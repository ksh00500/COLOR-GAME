import { Capacitor, registerPlugin } from "@capacitor/core";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";

const defaultWebClientId =
  "346527230938-6219p1srt8p9ejhs44fvea3bldcknlrf.apps.googleusercontent.com";
const webClientId =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim() || defaultWebClientId;

interface GoogleAuthPlugin {
  signIn(options: { serverClientId: string }): Promise<{ idToken: string }>;
}

const nativeGoogleAuth = registerPlugin<GoogleAuthPlugin>("GoogleAuth");

interface GoogleAccountsApi {
  id: {
    initialize(options: {
      client_id: string;
      callback: (response: { credential?: string }) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }): void;
    renderButton(
      element: HTMLElement,
      options: {
        type: "standard";
        theme: "outline";
        size: "large";
        text: "signin_with";
        shape: "pill";
        width: number;
      },
    ): void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccountsApi };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let googleAccountsInitialized = false;
let googleCredentialHandler: ((idToken: string) => void) | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts !== undefined) return Promise.resolve();
  if (googleScriptPromise !== null) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing !== null) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GOOGLE_SCRIPT_FAILED")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GOOGLE_SCRIPT_FAILED"));
    document.head.append(script);
  });
  return googleScriptPromise;
};

const initializeGoogleAccounts = () => {
  if (googleAccountsInitialized || window.google === undefined) return;
  window.google.accounts.id.initialize({
    client_id: webClientId,
    callback: ({ credential }) => {
      if (credential !== undefined) googleCredentialHandler?.(credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  googleAccountsInitialized = true;
};

export function GoogleSignInButton({
  busy,
  onCredential,
  onError,
}: {
  busy: boolean;
  onCredential: (idToken: string) => void;
  onError: (code: string) => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const native = Capacitor.isNativePlatform();
  const [nativePending, setNativePending] = useState(false);
  const onErrorRef = useRef(onError);

  onErrorRef.current = onError;

  useEffect(() => {
    if (native) return;
    googleCredentialHandler = onCredential;
    return () => {
      if (googleCredentialHandler === onCredential) googleCredentialHandler = null;
    };
  }, [native, onCredential]);

  useEffect(() => {
    if (native || containerRef.current === null) return;
    let active = true;
    void loadGoogleScript()
      .then(() => {
        if (!active || containerRef.current === null || window.google === undefined) return;
        initializeGoogleAccounts();
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: Math.min(360, containerRef.current.clientWidth || 360),
        });
      })
      .catch(() => onErrorRef.current("GOOGLE_SIGN_IN_UNAVAILABLE"));
    return () => {
      active = false;
    };
  }, [native]);

  if (native) {
    const nativeBusy = busy || nativePending;
    return (
      <button
        className="google-native-button"
        type="button"
        disabled={nativeBusy}
        aria-busy={nativeBusy}
        onClick={() => {
          if (nativeBusy) return;
          setNativePending(true);
          void nativeGoogleAuth
            .signIn({ serverClientId: webClientId })
            .then(({ idToken }) => onCredential(idToken))
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "";
              onError(message.includes("CANCELED") ? "GOOGLE_SIGN_IN_CANCELED" : "GOOGLE_SIGN_IN_FAILED");
            })
            .finally(() => setNativePending(false));
        }}
      >
        <span aria-hidden="true">G</span>
        {t("Google로 로그인")}
      </button>
    );
  }

  return (
    <div
      className={`google-web-button${busy ? " disabled" : ""}`}
      ref={containerRef}
      aria-busy={busy}
    />
  );
}
