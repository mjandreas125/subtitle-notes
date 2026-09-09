# Subtitle Notes

A browser extension, a phone app and a Windows program that translate the word
you highlighted **the way it was meant in the line you found it in**, and keep
it in one library across all three.

## Register

**brand** — the surfaces this file governs are the landing page, the Chrome Web
Store listing, the promo video and the first-run tour. Design *is* the product
there. The in-app surfaces (library, review, settings) are product register and
are governed by their own conventions in the app code.

## Users & purpose

Somebody watching a film or reading in a language they are still learning. They
are mid-scene, they hit a word, and the cost of looking it up is the reason they
don't. Two constraints follow from that and shape everything:

- **They are not in a study session.** Any interaction longer than a gesture
  loses. The product's whole claim is one drag with a key held down.
- **A dictionary is the competitor, and it is free.** So the pitch is never
  "translation" — it is that a dictionary answers about the word while the
  product answers about the line. `No one wants a record` is the canonical
  proof: the dictionary says *рекорд*, the scene means *судимость*.

## Brand personality

**Precise. Unhurried. Literary.** The product description is written in full
sentences with real examples and no adjectives of self-praise; the visual work
has to match that voice or it reads as a different product.

Calm colour, high effort in motion. The user's words, verbatim: *«цвета
спокойные, но остальное с большим количеством эффектов»* — the palette stays
quiet so that the one thing moving on screen is the mechanism.

## Anti-references

Reject on sight:

- Gradient-text SaaS promo pages and their bouncing feature cards.
- Bright primary-colour language-app marketing (the Duolingo band): cartoon
  mascots, confetti, streak counters as hero material.
- App-store montage videos: quick cuts on a beat, phone mockups tilting in 3D,
  a voice-over saying "effortlessly".
- Stock photography of anybody smiling at a laptop.
- The word "AI" as the pitch. The model is a means; the answer is the product.

## Strategic design principles

1. **Show the mechanism, not the benefit.** The gesture, the line, the wrong
   answer struck through, the right one arriving. A claim the viewer watches
   happen needs no adjective.
2. **One reading per frame.** Store thumbnails are shown at roughly a third of
   their size. If a caption is not legible at 33%, it is decoration.
3. **The dark film frame is the brand's one image.** Everything else — cards,
   pages, library — is the light paper surface. That contrast is the identity;
   don't add a third world.
4. **Every string is localisable.** The listing exists in 15 locales. No text
   is baked into an image that a language switch cannot reach.
5. **Motion is the argument.** Latency, the round trip, the moment the answer
   lands: those are what make the product feel fast. They are the reason the
   promo is a film and not five more screenshots.

## Accessibility

- Body text ≥ 4.5:1, large text ≥ 3:1, verified rather than assumed.
- Every animated surface ships a `prefers-reduced-motion` state that is the
  *finished* frame, not a blank one.
- The promo video carries its meaning in on-screen text; sound is atmosphere
  and never the only channel.
