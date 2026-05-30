import { Moon, Sun } from "lucide-react";
import useTheme from "../../hooks/useTheme";

const ThemeToggle = ({ compact = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
        compact ? "w-10 px-0" : ""
      }`}
      onClick={toggleTheme}
      title={isDarkMode ? "Light mode" : "Dark mode"}
      type="button"
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {!compact && <span>{isDarkMode ? "Light" : "Dark"}</span>}
    </button>
  );
};

export default ThemeToggle;
