import { useMemo } from "react";
import type { Filters } from "./FilterBar";

interface Props { filters: Filters; }

const MOCK = { positive: 847, neutral: 324, negative: 192 };
const COLORS = {
  positive: "#4ade80",
  neutral:  "#60a5fa",
  negative: "#f87171",
};
const LABELS = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

function donutPath(cx: number, cy: number, r: number, R: number, startAngle: number, endAngle: number) {
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const s = toRad(startAngle), e = toRad(endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s);
  const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e);
  const x3 = cx + r * Math.cos(e), y3 = cy + r * Math.sin(e);
  const x4 = cx + r * Math.cos(s), y4 = cy + r * Math.sin(s);
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
}

export default function SentimentDistribution({ filters: _ }: Props) {
  const data = MOCK;
  const total = data.positive + data.neutral + data.negative;
  const dominant = data.positive >= data.neutral && data.positive >= data.negative
    ? "positive" : data.neutral >= data.negative ? "neutral" : "negative";

  const segments = useMemo(() => {
    let angle = 0;
    return (["positive", "neutral", "negative"] as const).map(key => {
      const pct = data[key] / total;
      const sweep = pct * 360;
      const path = donutPath(80, 80, 48, 72, angle, angle + sweep - 1);
      angle += sweep;
      return { key, pct, path, color: COLORS[key], count: data[key] };
    });
  }, [data, total]);

  return (
    <div className="glass-panel glass-teal h-full flex flex-col p-4 fade-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Sentiment Split</h3>
        <span className="chip text-white/50">Live</span>
      </div>

      {/* Donut */}
      <div className="flex items-center gap-4 flex-1 min-h-0">
        <div className="relative flex-shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Glow defs */}
            <defs>
              {segments.map(s => (
                <filter key={s.key} id={`glow-${s.key}`}>
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              ))}
            </defs>
            {/* Track */}
            <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="24" />
            {/* Segments */}
            {segments.map(s => (
              <path key={s.key} d={s.path} fill={s.color} opacity="0.88"
                    filter={`url(#glow-${s.key})`} />
            ))}
            {/* Center text */}
            <text x="80" y="75" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="Hanken Grotesk">
              {total.toLocaleString()}
            </text>
            <text x="80" y="91" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="Hanken Grotesk">
              total reviews
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1">
          {segments.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                  <span className="text-xs text-white/65 font-medium">{LABELS[s.key]}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: s.color }}>{(s.pct * 100).toFixed(1)}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${s.pct * 100}%`, background: s.color, opacity: 0.75 }} />
              </div>
              <span className="text-[10px] text-white/35 mt-0.5 block">{s.count.toLocaleString()} reviews</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dominant badge */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Dominant</span>
        <span className="chip font-bold text-[10px]" style={{ color: COLORS[dominant], borderColor: `${COLORS[dominant]}40` }}>
          {LABELS[dominant]}
        </span>
        <span className="text-[10px] text-white/35 ml-auto">
          {((data[dominant] / total) * 100).toFixed(1)}% of reviews
        </span>
      </div>
    </div>
  );
}
