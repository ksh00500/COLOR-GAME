import { io, type ManagerOptions, type SocketOptions } from "socket.io-client";
import { clearAuthToken } from "./api";

type AppSocketOptions = Partial<ManagerOptions & SocketOptions>;

const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const socketUrl = configuredSocketUrl === undefined || configuredSocketUrl === ""
  ? import.meta.env.DEV ? "http://localhost:8080" : undefined
  : configuredSocketUrl;
const guestTokenKey = "tango-guest-token";

export const createAppSocket = (options?: AppSocketOptions) => {
  const guestToken = typeof window === "undefined" ? null : window.localStorage.getItem(guestTokenKey);
  const mergedOptions: AppSocketOptions = {
    ...options,
    auth: {
      ...((options?.auth ?? {}) as Record<string, unknown>),
      guestToken,
    },
  };
  const socket = socketUrl === undefined ? io(undefined, mergedOptions) : io(socketUrl, mergedOptions);
  socket.on("guest:token", (payload: { token?: unknown }) => {
    if (typeof payload.token === "string") {
      window.localStorage.setItem(guestTokenKey, payload.token);
    }
  });
  socket.on("auth:session-replaced", () => {
    clearAuthToken();
  });
  socket.on("connect_error", (error) => {
    if (error.message === "UNAUTHORIZED") {
      clearAuthToken();
    }
  });
  return socket;
};
