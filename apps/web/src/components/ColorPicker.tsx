import type { TileColorId } from "@color-game/shared-types";
import { useI18n } from "../i18n";
import { formatShortcutCode, useSettings } from "../settings";

interface ColorPickerProps {
  selected: TileColorId;
  disabled: boolean;
  showShapes?: boolean;
  onSelect: (color: TileColorId) => void;
}

const colorOptions: Array<{ id: TileColorId; name: string; shape: string }> = [
  { id: "colorA", name: "버건디", shape: "●" },
  { id: "colorB", name: "네이비", shape: "▲" },
  { id: "colorC", name: "딥그린", shape: "■" },
];

export function ColorPicker({ selected, disabled, showShapes = false, onSelect }: ColorPickerProps) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const shortcutLabels = settings.colorShortcuts.map(formatShortcutCode);
  return (
    <section className="color-picker" aria-label={t("타일 색상 선택")}>
      <div className="picker-label">
        <span>SELECT COLOR</span>
        <small>{t("현재 단축키: {keys}", { keys: shortcutLabels.join(" · ") })}</small>
      </div>
      <div className="color-options">
        {colorOptions.map((option, index) => (
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
            <kbd>{shortcutLabels[index]}</kbd>
          </button>
        ))}
      </div>
    </section>
  );
}
