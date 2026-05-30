const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

const MAX_MESSAGE_LENGTH = 2000;
const connectedUsers = new Map();
let ioInstance = null;

const getOnlineUsers = () => Array.from(connectedUsers.keys());

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeMessageText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return escapeHtml(value.trim().replace(/\s+/g, " "));
};

const formatMessage = (message) => ({
  id: message._id,
  sender: message.sender,
  receiver: message.receiver,
  text: message.text,
  imageUrl: message.imageUrl,
  videoUrl: message.videoUrl,
  type: message.type || "text",
  isRead: message.isRead,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const isUserOnline = (userId) => connectedUsers.has(userId.toString());

const emitMessageToParticipants = (message) => {
  if (!ioInstance || !message) {
    return null;
  }

  const formattedMessage = formatMessage(message);
  const senderId = message.sender.toString();
  const receiverId = message.receiver.toString();

  ioInstance.to(receiverId).emit("receiveMessage", formattedMessage);
  ioInstance.to(senderId).emit("receiveMessage", formattedMessage);

  return formattedMessage;
};

const emitMessageDeletedToParticipants = (message) => {
  if (!ioInstance || !message) {
    return;
  }

  const payload = {
    id: message._id,
    sender: message.sender,
    receiver: message.receiver,
  };
  const senderId = message.sender.toString();
  const receiverId = message.receiver.toString();

  ioInstance.to(receiverId).emit("messageDeleted", payload);
  ioInstance.to(senderId).emit("messageDeleted", payload);
};

const addSocketForUser = (userId, socketId) => {
  const socketIds = connectedUsers.get(userId) || new Set();
  socketIds.add(socketId);
  connectedUsers.set(userId, socketIds);
};

const removeSocketForUser = (userId, socketId) => {
  const socketIds = connectedUsers.get(userId);

  if (!socketIds) {
    return;
  }

  socketIds.delete(socketId);

  if (socketIds.size === 0) {
    connectedUsers.delete(userId);
  } else {
    connectedUsers.set(userId, socketIds);
  }
};

const getTokenFromSocket = (socket) => {
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  const authorization = socket.handshake.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    return authorization.split(" ")[1];
  }

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parsedCookies = cookie.parse(cookieHeader);
  return parsedCookies.token || null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      return next(new Error("Authentication required."));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("JWT_SECRET is missing from environment variables."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("User no longer exists."));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token."));
  }
};

const initializeSocket = (httpServer, allowedOrigins) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });
  ioInstance = io;

  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();

    addSocketForUser(userId, socket.id);
    socket.join(userId);

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error(`Failed to mark user online: ${error.message}`);
    }

    io.emit("onlineUsers", getOnlineUsers());

    socket.on("join", () => {
      socket.join(userId);
      socket.emit("onlineUsers", getOnlineUsers());
    });

    socket.on("sendMessage", async (payload = {}, callback) => {
      try {
        const receiverId = payload.receiver || payload.receiverId;
        const text = sanitizeMessageText(payload.text || payload.message);

        if (!isValidObjectId(receiverId)) {
          throw new Error("Valid receiver id is required.");
        }

        if (receiverId === userId) {
          throw new Error("You cannot send a message to yourself.");
        }

        if (!text) {
          throw new Error("Message text is required.");
        }

        if (text.length > MAX_MESSAGE_LENGTH) {
          throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
        }

        const receiver = await User.findById(receiverId).select("_id");
        if (!receiver) {
          throw new Error("Receiver not found.");
        }

        const deliveredAt = isUserOnline(receiverId) ? new Date() : undefined;
        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          text,
          type: "text",
          deliveredAt,
        });
        const formattedMessage = emitMessageToParticipants(message);

        if (typeof callback === "function") {
          callback({
            success: true,
            message: formattedMessage,
          });
        }
      } catch (error) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: error.message || "Failed to send message.",
          });
        }

        socket.emit("chatError", {
          message: error.message || "Failed to send message.",
        });
      }
    });

    socket.on("typing", (payload = {}) => {
      const receiverId = payload.receiver || payload.receiverId;

      if (!isValidObjectId(receiverId) || receiverId === userId) {
        return;
      }

      socket.to(receiverId).emit("typing", {
        senderId: userId,
        name: socket.user.name,
      });
    });

    socket.on("stopTyping", (payload = {}) => {
      const receiverId = payload.receiver || payload.receiverId;

      if (!isValidObjectId(receiverId) || receiverId === userId) {
        return;
      }

      socket.to(receiverId).emit("stopTyping", {
        senderId: userId,
      });
    });

    socket.on("messageRead", async (payload = {}, callback) => {
      try {
        const { messageId } = payload;

        if (!isValidObjectId(messageId)) {
          throw new Error("Valid message id is required.");
        }

        const message = await Message.findOne({
          _id: messageId,
          receiver: userId,
        });

        if (!message) {
          throw new Error("Message not found.");
        }

        if (!message.isRead) {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();
        }

        const formattedMessage = formatMessage(message);

        io.to(message.sender.toString()).emit("messageRead", formattedMessage);
        io.to(userId).emit("messageRead", formattedMessage);

        if (typeof callback === "function") {
          callback({
            success: true,
            message: formattedMessage,
          });
        }
      } catch (error) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: error.message || "Failed to mark message as read.",
          });
        }

        socket.emit("chatError", {
          message: error.message || "Failed to mark message as read.",
        });
      }
    });

    socket.on("disconnect", async () => {
      removeSocketForUser(userId, socket.id);

      if (!isUserOnline(userId)) {
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (error) {
          console.error(`Failed to mark user offline: ${error.message}`);
        }
      }

      io.emit("onlineUsers", getOnlineUsers());
    });
  });

  return io;
};

const getIO = () => ioInstance;

module.exports = {
  emitMessageDeletedToParticipants,
  emitMessageToParticipants,
  initializeSocket,
  getIO,
  getOnlineUsers,
  isUserOnline,
};
