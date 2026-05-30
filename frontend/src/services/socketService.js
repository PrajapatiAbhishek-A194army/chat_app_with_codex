import { io } from "socket.io-client";

// For single-service deployment, connect to the same origin
// window.location.origin = current domain (e.g., https://app.render.com)
const SOCKET_URL = window.location.origin;

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
