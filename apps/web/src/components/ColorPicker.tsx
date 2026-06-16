import type { TileColorId } from "@color-game/shared-types";

interface ColorPickerProps {
  selected: TileColorId;
  disabled: boolean;
  showShapes?: boolean;
  onSelect: (color: TileColorId) => void;
}

const colorOptions: Array<{ id: TileColorId; name: string; shortcut: string; shape: string }> = [
  { id: "colorA", name: "버건디", shortcut: "1", shape: "●" },
  { id: "colorB", name: "네이비", shortcut: "2", shape: "▲" },
  { id: "colorC", name: "딥그린", shortcut: "3", shape: "■" },
];

export function ColorPicker({ selected, disabled, showShapes = false, onSelect }: ColorPickerProps) {
  return (
    <section className="color-picker" aria-label="타일 색상 선택">
      <div className="picker-label">
        <span>SELECT COLOR</span>
        <small>숫자키 1 · 2 · 3</small>
      </div>
      <div className="color-options">
        {colorOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            className={`color-option ${option.id} ${selected === option.id ? "active" : ""}`}
            onClick={() => onSelect(option.id)}
            aria-pressed={selected === option.id}
          >
            <span className="color-swatch" aria-hidden="true">{showShapes ? option.shape : ""}</span>
            <span className="color-name">{option.name}</span>
            <kbd>{option.shortcut}</kbd>
          </button>
        ))}
      </div>
    </section>
  );
}
