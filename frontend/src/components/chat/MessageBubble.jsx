const decodeMessageText = (value) => {
  if (typeof document === "undefined" || typeof value !== "string") {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (message) => {
  if (message.isRead || message.readAt) {
    return "Read";
  }

  if (message.deliveredAt) {
    return "Delivered";
  }

  return "Sent";
};

const getStatusMark = (message) => {
  if (message.isRead || message.readAt) {
    return "✓✓";
  }

  if (message.deliveredAt) {
    return "✓✓";
  }

  return "✓";
};

const MessageBubble = ({ message, isOwnMessage }) => {
  const messageType = message.type || "text";

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-lg px-3 py-2 shadow-sm sm:max-w-[68%] ${
          isOwnMessage
            ? "bg-sky-600 text-white"
            : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {messageType === "image" && message.imageUrl ? (
          <a
            className="block overflow-hidden rounded-lg"
            href={message.imageUrl}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={message.text ? decodeMessageText(message.text) : "Chat image"}
              className="max-h-80 w-full max-w-sm object-cover"
              loading="lazy"
              src={message.imageUrl}
            />
          </a>
        ) : null}

        {messageType === "video" && message.videoUrl ? (
          <video
            className="max-h-80 w-full max-w-sm rounded-lg bg-black"
            controls
            preload="metadata"
            src={message.videoUrl}
          />
        ) : null}

        {message.text ? (
          <p className={`${messageType === "text" ? "" : "mt-2"} whitespace-pre-wrap break-words text-sm leading-6`}>
            {decodeMessageText(message.text)}
          </p>
        ) : null}
        <div
          className={`mt-1 flex items-center justify-end gap-2 text-[11px] font-semibold ${
            isOwnMessage ? "text-sky-100" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwnMessage && (
            <span
              className={message.isRead || message.readAt ? "text-cyan-100" : ""}
              title={getStatusLabel(message)}
            >
              {getStatusMark(message)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
