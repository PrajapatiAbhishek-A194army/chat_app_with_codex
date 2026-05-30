import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image, SendHorizontal, Video, X } from "lucide-react";
import MessageBubble from "./MessageBubble";
import OnlineStatus from "./OnlineStatus";
import TypingIndicator from "./TypingIndicator";

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const formatLastSeen = (value) => {
  if (!value) {
    return "Offline";
  }

  return `Last seen ${new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const IMAGE_VALIDATION = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxSize: 5 * 1024 * 1024,
  maxSizeLabel: "5MB",
  label: "Images",
};

const VIDEO_VALIDATION = {
  acceptedTypes: ["video/mp4", "video/quicktime", "video/webm"],
  acceptedExtensions: [".mp4", ".mov", ".webm"],
  maxSize: 50 * 1024 * 1024,
  maxSizeLabel: "50MB",
  label: "Videos",
};

const getFileExtension = (fileName = "") => {
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex === -1 ? "" : fileName.slice(extensionIndex).toLowerCase();
};

const ChatWindow = ({
  activeConversation,
  currentUser,
  messages,
  onBack,
  onReadMessage,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onlineUsers,
  sending,
  typingName,
  uploadProgress,
}) => {
  const [draft, setDraft] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const videoInputRef = useRef(null);
  const currentUserId = currentUser?.id || currentUser?._id;

  const onlineUserSet = useMemo(
    () => new Set((onlineUsers || []).map((id) => id.toString())),
    [onlineUsers]
  );

  const isOnline = activeConversation
    ? onlineUserSet.has(activeConversation.id?.toString())
    : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversation]);

  useEffect(() => {
    if (!activeConversation || !currentUserId) {
      return;
    }

    messages.forEach((message) => {
      const senderId = message.sender?.toString();
      if (senderId !== currentUserId && !message.isRead) {
        onReadMessage(message.id).catch(() => {});
      }
    });
  }, [activeConversation, currentUserId, messages, onReadMessage]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);

    if (!activeConversation) {
      return;
    }

    onStartTyping(activeConversation.id);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onStopTyping(activeConversation.id);
    }, 900);
  };

  const handleMediaChange = (event, mediaType) => {
    const file = event.target.files?.[0];
    setMediaError("");

    if (!file) {
      return;
    }

    const isImage = mediaType === "image";
    const validation = isImage ? IMAGE_VALIDATION : VIDEO_VALIDATION;
    const extension = getFileExtension(file.name);
    const hasAllowedType = validation.acceptedTypes.includes(file.type);
    const hasAllowedExtension = validation.acceptedExtensions.includes(extension);

    if (!hasAllowedType || !hasAllowedExtension) {
      setMediaError(
        `${validation.label} must be ${validation.acceptedExtensions
          .map((item) => item.replace(".", "").toUpperCase())
          .join(", ")}.`
      );
      event.target.value = "";
      return;
    }

    if (file.size > validation.maxSize) {
      setMediaError(`${validation.label} must be ${validation.maxSizeLabel} or smaller.`);
      event.target.value = "";
      return;
    }

    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }

    setSelectedMedia({
      file,
      type: mediaType,
      previewUrl: URL.createObjectURL(file),
    });
    event.target.value = "";
  };

  const clearSelectedMedia = () => {
    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }

    setSelectedMedia(null);
    setMediaError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = draft.trim();

    if ((!text && !selectedMedia) || !activeConversation || sending) {
      return;
    }

    setDraft("");
    onStopTyping(activeConversation.id);
    const payload = {
      receiverId: activeConversation.id,
      text,
    };

    if (selectedMedia?.type === "image") {
      payload.image = selectedMedia.file;
    }

    if (selectedMedia?.type === "video") {
      payload.video = selectedMedia.file;
    }

    await onSendMessage(payload);
    clearSelectedMedia();
  };

  if (!activeConversation) {
    return (
    <section className="hidden h-full min-h-0 place-items-center bg-slate-50 dark:bg-slate-950 md:grid">
        <div className="max-w-sm px-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-sky-100 text-sky-700">
            <SendHorizontal className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
            Pick a conversation
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            Search for a user or open a recent chat to start messaging.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
        <button
          aria-label="Back to conversations"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
          onClick={onBack}
          title="Back"
          type="button"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative shrink-0">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-slate-200 text-sm font-black text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            {activeConversation.avatar ? (
              <img
                alt=""
                className="h-full w-full object-cover"
                src={activeConversation.avatar}
              />
            ) : (
              getInitial(activeConversation.name)
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatus isOnline={isOnline} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-black text-slate-950 dark:text-white sm:text-base">
            {activeConversation.name}
          </h2>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isOnline ? "Online" : formatLastSeen(activeConversation.lastSeen)}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center">
            <p className="max-w-xs text-center text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              No messages yet. Send the first text message.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwnMessage = message.sender?.toString() === currentUserId;

              return (
                <MessageBubble
                  isOwnMessage={isOwnMessage}
                  key={message.id}
                  message={message}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <TypingIndicator name={typingName} />

      <form
        className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
        onSubmit={handleSubmit}
      >
        {selectedMedia && (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                {selectedMedia.type === "image" ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={selectedMedia.previewUrl}
                  />
                ) : (
                  <video
                    className="h-full w-full object-cover"
                    muted
                    src={selectedMedia.previewUrl}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {selectedMedia.file.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedMedia.type === "image" ? "Image message" : "Video message"}
                </p>
              </div>
              <button
                aria-label="Remove selected media"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={sending}
                onClick={clearSelectedMedia}
                title="Remove"
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {mediaError && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {mediaError}
          </p>
        )}

        {sending && uploadProgress > 0 && (
          <div className="mb-3 grid gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-600 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Uploading {uploadProgress}%
            </p>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            accept={IMAGE_VALIDATION.acceptedTypes.join(",")}
            className="sr-only"
            onChange={(event) => handleMediaChange(event, "image")}
            ref={imageInputRef}
            type="file"
          />
          <input
            accept={VIDEO_VALIDATION.acceptedTypes.join(",")}
            className="sr-only"
            onChange={(event) => handleMediaChange(event, "video")}
            ref={videoInputRef}
            type="file"
          />
          <button
            aria-label="Attach image"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={sending}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image"
            type="button"
          >
            <Image className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            aria-label="Attach video"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={sending}
            onClick={() => videoInputRef.current?.click()}
            title="Attach video"
            type="button"
          >
            <Video className="h-5 w-5" aria-hidden="true" />
          </button>
          <label className="sr-only" htmlFor="message-draft">
            Message
          </label>
          <textarea
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-sky-900"
            id="message-draft"
            onChange={handleDraftChange}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            placeholder={selectedMedia ? "Add a caption" : "Type a text message"}
            rows={1}
            value={draft}
          />
          <button
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sky-600 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={(!draft.trim() && !selectedMedia) || sending}
            title="Send"
            type="submit"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChatWindow;
