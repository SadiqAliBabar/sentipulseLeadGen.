import { useState } from "react";
import FilterBar, { type Filters } from "./components/FilterBar";
import SentimentDistribution from "./components/SentimentDistribution";
import ReviewsList from "./components/ReviewsList";
import ReviewSankey from "./components/ReviewSankey";
import MonthlyBarChart from "./components/MonthlyBarChart";

const today = new Date();
const sevenWeeksAgo = new Date(today);
sevenWeeksAgo.setDate(today.getDate() - 49);

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function App() {
  const [filters, setFilters] = useState<Filters>({
    startDate: fmtDate(sevenWeeksAgo),
    endDate:   fmtDate(today),
    platform:  "All Platforms",
    branch:    "All Branches",
  });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: "#080810" }}>
      {/* Ambient background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-screen p-3 gap-3">

        {/* ── Filter bar ───────────────────────────────────── */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* ── Charts grid ──────────────────────────────────── */}
        <div className="flex gap-3 flex-1 min-h-0">

          {/* LEFT column — 1/3 */}
          <div className="flex flex-col gap-3 w-1/3 min-h-0">
            {/* Sentiment Distribution — top ~40% */}
            <div className="flex-[2] min-h-0">
              <SentimentDistribution filters={filters} />
            </div>
            {/* Reviews List — bottom ~60% */}
            <div className="flex-[3] min-h-0">
              <ReviewsList filters={filters} />
            </div>
          </div>

          {/* RIGHT column — 2/3 */}
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Sankey — top ~60% */}
            <div className="flex-[3] min-h-0">
              <ReviewSankey filters={filters} />
            </div>
            {/* Monthly Bar Chart — bottom ~40% */}
            <div className="flex-[2] min-h-0">
              <MonthlyBarChart />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
