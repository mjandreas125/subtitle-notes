# Subtitle Notes — visual system

Captured from the shipped surfaces: `cloud_api/src/home.ts` (landing),
`extension/welcome.html` (first run), `release_package/store/` (listing assets),
`extension/options.html` (settings). One system, four places.

## Theme

Light by default, dark by system preference. The exception is the **film frame**:
a deliberately dark rectangle that appears inside the light page wherever the
product is shown doing its job. That contrast — lit page, dark scene — is the
identity. Do not introduce a third surface world.

## Colour

Light (default):

| Token | Value | Role |
|---|---|---|
| `--paper` | `#faf8f4` | page ground |
| `--card` | `#ffffff` | raised surface |
| `--ink` | `#14201c` | body and headings |
| `--soft` | `#5d6d67` | secondary text — 4.9:1 on paper, safe for body |
| `--hair` | `#e4dfd5` | 1px separators and card borders |
| `--accent` | `#1e7a4c` | the one saturated colour; ≤10% of surface |
| `--wash` | `#e7f2ea` | accent at low strength, for marks and chips |

Dark (`prefers-color-scheme: dark`): `--paper #101614`, `--card #151d1a`,
`--ink #eaf1ed`, `--soft #93a49c`, `--hair #26332e`, `--accent #64c795`,
`--wash #17241f`.

Inside the film frame the accent brightens to `#35a874` / `rgba(70,214,143,.34)`
for the subtitle highlight, because it is sitting on near-black.

**Strategy: restrained.** One accent, under a tenth of any surface. Green is
"the answer arrived" and is spent on nothing else — never on a border for
decoration, never on a heading.

## Typography

One family in several weights: `"Segoe UI", system-ui, sans-serif`. No pairing —
the contrast axis is weight and size, not family.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Shot headline | 40px | 700 | -0.022em |
| Lede | 19px | 400 | — |
| Section label | 12.5px | 700 | 0.14em, uppercase |
| Body | 15–16px | 400 | — |
| Card headword | 17px | 600 | — |
| Subtitle in frame | 27px | 600 | — |

Letter-spacing floor -0.04em. `text-wrap: balance` on headings.

## Components

- **Film frame** (`.screen`) — 18px radius, near-black, built entirely in CSS:
  two blurred radial lamps, a rim-lit shoulder-and-head silhouette, venetian
  blinds as a repeating gradient behind a radial mask, 3px dot grain, and a
  vignette. Never a stock still from a real film.
- **Subtitle** (`.caption`) — centred, `rgba(0,0,0,.62)`, 8px radius. The
  highlighted run gets the bright accent plus a 3px glow ring.
- **Answer card** (`.card`) — `rgba(16,22,20,.95)`, hairline white border,
  deep shadow. Headword, then `term — meaning` in accent, then a quiet status
  line. This is the product's single most recognisable object.
- **Key cap** (`.key`) — warm paper, 3px bottom border, pressed state removes it.
- **Struck-through row** (`.row.lose`) — the dictionary's wrong answer, greyed
  and ruled through; the right answer sits under it in accent.
- **Language chips** (`.langs span`) — pill, hairline; the active one takes
  `--wash` and accent text.

## Layout

Store shot canvas is exactly **1280×800**, full bleed, 50px/64px padding.
Video canvas is **1920×1080**. Both are fixed-size stages, not responsive
pages — but every string comes from a dictionary so the same stage renders in
any locale.

## Motion

- Ease-out only, exponential curves. **No bounce, no elastic, no spring.**
- The vocabulary is: a cursor that travels, a key that depresses, a highlight
  that fills left-to-right, a card that rises 8px into place, a signal that
  leaves the frame and returns as an answer.
- Deterministic rendering: animations are declared `paused` and seeked with a
  negative `animation-delay`, so frame *n* is a pure function of *t*. Never
  rely on wall-clock timing in anything that gets captured.
- `prefers-reduced-motion` renders the **finished** state: line marked, card up,
  key held. A reduced-motion viewer sees the conclusion, not an empty stage.

## Bans specific to this brand

No gradient text. No glass cards. No 3D-tilted device mockups. No numbered
`01 / 02 / 03` eyebrows — the only numbers on any surface are the three real
steps of the gesture, which are a genuine sequence.
