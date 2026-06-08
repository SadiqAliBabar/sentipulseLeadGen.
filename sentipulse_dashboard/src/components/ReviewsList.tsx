import { useState } from "react";
import { Star, Heart, ExternalLink } from "lucide-react";
import type { Filters } from "./FilterBar";

interface Props { filters: Filters; }

const MOCK_REVIEWS = [
  {
    id: 1,
    user: "Ahmed K.",
    platform: "Google",
    branch: "Branch A",
    date: "2026-06-05",
    rating: 5,
    sentRating: 4.8,
    sentiment: "positive" as const,
    text: "Amazing food — the biryani was absolutely delicious. Service was quick and staff were very friendly. Will definitely come back again!",
  },
  {
    id: 2,
    user: "Sara M.",
    platform: "Foodpanda",
    branch: "Branch B",
    date: "2026-06-03",
    rating: 3,
    sentRating: 3.1,
    sentiment: "neutral" as const,
    text: "Food was okay, delivery took a bit longer than expected but the quality was decent. Portion sizes could be better for the price.",
  },
  {
    id: 3,
    user: "Usman T.",
    platform: "Google",
    branch: "Branch A",
    date: "2026-06-01",
    rating: 2,
    sentRating: 1.9,
    sentiment: "negative" as const,
    text: "Disappointing experience — the food arrived cold and the portion was way too small. Expected better based on the reviews.",
  },
];

const SENTIMENT_COLORS = {
  positive: { text: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
  neutral:  { text: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)" },
  negative: { text: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)" },
};

const PLATFORM_COLORS: Record<string, string> = {
  Google:    "#4285F4",
  Foodpanda: "#d70f64",
  "In-House": "#f59e0b",
};

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={10}
              fill={i < Math.round(value) ? "#fbbf24" : "transparent"}
              stroke={i < Math.round(value) ? "#fbbf24" : "rgba(255,255,255,0.2)"}
              strokeWidth={1.5} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function ReviewsList({ filters: _ }: Props) {
  const [active, setActive] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const shown = MOCK_REVIEWS.filter(r => active === "all" || r.sentiment === active);

  return (
    <div className="glass-panel glass-purple h-full flex flex-col p-4 fade-up" style={{ animationDelay: "0.08s" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Latest Reviews</h3>
        <span className="chip text-white/40 text-[10px]">{MOCK_REVIEWS.length} shown</span>
      </div>

      {/* Sentiment filter pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {(["all", "positive", "neutral", "negative"] as const).map(s => {
          const isActive = active === s;
          const col = s === "all" ? "rgba(255,255,255,0.6)" : SENTIMENT_COLORS[s].text;
          return (
            <button key={s} onClick={() => setActive(s)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize transition-all border"
                    style={{
                      background: isActive ? (s === "all" ? "rgba(255,255,255,0.12)" : SENTIMENT_COLORS[s].bg) : "transparent",
                      borderColor: isActive ? col : "rgba(255,255,255,0.08)",
                      color: isActive ? col : "rgba(255,255,255,0.35)",
                    }}>
              {s}
            </button>
          );
        })}
      </div>

      {/* Review cards */}
      <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-0.5">
        {shown.map(r => {
          const sc = SENTIMENT_COLORS[r.sentiment];
          return (
            <div key={r.id} className="rounded-xl p-3 border transition-all hover:scale-[1.01]"
                 style={{ background: sc.bg, borderColor: sc.border }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                       style={{ background: `${sc.text}22`, color: sc.text, border: `1px solid ${sc.border}` }}>
                    {r.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/85 leading-none">{r.user}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{r.branch} · {timeAgo(r.date)}</p>
                  </div>
                </div>
                {/* Platform badge */}
                <span className="chip text-[9px] font-bold flex-shrink-0"
                      style={{ color: PLATFORM_COLORS[r.platform] || "#aaa", borderColor: `${PLATFORM_COLORS[r.platform]}30` }}>
                  {r.platform}
                </span>
              </div>

              {/* Review text */}
              <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2 mb-2">{r.text}</p>

              {/* Ratings row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <StarRow value={r.rating} />
                    <span className="text-[10px] text-white/40">{r.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={9} fill="#f472b6" stroke="#f472b6" />
                    <span className="text-[10px] text-white/40">{r.sentRating}</span>
                  </div>
                </div>
                <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ color: sc.text }}>
                  {r.sentiment}
                </span>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/25 text-xs">No reviews for this filter</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/30">Filtered by date & platform</span>
        <button className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
          <ExternalLink size={10} /> View all
        </button>
      </div>
    </div>
  );
}
