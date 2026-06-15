import { useEffect, useId } from "react";
import { useSettings, type AnimationLevel, type ThemePreference } from "../settings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

const motionOptions: Array<{ value: AnimationLevel; label: string }> = [
  { value: "full", label: "전체" },
  { value: "reduced", label: "감소" },
  { value: "off", label: "끄기" },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const titleId = useId();
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PREFERENCES</p>
            <h2 id={titleId}>게임 설정</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="설정 닫기">
            ×
          </button>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>화면 테마</strong>
            <span>선택한 값은 이 기기에 저장됩니다.</span>
          </div>
          <div className="segmented-control">
            {themeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.theme === option.value ? "active" : ""}
                onClick={() => updateSettings({ theme: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group setting-stack">
          <label className="switch-row">
            <span>
              <strong>색약 대응 팔레트</strong>
              <small>색상 간 명도와 대비를 넓힙니다.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.colorBlindPalette}
              onChange={(event) => updateSettings({ colorBlindPalette: event.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>타일 도형 표시</strong>
              <small>원, 삼각형, 사각형으로 색상을 구분합니다.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.showShapes}
              onChange={(event) => updateSettings({ showShapes: event.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>효과음</strong>
              <small>현재 시제품은 설정 상태만 보존합니다.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => updateSettings({ soundEnabled: event.target.checked })}
            />
          </label>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>애니메이션</strong>
            <span>움직임과 전환 효과의 강도를 조절합니다.</span>
          </div>
          <div className="segmented-control">
            {motionOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.animationLevel === option.value ? "active" : ""}
                onClick={() => updateSettings({ animationLevel: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>게임 연출 속도</strong>
            <span>빠름은 효과를 없애지 않고 시간을 줄입니다.</span>
          </div>
          <div className="segmented-control two-up">
            <button
              type="button"
              className={settings.presentationSpeed === "standard" ? "active" : ""}
              onClick={() => updateSettings({ presentationSpeed: "standard" })}
            >
              기본
            </button>
            <button
              type="button"
              className={settings.presentationSpeed === "fast" ? "active" : ""}
              onClick={() => updateSettings({ presentationSpeed: "fast" })}
            >
              빠름
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
