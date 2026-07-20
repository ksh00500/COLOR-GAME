import { useEffect, useId, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "../i18n";
import {
  defaultColorShortcuts,
  formatShortcutCode,
  isConfigurableShortcutCode,
  useSettings,
  type AppLanguage,
  type ColorShortcuts,
  type ThemePreference,
} from "../settings";
import { openTutorial } from "./TutorialPanel";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
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
  const [recordingShortcut, setRecordingShortcut] = useState<number | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const setColorShortcut = (index: number, event: ReactKeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.code === "Escape") {
      setRecordingShortcut(null);
      setShortcutError(null);
      return;
    }
    if (!isConfigurableShortcutCode(event.code)) {
      setShortcutError("숫자 또는 영문 키만 사용할 수 있습니다.");
      return;
    }
    if (settings.colorShortcuts.some((code, shortcutIndex) => code === event.code && shortcutIndex !== index)) {
      setShortcutError("이미 다른 색에 사용 중인 키입니다.");
      return;
    }
    const colorShortcuts = [...settings.colorShortcuts] as ColorShortcuts;
    colorShortcuts[index] = event.code;
    updateSettings({ colorShortcuts });
    setRecordingShortcut(null);
    setShortcutError(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setRecordingShortcut(null);
      setShortcutError(null);
    }
  }, [open]);

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

        <div className="setting-group shortcut-setting-group">
          <div className="setting-label shortcut-setting-heading">
            <span>
              <strong>{t("색 선택 키")}</strong>
              <small>{t("세 색상에 사용할 단축키를 직접 지정합니다.")}</small>
            </span>
            <button
              type="button"
              className="secondary-action shortcut-reset"
              onClick={() => {
                updateSettings({ colorShortcuts: [...defaultColorShortcuts] });
                setRecordingShortcut(null);
                setShortcutError(null);
              }}
            >
              {t("기본값 복원")}
            </button>
          </div>
          <div className="shortcut-key-grid">
            {settings.colorShortcuts.map((code, index) => (
              <div className="shortcut-key-row" key={index}>
                <span className={`shortcut-color-dot color${String.fromCharCode(65 + index)}`} aria-hidden="true" />
                <strong>{t(`${index + 1}번 색`)}</strong>
                <button
                  type="button"
                  className={recordingShortcut === index ? "recording" : ""}
                  onClick={() => {
                    setRecordingShortcut(index);
                    setShortcutError(null);
                  }}
                  onKeyDown={(event) => {
                    if (recordingShortcut === index) setColorShortcut(index, event);
                  }}
                  aria-label={t("{slot} 단축키 변경", { slot: t(`${index + 1}번 색`) })}
                >
                  {recordingShortcut === index ? t("키 입력 대기") : formatShortcutCode(code)}
                </button>
              </div>
            ))}
          </div>
          <small className={`shortcut-setting-help${shortcutError === null ? "" : " error"}`} role={shortcutError === null ? undefined : "alert"}>
            {shortcutError === null
              ? t("변경할 칸을 누른 다음 원하는 키를 입력하세요.")
              : t(shortcutError)}
          </small>
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

        <div className="setting-group">
          <div className="setting-label">
            <strong>{t("튜토리얼")}</strong>
            <span>{t("게임 방법과 점수 규칙을 처음부터 다시 확인합니다.")}</span>
          </div>
          <button
            className="secondary-action settings-tutorial-action"
            type="button"
            onClick={() => {
              onClose();
              openTutorial();
            }}
          >
            {t("튜토리얼 다시 보기")}
          </button>
        </div>
      </section>
    </div>
  );
}
