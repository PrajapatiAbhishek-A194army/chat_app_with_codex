import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Settings, UserRound } from "lucide-react";
import ChatWindow from "../../components/chat/ChatWindow";
import Sidebar from "../../components/chat/Sidebar";
import ThemeToggle from "../../components/chat/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import useChat from "../../hooks/useChat";

const ChatPage = () => {
  const { user } = useAuth();
  const {
    activeConversation,
    chatError,
    chatLoading,
    chatUsers,
    fetchChatUsers,
    fetchMessages,
    messagesByUser,
    onlineUsers,
    readMessage,
    sendImageMessage,
    sendMessage,
    sendStopTyping,
    sendTyping,
    sendVideoMessage,
    setActiveConversation,
    setChatError,
    socketConnected,
    typingUsers,
  } = useChat();
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConversationOnMobile, setShowConversationOnMobile] = useState(false);

  useEffect(() => {
    fetchChatUsers().catch(() => {});
  }, [fetchChatUsers]);

  const activeMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    return messagesByUser[activeConversation.id] || [];
  }, [activeConversation, messagesByUser]);

  const typingName = activeConversation
    ? typingUsers[activeConversation.id]
    : "";

  const handleSelectConversation = useCallback(
    async (chatUser) => {
      setChatError("");
      setActiveConversation(chatUser);
      setShowConversationOnMobile(true);
      await fetchMessages(chatUser.id, { page: 1, limit: 30 });
    },
    [fetchMessages, setActiveConversation, setChatError]
  );

  const handleSendMessage = useCallback(
    async ({ receiverId, text, image, video }) => {
      try {
        setSending(true);
        setUploadProgress(0);
        setChatError("");

        if (image) {
          await sendImageMessage({ receiverId, text, image }, (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded * 100) / event.total));
            }
          });
        } else if (video) {
          await sendVideoMessage({ receiverId, text, video }, (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded * 100) / event.total));
            }
          });
        } else {
          await sendMessage({ receiverId, text });
        }

        await fetchChatUsers();
      } catch (error) {
        setChatError(error.message || "Unable to send message.");
      } finally {
        setSending(false);
        setUploadProgress(0);
      }
    },
    [
      fetchChatUsers,
      sendImageMessage,
      sendMessage,
      sendVideoMessage,
      setChatError,
    ]
  );

  const handleReadMessage = useCallback(
    async (messageId) => {
      await readMessage(messageId);
      fetchChatUsers().catch(() => {});
    },
    [fetchChatUsers, readMessage]
  );

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-full flex-col">
        <div className="flex min-h-12 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-normal text-slate-500">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                socketConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
              aria-hidden="true"
            />
            {socketConnected ? "Real-time connected" : "Connecting"}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <Link
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-black text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
              to="/profile"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-black text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
              to="/settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <Link
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-black text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
              to="/dashboard"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Billing</span>
            </Link>
          </div>
        </div>

        {chatError && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {chatError}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          <div
            className={`min-h-0 ${
              showConversationOnMobile ? "hidden md:block" : "block"
            }`}
          >
            <Sidebar
              activeConversation={activeConversation}
              chatUsers={chatUsers}
              currentUser={user}
              loading={chatLoading}
              onRefresh={fetchChatUsers}
              onSelectConversation={handleSelectConversation}
              onlineUsers={onlineUsers}
            />
          </div>

          <div
            className={`min-h-0 ${
              showConversationOnMobile ? "block" : "hidden md:block"
            }`}
          >
            <ChatWindow
              activeConversation={activeConversation}
              currentUser={user}
              messages={activeMessages}
              onBack={() => setShowConversationOnMobile(false)}
              onReadMessage={handleReadMessage}
              onSendMessage={handleSendMessage}
              onStartTyping={sendTyping}
              onStopTyping={sendStopTyping}
              onlineUsers={onlineUsers}
              sending={sending}
              typingName={typingName}
              uploadProgress={uploadProgress}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
