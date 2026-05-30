import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/chat/ThemeToggle";
import useTheme from "../../hooks/useTheme";

const SettingsPage = () => {
  const { theme } = useTheme();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-white shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-black text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            to="/chat"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Chat
          </Link>
          <ThemeToggle />
        </div>

        <div className="p-5 sm:p-7">
          <p className="text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-400">
            Appearance
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Settings
          </h1>
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Theme
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Current preference: {theme}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default SettingsPage;
