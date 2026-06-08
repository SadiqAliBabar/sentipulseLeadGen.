import { ViewMode } from "../types";
import { Bell, Settings, Sun, Moon } from "lucide-react";

interface HeaderProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onExportCsv?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function Header({ 
  activeView, 
  onViewChange, 
  onExportCsv,
  isDarkMode = false,
  onToggleDarkMode
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-transparent">
      {/* Brand Logo - Clicking takes you back to Dashboard */}
      <button
        onClick={() => onViewChange("dashboard")}
        className="flex items-center gap-0.5 cursor-pointer text-left focus:outline-none transition-transform hover:scale-102"
        id="btn-brand-logo"
      >
        <span className="font-sans font-black text-4xl tracking-tight text-[#008378] dark:text-teal-400 drop-shadow-sm select-none">
          LEADGEN
        </span>
        <span className="font-black text-4xl text-[#b5005d] dark:text-pink-400 leading-none select-none">.</span>
      </button>

      {/* Navigation depending on Active Screen */}
      {activeView === "process-loop" ? (
        <nav className="flex items-center gap-4">
          <button
            onClick={() => onViewChange("dashboard")}
            className="px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all bg-[#00685f] text-white border border-[#00685f]/20 shadow-lg shadow-[#00685f]/10 hover:brightness-110 active:scale-95 cursor-pointer dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/50 dark:shadow-teal-950/20"
            id="nav-lead-discovery"
          >
            Lead Discovery
          </button>
          <button
            onClick={() => onViewChange("campaigns")}
            className="px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all bg-white/50 text-[#3d4947] border border-[#bcc9c6]/30 hover:bg-white/80 active:scale-95 cursor-pointer dark:bg-slate-800/50 dark:text-slate-200 dark:border-slate-700/50 dark:hover:bg-slate-800/80"
            id="nav-campaigns-loop"
          >
            Campaigns
          </button>
        </nav>
      ) : (
        <div className="flex items-center gap-4 sm:gap-8 flex-1 justify-between max-w-5xl ml-4 sm:ml-12">
          {/* Dashboard specific menus */}
          <nav className="flex items-center gap-4 sm:gap-8">
            {(["dashboard", "campaigns", "run-pipeline"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewChange(mode as ViewMode)}
                className={`relative py-1 text-sm sm:text-base font-semibold tracking-wide capitalize cursor-pointer transition-colors ${
                  activeView === mode
                    ? "text-[#191c1d] dark:text-slate-100"
                    : "text-[#3d4947]/70 dark:text-slate-400 hover:text-[#191c1d] dark:hover:text-slate-100"
                }`}
                id={`nav-${mode}`}
              >
                {mode === "dashboard" ? "Dashboard" : mode === "run-pipeline" ? "Run Pipeline" : mode}
                {activeView === mode && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00685f] dark:bg-teal-400" />
                )}
              </button>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-full text-[#3d4947]/70 hover:text-[#191c1d] hover:bg-white/40 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                id="btn-theme-toggle"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-amber-300" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-600" />
                )}
              </button>
            )}

            {/* Settings Wheel hidden (will be built later) */}

            {/* User Profile Avatar */}
            <div className="w-10 h-10 rounded-full border border-neutral-300 dark:border-slate-700 overflow-hidden shadow-sm select-none">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
