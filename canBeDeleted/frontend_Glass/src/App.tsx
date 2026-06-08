import { useState, useEffect } from "react";
import { ViewMode } from "./types";
import { STAGES } from "./data";
import Header from "./components/Header";
import ProcessLoop from "./components/ProcessLoop";
import DashboardView from "./components/DashboardView";
import Particles from "./components/Particles";

import RunPipelineView from "./components/RunPipelineView";
import { 
  BarChart3, 
  Settings, 
  History, 
  MapPin, 
  ArrowRight, 
  Mail, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Trophy,
  Users
} from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>("dashboard");
  const [category, setCategory] = useState<string>("dentist");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "info" }>>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const addToast = (message: string, type: "success" | "info" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleExportCsv = () => {
    addToast("Exporting Lahore Dental Clinic leads dataset... Lahore_Dentist_Leads.csv saved to local reports!", "success");
  };

  // Static Custom Campaigns Tracker Overview
  const renderCampaigns = () => (
    <div className="pt-28 px-8 max-w-7xl mx-auto w-full animate-[fadeIn_0.35s_ease-out]">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-[#191c1d] dark:text-slate-100">
          Active Outreach Campaigns
        </h2>
        <p className="text-xs text-[#3d4947]/75 dark:text-slate-400 font-semibold mt-1">
          Monitor your outbound cold audits, dispatch states, and engagement matrices
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-neutral-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
              <th className="p-4.5 text-[10px] font-black uppercase tracking-wider text-[#3d4947]/50 dark:text-slate-400/60">Target Clinic</th>
              <th className="p-4.5 text-[10px] font-black uppercase tracking-wider text-[#3d4947]/50 dark:text-slate-400/60">Est. Impact Valuation</th>
              <th className="p-4.5 text-[10px] font-black uppercase tracking-wider text-[#3d4947]/50 dark:text-slate-400/60">Primary Campaign Pitch</th>
              <th className="p-4.5 text-[10px] font-black uppercase tracking-wider text-[#3d4947]/50 dark:text-slate-400/60">Launch date</th>
              <th className="p-4.5 text-[10px] font-black uppercase tracking-wider text-[#3d4947]/50 dark:text-slate-400/60">Campaign status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/80 font-semibold text-xs text-[#2D3748] dark:text-slate-300">
            {[
              { name: "Advanced Dental Practice", impact: "PKR 250k-400k", subject: "Review completeness checklist for Lahore seekers", date: "June 04, 2026", status: "Delivered", color: "bg-[#00685f] text-white dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/50" },
              { name: "Lahore Dental Hub", impact: "PKR 500k-750k", subject: "Critical Chrome safety bypass audit alert", date: "Pending setup", status: "Draft-Pending", color: "bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
              { name: "Prime Care Dental", impact: "PKR 350k-550k", subject: "Mobile rendering diagnostic checklist", date: "June 02, 2026", status: "Opened", color: "bg-[#89f5e7] text-[#00201d] dark:bg-teal-950/60 dark:text-teal-300 dark:border dark:border-teal-800/50" },
              { name: "De Dental Pro", impact: "PKR 150k-250k", subject: "Automated local ranking position trends comparison", date: "June 01, 2026", status: "Opened", color: "bg-[#89f5e7] text-[#00201d] dark:bg-teal-950/60 dark:text-teal-300 dark:border dark:border-teal-800/50" }
            ].map((camp, idx) => (
              <tr key={idx} className="hover:bg-[#f4fffc]/30 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4.5 font-bold text-neutral-800 dark:text-slate-200">{camp.name}</td>
                <td className="p-4.5 text-neutral-700 dark:text-slate-300">{camp.impact}</td>
                <td className="p-4.5 text-neutral-500 dark:text-slate-400 italic max-w-xs truncate">{camp.subject}</td>
                <td className="p-4.5 text-neutral-400 dark:text-slate-500">{camp.date}</td>
                <td className="p-4.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${camp.color}`}>
                    {camp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const isSpecialView = activeView === "dashboard" || activeView === "campaigns" || activeView === "run-pipeline";

  return (
    <div className={`relative min-h-screen bg-[#f8f9fa] dark:bg-transparent w-full transition-colors duration-300 overflow-hidden ${isSpecialView ? 'special-cursor' : ''}`} id="application-container-root">
      
      {/* Ambient Liquid Background Orbs for Dark Mode */}
      {darkMode && (
        <>
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="orb orb-4"></div>
          
          {isSpecialView && (
            <Particles isDarkMode={darkMode} />
          )}
        </>
      )}

      {/* Visual Header */}
      <Header 
        activeView={activeView} 
        onViewChange={(view) => setActiveView(view)} 
        onExportCsv={handleExportCsv}
        isDarkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
      />

      {/* Screen Routing */}
      <main className="relative w-full">
        {activeView === "process-loop" && (
          <ProcessLoop 
            onViewChange={(view) => setActiveView(view)} 
            category={category}
            onCategoryChange={setCategory}
            isDarkMode={darkMode}
          />
        )}

        {activeView === "dashboard" && (
          <DashboardView category={category} onCategoryChange={setCategory} isDarkMode={darkMode} />
        )}

        {activeView === "campaigns" && renderCampaigns()}



        {activeView === "run-pipeline" && (
          <RunPipelineView isDarkMode={darkMode} />
        )}
      </main>

      {/* Dynamic Toast feedback layer */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4.5 py-3 rounded-lg text-xs font-bold shadow-lg border animate-[scaleIn_0.25s_ease-out] flex items-center gap-2 select-none pointer-events-auto ${
              t.type === "success"
                ? "bg-[#f4fffc] border-[#00685f]/30 text-[#00685f] dark:bg-emerald-950/80 dark:border-emerald-800/50 dark:text-emerald-300"
                : "bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-300"
            }`}
          >
            <CheckCircle className="w-4 h-4 text-[#008378] dark:text-teal-400 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
