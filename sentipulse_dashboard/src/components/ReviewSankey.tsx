import { useMemo, useState } from "react";
import type { Filters } from "./FilterBar";

interface Props { filters: Filters; }

type Sentiment = "positive" | "neutral" | "negative";

const ALL_LINKS = [
  { source: "positive", target: "food",     value: 380 },
  { source: "positive", target: "service",  value: 210 },
  { source: "positive", target: "price",    value: 95  },
  { source: "positive", target: "ambiance", value: 107 },
  { source: "positive", target: "others",   value: 55  },
  { source: "neutral",  target: "food",     value: 112 },
  { source: "neutral",  target: "service",  value: 85  },
  { source: "neutral",  target: "price",    value: 67  },
  { source: "neutral",  target: "ambiance", value: 38  },
  { source: "neutral",  target: "others",   value: 22  },
  { source: "negative", target: "food",     value: 67  },
  { source: "negative", target: "service",  value: 76  },
  { source: "negative", target: "price",    value: 28  },
  { source: "negative", target: "ambiance", value: 12  },
  { source: "negative", target: "others",   value: 9   },
];

const SRC_COLORS: Record<string, string> = {
  positive: "#4ade80",
  neutral:  "#60a5fa",
  negative: "#f87171",
};
const TGT_COLORS: Record<string, string> = {
  food:     "#F28E2B",
  service:  "#4E79A7",
  price:    "#E15759",
  ambiance: "#76B7B2",
  others:   "#9ca3af",
};
const TGT_LABELS: Record<string, string> = {
  food: "Food", service: "Service", price: "Price", ambiance: "Ambiance", others: "Others",
};

const W = 420, H = 340, NODE_W = 14, PAD = 6;

function computeLayout(filter: Sentiment | "all") {
  const links = filter === "all" ? ALL_LINKS : ALL_LINKS.filter(l => l.source === filter);
  const total = links.reduce((s, l) => s + l.value, 0);

  // Source nodes
  const srcKeys = filter === "all"
    ? ["positive", "neutral", "negative"]
    : [filter];

  const srcTotals = srcKeys.map(k => ({ k, v: links.filter(l => l.source === k).reduce((s, l) => s + l.value, 0) }));
  const srcTotalSum = srcTotals.reduce((s, x) => s + x.v, 0);
  const usableH = H - PAD * (srcKeys.length - 1);
  let sy = 0;
  const srcNodes = srcTotals.map(({ k, v }) => {
    const h = (usableH * v) / srcTotalSum;
    const node = { id: k, x: 0, y: sy, h, color: SRC_COLORS[k] };
    sy += h + PAD;
    return node;
  });

  // Target nodes
  const tgtKeys = ["food", "service", "price", "ambiance", "others"];
  const tgtTotals = tgtKeys.map(k => ({ k, v: links.filter(l => l.target === k).reduce((s, l) => s + l.value, 0) }));
  const tgtTotalSum = tgtTotals.reduce((s, x) => s + x.v, 0) || 1;
  const usableHt = H - PAD * (tgtKeys.length - 1);
  let ty = 0;
  const tgtNodes = tgtTotals.map(({ k, v }) => {
    const h = (usableHt * v) / tgtTotalSum;
    const node = { id: k, x: W - NODE_W, y: ty, h, color: TGT_COLORS[k] };
    ty += h + PAD;
    return node;
  });

  // Link paths
  const srcOffsets: Record<string, number> = {};
  const tgtOffsets: Record<string, number> = {};
  const linkPaths = links.map(link => {
    const src = srcNodes.find(n => n.id === link.source)!;
    const tgt = tgtNodes.find(n => n.id === link.target)!;
    const lh = (usableH * link.value) / srcTotalSum;
    const sOff = srcOffsets[link.source] || 0;
    const tOff = tgtOffsets[link.target] || 0;

    const x0 = NODE_W, y0 = src.y + sOff, y0e = y0 + lh;
    const x1 = W - NODE_W, y1 = tgt.y + tOff, y1e = y1 + lh;
    const mx = (x0 + x1) / 2;

    const path = `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1} L ${x1} ${y1e} C ${mx} ${y1e}, ${mx} ${y0e}, ${x0} ${y0e} Z`;
    srcOffsets[link.source] = sOff + lh;
    tgtOffsets[link.target] = tOff + lh;
    const pct = total ? ((link.value / total) * 100).toFixed(1) : "0";
    return { ...link, path, color: SRC_COLORS[link.source], tgtColor: TGT_COLORS[link.target], pct };
  });

  return { srcNodes, tgtNodes, linkPaths };
}

export default function ReviewSankey({ filters: _ }: Props) {
  const [filter, setFilter] = useState<Sentiment | "all">("all");
  const layout = useMemo(() => computeLayout(filter), [filter]);
  const [hovered, setHovered] = useState<string | null>(null);

  const pillStyle = (s: Sentiment | "all") => {
    const col = s === "all" ? "rgba(255,255,255,0.6)" : SRC_COLORS[s];
    const active = filter === s;
    return {
      background: active ? `${col}18` : "transparent",
      borderColor: active ? col : "rgba(255,255,255,0.08)",
      color: active ? col : "rgba(255,255,255,0.35)",
    };
  };

  return (
    <div className="glass-panel glass-blue h-full flex flex-col p-4 fade-up" style={{ animationDelay: "0.05s" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Aspect Sentiment Flow</h3>
          <p className="text-[10px] text-white/35 mt-0.5">Sankey — sentiment → review aspect</p>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "positive", "neutral", "negative"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize transition-all border"
                    style={pillStyle(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Sankey */}
      <div className="flex-1 min-h-0 relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            {layout.linkPaths.map((lp, i) => (
              <linearGradient key={i} id={`lg-${i}`} x1="0" x2="1">
                <stop offset="0%" stopColor={lp.color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={lp.tgtColor} stopOpacity="0.55" />
              </linearGradient>
            ))}
          </defs>

          {/* Links */}
          {layout.linkPaths.map((lp, i) => {
            const key = `${lp.source}-${lp.target}`;
            const isHov = hovered === key;
            return (
              <path key={i} d={lp.path}
                    fill={`url(#lg-${i})`}
                    opacity={hovered ? (isHov ? 0.85 : 0.18) : 0.45}
                    style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}>
                <title>{lp.source} → {TGT_LABELS[lp.target]}: {lp.value} reviews ({lp.pct}%)</title>
              </path>
            );
          })}

          {/* Source nodes */}
          {layout.srcNodes.map(n => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={NODE_W} height={n.h} rx={4}
                    fill={n.color} opacity="0.85"
                    style={{ filter: `drop-shadow(0 0 6px ${n.color}66)` }} />
              <text x={NODE_W + 5} y={n.y + n.h / 2 + 4}
                    fill="rgba(255,255,255,0.65)" fontSize="9" fontFamily="Hanken Grotesk" fontWeight="600"
                    style={{ textTransform: "capitalize" }}>
                {n.id}
              </text>
            </g>
          ))}

          {/* Target nodes */}
          {layout.tgtNodes.map(n => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={NODE_W} height={n.h} rx={4}
                    fill={n.color} opacity="0.85"
                    style={{ filter: `drop-shadow(0 0 6px ${n.color}66)` }} />
              <text x={n.x - 4} y={n.y + n.h / 2 + 4}
                    fill="rgba(255,255,255,0.65)" fontSize="9" fontFamily="Hanken Grotesk" fontWeight="600"
                    textAnchor="end">
                {TGT_LABELS[n.id]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-3">
        {Object.entries(TGT_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
            <span className="text-[10px] text-white/40">{TGT_LABELS[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
