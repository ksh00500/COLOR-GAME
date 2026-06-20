import unittest
from game import State


class GameRulesTest(unittest.TestCase):
    def test_initial_action_count_and_occupied_cells(self):
        state = State.initial().play(0)
        self.assertEqual(len(state.legal_actions()), 72)

    def test_three_tiles_score_and_clear(self):
        state = State.initial()
        for action in (0, 12, 3, 15, 6):
            state = state.play(action)
        self.assertEqual(state.scores, (1, 0))
        self.assertEqual(int(state.board[0, 0]), 0)
        self.assertEqual(int(state.board[0, 1]), 0)
        self.assertEqual(int(state.board[0, 2]), 0)

    def test_target_score_finishes_game(self):
        state = State.initial()
        object.__setattr__(state, "scores", (6, 0))
        for action in (0, 12, 3, 15, 6):
            state = state.play(action)
        self.assertTrue(state.terminal)
        self.assertEqual(state.winner, 0)


if __name__ == "__main__":
    unittest.main()
