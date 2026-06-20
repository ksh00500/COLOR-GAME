from __future__ import annotations

from dataclasses import dataclass
import numpy as np

BOARD_SIZE = 5
COLOR_COUNT = 3
ACTION_SIZE = BOARD_SIZE * BOARD_SIZE * COLOR_COUNT
TARGET_SCORE = 7
DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))


@dataclass(frozen=True)
class State:
    board: np.ndarray
    scores: tuple[int, int] = (0, 0)
    current: int = 0
    winner: int | None = None

    @staticmethod
    def initial(first: int = 0) -> "State":
        return State(np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8), current=first)

    @property
    def terminal(self) -> bool:
        return self.winner is not None

    def legal_actions(self) -> np.ndarray:
        if self.terminal:
            return np.empty(0, dtype=np.int64)
        cells = np.flatnonzero(self.board.reshape(-1) == 0)
        return np.array([cell * COLOR_COUNT + color for cell in cells for color in range(COLOR_COUNT)], dtype=np.int64)

    def play(self, action: int) -> "State":
        cell, color_index = divmod(int(action), COLOR_COUNT)
        row, col = divmod(cell, BOARD_SIZE)
        if self.terminal or self.board[row, col] != 0:
            raise ValueError(f"Illegal action: {action}")
        color = color_index + 1
        board = self.board.copy()
        board[row, col] = color
        removed: set[tuple[int, int]] = set()
        earned = 0
        for dr, dc in DIRECTIONS:
            line = [(row, col)]
            rr, cc = row - dr, col - dc
            before = []
            while 0 <= rr < BOARD_SIZE and 0 <= cc < BOARD_SIZE and board[rr, cc] == color:
                before.append((rr, cc)); rr -= dr; cc -= dc
            rr, cc = row + dr, col + dc
            after = []
            while 0 <= rr < BOARD_SIZE and 0 <= cc < BOARD_SIZE and board[rr, cc] == color:
                after.append((rr, cc)); rr += dr; cc += dc
            line = list(reversed(before)) + line + after
            if len(line) >= 3:
                earned += {3: 1, 4: 2, 5: 4}.get(len(line), 0)
                removed.update(line)
        if removed:
            for rr, cc in removed:
                board[rr, cc] = 0
        elif np.all(board != 0):
            board[board == color] = 0
        scores = list(self.scores)
        scores[self.current] += earned
        winner = self.current if scores[self.current] >= TARGET_SCORE else None
        return State(board, (scores[0], scores[1]), 1 - self.current, winner)

    def encoded(self) -> np.ndarray:
        planes = [(self.board == color).astype(np.float32) for color in range(1, COLOR_COUNT + 1)]
        planes.append(np.full_like(planes[0], self.current, dtype=np.float32))
        planes.append(np.full_like(planes[0], self.scores[self.current] / TARGET_SCORE, dtype=np.float32))
        planes.append(np.full_like(planes[0], self.scores[1 - self.current] / TARGET_SCORE, dtype=np.float32))
        return np.stack(planes)

    def key(self) -> bytes:
        return self.board.tobytes() + bytes((*self.scores, self.current, 255 if self.winner is None else self.winner))


def heuristic_action(state: State, rng: np.random.Generator) -> int:
    best: list[int] = []
    best_score = -1e9
    for action in state.legal_actions():
        next_state = state.play(int(action))
        earned = next_state.scores[state.current] - state.scores[state.current]
        cell, color_index = divmod(int(action), COLOR_COUNT)
        row, col = divmod(cell, BOARD_SIZE)
        color = color_index + 1
        adjacent = 0
        for dr, dc in DIRECTIONS:
            for sign in (-1, 1):
                rr, cc = row + dr * sign, col + dc * sign
                if 0 <= rr < BOARD_SIZE and 0 <= cc < BOARD_SIZE and state.board[rr, cc] == color:
                    adjacent += 1
        center_distance = abs(row - 2) + abs(col - 2)
        score = earned * 1000 + adjacent * 18 - center_distance
        if score > best_score:
            best_score, best = score, [int(action)]
        elif score == best_score:
            best.append(int(action))
    return int(rng.choice(best))
