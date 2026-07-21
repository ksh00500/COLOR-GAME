import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Board, MatchCosmetics, Position, TileColorId } from "@color-game/shared-types";
import { useI18n } from "../i18n";

interface GameBoardProps {
  board: Board;
  selectedColor: TileColorId;
  canPlay: boolean;
  isClearing?: boolean;
  showShapes: boolean;
  focusedIndex: number;
  scoringCells: Set<string>;
  lastPlaced: Position | null;
  opponentLastPlaced?: Position | null;
  invalidCell: Position | null;
  activeCosmetics?: MatchCosmetics | null | undefined;
  onFocusedIndexChange: (index: number) => void;
  onPlace: (position: Position) => void;
}

const shapeForColor: Record<TileColorId, string> = {
  colorA: "●",
  colorB: "▲",
  colorC: "■",
};

const colorName: Record<TileColorId, string> = {
  colorA: "버건디",
  colorB: "네이비",
  colorC: "딥그린",
};

export function GameBoard({
  board,
  selectedColor,
  canPlay,
  isClearing = false,
  showShapes,
  focusedIndex,
  scoringCells,
  lastPlaced,
  opponentLastPlaced = null,
  invalidCell,
  activeCosmetics,
  onFocusedIndexChange,
  onPlace,
}: GameBoardProps) {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [inputMode, setInputMode] = useState<"keyboard" | "pointer">("keyboard");
  const size = board.length;
  const placementPreset = activeCosmetics === undefined
    ? undefined
    : activeCosmetics?.placementEffect?.preset ?? "default";
  const scorePreset = activeCosmetics === undefined
    ? undefined
    : activeCosmetics?.scoreEffect?.preset ?? "default";
  const scoreAnchor = scoringCells.values().next().value as string | undefined;

  useEffect(() => {
    const focusedButton = boardRef.current?.querySelector<HTMLButtonElement>(
      `[data-cell-index="${focusedIndex}"]`,
    );
    focusedButton?.focus({ preventScroll: true });
  }, [focusedIndex]);

  const moveFocus = (key: string) => {
    const row = Math.floor(focusedIndex / size);
    const col = focusedIndex % size;
    const next = ({
      ArrowUp: [Math.max(0, row - 1), col],
      ArrowDown: [Math.min(size - 1, row + 1), col],
      ArrowLeft: [row, Math.max(0, col - 1)],
      ArrowRight: [row, Math.min(size - 1, col + 1)],
    } as Record<string, [number, number]>)[key];

    if (next !== undefined) {
      const [nextRow, nextCol] = next;
      setInputMode("keyboard");
      onFocusedIndexChange(nextRow * size + nextCol);
    }
  };

  return (
    <div
      className={`game-board-frame ${canPlay ? "interactive" : "locked"} ${isClearing ? "clearing" : ""} ${inputMode}-active`}
      data-placement-preset={placementPreset}
      data-score-preset={scorePreset}
      style={{
        "--active-placement-a": activeCosmetics?.placementEffect?.colors[0],
        "--active-placement-b": activeCosmetics?.placementEffect?.colors[1] ?? activeCosmetics?.placementEffect?.colors[0],
        "--active-placement-duration": `${activeCosmetics?.placementEffect?.durationMs ?? 240}ms`,
        "--active-score-a": activeCosmetics?.scoreEffect?.colors[0],
        "--active-score-b": activeCosmetics?.scoreEffect?.colors[1] ?? activeCosmetics?.scoreEffect?.colors[0],
        "--active-score-duration": `${activeCosmetics?.scoreEffect?.durationMs ?? 450}ms`,
      } as CSSProperties}
    >
      <span className="board-surface-art" aria-hidden="true">
        <i className="board-surface-inlay" />
        <i className="board-surface-emblem" />
        <i className="board-surface-light" />
        <i className="board-surface-pattern" />
      </span>
      <div
        className="game-board"
        ref={boardRef}
        role="grid"
        aria-label={t("5×5 게임 보드")}
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {board.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const index = rowIndex * size + colIndex;
            const key = `${rowIndex}:${colIndex}`;
            const scoring = scoringCells.has(key);
            const placed = lastPlaced?.row === rowIndex && lastPlaced.col === colIndex;
            const opponentLast = opponentLastPlaced?.row === rowIndex && opponentLastPlaced.col === colIndex;
            const invalid = invalidCell?.row === rowIndex && invalidCell.col === colIndex;
            const cellLabel = cell === null
              ? t("{row}행 {col}열 빈칸, {color} 배치", { row: rowIndex + 1, col: colIndex + 1, color: t(colorName[selectedColor]) })
              : t("{row}행 {col}열 {color} 타일", { row: rowIndex + 1, col: colIndex + 1, color: t(colorName[cell]) });
            const label = opponentLast ? `${cellLabel}, ${t("상대가 마지막으로 둔 칸")}` : cellLabel;

            return (
              <button
                type="button"
                role="gridcell"
                key={key}
                data-cell-index={index}
                data-cell-row={rowIndex}
                data-cell-col={colIndex}
                tabIndex={index === focusedIndex ? 0 : -1}
                className={`board-cell ${cell ?? "empty"} ${scoring ? "scoring" : ""} ${placed ? "placed" : ""} ${opponentLast ? "opponent-last" : ""} ${invalid ? "invalid" : ""}`}
                aria-label={label}
                aria-disabled={!canPlay || cell !== null}
                onFocus={() => onFocusedIndexChange(index)}
                onMouseEnter={() => {
                  setInputMode("pointer");
                  onFocusedIndexChange(index);
                }}
                onClick={() => onPlace({ row: rowIndex, col: colIndex })}
                onKeyDown={(event) => {
                  if (event.key.startsWith("Arrow")) {
                    event.preventDefault();
                    moveFocus(event.key);
                  }
                }}
              >
                <span className="board-cell-material" aria-hidden="true" />
                {cell !== null && (
                  <span className="tile-face">
                    {showShapes ? shapeForColor[cell] : ""}
                    {placed && (
                      <span className="placement-effect-layer" aria-hidden="true">
                        <i /><i /><i /><i /><i /><i /><i /><i />
                      </span>
                    )}
                    {scoring && (
                      <span className="score-effect-layer" aria-hidden="true">
                        <i /><i /><i /><i /><i /><i />
                      </span>
                    )}
                  </span>
                )}
                {scoring && key === scoreAnchor && (
                  <strong className="score-effect-callout" aria-hidden="true">+{scoringCells.size}</strong>
                )}
                {cell === null && canPlay && <span className={`tile-preview ${selectedColor}`}>{showShapes ? shapeForColor[selectedColor] : ""}</span>}
              </button>
            );
          }),
        )}
      </div>
      <span className="board-corner corner-a" aria-hidden="true" />
      <span className="board-corner corner-b" aria-hidden="true" />
      <span className="board-corner corner-c" aria-hidden="true" />
      <span className="board-corner corner-d" aria-hidden="true" />
    </div>
  );
}
