import { io, type ManagerOptions, type SocketOptions } from "socket.io-client";
import { clearAuthToken } from "./api";

type AppSocketOptions = Partial<ManagerOptions & SocketOptions>;

const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const socketUrl = configuredSocketUrl === undefined || configuredSocketUrl === ""
  ? import.meta.env.DEV ? "http://localhost:8080" : undefined
  : configuredSocketUrl;

export const createAppSocket = (options?: AppSocketOptions) => {
  const socket = socketUrl === undefined ? io(undefined, options) : io(socketUrl, options);
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
