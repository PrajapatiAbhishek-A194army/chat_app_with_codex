import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import OnlineStatus from "./OnlineStatus";

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const formatLatestTime = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const getLatestMessagePreview = (message, fallback) => {
  if (!message) {
    return fallback;
  }

  if (message.text) {
    return message.text;
  }

  if (message.type === "image" || message.imageUrl) {
    return "Image";
  }

  if (message.type === "video" || message.videoUrl) {
    return "Video";
  }

  return fallback;
};

const Sidebar = ({
  activeConversation,
  chatUsers,
  currentUser,
  loading,
  onRefresh,
  onSelectConversation,
  onlineUsers,
}) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onRefresh({ search });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [onRefresh, search]);

  const onlineUserSet = useMemo(
    () => new Set((onlineUsers || []).map((id) => id.toString())),
    [onlineUsers]
  );

  const usersWithPresence = useMemo(
    () =>
      chatUsers.map((chatUser) => ({
        ...chatUser,
        isCurrentlyOnline:
          onlineUserSet.has(chatUser.id?.toString()) || Boolean(chatUser.isOnline),
      })),
    [chatUsers, onlineUserSet]
  );

  const groupedUsers = useMemo(
    () => ({
      online: usersWithPresence.filter((chatUser) => chatUser.isCurrentlyOnline),
      offline: usersWithPresence.filter((chatUser) => !chatUser.isCurrentlyOnline),
    }),
    [usersWithPresence]
  );

  const renderUserButton = (chatUser) => {
    const isActive = activeConversation?.id === chatUser.id;
    const latestMessage = chatUser.latestMessage;

    return (
      <button
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
          isActive
            ? "bg-sky-50 dark:bg-sky-950/50"
            : "bg-white hover:bg-slate-50 focus:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
        }`}
        key={chatUser.id}
        onClick={() => onSelectConversation(chatUser)}
        type="button"
      >
        <div className="relative shrink-0">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-slate-200 text-sm font-black text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            {chatUser.avatar ? (
              <img
                alt=""
                className="h-full w-full object-cover"
                src={chatUser.avatar}
              />
            ) : (
              getInitial(chatUser.name)
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatus isOnline={chatUser.isCurrentlyOnline} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {chatUser.name}
            </p>
            <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {formatLatestTime(latestMessage?.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {getLatestMessagePreview(latestMessage, chatUser.email)}
          </p>
        </div>

        {chatUser.unreadCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-600 px-1.5 text-[11px] font-black text-white">
            {chatUser.unreadCount}
          </span>
        )}
      </button>
    );
  };

  const renderUserGroup = (label, users) => {
    if (users.length === 0) {
      return null;
    }

    return (
      <section className="py-2" key={label}>
        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <h2 className="text-[11px] font-black uppercase tracking-normal text-slate-500 dark:text-slate-400">
            {label}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {users.length}
          </span>
        </div>
        <div>{users.map(renderUserButton)}</div>
      </section>
    );
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-900 text-sm font-black text-white dark:bg-sky-600">
            {getInitial(currentUser?.name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black leading-tight text-slate-950 dark:text-white">
              All users
            </h1>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {currentUser?.email}
            </p>
          </div>
        </div>

        <label className="mt-4 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:focus-within:bg-slate-900 dark:focus-within:ring-sky-900">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search users</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            type="search"
            value={search}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chatUsers.length === 0 ? (
          <div className="px-4 py-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading users...
          </div>
        ) : null}

        {!loading && chatUsers.length === 0 ? (
          <div className="grid place-items-center gap-3 px-5 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No users found.
            </p>
          </div>
        ) : null}

        <div className="py-2">
          {renderUserGroup("Online", groupedUsers.online)}
          {renderUserGroup("Offline", groupedUsers.offline)}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
