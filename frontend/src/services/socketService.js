import { io } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "");

let socket = null;

export const connectSocket = () => {
  if (socket) {
    if (!socket.connected && socket.disconnected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
