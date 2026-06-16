import { useEffect, useState } from "react";
import {
  fetchVisitorCounts,
  recordVisitorHeartbeat,
  type VisitorCounts,
} from "./api";

const visitorKey = "color-game-visitor-id";

const createVisitorId = () =>
  window.crypto?.randomUUID?.()
  ?? `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readVisitorId = (): string => {
  try {
    const stored = window.localStorage.getItem(visitorKey);
    if (stored !== null && stored.length >= 8) return stored;

    const next = createVisitorId();
    window.localStorage.setItem(visitorKey, next);
    return next;
  } catch {
    return createVisitorId();
  }
};

const currentPath = () => `${window.location.pathname}${window.location.search}`;

export const useVisitorAnalytics = (): VisitorCounts | null => {
  const [counts, setCounts] = useState<VisitorCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const visitorId = readVisitorId();

    const heartbeat = async () => {
      try {
        const nextCounts = await recordVisitorHeartbeat(visitorId, currentPath());
        if (!cancelled) setCounts(nextCounts);
      } catch {
        // Analytics must never block the play flow.
      }
    };

    const refresh = async () => {
      try {
        const nextCounts = await fetchVisitorCounts();
        if (!cancelled) setCounts(nextCounts);
      } catch {
        // Keep the previous value when the server is temporarily unavailable.
      }
    };

    void heartbeat();
    const heartbeatTimer = window.setInterval(heartbeat, 30_000);
    const refreshTimer = window.setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(refreshTimer);
    };
  }, []);

  return counts;
};
