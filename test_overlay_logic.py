"""Tests for the parts of the overlay that decide what gets learned and when a
subtitle is on screen.

    python -m unittest test_overlay_logic -v
"""

from __future__ import annotations

import unittest

import vlc_subtitle_overlay as ov


class PhraseSelection(unittest.TestCase):
    """A highlighted expression must survive as the thing being learned."""

    def phrase(self, text: str) -> str:
        return ov.choose_focus_phrase(text)[1]

    def test_keeps_a_noun_compound_whole(self):
        # "employment record" is a work history, not employment.
        self.assertEqual(self.phrase("employment record"), "employment record")

    def test_keeps_an_idiom_whole(self):
        self.assertEqual(self.phrase("seize the day"), "seize the day")
        self.assertEqual(self.phrase("a piece of cake"), "a piece of cake")

    def test_keeps_an_idiom_containing_it(self):
        # The "it" here is an object, not a subject.
        self.assertEqual(self.phrase("take it for granted"), "take it for granted")

    def test_keeps_a_phrasal_verb_whole(self):
        self.assertEqual(self.phrase("brag about"), "brag about")

    def test_single_word_stays_single(self):
        self.assertEqual(self.phrase("bias"), "bias")

    def test_a_question_yields_its_key_word(self):
        self.assertEqual(self.phrase("Are you high?"), "high")

    def test_a_contraction_marks_a_clause(self):
        # "She's a trifle" is a line, and "trifle" is the word worth keeping.
        self.assertEqual(self.phrase("She's a trifle"), "trifle")
        self.assertEqual(self.phrase("I'm running late"), "running")

    def test_a_clause_yields_its_key_word(self):
        self.assertEqual(self.phrase("It works every time"), "works")

    def test_a_sentence_yields_the_useful_expression(self):
        # Not "keeps": light verbs are never the lesson.
        self.assertEqual(
            self.phrase("He keeps bragging about his new car"), "bragging about"
        )

    def test_long_selection_is_reduced(self):
        self.assertEqual(
            self.phrase("I am chanting the right words"), "chanting"
        )


class SingleInstance(unittest.TestCase):
    """Only one overlay may run: two of them draw two subtitle layers over the
    same video, which looks like the previous line hanging over the next."""

    def test_second_claim_is_refused(self):
        first = ov.claim_single_instance()
        if first is None:
            # A real overlay is open and holds the guard, which is the very
            # thing this test checks for. Nothing to prove against itself.
            self.skipTest("an overlay is already running")
        self.assertIsNotNone(first, "the first overlay must be allowed to run")
        second = ov.claim_single_instance()
        self.assertIsNone(second, "a second overlay was allowed to start")


class CueSelection(unittest.TestCase):
    """Which lines belong on screen at a given moment."""

    def setUp(self):
        self.overlay = object.__new__(ov.VlcSubtitleOverlay)
        self.overlay.cues = sorted(
            [
                ov.Cue(1000, 5000, "A long line"),
                ov.Cue(2000, 3000, "An interjection"),
                ov.Cue(5100, 6000, "The next line"),
            ],
            key=lambda cue: (cue.start_ms, cue.end_ms),
        )
        self.overlay.cue_starts = [cue.start_ms for cue in self.overlay.cues]

    def texts(self, at_ms: int) -> list[str]:
        return [
            self.overlay.cues[index].text
            for index in ov.VlcSubtitleOverlay._cues_for_time(self.overlay, at_ms)
        ]

    def test_two_speakers_are_both_shown(self):
        self.assertEqual(self.texts(2500), ["A long line", "An interjection"])

    def test_a_covering_line_survives_the_shorter_one_ending(self):
        # This used to blank out: the search only looked at the last cue to
        # have started.
        self.assertEqual(self.texts(4000), ["A long line"])

    def test_nothing_shows_in_a_real_gap(self):
        self.assertEqual(self.texts(5050), [])


class PlaybackClock(unittest.TestCase):
    """The clock must never step backwards, which is what made the previous
    subtitle flash up when playback resumed."""

    def setUp(self):
        self.overlay = object.__new__(ov.VlcSubtitleOverlay)
        self.overlay.clock_ms = None
        self.overlay.clock_at = 0.0
        self.overlay.clock_running = False
        self.overlay.seek_pending = False
        self.overlay.status_lock = __import__("threading").Lock()
        self.overlay.status_sample = (None, 0.0)

    def tick(self, time_ms: float, state: str, sample_age: float = 0.0) -> int:
        """Feeds one status reading and returns the clock the UI would use."""
        now = __import__("time").monotonic()
        self.overlay.status_sample = (
            {"time": time_ms / 1000, "position": 0, "length": 0, "state": state},
            now - sample_age,
        )
        return ov.VlcSubtitleOverlay._playback_ms(self.overlay)

    def test_a_stale_reading_after_resume_does_not_rewind(self):
        self.tick(10_000, "playing")
        # Playback has moved on locally...
        self.overlay.clock_ms = 10_900
        # ...while the last reading from VLC still says 10.0 s.
        after = self.tick(10_000, "playing")
        self.assertGreaterEqual(
            after, 10_800, "the clock jumped back into the previous cue"
        )

    def test_pausing_holds_the_position(self):
        self.tick(20_000, "playing")
        paused = self.tick(20_000, "paused")
        self.assertAlmostEqual(paused, 20_000, delta=200)

    def test_a_real_seek_resyncs_and_flags_it(self):
        self.tick(30_000, "playing")
        self.overlay.seek_pending = False
        jumped = self.tick(90_000, "playing")
        self.assertAlmostEqual(jumped, 90_000, delta=200)
        self.assertTrue(self.overlay.seek_pending)

    def test_falling_behind_is_caught_up(self):
        self.tick(40_000, "playing")
        self.overlay.clock_ms = 40_000
        ahead = self.tick(40_800, "playing")
        self.assertGreater(ahead, 40_000)


if __name__ == "__main__":
    unittest.main()
