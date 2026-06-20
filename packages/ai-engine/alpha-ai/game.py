from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
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
    opponent = State(state.board, state.scores, 1 - state.current, state.winner)
    threatened_cells = set()
    for opponent_action in opponent.legal_actions():
        reply = opponent.play(int(opponent_action))
        if reply.scores[opponent.current] > opponent.scores[opponent.current]:
            threatened_cells.add(int(opponent_action) // COLOR_COUNT)
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
        block = 1 if cell in threatened_cells else 0
        score = earned * 1000 + block * 120 + adjacent * 18 - center_distance
        if score > best_score:
            best_score, best = score, [int(action)]
        elif score == best_score:
            best.append(int(action))
    return int(rng.choice(best))


def easy_model_action(state: State, model_path: Path, rng: np.random.Generator) -> int:
    model = json.loads(model_path.read_text(encoding="utf-8"))
    opponent = State(state.board, state.scores, 1 - state.current, state.winner)
    threatened_cells = set()
    for opponent_action in opponent.legal_actions():
        reply = opponent.play(int(opponent_action))
        if reply.scores[opponent.current] > opponent.scores[opponent.current]:
            threatened_cells.add(int(opponent_action) // COLOR_COUNT)
    candidates = []
    for action in state.legal_actions():
        action = int(action)
        next_state = state.play(action)
        earned = next_state.scores[state.current] - state.scores[state.current]
        cell, color_index = divmod(action, COLOR_COUNT)
        row, col = divmod(cell, BOARD_SIZE)
        color = color_index + 1
        adjacent = 0
        for dr, dc in DIRECTIONS:
            for sign in (-1, 1):
                rr, cc = row + dr * sign, col + dc * sign
                if 0 <= rr < BOARD_SIZE and 0 <= cc < BOARD_SIZE and state.board[rr, cc] == color:
                    adjacent += 1
        features = [earned, 1 if cell in threatened_cells else 0, adjacent,
                    BOARD_SIZE - (abs(row - 2) + abs(col - 2)), int(np.sum(state.board == color))]
        score = model["bias"] + sum(
            model["weights"][i] * ((features[i] - model["means"][i]) / model["scales"][i])
            for i in range(len(features))
        )
        candidates.append((action, features, score))
    best_immediate = max(item[1][0] for item in candidates)
    if best_immediate > 0:
        candidates = [item for item in candidates if item[1][0] == best_immediate]
    elif any(item[1][1] == 1 for item in candidates):
        candidates = [item for item in candidates if item[1][1] == 1]
    best_score = max(item[2] for item in candidates)
    return int(rng.choice([item[0] for item in candidates if abs(item[2] - best_score) < 1e-9]))


def tactical_actions(state: State) -> list[int]:
    opponent = State(state.board, state.scores, 1 - state.current, state.winner)
    threatened_cells = set()
    for opponent_action in opponent.legal_actions():
        reply = opponent.play(int(opponent_action))
        if reply.scores[opponent.current] > opponent.scores[opponent.current]:
            threatened_cells.add(int(opponent_action) // COLOR_COUNT)
    candidates = []
    for action in state.legal_actions():
        action = int(action)
        next_state = state.play(action)
        earned = next_state.scores[state.current] - state.scores[state.current]
        candidates.append((action, earned, action // COLOR_COUNT in threatened_cells))
    best_earned = max(item[1] for item in candidates)
    if best_earned > 0:
        return [item[0] for item in candidates if item[1] == best_earned]
    blocks = [item[0] for item in candidates if item[2]]
    return blocks or [item[0] for item in candidates]


def safe_lookahead_actions(state: State, candidates: list[int]) -> list[int]:
    risks = []
    for action in candidates:
        next_state = state.play(action)
        if next_state.terminal:
            risks.append((action, -1))
            continue
        opponent = next_state.current
        best_reply = 0
        for reply_action in next_state.legal_actions():
            reply = next_state.play(int(reply_action))
            best_reply = max(best_reply, reply.scores[opponent] - next_state.scores[opponent])
        risks.append((action, best_reply))
    minimum = min(item[1] for item in risks)
    return [item[0] for item in risks if item[1] == minimum]
