import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
export type PresentationSpeed = "standard" | "fast";
export type AppLanguage = "auto" | "ko" | "en" | "ja" | "es" | "pt-BR";
export type ColorShortcuts = [string, string, string];

export const defaultColorShortcuts: ColorShortcuts = ["Digit1", "Digit2", "Digit3"];

const validShortcutCode = /^(?:Key[A-Z]|Digit[0-9]|Numpad[0-9])$/;

export const isConfigurableShortcutCode = (code: string): boolean =>
  validShortcutCode.test(code);

export const formatShortcutCode = (code: string): string => {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `NUM ${code.slice(6)}`;
  return code;
};

const normalizeColorShortcuts = (value: unknown): ColorShortcuts => {
  if (!Array.isArray(value) || value.length !== 3) return [...defaultColorShortcuts];
  const shortcuts = value.map((item) => typeof item === "string" ? item : "");
  if (
    shortcuts.some((code) => !isConfigurableShortcutCode(code)) ||
    new Set(shortcuts).size !== shortcuts.length
  ) {
    return [...defaultColorShortcuts];
  }
  return shortcuts as ColorShortcuts;
};

export const resolveColorShortcutIndex = (
  eventCode: string,
  shortcuts: ColorShortcuts,
): number | null => {
  const directIndex = shortcuts.indexOf(eventCode);
  if (directIndex >= 0) return directIndex;

  // Keep the number row and numeric keypad interchangeable for number shortcuts.
  if (eventCode.startsWith("Numpad")) {
    const digitIndex = shortcuts.indexOf(`Digit${eventCode.slice(6)}`);
    return digitIndex >= 0 ? digitIndex : null;
  }
  if (eventCode.startsWith("Digit")) {
    const numpadIndex = shortcuts.indexOf(`Numpad${eventCode.slice(5)}`);
    return numpadIndex >= 0 ? numpadIndex : null;
  }
  return null;
};

export interface AppSettings {
  theme: ThemePreference;
  colorBlindPalette: boolean;
  showShapes: boolean;
  presentationSpeed: PresentationSpeed;
  soundEnabled: boolean;
  language: AppLanguage;
  colorShortcuts: ColorShortcuts;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const STORAGE_KEY = "color-line-settings-v1";

const defaultSettings: AppSettings = {
  theme: "system",
  colorBlindPalette: false,
  showShapes: false,
  presentationSpeed: "standard",
  soundEnabled: true,
  language: "auto",
  colorShortcuts: [...defaultColorShortcuts],
};

export const resolveAppLanguage = (language: AppLanguage): Exclude<AppLanguage, "auto"> => {
  if (language !== "auto") return language;
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("ko")) return "ko";
  if (browserLanguage.startsWith("ja")) return "ja";
  if (browserLanguage.startsWith("es")) return "es";
  if (browserLanguage.startsWith("pt")) return "pt-BR";
  return "en";
};

const readSettings = (): AppSettings => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return defaultSettings;
    const parsed = JSON.parse(stored) as Partial<AppSettings> & { animationLevel?: unknown };
    const { animationLevel: _legacyAnimationLevel, ...currentSettings } = parsed;
    return {
      ...defaultSettings,
      ...currentSettings,
      colorShortcuts: normalizeColorShortcuts(parsed.colorShortcuts),
    };
  } catch {
    return defaultSettings;
  }
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readSettings);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme =
      settings.theme === "system" ? (systemIsDark ? "dark" : "light") : settings.theme;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.palette = settings.colorBlindPalette
      ? "colorblind"
      : "default";
    delete document.documentElement.dataset.motion;
    document.documentElement.dataset.speed = settings.presentationSpeed;
    document.documentElement.lang = resolveAppLanguage(settings.language);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== "system") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [settings.theme]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = (): SettingsContextValue => {
  const value = useContext(SettingsContext);
  if (value === null) throw new Error("useSettings must be used inside SettingsProvider.");
  return value;
};

