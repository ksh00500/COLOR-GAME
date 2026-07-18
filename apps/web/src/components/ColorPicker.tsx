import type { TileColorId } from "@color-game/shared-types";
import { useI18n } from "../i18n";

interface ColorPickerProps {
  selected: TileColorId;
  disabled: boolean;
  showShapes?: boolean;
  onSelect: (color: TileColorId) => void;
}

const colorOptions: Array<{ id: TileColorId; name: string; shortcut: string; shape: string }> = [
  { id: "colorA", name: "버건디", shortcut: "1/Q", shape: "●" },
  { id: "colorB", name: "네이비", shortcut: "2/W", shape: "▲" },
  { id: "colorC", name: "딥그린", shortcut: "3/E", shape: "■" },
];

export function ColorPicker({ selected, disabled, showShapes = false, onSelect }: ColorPickerProps) {
  const { t } = useI18n();
  return (
    <section className="color-picker" aria-label={t("타일 색상 선택")}>
      <div className="picker-label">
        <span>SELECT COLOR</span>
        <small>{t("숫자키 1 · 2 · 3 또는 Q · W · E")}</small>
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
            <span className="color-name">{t(option.name)}</span>
            <kbd>{option.shortcut}</kbd>
          </button>
        ))}
      </div>
    </section>
  );
}
