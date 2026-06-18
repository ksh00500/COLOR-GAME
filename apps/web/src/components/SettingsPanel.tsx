import { useEffect, useId } from "react";
import { useI18n } from "../i18n";
import { useSettings, type AnimationLevel, type AppLanguage, type ThemePreference } from "../settings";

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

const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "auto", label: "자동" },
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const titleId = useId();
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

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
            <h2 id={titleId}>{t("게임 설정")}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("설정 닫기")}>
            ×
          </button>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>{t("언어")}</strong>
            <span>{t("브라우저 언어를 자동으로 사용합니다.")}</span>
          </div>
          <div className="language-grid">
            {languageOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.language === option.value ? "active" : ""}
                onClick={() => updateSettings({ language: option.value })}
              >
                {option.value === "auto" ? t(option.label) : option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>{t("화면 테마")}</strong>
            <span>{t("선택한 값은 이 기기에 저장됩니다.")}</span>
          </div>
          <div className="segmented-control">
            {themeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.theme === option.value ? "active" : ""}
                onClick={() => updateSettings({ theme: option.value })}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group setting-stack">
          <label className="switch-row">
            <span>
              <strong>{t("색약 대응 팔레트")}</strong>
              <small>{t("색상 간 명도와 대비를 넓힙니다.")}</small>
            </span>
            <input
              type="checkbox"
              checked={settings.colorBlindPalette}
              onChange={(event) => updateSettings({
                colorBlindPalette: event.target.checked,
                showShapes: event.target.checked ? settings.showShapes : false,
              })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>{t("타일 도형 표시")}</strong>
              <small>{t("색약 대응 팔레트를 켰을 때만 원, 삼각형, 사각형을 표시합니다.")}</small>
            </span>
            <input
              type="checkbox"
              checked={settings.showShapes}
              disabled={!settings.colorBlindPalette}
              onChange={(event) => updateSettings({ showShapes: event.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>{t("효과음")}</strong>
              <small>{t("상대 턴 알림과 게임 효과음을 켜거나 끕니다.")}</small>
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
            <strong>{t("애니메이션")}</strong>
            <span>{t("움직임과 전환 효과의 강도를 조절합니다.")}</span>
          </div>
          <div className="segmented-control">
            {motionOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.animationLevel === option.value ? "active" : ""}
                onClick={() => updateSettings({ animationLevel: option.value })}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <strong>{t("게임 연출 속도")}</strong>
            <span>{t("빠름은 효과를 없애지 않고 시간을 줄입니다.")}</span>
          </div>
          <div className="segmented-control two-up">
            <button
              type="button"
              className={settings.presentationSpeed === "standard" ? "active" : ""}
              onClick={() => updateSettings({ presentationSpeed: "standard" })}
            >
              {t("기본")}
            </button>
            <button
              type="button"
              className={settings.presentationSpeed === "fast" ? "active" : ""}
              onClick={() => updateSettings({ presentationSpeed: "fast" })}
            >
              {t("빠름")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
