from __future__ import annotations

import argparse
import json
from pathlib import Path
import random
import numpy as np
import torch
import torch.nn.functional as F

from game import State, heuristic_action
from mcts import search
from model import PolicyValueNet

PRESETS = {
    "smoke": dict(games=2, simulations=8, epochs=1, evaluation_games=2, batch=32),
    "quick": dict(games=40, simulations=32, epochs=3, evaluation_games=20, batch=128),
    "standard": dict(games=300, simulations=96, epochs=8, evaluation_games=100, batch=256),
    "deep": dict(games=1000, simulations=192, epochs=12, evaluation_games=200, batch=256),
}


def self_play(model, simulations, device, rng):
    state = State.initial(int(rng.integers(0, 2)))
    history = []
    for turn in range(250):
        if state.terminal:
            break
        policy = search(model, state, simulations, device, rng, add_noise=True)
        temperature = 1.0 if turn < 20 else 0.25
        adjusted = np.power(policy + 1e-10, 1 / temperature)
        adjusted /= adjusted.sum()
        history.append((state.encoded(), policy, state.current))
        state = state.play(int(rng.choice(len(adjusted), p=adjusted)))
    return [(encoded, policy, 0.0 if state.winner is None else (1.0 if state.winner == player else -1.0))
            for encoded, policy, player in history]


def train_epoch(model, optimizer, replay, batch_size, device, rng):
    model.train()
    order = rng.permutation(len(replay))
    losses = []
    for start in range(0, len(order), batch_size):
        indexes = order[start:start + batch_size]
        states = torch.from_numpy(np.stack([replay[i][0] for i in indexes])).to(device)
        policies = torch.from_numpy(np.stack([replay[i][1] for i in indexes])).to(device)
        values = torch.tensor([replay[i][2] for i in indexes], dtype=torch.float32, device=device)
        logits, predicted_values = model(states)
        policy_loss = -(policies * F.log_softmax(logits, dim=1)).sum(dim=1).mean()
        value_loss = F.mse_loss(predicted_values, values)
        loss = policy_loss + value_loss
        optimizer.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0); optimizer.step()
        losses.append(float(loss.item()))
    return sum(losses) / max(1, len(losses))


def evaluate(model, games, simulations, device, rng):
    model.eval(); wins = draws = 0
    for game_index in range(games):
        model_player = game_index % 2
        state = State.initial(game_index % 2)
        for _ in range(250):
            if state.terminal:
                break
            if state.current == model_player:
                policy = search(model, state, simulations, device, rng)
                action = int(np.argmax(policy))
            else:
                action = heuristic_action(state, rng)
            state = state.play(action)
        if state.winner is None: draws += 1
        elif state.winner == model_player: wins += 1
    return wins, draws, games - wins - draws


def export_model(model, path: Path, metadata):
    state = {name: tensor.detach().cpu().tolist() for name, tensor in model.state_dict().items()}
    path.write_text(json.dumps({"version": 1, "available": True, "architecture": "mlp-policy-value-v1",
                                "hidden": model.hidden, "metadata": metadata, "state": state}, separators=(",", ":")), encoding="utf-8")


def human_examples(path: Path, target_count: int, rng):
    document = json.loads(path.read_text(encoding="utf-8"))
    positions = document["positions"]
    if not positions:
        raise RuntimeError("Human training data has no positions")
    examples = []
    for index in rng.integers(0, len(positions), size=target_count):
        position = positions[int(index)]
        policy = np.zeros(75, dtype=np.float32)
        policy[int(position["chosenAction"])] = 1.0
        examples.append((np.asarray(position["encodedState"], dtype=np.float32), policy, float(position["value"])))
    return examples, int(document.get("gameCount", 0)), len(positions)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", choices=PRESETS, default="standard")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--human-data", type=Path, required=True)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--seed", type=int, default=20260620)
    args = parser.parse_args()
    config = PRESETS[args.preset]
    args.output.mkdir(parents=True, exist_ok=True)
    checkpoint_path = args.output / "checkpoint.pt"
    rng = np.random.default_rng(args.seed)
    random.seed(args.seed); torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = PolicyValueNet().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    replay = []
    completed_games = 0
    if args.resume and checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model"]); optimizer.load_state_dict(checkpoint["optimizer"])
        replay = checkpoint["replay"]; completed_games = checkpoint["completed_games"]
    print(json.dumps({"device": str(device), "preset": args.preset, **config, "resumedGames": completed_games}))

    model.eval()
    for game_number in range(completed_games, config["games"]):
        replay.extend(self_play(model, config["simulations"], device, rng))
        replay = replay[-100_000:]
        completed_games = game_number + 1
        if completed_games % 10 == 0 or completed_games == config["games"]:
            torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(),
                        "replay": replay, "completed_games": completed_games}, checkpoint_path)
            print(json.dumps({"selfPlayGames": completed_games, "positions": len(replay)}))

    human_target = max(1, round(len(replay) * 3 / 7))
    humans, human_games, available_human_positions = human_examples(args.human_data, human_target, rng)
    combined = replay + humans
    for epoch in range(config["epochs"]):
        loss = train_epoch(model, optimizer, combined, config["batch"], device, rng)
        print(json.dumps({"epoch": epoch + 1, "loss": round(loss, 5)}))

    wins, draws, losses = evaluate(model, config["evaluation_games"], config["simulations"], device, rng)
    decisive = wins + losses
    win_rate = wins / decisive if decisive else 0.0
    eligible = config["evaluation_games"] >= 20 and win_rate >= 0.55
    report = {"preset": args.preset, "device": str(device), "selfPlayGames": completed_games,
              "humanGames": human_games, "availableHumanPositions": available_human_positions,
              "selfPlayPositions": len(replay), "humanTrainingPositions": len(humans),
              "trainingPositions": len(combined), "humanDataRatio": 0.30, "selfPlayDataRatio": 0.70,
              "evaluationGames": config["evaluation_games"],
              "wins": wins, "draws": draws, "losses": losses, "winRate": win_rate,
              "promotionThreshold": 0.55, "eligibleForPromotion": eligible}
    export_model(model, args.output / "candidate-model.json", report)
    (args.output / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(),
                "replay": replay, "completed_games": completed_games}, checkpoint_path)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
