const TypingIndicator = ({ name }) => {
  if (!name) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
      <span>{name} is typing</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
      </span>
    </div>
  );
};

export default TypingIndicator;
