import unittest

from sync_server.learning import _focus


class FocusSelectionTest(unittest.TestCase):
    def test_keeps_the_main_verb_when_a_later_clause_has_have(self) -> None:
        self.assertEqual(_focus("We brag about things that we have done."), ("brag", "brag about"))

    def test_selects_verb_after_leading_auxiliary(self) -> None:
        self.assertEqual(_focus("They will arrive soon."), ("arrive", "arrive"))

    def test_selects_passive_action(self) -> None:
        self.assertEqual(_focus("The car was impounded."), ("impounded", "impounded"))


if __name__ == "__main__":
    unittest.main()
