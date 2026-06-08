// Static 6-month bar chart — not affected by date/platform filters (constant data)
const MONTHS = [
  { month: "Jan", positive: 62, negative: 38 },
  { month: "Feb", positive: 58, negative: 42 },
  { month: "Mar", positive: 71, negative: 29 },
  { month: "Apr", positive: 65, negative: 35 },
  { month: "May", positive: 74, negative: 26 },
  { month: "Jun", positive: 68, negative: 32 },
];

const POS_COLOR = "#4ade80";
const NEG_COLOR = "#f87171";

const W = 480, H = 180;
const PAD = { top: 28, right: 16, bottom: 32, left: 24 };
const chartW = W - PAD.left - PAD.right;
const chartH = H - PAD.top - PAD.bottom;

const BAR_GROUP = chartW / MONTHS.length;
const BAR_W = BAR_GROUP * 0.28;
const GAP = BAR_GROUP * 0.06;
const GROUP_OFFSET = (BAR_GROUP - (BAR_W * 2 + GAP)) / 2;

export default function MonthlyBarChart() {
  return (
    <div className="glass-panel glass-pink h-full flex flex-col p-4 fade-up" style={{ animationDelay: "0.12s" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest">Monthly Trend</h3>
          <p className="text-[10px] text-white/35 mt-0.5">Last 6 months — positive vs negative</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: POS_COLOR }} />
            <span className="text-[10px] text-white/45">Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: NEG_COLOR }} />
            <span className="text-[10px] text-white/45">Negative</span>
          </div>
          <span className="chip text-[9px] text-white/35">Static</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={POS_COLOR} stopOpacity="0.9" />
              <stop offset="100%" stopColor={POS_COLOR} stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NEG_COLOR} stopOpacity="0.9" />
              <stop offset="100%" stopColor={NEG_COLOR} stopOpacity="0.35" />
            </linearGradient>
            <filter id="barGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map(val => {
            const y = PAD.top + chartH - (val / 100) * chartH;
            return (
              <g key={val}>
                <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={PAD.left - 4} y={y + 3.5}
                      fill="rgba(255,255,255,0.25)" fontSize="7.5" textAnchor="end"
                      fontFamily="Hanken Grotesk">
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {MONTHS.map((d, i) => {
            const gx = PAD.left + i * BAR_GROUP + GROUP_OFFSET;
            const posH = (d.positive / 100) * chartH;
            const negH = (d.negative / 100) * chartH;
            const posX = gx;
            const negX = gx + BAR_W + GAP;
            const baseY = PAD.top + chartH;

            return (
              <g key={d.month}>
                {/* Positive bar */}
                <rect x={posX} y={baseY - posH} width={BAR_W} height={posH}
                      rx={3} ry={3} fill="url(#posGrad)" filter="url(#barGlow)" />
                {/* Positive pct label */}
                <text x={posX + BAR_W / 2} y={baseY - posH - 4}
                      fill={POS_COLOR} fontSize="7.5" textAnchor="middle"
                      fontFamily="Hanken Grotesk" fontWeight="700">
                  {d.positive}%
                </text>

                {/* Negative bar */}
                <rect x={negX} y={baseY - negH} width={BAR_W} height={negH}
                      rx={3} ry={3} fill="url(#negGrad)" filter="url(#barGlow)" />
                {/* Negative pct label */}
                <text x={negX + BAR_W / 2} y={baseY - negH - 4}
                      fill={NEG_COLOR} fontSize="7.5" textAnchor="middle"
                      fontFamily="Hanken Grotesk" fontWeight="700">
                  {d.negative}%
                </text>

                {/* Month label */}
                <text x={gx + BAR_W + GAP / 2} y={baseY + 11}
                      fill="rgba(255,255,255,0.45)" fontSize="8" textAnchor="middle"
                      fontFamily="Hanken Grotesk" fontWeight="600">
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
