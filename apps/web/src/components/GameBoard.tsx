import { useEffect, useRef } from "react";
import type { Board, Position, TileColorId } from "@color-game/shared-types";

interface GameBoardProps {
  board: Board;
  selectedColor: TileColorId;
  canPlay: boolean;
  isClearing?: boolean;
  showShapes: boolean;
  focusedIndex: number;
  scoringCells: Set<string>;
  lastPlaced: Position | null;
  invalidCell: Position | null;
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
  invalidCell,
  onFocusedIndexChange,
  onPlace,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const size = board.length;

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
      onFocusedIndexChange(nextRow * size + nextCol);
    }
  };

  return (
    <div className={`game-board-frame ${canPlay ? "interactive" : "locked"} ${isClearing ? "clearing" : ""}`}>
      <div
        className="game-board"
        ref={boardRef}
        role="grid"
        aria-label="5×5 게임 보드"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {board.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const index = rowIndex * size + colIndex;
            const key = `${rowIndex}:${colIndex}`;
            const scoring = scoringCells.has(key);
            const placed = lastPlaced?.row === rowIndex && lastPlaced.col === colIndex;
            const invalid = invalidCell?.row === rowIndex && invalidCell.col === colIndex;
            const label = cell === null
              ? `${rowIndex + 1}행 ${colIndex + 1}열 빈칸, ${colorName[selectedColor]} 배치`
              : `${rowIndex + 1}행 ${colIndex + 1}열 ${colorName[cell]} 타일`;

            return (
              <button
                type="button"
                role="gridcell"
                key={key}
                data-cell-index={index}
                tabIndex={index === focusedIndex ? 0 : -1}
                className={`board-cell ${cell ?? "empty"} ${scoring ? "scoring" : ""} ${placed ? "placed" : ""} ${invalid ? "invalid" : ""}`}
                aria-label={label}
                aria-disabled={!canPlay || cell !== null}
                onFocus={() => onFocusedIndexChange(index)}
                onClick={() => onPlace({ row: rowIndex, col: colIndex })}
                onKeyDown={(event) => {
                  if (event.key.startsWith("Arrow")) {
                    event.preventDefault();
                    moveFocus(event.key);
                  }
                }}
              >
                {cell !== null && <span className="tile-face">{showShapes ? shapeForColor[cell] : ""}</span>}
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
