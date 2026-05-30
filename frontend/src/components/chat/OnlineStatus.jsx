const OnlineStatus = ({ isOnline, showLabel = false }) => {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full border border-white ${
          isOnline ? "bg-emerald-500" : "bg-slate-400"
        }`}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </span>
  );
};

export default OnlineStatus;
