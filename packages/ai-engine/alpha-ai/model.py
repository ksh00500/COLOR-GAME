from __future__ import annotations

import torch
from torch import nn
from game import ACTION_SIZE, BOARD_SIZE


class PolicyValueNet(nn.Module):
    def __init__(self, hidden: int = 128):
        super().__init__()
        inputs = 6 * BOARD_SIZE * BOARD_SIZE
        self.hidden = hidden
        self.trunk = nn.Sequential(
            nn.Flatten(), nn.Linear(inputs, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
        )
        self.policy = nn.Linear(hidden, ACTION_SIZE)
        self.value = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1), nn.Tanh())

    def forward(self, x):
        features = self.trunk(x)
        return self.policy(features), self.value(features).squeeze(-1)
