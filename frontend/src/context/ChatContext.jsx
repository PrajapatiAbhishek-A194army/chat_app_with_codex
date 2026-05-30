import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import useAuth from "../hooks/useAuth";
import {
  deleteMessage as deleteMessageRequest,
  getChatUsers,
  getMessages,
  markMessageAsRead,
  sendImageMessage as sendImageMessageRequest,
  sendMessage as sendMessageRequest,
  sendVideoMessage as sendVideoMessageRequest,
} from "../services/chatService";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../services/socketService";

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesByUser, setMessagesByUser] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const upsertMessage = useCallback((message) => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId || !message?.sender || !message?.receiver) {
      return;
    }

    const senderId = message.sender.toString();
    const receiverId = message.receiver.toString();
    const participantId = senderId === currentUserId ? receiverId : senderId;

    setMessagesByUser((current) => {
      const existingMessages = current[participantId] || [];
      const nextMessages = existingMessages.some((item) => item.id === message.id)
        ? existingMessages.map((item) => (item.id === message.id ? message : item))
        : [...existingMessages, message];

      return {
        ...current,
        [participantId]: nextMessages,
      };
    });
  }, [user]);

  const removeMessage = useCallback((payload) => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId || !payload?.sender || !payload?.receiver || !payload?.id) {
      return;
    }

    const senderId = payload.sender.toString();
    const receiverId = payload.receiver.toString();
    const participantId = senderId === currentUserId ? receiverId : senderId;

    setMessagesByUser((current) => ({
      ...current,
      [participantId]: (current[participantId] || []).filter(
        (message) => message.id !== payload.id
      ),
    }));
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setSocketConnected(false);
      setOnlineUsers([]);
      setChatUsers([]);
      setActiveConversation(null);
      setMessagesByUser({});
      setTypingUsers({});
      return undefined;
    }

    const socket = connectSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("join");
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    const handleTyping = ({ senderId, name }) => {
      setTypingUsers((current) => ({
        ...current,
        [senderId]: name || "Someone",
      }));
    };

    const handleStopTyping = ({ senderId }) => {
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[senderId];
        return next;
      });
    };

    const handleChatError = ({ message }) => {
      setChatError(message || "Chat request failed.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("receiveMessage", upsertMessage);
    socket.on("messageDeleted", removeMessage);
    socket.on("messageRead", upsertMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("chatError", handleChatError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("receiveMessage", upsertMessage);
      socket.off("messageDeleted", removeMessage);
      socket.off("messageRead", upsertMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("chatError", handleChatError);
    };
  }, [isAuthenticated, removeMessage, upsertMessage]);

  const fetchChatUsers = useCallback(async (params = {}) => {
    try {
      setChatLoading(true);
      setChatError("");
      const data = await getChatUsers(params);
      setChatUsers(data.users || []);
      return data.users || [];
    } catch (error) {
      setChatError(error.message || "Unable to fetch chat users.");
      throw error;
    } finally {
      setChatLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (participantId, params = {}) => {
    try {
      setChatLoading(true);
      setChatError("");
      const data = await getMessages(participantId, params);
      setMessagesByUser((current) => ({
        ...current,
        [participantId]: data.messages || [],
      }));
      return data;
    } catch (error) {
      setChatError(error.message || "Unable to fetch messages.");
      throw error;
    } finally {
      setChatLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async ({ receiverId, text }) => {
    const socket = getSocket();

    if (socket?.connected) {
      return new Promise((resolve, reject) => {
        socket.emit("sendMessage", { receiverId, text }, (response) => {
          if (response?.success) {
            resolve(response.message);
            return;
          }

          reject(new Error(response?.message || "Unable to send message."));
        });
      });
    }

    const data = await sendMessageRequest({ receiverId, text });
    upsertMessage(data.data);
    return data.data;
  }, [upsertMessage]);

  const sendImageMessage = useCallback(
    async ({ receiverId, text, image }, onUploadProgress) => {
      const data = await sendImageMessageRequest(
        { receiverId, text, image },
        onUploadProgress
      );
      upsertMessage(data.data);
      return data.data;
    },
    [upsertMessage]
  );

  const sendVideoMessage = useCallback(
    async ({ receiverId, text, video }, onUploadProgress) => {
      const data = await sendVideoMessageRequest(
        { receiverId, text, video },
        onUploadProgress
      );
      upsertMessage(data.data);
      return data.data;
    },
    [upsertMessage]
  );

  const sendTyping = useCallback((receiverId) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("typing", { receiverId });
    }
  }, []);

  const sendStopTyping = useCallback((receiverId) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("stopTyping", { receiverId });
    }
  }, []);

  const readMessage = useCallback(async (messageId) => {
    const socket = getSocket();

    if (socket?.connected) {
      return new Promise((resolve, reject) => {
        socket.emit("messageRead", { messageId }, (response) => {
          if (response?.success) {
            resolve(response.message);
            return;
          }

          reject(new Error(response?.message || "Unable to mark message read."));
        });
      });
    }

    const data = await markMessageAsRead(messageId);
    upsertMessage(data.data);
    return data.data;
  }, [upsertMessage]);

  const deleteMessage = useCallback(
    async (messageId) => {
      const data = await deleteMessageRequest(messageId);
      removeMessage({
        id: data.deletedMessageId,
        sender: user?.id || user?._id,
        receiver: activeConversation?.id,
      });
      return data;
    },
    [activeConversation, removeMessage, user]
  );

  const value = useMemo(
    () => ({
      activeConversation,
      chatError,
      chatLoading,
      chatUsers,
      deleteMessage,
      fetchChatUsers,
      fetchMessages,
      messagesByUser,
      onlineUsers,
      readMessage,
      sendMessage,
      sendImageMessage,
      sendStopTyping,
      sendTyping,
      sendVideoMessage,
      setActiveConversation,
      setChatError,
      socketConnected,
      typingUsers,
    }),
    [
      activeConversation,
      chatError,
      chatLoading,
      chatUsers,
      deleteMessage,
      fetchChatUsers,
      fetchMessages,
      messagesByUser,
      onlineUsers,
      readMessage,
      sendMessage,
      sendImageMessage,
      sendStopTyping,
      sendTyping,
      sendVideoMessage,
      socketConnected,
      typingUsers,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
