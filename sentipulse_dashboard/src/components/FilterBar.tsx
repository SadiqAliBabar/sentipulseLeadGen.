import React from "react";
import { CalendarDays, Monitor, GitBranch, Search } from "lucide-react";

export interface Filters {
  startDate: string;
  endDate: string;
  platform: string;
  branch: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const PLATFORMS = ["All Platforms", "Google", "Foodpanda", "In-House"];
const BRANCHES  = ["All Branches", "Branch A", "Branch B", "Branch C", "Branch D"];

export default function FilterBar({ filters, onChange }: Props) {
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="glass-panel flex flex-wrap items-center gap-3 px-5 py-3">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#00b4a0,#005f58)" }}>
          <span className="text-white font-black text-xs">SP</span>
        </span>
        <span className="font-bold text-sm tracking-tight text-white/90">SentiPulse</span>
      </div>

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      {/* Date range */}
      <label className="flex items-center gap-1.5 text-white/50 text-xs">
        <CalendarDays size={13} className="text-[var(--brand-teal)]" />
        <span className="hidden sm:inline">From</span>
      </label>
      <input
        type="date"
        value={filters.startDate}
        onChange={set("startDate")}
        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[var(--brand-teal)] transition-colors"
      />
      <span className="text-white/30 text-xs">→</span>
      <input
        type="date"
        value={filters.endDate}
        onChange={set("endDate")}
        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[var(--brand-teal)] transition-colors"
      />

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      {/* Platform */}
      <label className="flex items-center gap-1.5 text-white/50 text-xs">
        <Monitor size={13} className="text-[var(--brand-purple)]" />
      </label>
      <select
        value={filters.platform}
        onChange={set("platform")}
        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[var(--brand-purple)] transition-colors appearance-none cursor-pointer"
      >
        {PLATFORMS.map(p => <option key={p} value={p} className="bg-[#1a1a2e]">{p}</option>)}
      </select>

      {/* Branch */}
      <label className="flex items-center gap-1.5 text-white/50 text-xs">
        <GitBranch size={13} className="text-[var(--brand-blue)]" />
      </label>
      <select
        value={filters.branch}
        onChange={set("branch")}
        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[var(--brand-blue)] transition-colors appearance-none cursor-pointer"
      >
        {BRANCHES.map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
      </select>

      {/* Search btn */}
      <button
        onClick={() => onChange({ ...filters })}
        className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
        style={{ background: "linear-gradient(135deg,#00b4a0,#0077cc)" }}
      >
        <Search size={12} />
        Apply
      </button>
    </div>
  );
}
