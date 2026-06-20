from __future__ import annotations

from dataclasses import dataclass, field
import math
import numpy as np
import torch
from game import ACTION_SIZE, State


@dataclass
class Node:
    prior: float = 0.0
    visits: int = 0
    value_sum: float = 0.0
    children: dict[int, "Node"] = field(default_factory=dict)

    @property
    def value(self) -> float:
        return self.value_sum / self.visits if self.visits else 0.0


def policy_value(model, state: State, device: torch.device):
    tensor = torch.from_numpy(state.encoded()).unsqueeze(0).to(device)
    with torch.no_grad():
        logits, value = model(tensor)
    legal = state.legal_actions()
    masked = torch.full((ACTION_SIZE,), -1e9, device=device)
    masked[torch.as_tensor(legal, device=device)] = logits[0, torch.as_tensor(legal, device=device)]
    probabilities = torch.softmax(masked, dim=0).cpu().numpy()
    return legal, probabilities, float(value.item())


def search(model, root_state: State, simulations: int, device: torch.device, rng: np.random.Generator,
           add_noise: bool = False, c_puct: float = 1.5) -> np.ndarray:
    root = Node()
    legal, priors, _ = policy_value(model, root_state, device)
    if add_noise and len(legal):
        noise = rng.dirichlet(np.full(len(legal), 0.3))
        for i, action in enumerate(legal):
            priors[action] = 0.75 * priors[action] + 0.25 * noise[i]
    root.children = {int(action): Node(float(priors[action])) for action in legal}

    for _ in range(simulations):
        state, node = root_state, root
        path: list[Node] = [node]
        while node.children:
            parent_visits = max(1, node.visits)
            action, child = max(node.children.items(), key=lambda item:
                -item[1].value + c_puct * item[1].prior * math.sqrt(parent_visits) / (1 + item[1].visits))
            state = state.play(action)
            node = child
            path.append(node)
            if state.terminal:
                break
        if state.terminal:
            value = 1.0 if state.winner == state.current else -1.0
        else:
            legal, priors, value = policy_value(model, state, device)
            node.children = {int(action): Node(float(priors[action])) for action in legal}
        for visited in reversed(path):
            visited.visits += 1
            visited.value_sum += value
            value = -value

    visits = np.zeros(ACTION_SIZE, dtype=np.float32)
    for action, child in root.children.items():
        visits[action] = child.visits
    return visits / max(1.0, visits.sum())
