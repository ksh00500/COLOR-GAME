import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
export type AnimationLevel = "full" | "reduced" | "off";
export type PresentationSpeed = "standard" | "fast";

export interface AppSettings {
  theme: ThemePreference;
  colorBlindPalette: boolean;
  showShapes: boolean;
  animationLevel: AnimationLevel;
  presentationSpeed: PresentationSpeed;
  soundEnabled: boolean;
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
  animationLevel: "full",
  presentationSpeed: "standard",
  soundEnabled: true,
};

const readSettings = (): AppSettings => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(stored) as Partial<AppSettings>) };
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
    document.documentElement.dataset.motion = settings.animationLevel;
    document.documentElement.dataset.speed = settings.presentationSpeed;
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

