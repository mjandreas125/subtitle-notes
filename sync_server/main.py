"""Shared API for the Translated VLC desktop overlay and the Android app.

Use SQLite when developing locally. Set DATABASE_URL to a PostgreSQL URL and
APP_SECRET to a long random value before making this reachable from the internet.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine, desc, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

try:
    from .learning import enrich
except ImportError:  # Running `uvicorn main:app` inside this folder.
    from learning import enrich


ROOT = Path(__file__).resolve().parent
LOCAL_DATA = Path(os.getenv("LOCALAPPDATA", str(ROOT))) / "Subtitle Notes Server"
LOCAL_DATA.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{LOCAL_DATA / 'translated_vlc.db'}")
APP_SECRET = os.getenv("APP_SECRET", "development-only-change-me-before-public-hosting")
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "30"))
ALLOWED_ORIGINS = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "*").split(",") if item.strip()]
# OAuth client IDs identify an app; unlike a client secret they are designed to
# be shipped in Android builds. Deployments can replace this product default
# with GOOGLE_OAUTH_CLIENT_IDS without changing the source.
_DEFAULT_GOOGLE_OAUTH_CLIENT_IDS = (
    "151185018789-tjda40ks4kb2vo8s30f9359n2b9o4dlb.apps.googleusercontent.com",
)
GOOGLE_OAUTH_CLIENT_IDS = [item.strip() for item in os.getenv("GOOGLE_OAUTH_CLIENT_IDS", "").split(",") if item.strip()] or list(_DEFAULT_GOOGLE_OAUTH_CLIENT_IDS)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(256))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    selections: Mapped[list["Selection"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Selection(Base):
    __tablename__ = "selections"
    __table_args__ = (UniqueConstraint("owner_id", "client_key", name="uq_selection_owner_client_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_key: Mapped[str] = mapped_column(String(96), index=True)
    media_title: Mapped[str] = mapped_column(String(240), index=True)
    season: Mapped[str | None] = mapped_column(String(24), nullable=True)
    episode: Mapped[str | None] = mapped_column(String(24), nullable=True)
    timecode_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    selected_text: Mapped[str] = mapped_column(Text)
    translation: Mapped[str] = mapped_column(Text)
    focus_word: Mapped[str | None] = mapped_column(String(120), nullable=True)
    focus_phrase: Mapped[str | None] = mapped_column(String(240), nullable=True)
    focus_translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    variants_json: Mapped[str] = mapped_column(Text, default="[]")
    examples_json: Mapped[str] = mapped_column(Text, default="[]")
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    owner: Mapped[User] = relationship(back_populates="selections")


class DevicePairing(Base):
    __tablename__ = "device_pairings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    request_secret_hash: Mapped[str] = mapped_column(String(64))
    device_name: Mapped[str] = mapped_column(String(80))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    device_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=256)
    display_name: str = Field(default="", max_length=80)

    @field_validator("email")
    @classmethod
    def email_is_valid(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Введите корректный e-mail")
        return value


class GoogleToken(BaseModel):
    id_token: str = Field(min_length=30, max_length=20_000)


class PairingStart(BaseModel):
    device_name: str = Field(default="New device", min_length=1, max_length=80)


class PairingPoll(BaseModel):
    pairing_id: str = Field(min_length=36, max_length=36)
    request_secret: str = Field(min_length=32, max_length=128)


class PairingApprove(BaseModel):
    code: str = Field(min_length=6, max_length=12)


class SelectionInput(BaseModel):
    client_key: str = Field(min_length=8, max_length=96)
    media_title: str = Field(min_length=1, max_length=240)
    season: str | None = Field(default=None, max_length=24)
    episode: str | None = Field(default=None, max_length=24)
    timecode_ms: int | None = Field(default=None, ge=0)
    selected_text: str = Field(min_length=1, max_length=4000)
    translation: str = Field(min_length=1, max_length=4000)
    focus_word: str | None = Field(default=None, max_length=120)
    focus_phrase: str | None = Field(default=None, max_length=240)
    focus_translation: str | None = Field(default=None, max_length=4000)
    variants: list[str] = Field(default_factory=list, max_length=25)
    examples: list[str] = Field(default_factory=list, max_length=25)
    context: str | None = Field(default=None, max_length=8000)


class CaptureInput(BaseModel):
    """Raw highlighted text from the browser, Windows helper, or Android."""
    client_key: str = Field(min_length=8, max_length=96)
    selected_text: str = Field(min_length=1, max_length=4000)
    media_title: str = Field(default="Web or other app", min_length=1, max_length=240)
    season: str | None = Field(default=None, max_length=24)
    episode: str | None = Field(default=None, max_length=24)
    timecode_ms: int | None = Field(default=None, ge=0)
    context: str | None = Field(default=None, max_length=8000)


class ArchiveUpdate(BaseModel):
    archived: bool


class SelectionCard(BaseModel):
    id: str
    media_title: str
    season: str | None
    episode: str | None
    timecode_ms: int | None
    selected_text: str
    translation: str
    focus_word: str | None
    focus_phrase: str | None
    focus_translation: str | None
    archived: bool
    created_at: datetime


class SelectionDetail(SelectionCard):
    variants: list[str]
    examples: list[str]
    context: str | None


def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), 310_000)
        return hmac.compare_digest(actual.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user: User) -> str:
    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(json.dumps({"sub": user.id, "exp": int((datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)).timestamp())}, separators=(",", ":")).encode())
    signed = f"{header}.{payload}".encode()
    signature = _b64(hmac.new(APP_SECRET.encode(), signed, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def pairing_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def new_pairing_code() -> str:
    # Avoid ambiguous I/O/1/0 when a person types the code on a phone.
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def current_user(request: Request, db: Session = Depends(db_session)) -> User:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нужна авторизация")
    try:
        header, payload, signature = authorization[7:].split(".")
        signed = f"{header}.{payload}".encode()
        expected = _b64(hmac.new(APP_SECRET.encode(), signed, hashlib.sha256).digest())
        claims: dict[str, Any] = json.loads(_unb64(payload))
        if not hmac.compare_digest(signature, expected) or int(claims["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Сессия истекла") from None
    user = db.get(User, str(claims["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")
    return user


def as_card(row: Selection) -> SelectionCard:
    return SelectionCard(
        id=row.id, media_title=row.media_title, season=row.season, episode=row.episode,
        timecode_ms=row.timecode_ms, selected_text=row.selected_text, translation=row.translation,
        focus_word=row.focus_word, focus_phrase=row.focus_phrase, focus_translation=row.focus_translation,
        archived=row.archived,
        created_at=row.created_at,
    )


def as_detail(row: Selection) -> SelectionDetail:
    return SelectionDetail(**as_card(row).model_dump(), variants=json.loads(row.variants_json), examples=json.loads(row.examples_json), context=row.context)


def learning_key(focus_phrase: str | None, focus_word: str | None, selected_text: str) -> str:
    """A user learns a word/phrase once, even when it appears in another scene."""
    value = focus_phrase or focus_word or selected_text
    return re.sub(r"\s+", " ", value.strip()).casefold()


def existing_learning_selection(
    db: Session,
    user_id: str,
    focus_phrase: str | None,
    focus_word: str | None,
    selected_text: str,
) -> Selection | None:
    key = learning_key(focus_phrase, focus_word, selected_text)
    rows = db.scalars(select(Selection).where(Selection.owner_id == user_id)).all()
    return next(
        (
            row
            for row in rows
            if learning_key(row.focus_phrase, row.focus_word, row.selected_text) == key
        ),
        None,
    )


def resurface(row: Selection) -> None:
    row.created_at = datetime.now(timezone.utc)
    row.archived = False


app = FastAPI(title="Translated VLC Sync API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=False, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def create_schema() -> None:
    Base.metadata.create_all(engine)
    # Existing local test databases predate Google sign-in and archive support.
    with engine.begin() as connection:
        user_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()} if DATABASE_URL.startswith("sqlite") else set()
        selection_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(selections)").fetchall()} if DATABASE_URL.startswith("sqlite") else set()
        if DATABASE_URL.startswith("sqlite") and "google_sub" not in user_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255)")
        if DATABASE_URL.startswith("sqlite") and "archived" not in selection_columns:
            connection.exec_driver_sql("ALTER TABLE selections ADD COLUMN archived BOOLEAN NOT NULL DEFAULT 0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/auth/register")
def register(credentials: Credentials, db: Session = Depends(db_session)) -> dict[str, Any]:
    if db.scalar(select(User).where(User.email == credentials.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Этот e-mail уже зарегистрирован")
    user = User(email=credentials.email, display_name=credentials.display_name.strip() or credentials.email.split("@", 1)[0], password_hash=hash_password(credentials.password))
    db.add(user)
    db.commit()
    return {"token": create_token(user), "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


@app.post("/v1/auth/login")
def login(credentials: Credentials, db: Session = Depends(db_session)) -> dict[str, Any]:
    user = db.scalar(select(User).where(User.email == credentials.email))
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный e-mail или пароль")
    return {"token": create_token(user), "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


@app.post("/v1/auth/google")
def google_login(credentials: GoogleToken, db: Session = Depends(db_session)) -> dict[str, Any]:
    if not GOOGLE_OAUTH_CLIENT_IDS:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in has not been configured on this server")
    claims: dict[str, Any] | None = None
    for client_id in GOOGLE_OAUTH_CLIENT_IDS:
        try:
            value = google_id_token.verify_oauth2_token(credentials.id_token, google_requests.Request(), client_id)
            if value.get("iss") in {"accounts.google.com", "https://accounts.google.com"}:
                claims = value
                break
        except ValueError:
            continue
    if not claims or not claims.get("sub") or not claims.get("email") or not claims.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google account could not be verified")
    google_sub = str(claims["sub"])
    email = str(claims["email"]).lower()
    user = db.scalar(select(User).where(User.google_sub == google_sub))
    if not user:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            user.google_sub = google_sub
        else:
            user = User(email=email, display_name=str(claims.get("name") or email.split("@", 1)[0])[:80], password_hash=hash_password(secrets.token_urlsafe(40)), google_sub=google_sub)
            db.add(user)
        db.commit()
    return {"token": create_token(user), "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


@app.post("/v1/pairings/start")
def start_pairing(item: PairingStart, db: Session = Depends(db_session)) -> dict[str, Any]:
    # SQLite returns naive DateTime values; use a consistent UTC-naive value
    # for short-lived device pairing expiry checks across SQLite/PostgreSQL.
    now = datetime.utcnow()
    db.query(DevicePairing).filter(DevicePairing.expires_at < now).delete()
    code = new_pairing_code()
    while db.scalar(select(DevicePairing).where(DevicePairing.code == code)):
        code = new_pairing_code()
    request_secret = secrets.token_urlsafe(32)
    row = DevicePairing(
        code=code,
        request_secret_hash=pairing_hash(request_secret),
        device_name=item.device_name.strip(),
        expires_at=now + timedelta(minutes=10),
    )
    db.add(row)
    db.commit()
    return {"pairing_id": row.id, "code": code, "request_secret": request_secret, "expires_in_seconds": 600}


@app.post("/v1/pairings/poll")
def poll_pairing(item: PairingPoll, db: Session = Depends(db_session)) -> dict[str, Any]:
    row = db.get(DevicePairing, item.pairing_id)
    if not row or row.expires_at < datetime.utcnow() or not hmac.compare_digest(row.request_secret_hash, pairing_hash(item.request_secret)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pairing code expired")
    if not row.user_id or not row.device_token:
        return {"status": "waiting"}
    user = db.get(User, row.user_id)
    response = {"status": "connected", "token": row.device_token, "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}
    db.delete(row)  # The device token is returned exactly once.
    db.commit()
    return response


@app.post("/v1/pairings/approve")
def approve_pairing(item: PairingApprove, user: User = Depends(current_user), db: Session = Depends(db_session)) -> dict[str, str]:
    row = db.scalar(select(DevicePairing).where(DevicePairing.code == item.code.strip().upper()))
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pairing code expired or was already used")
    if row.user_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "This code was already approved")
    row.user_id = user.id
    row.device_token = create_token(user)
    db.commit()
    return {"status": "approved", "device_name": row.device_name}


@app.get("/v1/me")
def me(user: User = Depends(current_user)) -> dict[str, str]:
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@app.post("/v1/selections", response_model=SelectionDetail, status_code=status.HTTP_201_CREATED)
def create_selection(item: SelectionInput, user: User = Depends(current_user), db: Session = Depends(db_session)) -> SelectionDetail:
    existing = db.scalar(select(Selection).where(Selection.owner_id == user.id, Selection.client_key == item.client_key))
    existing = existing or existing_learning_selection(
        db, user.id, item.focus_phrase, item.focus_word, item.selected_text,
    )
    if existing:
        resurface(existing)
        db.commit()
        db.refresh(existing)
        return as_detail(existing)
    row = Selection(owner_id=user.id, client_key=item.client_key, media_title=item.media_title.strip(), season=item.season, episode=item.episode, timecode_ms=item.timecode_ms, selected_text=item.selected_text.strip(), translation=item.translation.strip(), focus_word=item.focus_word, focus_phrase=item.focus_phrase, focus_translation=item.focus_translation, variants_json=json.dumps(item.variants, ensure_ascii=False), examples_json=json.dumps(item.examples, ensure_ascii=False), context=item.context)
    db.add(row)
    db.commit()
    db.refresh(row)
    return as_detail(row)


@app.post("/v1/captures", response_model=SelectionDetail, status_code=status.HTTP_201_CREATED)
def create_capture(item: CaptureInput, user: User = Depends(current_user), db: Session = Depends(db_session)) -> SelectionDetail:
    """Enrich and save a raw selection consistently, regardless of its origin."""
    try:
        result = enrich(item.selected_text.strip())
    except Exception:
        result = None
    existing = db.scalar(select(Selection).where(Selection.owner_id == user.id, Selection.client_key == item.client_key))
    existing = existing or existing_learning_selection(
        db,
        user.id,
        result.focus_phrase if result else None,
        result.focus_word if result else None,
        item.selected_text,
    )
    if existing:
        resurface(existing)
        db.commit()
        db.refresh(existing)
        return as_detail(existing)
    row = Selection(
        owner_id=user.id, client_key=item.client_key, media_title=item.media_title.strip(), season=item.season,
        episode=item.episode, timecode_ms=item.timecode_ms, selected_text=item.selected_text.strip(),
        translation=result.translation if result else "Translation unavailable", focus_word=result.focus_word if result else None,
        focus_phrase=result.focus_phrase if result else None, focus_translation=result.focus_translation if result else None,
        variants_json=json.dumps(result.variants if result else [], ensure_ascii=False),
        examples_json=json.dumps(result.examples if result else [], ensure_ascii=False), context=item.context,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return as_detail(row)


@app.get("/v1/selections", response_model=list[SelectionCard])
def list_selections(archived: bool = False, limit: int = 60, offset: int = 0, user: User = Depends(current_user), db: Session = Depends(db_session)) -> list[SelectionCard]:
    limit = min(max(limit, 1), 100)
    rows = db.scalars(select(Selection).where(Selection.owner_id == user.id, Selection.archived == archived).order_by(desc(Selection.created_at)).offset(max(offset, 0)).limit(limit)).all()
    return [as_card(row) for row in rows]


@app.get("/v1/selections/{selection_id}", response_model=SelectionDetail)
def get_selection(selection_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)) -> SelectionDetail:
    row = db.scalar(select(Selection).where(Selection.id == selection_id, Selection.owner_id == user.id))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    return as_detail(row)


@app.patch("/v1/selections/{selection_id}/archive", response_model=SelectionCard)
def set_selection_archive(selection_id: str, item: ArchiveUpdate, user: User = Depends(current_user), db: Session = Depends(db_session)) -> SelectionCard:
    row = db.scalar(select(Selection).where(Selection.id == selection_id, Selection.owner_id == user.id))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Selection not found")
    row.archived = item.archived
    db.commit()
    db.refresh(row)
    return as_card(row)


@app.delete("/v1/selections/{selection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_selection(selection_id: str, user: User = Depends(current_user), db: Session = Depends(db_session)) -> None:
    row = db.scalar(select(Selection).where(Selection.id == selection_id, Selection.owner_id == user.id))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    db.delete(row)
    db.commit()
