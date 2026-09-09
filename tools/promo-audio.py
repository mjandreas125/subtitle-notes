"""Synthesises the promo film's soundtrack, in step with its timeline.

    python tools/promo-audio.py release_package/promo/build/audio.wav

Everything here is generated from arithmetic, so the film owes nothing to a
music library and there is no licence to keep track of. Three layers:

* a slow pad that moves through six chords, one per scene, always quiet;
* sound design pinned to the seconds the picture does something - the subtitle
  changing, the key going down, the drag, the three nodes, the card landing;
* a short room around the sound design, because dry synthetic blips in silence
  are the thing that makes a promo sound cheap.

Timbres are struck-wood rather than clicks. An earlier cut used band-passed
noise up to 5 kHz and sine pings at 2 kHz, which read as harsh on anything with
real treble.

Times are written in STORY seconds and played at RATE - the same constant as in
release_package/promo/film.html. If a scene moves there, it moves here.
"""

from __future__ import annotations

import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48_000
RATE = 0.75
STORY_END = 36.6
DURATION = STORY_END * RATE


def at(story: float) -> float:
    """A story second as a real one."""
    return story * RATE


def t_of(n: int) -> np.ndarray:
    return np.arange(n) / SR


def seconds(x: float) -> int:
    return int(round(x * SR))


class Track:
    """A stereo buffer that things get added into at a given second."""

    def __init__(self, length: float) -> None:
        self.buf = np.zeros((seconds(length) + SR, 2), dtype=np.float64)

    def add(self, when: float, mono: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
        start = seconds(when)
        end = start + len(mono)
        if end > len(self.buf):
            mono = mono[: len(self.buf) - start]
            end = len(self.buf)
        self.buf[start:end, 0] += mono * gain * min(1.0, 1.0 - pan)
        self.buf[start:end, 1] += mono * gain * min(1.0, 1.0 + pan)


def lowpass(x: np.ndarray, hz: float, order: int = 4) -> np.ndarray:
    sos = butter(order, min(hz / (SR / 2), 0.99), btype="low", output="sos")
    return sosfilt(sos, x)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    lo, hi = max(20.0, lo), min(hi, SR / 2 - 100)
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band", output="sos")
    return sosfilt(sos, x)


def env(n: int, attack: float, decay: float, curve: float = 3.0) -> np.ndarray:
    """A struck shape: a soft rise, then an exponential tail.

    The attack is what separates a note from a click. Anything under about
    four milliseconds is heard as an edge rather than as a sound starting.
    """
    a = min(n - 1, seconds(attack))
    e = np.ones(n)
    if a > 0:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    tail = np.arange(n - a) / max(1, seconds(decay))
    e[a:] = np.exp(-curve * tail)
    return e


# --- the pad ---------------------------------------------------------------

# One chord per scene, in D minor. Frequencies, not note names: all that
# matters is that consecutive chords share a tone and the whole thing sits low
# enough to stay out of the way.
CHORDS = [
    (0.0, [146.83, 174.61, 220.00]),          # Dm    - the scene
    (7.2, [116.54, 146.83, 174.61]),          # Bb    - the dictionary is wrong
    (12.8, [130.81, 164.81, 196.00]),         # C     - the round trip
    (20.5, [174.61, 220.00, 261.63]),         # F     - the answer, brighter
    (26.8, [146.83, 174.61, 220.00]),         # Dm    - languages
    (31.9, [110.00, 146.83, 174.61]),         # Dm/A  - the end card
]


def pad(total: float) -> np.ndarray:
    n = seconds(total)
    time = t_of(n)
    out = np.zeros(n)
    rng = np.random.default_rng(3)
    for i, (start, freqs) in enumerate(CHORDS):
        end = CHORDS[i + 1][0] if i + 1 < len(CHORDS) else STORY_END
        # Chords overlap, so one dissolves into the next rather than cutting.
        a = seconds(max(0.0, at(start) - 1.4))
        b = min(n, seconds(at(end) + 2.0))
        span = b - a
        if span <= 0:
            continue
        shape = np.ones(span)
        fade = min(seconds(1.7), span // 2)
        shape[:fade] = np.linspace(0, 1, fade) ** 1.5
        shape[-fade:] = np.linspace(1, 0, fade) ** 1.5
        voice = np.zeros(span)
        local = time[a:b] - time[a]
        for f in freqs:
            for partial, amp in ((1, 1.0), (2, 0.26), (3, 0.10), (4, 0.05)):
                detune = 1.0 + rng.uniform(-0.0016, 0.0016)
                phase = rng.uniform(0, 2 * np.pi)
                lfo = 1.0 + 0.16 * np.sin(2 * np.pi * rng.uniform(0.05, 0.13) * local + phase)
                voice += amp * lfo * np.sin(2 * np.pi * f * partial * detune * local + phase)
        out[a:b] += shape * voice / (len(freqs) * 2.4)
    out = lowpass(out, 2000)
    # A breath of air over the top, so the pad is not purely synthetic.
    air = lowpass(np.random.default_rng(11).standard_normal(n), 800) * 0.05
    air *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.06 * time)
    return out * 0.5 + air


# --- sound design ----------------------------------------------------------

def wood(freq: float = 660.0, dur: float = 0.45, bright: float = 1.0) -> np.ndarray:
    """A struck wooden bar. Warm, short, and nothing above about 3 kHz.

    The partials are the ones a marimba bar actually gives - roughly 4x and
    10x the fundamental - which is why it reads as an instrument rather than
    as a beep.
    """
    n = seconds(dur)
    time = t_of(n)
    body = np.sin(2 * np.pi * freq * time) * env(n, 0.006, dur / 3.4, 3.4)
    body += 0.30 * bright * np.sin(2 * np.pi * freq * 3.93 * time) * env(n, 0.004, dur / 9, 5)
    body += 0.11 * bright * np.sin(2 * np.pi * freq * 9.6 * time) * env(n, 0.003, dur / 22, 7)
    # The mallet itself: a thump of noise, well under the tone.
    body += 0.16 * lowpass(np.random.default_rng(int(freq)).standard_normal(n), 1300) \
        * env(n, 0.002, 0.012, 6)
    return lowpass(body, 3400) * 0.6


def key_click() -> np.ndarray:
    """A key going down on a good keyboard: mostly a thud, barely any tick."""
    n = seconds(0.16)
    time = t_of(n)
    tick = bandpass(np.random.default_rng(17).standard_normal(n), 260, 1700) * env(n, 0.0015, 0.016, 6)
    thud = np.sin(2 * np.pi * 96 * time) * env(n, 0.002, 0.05, 4.5)
    thud += 0.4 * np.sin(2 * np.pi * 152 * time) * env(n, 0.002, 0.03, 5)
    return lowpass(tick * 0.34 + thud * 0.8, 2600)


def drag(dur: float) -> np.ndarray:
    """Pulling a selection across words: a soft grain, not a swoosh."""
    n = seconds(dur)
    rng = np.random.default_rng(23)
    grains = np.zeros(n)
    step = seconds(0.03)
    for start in range(0, max(1, n - step), step):
        k = start / n
        g = bandpass(rng.standard_normal(step), 420 + 500 * k, 1500 + 900 * k)
        grains[start:start + step] += g * np.hanning(step) * (0.45 + 0.55 * k)
    return lowpass(grains, 2000) * (np.sin(np.pi * np.linspace(0, 1, n)) ** 0.8)


def swoosh(dur: float, rising: bool = True) -> np.ndarray:
    """Air moving. Filtered well down, so it is a breath and not a hiss."""
    n = seconds(dur)
    raw = np.random.default_rng(7).standard_normal(n)
    out = np.zeros(n)
    edges = np.linspace(0, n, 33).astype(int)
    lo, hi = (260.0, 1500.0) if rising else (1500.0, 260.0)
    for i in range(32):
        a, b = edges[i], edges[i + 1]
        if b <= a:
            continue
        centre = lo * (hi / lo) ** (i / 31)
        out[a:b] = bandpass(raw[a:b], centre / 1.7, centre * 1.7)
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.3
    return lowpass(out * shape, 2400)


def bell(freqs=(392.0, 587.33, 880.0), dur: float = 2.4) -> np.ndarray:
    """The answer landing. Struck, not pinged: a slow attack and a long tail."""
    n = seconds(dur)
    time = t_of(n)
    out = np.zeros(n)
    for i, f in enumerate(freqs):
        out += np.sin(2 * np.pi * f * time) * np.exp(-(1.5 + i * 0.9) * time) / (i + 1.7)
    return lowpass(out, 3000) * env(n, 0.012, dur / 3.2, 2.2)


def swell(dur: float = 1.6) -> np.ndarray:
    n = seconds(dur)
    body = lowpass(np.random.default_rng(31).standard_normal(n), 900)
    return body * (np.sin(np.pi * np.linspace(0, 1, n)) ** 2)


def room(x: np.ndarray, decay: float = 1.15, wet: float = 0.26) -> np.ndarray:
    """A small dark room around the sound design.

    Dry blips in silence are what makes a promo sound like a slideshow. The
    impulse is decaying noise with the top rolled off, which is enough: nobody
    is listening for the shape of the hall.
    """
    n = seconds(decay)
    rng = np.random.default_rng(101)
    imp = rng.standard_normal(n) * np.exp(-4.2 * np.arange(n) / n)
    imp[: seconds(0.011)] = 0.0                      # a little pre-delay
    imp = lowpass(imp, 2600)
    imp /= np.sqrt(np.sum(imp ** 2))
    wetsig = np.stack([fftconvolve(x[:, c], imp)[: len(x)] for c in (0, 1)], axis=1)
    return x * (1 - wet * 0.5) + wetsig * wet


def build() -> np.ndarray:
    bed = Track(DURATION)
    fx = Track(DURATION)
    # The bed sits well under the sound design on purpose: the film is quiet,
    # and the things worth hearing are the key, the drag and the answer.
    bed.add(0.0, pad(DURATION), gain=0.34)

    # Scene A - a series is running, and the dictionary gets the line wrong.
    fx.add(at(0.8), swell(1.2), gain=0.045)
    fx.add(at(2.9), wood(392, 0.40, 0.7), gain=0.10, pan=-0.05)    # the line changes
    fx.add(at(4.4), wood(523, 0.42, 0.8), gain=0.13, pan=0.12)     # the dictionary answers
    fx.add(at(6.0), swoosh(0.42, rising=False), gain=0.075)        # the strike
    fx.add(at(7.4), wood(294, 0.5, 0.5), gain=0.075, pan=-0.1)     # it drops away

    # Scene B - the gesture.
    fx.add(at(9.45), key_click(), gain=0.34, pan=-0.4)
    fx.add(at(9.8), drag(at(1.3)), gain=0.10)
    fx.add(at(11.05), wood(784, 0.45), gain=0.15)                  # the highlight lands
    fx.add(at(11.3), wood(262, 0.7, 0.35), gain=0.07)              # the film pauses

    # Scene C - the round trip. Three nodes, three rising notes.
    fx.add(at(13.0), swoosh(at(0.85), rising=True), gain=0.085)
    for i, hz in enumerate((587.33, 698.46, 880.0)):
        fx.add(at(14.1 + i * 0.65), wood(hz, 0.5), gain=0.14, pan=-0.2 + i * 0.2)
    fx.add(at(16.2), swoosh(at(0.75), rising=False), gain=0.085)
    fx.add(at(16.9), bell(), gain=0.20)                            # the answer
    for i in range(3):
        fx.add(at(18.6 + i * 0.13), wood(1046 + i * 118, 0.26, 0.6), gain=0.055)

    # Scene D - one library, three places.
    fx.add(at(22.5), swell(1.5), gain=0.06)
    for i in range(3):
        fx.add(at(23.2 + i * 0.22), wood(523 + i * 87, 0.4, 0.7), gain=0.085, pan=-0.3 + i * 0.3)
    for i in range(4):
        fx.add(at(24.3 + i * 0.15), wood(349, 0.3, 0.5), gain=0.045)

    # Scene E - the answer in one language after another.
    for i in range(5):
        fx.add(at(27.5 + i * 0.74), wood(440 + i * 49, 0.42, 0.6), gain=0.075)
    for i in range(14):
        fx.add(at(27.6 + i * 0.13), wood(880 + i * 33, 0.22, 0.45), gain=0.032,
               pan=-0.3 + i * 0.045)

    # Scene F - the end card.
    fx.add(at(31.9), bell((293.66, 440.0, 587.33), 3.0), gain=0.17)

    out = bed.buf[: seconds(DURATION)] + room(fx.buf[: seconds(DURATION)])

    # A gentle top on the peaks rather than a limiter, then the fades.
    out = np.tanh(out * 1.2) / 1.2
    gate = np.ones(len(out))
    rise, fall = seconds(1.2), seconds(1.8)
    gate[:rise] = np.linspace(0, 1, rise) ** 1.5
    gate[-fall:] = np.linspace(1, 0, fall) ** 1.6
    out *= gate[:, None]

    peak = np.max(np.abs(out))
    if peak > 0:
        out *= 10 ** (-1.5 / 20) / peak            # -1.5 dBFS true peak
    rms = np.sqrt(np.mean(out ** 2))
    print(f"peak {20 * np.log10(np.max(np.abs(out))):.1f} dBFS, "
          f"rms {20 * np.log10(rms):.1f} dBFS, {len(out) / SR:.2f} s")
    return out


def write_wav(path: str, data: np.ndarray) -> None:
    import wave
    pcm = (np.clip(data, -1.0, 1.0) * 32767.0).astype("<i2")
    with wave.open(path, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "audio.wav"
    write_wav(out, build())
    print("wrote", out)
