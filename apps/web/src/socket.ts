import { io, type ManagerOptions, type SocketOptions } from "socket.io-client";

type AppSocketOptions = Partial<ManagerOptions & SocketOptions>;

const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const socketUrl = configuredSocketUrl === undefined || configuredSocketUrl === ""
  ? import.meta.env.DEV ? "http://localhost:8080" : undefined
  : configuredSocketUrl;

export const createAppSocket = (options?: AppSocketOptions) =>
  socketUrl === undefined ? io(undefined, options) : io(socketUrl, options);
