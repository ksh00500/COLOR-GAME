import unittest
from pathlib import Path
import tempfile
from game import State
from model import PolicyValueNet
from train import export_model, greedy_rejection_repeats


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

    def test_exported_hard_model_contains_policy_and_value_heads(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate-model.json"
            export_model(PolicyValueNet(), output, {"preset": "test"})
            document = __import__("json").loads(output.read_text(encoding="utf-8"))

        self.assertEqual(document["version"], 2)
        self.assertIn("policy.weight", document["state"])
        self.assertIn("value.0.weight", document["state"])
        self.assertIn("value.2.weight", document["state"])

    def test_trap_curriculum_oversamples_policy_that_rejects_immediate_score(self):
        board = __import__("numpy").zeros((5, 5), dtype=__import__("numpy").int8)
        board[0] = [1, 1, 0, 1, 1]
        state = State(board)
        policy = __import__("numpy").zeros(75, dtype=__import__("numpy").float32)
        policy[15] = 1.0

        self.assertEqual(greedy_rejection_repeats(state, policy), 3)


if __name__ == "__main__":
    unittest.main()
