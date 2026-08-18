"""Generates the launcher icons from the app's own design tokens.

The mark is three saved words stacked like cards, the front one carrying a
subtitle line. It is the same shape the app already draws on its sign-in
screen, so the icon on the home screen and the mark inside the app are one
thing rather than two unrelated drawings. Drawn here rather than exported by
hand so the colours can never drift away from lib/design/tokens.dart.

Run from the `mobile` folder:  python tool/make_icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

GREEN = (43, 168, 74, 255)  # tokens: green
GREEN_LIP = (30, 127, 54, 255)  # tokens: greenLip
GREEN_DEEP = (22, 96, 41, 255)  # shadow inside the bubble
MINT = (110, 231, 148, 255)  # tokens: greenBright, lifted
WHITE = (255, 255, 255, 255)
BLUE = (31, 155, 224, 255)  # tokens: blue
AMBER = (242, 162, 12, 255)  # tokens: amber

RES = Path("android/app/src/main/res")
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Adaptive foreground is 108dp with only the middle 72dp guaranteed visible.
ADAPTIVE = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

SUPERSAMPLE = 8


def _card(size: int, width: float, height: float, colour, angle: float, dx: float, dy: float):
    """One rounded card, rotated, on its own transparent layer."""
    pad = int(max(width, height) * 0.5)
    layer = Image.new("RGBA", (int(width) + pad * 2, int(height) + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        (pad, pad, pad + width, pad + height), radius=width * 0.19, fill=colour
    )
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=False)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        layer,
        (int((size - layer.width) / 2 + dx), int((size - layer.height) / 2 + dy)),
    )
    return canvas


def stacked_cards(
    size: int,
    scale: float,
    *,
    body=WHITE,
    bar=GREEN,
    accent=MINT,
    hollow: bool = False,
) -> Image.Image:
    """Three saved words in a stack, the front one showing its subtitle line."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    width = size * scale
    height = width * 0.70

    # A silhouette pass (shadow, or the themed monochrome layer) wants every
    # card in one colour; the real icon wants the app's three.
    flat = hollow or (body == bar == accent)
    behind_left = body if flat else BLUE
    behind_right = body if flat else AMBER

    canvas.alpha_composite(
        _card(size, width * 0.86, height * 0.86, behind_left, 13, -width * 0.20, height * 0.10)
    )
    canvas.alpha_composite(
        _card(size, width * 0.86, height * 0.86, behind_right, -11, width * 0.21, height * 0.12)
    )
    canvas.alpha_composite(_card(size, width, height, body, 0, 0, -height * 0.06))
    if flat:
        return canvas

    # The subtitle line on the front card: one full bar and a short one under
    # it, the shape of a two-line caption.
    draw = ImageDraw.Draw(canvas)
    left = (size - width) / 2
    top = (size - height) / 2 - height * 0.06
    bar_h = height * 0.13
    draw.rounded_rectangle(
        (left + width * 0.17, top + height * 0.34,
         left + width * 0.83, top + height * 0.34 + bar_h),
        radius=bar_h / 2,
        fill=bar,
    )
    draw.rounded_rectangle(
        (left + width * 0.17, top + height * 0.58,
         left + width * 0.58, top + height * 0.58 + bar_h),
        radius=bar_h / 2,
        fill=accent,
    )
    return canvas


def squircle_icon(size: int, *, lip: bool, round_mask: bool = False) -> Image.Image:
    """Full legacy icon: the bubble on a green tile standing on its lip."""
    big = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = big * 0.235

    if round_mask:
        draw.ellipse((0, 0, big - 1, big - 1), fill=GREEN)
    else:
        lip_height = big * 0.055 if lip else 0
        if lip:
            draw.rounded_rectangle(
                (0, 0, big - 1, big - 1), radius=radius, fill=GREEN_LIP
            )
        draw.rounded_rectangle(
            (0, 0, big - 1, big - 1 - lip_height), radius=radius, fill=GREEN
        )

    # A soft drop under the bubble gives the tile depth without a blur.
    shadow = stacked_cards(big, 0.62, body=GREEN_DEEP, bar=GREEN_DEEP, accent=GREEN_DEEP)
    canvas.alpha_composite(shadow, (0, int(big * 0.022)))
    canvas.alpha_composite(stacked_cards(big, 0.62))
    return canvas.resize((size, size), Image.LANCZOS)


def adaptive_foreground(size: int) -> Image.Image:
    """Only the middle two thirds of an adaptive layer is guaranteed to survive
    the launcher's mask, so the mark is drawn smaller than it looks."""
    big = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    canvas.alpha_composite(
        stacked_cards(big, 0.45, body=GREEN_DEEP, bar=GREEN_DEEP, accent=GREEN_DEEP),
        (0, int(big * 0.016)),
    )
    canvas.alpha_composite(stacked_cards(big, 0.45))
    return canvas.resize((size, size), Image.LANCZOS)


def monochrome_foreground(size: int) -> Image.Image:
    """Themed icons are tinted by the launcher, so this layer is a flat
    silhouette: solid where the mark is, transparent everywhere else."""
    big = size * SUPERSAMPLE
    mark = stacked_cards(big, 0.45, body=WHITE, bar=(0, 0, 0, 0), accent=(0, 0, 0, 0), hollow=True)
    return mark.resize((size, size), Image.LANCZOS)


def write_android() -> None:
    for folder, size in DENSITIES.items():
        target = RES / folder
        target.mkdir(parents=True, exist_ok=True)
        squircle_icon(size, lip=True).save(target / "ic_launcher.png")
        squircle_icon(size, lip=False, round_mask=True).save(
            target / "ic_launcher_round.png"
        )
    for folder, size in ADAPTIVE.items():
        target = RES / folder
        target.mkdir(parents=True, exist_ok=True)
        adaptive_foreground(size).save(target / "ic_launcher_foreground.png")
        monochrome_foreground(size).save(target / "ic_launcher_monochrome.png")

    anydpi = RES / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher", "ic_launcher_round"):
        (anydpi / f"{name}.xml").write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background" />\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
            '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n'
            "</adaptive-icon>\n",
            encoding="utf-8",
        )


def write_windows() -> None:
    for target in (
        Path("windows/runner/resources/app_icon.ico"),
        Path("../app_icon.ico"),  # used by the PyInstaller desktop helpers
    ):
        if not target.parent.exists():
            continue
        squircle_icon(256, lip=True).save(
            target,
            format="ICO",
            sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
        )


if __name__ == "__main__":
    write_android()
    write_windows()
    print("icons written")
