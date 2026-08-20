"""Launch VLC and the clickable subtitle overlay for a video file."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import winreg
import json
import hashlib
from tkinter import messagebox
import tkinter as tk

import player_prefs
from vlc_subtitle_overlay import VLC_PASSWORD, find_subtitle_path


VIDEO_EXTENSIONS = {
    ".avi",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".webm",
    ".wmv",
}

def find_vlc() -> str | None:
    candidates: list[str] = []
    for hive, subkey in (
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\VideoLAN\VLC"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\VideoLAN\VLC"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\VideoLAN\VLC"),
    ):
        try:
            with winreg.OpenKey(hive, subkey) as key:
                install_dir = winreg.QueryValueEx(key, "InstallDir")[0]
                candidates.append(os.path.join(install_dir, "vlc.exe"))
                candidates.append(winreg.QueryValueEx(key, "")[0])
        except OSError:
            pass

    for folder in os.environ.get("PATH", "").split(os.pathsep):
        if folder:
            candidates.append(os.path.join(folder, "vlc.exe"))

    candidates.extend(
        [
            r"D:\Programs\VLC\vlc.exe",
            r"D:\Program Files\VideoLAN\VLC\vlc.exe",
            r"D:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
        ]
    )
    candidates.extend([
        os.path.join(os.environ.get("ProgramFiles", ""), "VideoLAN", "VLC", "vlc.exe"),
        os.path.join(os.environ.get("ProgramFiles(x86)", ""), "VideoLAN", "VLC", "vlc.exe"),
    ])

    seen: set[str] = set()
    for candidate in candidates:
        normalized = os.path.normcase(os.path.abspath(candidate)) if candidate else ""
        if normalized and normalized not in seen and os.path.exists(candidate):
            return candidate
        seen.add(normalized)
    return None


def executable_candidates(name: str) -> list[str]:
    candidates: list[str] = []
    for folder in os.environ.get("PATH", "").split(os.pathsep):
        if folder:
            candidates.append(os.path.join(folder, name))
    candidates.extend(
        [
            os.path.join(os.environ.get("ProgramFiles", ""), "FormatFactory", name),
            os.path.join(os.environ.get("ProgramFiles", ""), "ffmpeg", "bin", name),
            os.path.join(os.environ.get("ProgramFiles(x86)", ""), "ffmpeg", "bin", name),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Packages", name),
            os.path.join(os.environ.get("ProgramFiles", ""), "SteelSeries", "GG", "apps", "moments", name),
            rf"D:\Programs\ffmpeg\bin\{name}",
            rf"D:\Tools\ffmpeg\bin\{name}",
            rf"D:\src\ffmpeg\bin\{name}",
        ]
    )
    return candidates


def find_executable(name: str) -> str | None:
    seen: set[str] = set()
    for candidate in executable_candidates(name):
        normalized = os.path.normcase(os.path.abspath(candidate)) if candidate else ""
        if normalized and normalized not in seen and os.path.exists(candidate):
            return candidate
        seen.add(normalized)
    return None


def subtitle_cache_path(media_path: str, suffix: str = "embedded") -> str:
    stat = os.stat(media_path)
    key = hashlib.sha1(f"{media_path}|{stat.st_mtime_ns}|{stat.st_size}|{suffix}".encode("utf-8")).hexdigest()[:16]
    folder = os.path.join(tempfile.gettempdir(), "translated_vlc_subtitles")
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, f"{os.path.splitext(os.path.basename(media_path))[0]}.{key}.srt")


def run_hidden(args: list[str], timeout: float) -> subprocess.CompletedProcess[str]:
    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    return subprocess.run(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        startupinfo=startupinfo,
        check=False,
    )


def probe_subtitle_stream(ffprobe: str, media_path: str) -> int | None:
    result = run_hidden(
        [
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            "s",
            "-show_entries",
            "stream=index,codec_name:stream_tags=language,title",
            "-of",
            "json",
            media_path,
        ],
        timeout=12,
    )
    if result.returncode != 0:
        return None
    try:
        streams = json.loads(result.stdout).get("streams", [])
    except json.JSONDecodeError:
        return None
    if not streams:
        return None

    wanted = player_prefs.language_codes(
        player_prefs.load_player_prefs()["subtitle_language"]
    )

    def rank(stream: dict[str, object]) -> tuple[int, int, int]:
        """The asked-for language first, then anything that is really text.

        Image subtitles (PGS, VobSub) cannot be turned into words, so a file
        that carries both should give up its text track.
        """
        tags = stream.get("tags") if isinstance(stream.get("tags"), dict) else {}
        language = str((tags or {}).get("language", "")).lower()
        codec = str(stream.get("codec_name", "")).lower()
        image = codec in {"hdmv_pgs_subtitle", "dvd_subtitle", "dvb_subtitle", "xsub"}
        return (
            0 if wanted and language in wanted else 1,
            1 if image else 0,
            int(stream.get("index", 9999)),
        )

    selected = sorted(streams, key=rank)[0]
    try:
        return int(selected["index"])
    except (KeyError, TypeError, ValueError):
        return None


def extract_embedded_subtitle(media_path: str) -> tuple[str | None, str | None]:
    ffmpeg = find_executable("ffmpeg.exe")
    if not ffmpeg:
        return None, "No .srt file found, and ffmpeg.exe was not found for embedded subtitle extraction."

    cached = subtitle_cache_path(media_path)
    if os.path.exists(cached) and os.path.getsize(cached) > 0:
        return cached, None

    ffprobe = find_executable("ffprobe.exe")
    commands: list[list[str]] = []
    stream_index = probe_subtitle_stream(ffprobe, media_path) if ffprobe else None
    if stream_index is not None:
        commands.append([ffmpeg, "-y", "-i", media_path, "-map", f"0:{stream_index}", "-c:s", "srt", cached])

    # Without ffprobe there is nothing to inspect, so ask ffmpeg for the
    # language directly and fall back to the file's first subtitle track - a
    # film that does not carry the wanted language still gets subtitles.
    for code in player_prefs.language_codes(
        player_prefs.load_player_prefs()["subtitle_language"]
    ):
        commands.append(
            [ffmpeg, "-y", "-i", media_path, "-map", f"0:s:m:language:{code}", "-c:s", "srt", cached]
        )
    commands.append([ffmpeg, "-y", "-i", media_path, "-map", "0:s:0", "-c:s", "srt", cached])

    last_error = ""
    for command in commands:
        output_path = command[-1]
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        result = run_hidden(command, timeout=45)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path, None
        last_error = result.stderr[-1200:] if result.stderr else ""

    return (
        None,
        "Embedded subtitles were found only in a format that could not be converted to text. "
        "PGS/VobSub image subtitles need OCR, so they cannot be clicked as words yet."
        if "Subtitle encoding currently only possible from text to text" in last_error or "codec not currently supported" in last_error.lower()
        else "Could not extract embedded subtitles to .srt with ffmpeg.",
    )


def sibling_executable(name: str) -> str | None:
    folder = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, "frozen", False) else __file__))
    candidate = os.path.join(folder, name)
    if os.path.exists(candidate):
        return candidate
    source_candidate = os.path.join(folder, name.replace(".exe", ".py"))
    if os.path.exists(source_candidate):
        return source_candidate
    return None


def show_error(text: str) -> None:
    root = tk.Tk()
    root.withdraw()
    messagebox.showerror("Translated VLC", text)
    root.destroy()


def launch_vlc(vlc: str, media_path: str) -> None:
    prefs = player_prefs.load_player_prefs()
    audio = ",".join(player_prefs.language_codes(prefs["audio_language"]))
    command = [
        vlc,
        "--extraintf=http",
        "--http-host=127.0.0.1",
        f"--http-port={prefs['vlc_port']}",
        f"--http-password={VLC_PASSWORD}",
        "--no-spu",
    ]
    # VLC falls back to the file's own first track when nothing matches, so a
    # film without the wanted language still plays.
    if audio:
        command.append(f"--audio-language={audio}")
    command.append(media_path)
    subprocess.Popen(command, close_fds=True)


def launch_overlay(subtitle_path: str, media_path: str) -> None:
    if os.name == "nt":
        run_hidden(["taskkill", "/IM", "VlcSubtitleOverlay.exe", "/F"], timeout=3)
    overlay = sibling_executable("VlcSubtitleOverlay.exe")
    if overlay and overlay.lower().endswith(".exe"):
        subprocess.Popen([overlay, subtitle_path, media_path], close_fds=True)
    else:
        subprocess.Popen(
            [sys.executable, os.path.join(os.path.dirname(__file__), "vlc_subtitle_overlay.py"), subtitle_path, media_path],
            close_fds=True,
        )


def main() -> int:
    if len(sys.argv) < 2:
        show_error("Drop a video file onto this launcher or use Open with.")
        return 1

    media_path = os.path.abspath(sys.argv[1])
    if not os.path.exists(media_path):
        show_error(f"File not found:\n{media_path}")
        return 1

    extension = os.path.splitext(media_path)[1].lower()
    if extension not in VIDEO_EXTENSIONS and extension != ".srt":
        show_error("This launcher expects a video file or an .srt subtitle file.")
        return 1

    vlc = find_vlc()
    if not vlc:
        show_error("VLC was not found. Install VLC or add vlc.exe to PATH.")
        return 1

    if extension != ".srt":
        launch_vlc(vlc, media_path)

    subtitle_path = find_subtitle_path(media_path)
    if not subtitle_path:
        subtitle_path, extraction_error = extract_embedded_subtitle(media_path)
        if not subtitle_path:
            show_error(extraction_error or "No matching .srt file found next to the video or inside the file.")
            return 1

    if extension == ".srt":
        launch_vlc(vlc, media_path)

    time.sleep(0.8)
    launch_overlay(subtitle_path, media_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
