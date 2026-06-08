import { useState } from "react";
import {
  Download,
  PlayCircle,
  CheckCircle,
  ChevronRight,
  Search,
  Star,
  Zap,
  Globe,
  BarChart2,
  Users,
  FileText,
  Mail,
  Link2,
  ShieldCheck,
  Rocket,
  MapPin,
  Briefcase,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

// ─── Module definitions ────────────────────────────────────────────────────
const buildModules = (maxReviews: number) => [
  {
    id: 1,
    icon: Search,
    label: "Lead Discovery",
    emoji: "🔍",
    tagline: "Find the businesses",
    desc: "Goes onto the web and maps out all the businesses in your city. Grabs their names, phone numbers, and basic info into our database.",
    command: (cat: string, city: string) =>
      `uv run python -m lead_discovery.run --category ${cat} --city ${city}`,
    color: "#008378",
  },
  {
    id: 2,
    icon: ShieldCheck,
    label: "Google Profile Audit",
    emoji: "📋",
    tagline: "Check their Google listing",
    desc: "Inspects each business's Google Business Profile to see if they're missing photos, opening hours, or a website — all easy wins for us to pitch.",
    command: (cat: string, _city: string) =>
      `uv run python -m lead_auditor.audit_run --category ${cat}`,
    color: "#0891b2",
  },
  {
    id: 3,
    icon: Zap,
    label: "Speed Test",
    emoji: "⚡",
    tagline: "How fast is their website?",
    desc: "Tests how fast their website loads on a mobile phone. A slow website = a huge red flag that we can fix for them.",
    command: (cat: string, _city: string) =>
      `uv run python -m lead_auditor.pagespeed_api --category ${cat}`,
    color: "#d97706",
  },
  {
    id: 4,
    icon: Star,
    label: "Reviews Scraper",
    emoji: "⭐",
    tagline: "Read what customers say",
    desc: "Grabs the latest Google reviews so we can understand what people love and hate about the business.",
    command: (cat: string, _city: string) =>
      `uv run python -m lead_reviews_scraper.run --category ${cat} --max-reviews ${maxReviews}`,
    color: "#7c3aed",
  },
  {
    id: 5,
    icon: FileText,
    label: "AI Review Summary",
    emoji: "🤖",
    tagline: "Let AI read the reviews",
    desc: "Uses AI to read all the reviews and write a smart summary — like \"People love the food but complain about parking\" — so you know the real story fast.",
    command: (cat: string, _city: string) =>
      `uv run python -m summarize_info.review_summarize --category ${cat}`,
    color: "#db2777",
  },
  {
    id: 6,
    icon: BarChart2,
    label: "Rank Tracker",
    emoji: "📊",
    tagline: "Where do they rank on Google?",
    desc: "Simulates a Google search from your city to find the exact position each business appears when someone searches for it.",
    command: (cat: string, city: string) =>
      `uv run python -m rank_tracker.rank_analysis --category ${cat} --city ${city}`,
    color: "#059669",
  },
  {
    id: 7,
    icon: Globe,
    label: "Website Crawler",
    emoji: "🕷️",
    tagline: "Visit their website like a robot",
    desc: "Visits every page of their website automatically to gather data — similar to how Google crawls it.",
    command: (cat: string, _city: string) =>
      `uv run python -m website_crawler.web_crawler --category ${cat}`,
    color: "#0284c7",
  },
  {
    id: 8,
    icon: Link2,
    label: "SEO Deep Audit",
    emoji: "🔗",
    tagline: "Find the hidden problems",
    desc: "Acts like an SEO expert: checks for broken links, missing call-to-action buttons, and security issues (no HTTPS). These are all problems we can sell solutions to.",
    command: (cat: string, _city: string) =>
      `uv run python -m seo_deepaudit.audit_run --category ${cat}`,
    color: "#dc2626",
  },
  {
    id: 9,
    icon: ShieldCheck,
    label: "Lighthouse SEO Audit",
    emoji: "🏎️",
    tagline: "Google's own SEO scoring tool",
    desc: "Runs Google Lighthouse against each website via the PageSpeed Insights API. Checks for missing title tags, meta descriptions, broken links, image alt text, mobile UX issues, and more — gives each site an SEO score out of 100.",
    command: (cat: string, _city: string) =>
      `uv run python -m lead_auditor.lighthouse_audit --category ${cat}`,
    color: "#f59e0b",
  },
  {
    id: 10,
    icon: Users,
    label: "Competitor Finder",
    emoji: "🏆",
    tagline: "Who are their rivals nearby?",
    desc: "Finds other businesses in the same area. Great ammo to show your client who they're competing against.",
    command: (cat: string, _city: string) =>
      `uv run python -m neighbour_finder.finder_run --category ${cat}`,
    color: "#7c3aed",
  },
  {
    id: 11,
    icon: BarChart2,
    label: "SEO Score Report",
    emoji: "📈",
    tagline: "Give them a final grade",
    desc: "Takes all the data from every module and gives the business a grade from A to F, plus an estimate of how much revenue they're losing from poor SEO.",
    command: (cat: string, _city: string) =>
      `uv run python -m seo_report.report_run --category ${cat}`,
    color: "#008378",
  },
  {
    id: 12,
    icon: Mail,
    label: "Outreach Prep",
    emoji: "📧",
    tagline: "Write the perfect pitch email",
    desc: "The final step. Prepares personalised pitch emails based on the exact weaknesses found — ready for you to send.",
    command: (cat: string, _city: string) =>
      `uv run python -m seo_outreach.outreach_run --category ${cat}`,
    color: "#059669",
  },
];

// ─── HTML Guide Generator ─────────────────────────────────────────────────
function buildHTMLGuide(category: string, city: string, maxReviews: number): string {
  const cliCat = category.trim().toLowerCase();
  const modules = buildModules(maxReviews);

  const moduleBlocks = modules.map((m) => `
    <div class="module" style="--accent:${m.color}">
      <div class="module-head">
        <div class="step-dot" style="background:${m.color}">${m.id}</div>
        <span class="module-emoji">${m.emoji}</span>
        <div>
          <div class="module-title">${m.label}</div>
          <div class="module-tagline">${m.tagline}</div>
        </div>
      </div>
      <div class="module-desc">${m.desc}</div>
      <div class="cmd-wrap">
        <div class="code-block" id="cmd-${m.id}">${m.command(cliCat, city)}</div>
        <button class="copy-btn" onclick="copyCmd(${m.id})">Copy</button>
      </div>
    </div>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pipeline Guide — ${category} · ${city}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Hanken Grotesk', system-ui, sans-serif;
      background: #0f0f13;
      color: rgba(255,255,255,0.92);
      min-height: 100vh;
      padding: 2rem 1rem 4rem;
      overflow-x: hidden;
      position: relative;
    }

    /* Ambient orbs */
    .orb { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
    .orb-1 { width: 50vw; height: 50vw; top: -10%; left: -10%; background: radial-gradient(circle, #008378 0%, transparent 70%); opacity: 0.35; }
    .orb-2 { width: 55vw; height: 55vw; bottom: -20%; right: -10%; background: radial-gradient(circle, #8b5cf6 0%, transparent 70%); opacity: 0.25; }
    .orb-3 { width: 40vw; height: 40vw; top: 40%; left: 35%; background: radial-gradient(circle, #da2676 0%, transparent 70%); opacity: 0.15; }

    .wrap { max-width: 860px; margin: 0 auto; position: relative; z-index: 1; }

    /* Hero */
    .hero {
      background: linear-gradient(135deg, rgba(0,131,120,0.25) 0%, rgba(0,95,88,0.15) 100%);
      border: 1px solid rgba(0,131,120,0.35);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: 2.5rem 2rem;
      border-radius: 20px;
      margin-bottom: 1.5rem;
    }
    .hero h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 0.4rem; }
    .hero h1 span { color: #34d399; }
    .hero p { color: rgba(255,255,255,0.6); font-size: 0.95rem; font-weight: 500; }
    .hero .tags { display: flex; gap: 0.6rem; margin-top: 1.25rem; flex-wrap: wrap; }
    .tag {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      padding: 0.3rem 0.85rem;
      border-radius: 99px;
      font-size: 0.8rem;
      font-weight: 700;
      color: rgba(255,255,255,0.8);
    }

    /* First Step Card */
    .first-step {
      background: rgba(0,131,120,0.1);
      border: 1px solid rgba(0,131,120,0.3);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(12px);
    }
    .first-step .label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #34d399; margin-bottom: 0.6rem; }
    .first-step p { color: rgba(255,255,255,0.65); font-size: 0.88rem; margin-bottom: 0.75rem; }

    /* Section heading */
    .section-label {
      font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: rgba(255,255,255,0.35);
      margin-bottom: 1rem; margin-top: 0.5rem;
    }

    /* Modules */
    .module {
      background: rgba(25, 25, 30, 0.5);
      border: 1px solid rgba(255,255,255,0.07);
      border-left: 3px solid var(--accent, #008378);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 0.85rem;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      transition: border-color 0.2s;
    }
    .module:hover { border-color: rgba(255,255,255,0.14); border-left-color: var(--accent, #008378); }
    .module-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .step-dot {
      min-width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 900; color: white;
      flex-shrink: 0;
    }
    .module-emoji { font-size: 1.4rem; }
    .module-title { font-weight: 800; font-size: 0.95rem; color: rgba(255,255,255,0.92); }
    .module-tagline { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; margin-top: 0.1rem; }
    .module-desc { color: rgba(255,255,255,0.5); font-size: 0.85rem; line-height: 1.65; margin-bottom: 1rem; }

    /* Command */
    .cmd-wrap { display: flex; align-items: stretch; gap: 0; border-radius: 10px; overflow: hidden; }
    .code-block {
      flex: 1;
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.08);
      border-right: none;
      border-radius: 10px 0 0 10px;
      padding: 0.8rem 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #6ee7b7;
      word-break: break-all;
      line-height: 1.5;
    }
    .copy-btn {
      background: rgba(0,131,120,0.2);
      border: 1px solid rgba(0,131,120,0.35);
      border-left: none;
      border-radius: 0 10px 10px 0;
      color: #34d399;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0 1rem;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .copy-btn:hover { background: rgba(0,131,120,0.4); }
    .copy-btn.copied { background: rgba(0,131,120,0.5); color: #fff; }

    /* Done */
    .done {
      background: rgba(0,131,120,0.08);
      border: 1px solid rgba(0,131,120,0.25);
      border-radius: 14px;
      padding: 2rem;
      margin-top: 1.5rem;
      text-align: center;
      backdrop-filter: blur(12px);
    }
    .done h2 { font-size: 1.3rem; font-weight: 900; color: #34d399; margin-bottom: 0.5rem; }
    .done p { color: rgba(255,255,255,0.5); font-size: 0.88rem; }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>

  <div class="wrap">
    <div class="hero">
      <h1>🚀 Pipeline <span>Run Guide</span></h1>
      <p>Your step-by-step playbook for running the full Nexalyze LeadGen system.</p>
      <div class="tags">
        <span class="tag">📁 ${category}</span>
        <span class="tag">📍 ${city}</span>
        <span class="tag">⭐ ${maxReviews} reviews</span>
        <span class="tag">⚙️ ${modules.length} modules</span>
      </div>
    </div>

    <div class="first-step">
      <div class="label">🎯 Before You Start</div>
      <p>Open your terminal and navigate to the backend folder first:</p>
      <div class="cmd-wrap">
        <div class="code-block" id="cmd-0">cd d:/Nexalyze/Agentic/LeadGen/backened</div>
        <button class="copy-btn" onclick="copyCmd(0)">Copy</button>
      </div>
    </div>

    <div class="section-label">📦 Run Each Module In Order</div>
    ${moduleBlocks}

    <div class="done">
      <h2>🎉 All Done!</h2>
      <p>Head back to your browser dashboard and refresh to see all the data populated.</p>
    </div>
  </div>

  <script>
    function copyCmd(id) {
      const el = document.getElementById('cmd-' + id);
      if (!el) return;
      navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        const btn = el.parentElement.querySelector('.copy-btn');
        if (btn) { btn.textContent = '✓ Copied'; btn.classList.add('copied'); }
        setTimeout(() => { if (btn) { btn.textContent = 'Copy'; btn.classList.remove('copied'); } }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────
type Step = "inputs" | "timeline" | "done";

export default function RunPipelineView({ isDarkMode = false }: { isDarkMode?: boolean }) {
  const [step, setStep] = useState<Step>("inputs");
  const [category, setCategory] = useState("Dentist");
  const [city, setCity] = useState("Lahore");
  const [maxReviews, setMaxReviews] = useState(100);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const PIPELINE_MODULES = buildModules(maxReviews);

  const canProceed = category.trim().length > 0 && city.trim().length > 0;

  const downloadGuide = () => {
    const html = buildHTMLGuide(category, city, maxReviews);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Pipeline_Guide_${category}_${city}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    setStep("done");
  };

  return (
    <div className="pt-28 pb-24 px-4 md:px-8 max-w-3xl mx-auto w-full animate-[fadeIn_0.35s_ease-out]">

      {/* ── Page Title ── */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-[#191c1d] dark:text-slate-100 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-[#008378] dark:text-teal-400" />
          Run Pipeline
        </h2>
        <p className="text-sm text-[#3d4947]/70 dark:text-slate-400 font-semibold mt-1.5">
          Set your target, review what each module does, then download your run guide.
        </p>
      </div>

      {/* ── Step Progress Indicator ── */}
      <div className="flex items-center gap-2 mb-8">
        {(["inputs", "timeline", "done"] as Step[]).map((s, idx) => {
          const labels = ["Set Target", "Review Modules", "Download"];
          const isActive = step === s;
          const isDone =
            (idx === 0 && (step === "timeline" || step === "done")) ||
            (idx === 1 && step === "done");
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#008378] text-white shadow-md"
                    : isDone
                    ? "bg-[#008378]/15 text-[#008378] dark:bg-teal-900/30 dark:text-teal-400"
                    : "bg-neutral-100 text-neutral-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                )}
                {labels[idx]}
              </div>
              {idx < 2 && (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-slate-600 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ══ STEP 1 — Inputs ══ */}
      {step === "inputs" && (
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-neutral-200 dark:border-slate-800 p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-50 dark:bg-teal-900/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 space-y-7">
            <div>
              <h3 className="text-lg font-black text-neutral-800 dark:text-slate-100 mb-0.5">
                What are you targeting?
              </h3>
              <p className="text-xs text-neutral-400 dark:text-slate-500">
                Set your category, city, and how many reviews to scrape.
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-slate-200">
                <Briefcase className="w-4 h-4 text-[#008378]" />
                Type of Business (Category)
              </label>
              <p className="text-xs text-neutral-400 dark:text-slate-500 pl-6">
                Examples: <span className="font-semibold text-[#008378]">Dentist, Gym, Plumber, Restaurant</span>
              </p>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Dentist"
                className="w-full md:w-2/3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#008378] focus:border-transparent outline-none transition-all dark:text-white text-sm font-medium"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-[#008378]" />
                City
              </label>
              <p className="text-xs text-neutral-400 dark:text-slate-500 pl-6">
                Examples: <span className="font-semibold text-[#008378]">Lahore, Karachi, New York</span>
              </p>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore"
                className="w-full md:w-2/3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#008378] focus:border-transparent outline-none transition-all dark:text-white text-sm font-medium"
              />
            </div>

            {/* Max Reviews */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-slate-200">
                <Star className="w-4 h-4 text-[#008378]" />
                Max Reviews to Scrape
              </label>
              <p className="text-xs text-neutral-400 dark:text-slate-500 pl-6">
                How many Google reviews to pull per business. Default is <span className="font-semibold text-[#008378]">100</span>.
              </p>
              <div className="flex items-center gap-3 pl-0">
                <input
                  type="number"
                  min={10}
                  max={500}
                  step={10}
                  value={maxReviews}
                  onChange={(e) => setMaxReviews(Math.max(10, Number(e.target.value)))}
                  className="w-32 px-4 py-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#008378] focus:border-transparent outline-none transition-all dark:text-white text-sm font-medium"
                />
                <div className="flex gap-2">
                  {[50, 100, 200].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMaxReviews(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        maxReviews === v
                          ? "bg-[#008378] text-white border-[#008378]"
                          : "border-neutral-200 dark:border-slate-700 text-neutral-500 dark:text-slate-400 hover:border-[#008378]/40"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setStep("timeline")}
                disabled={!canProceed}
                className="flex items-center gap-2 bg-[#008378] hover:bg-[#006860] disabled:opacity-40 disabled:cursor-not-allowed text-white px-7 py-3.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl active:scale-95"
              >
                See What We'll Run
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2 — Timeline ══ */}
      {step === "timeline" && (
        <div className="space-y-4">
          {/* Target summary pill */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setStep("inputs")}
              className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-slate-400 hover:text-[#008378] dark:hover:text-teal-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#f0faf9] dark:bg-teal-900/20 border border-[#008378]/20 dark:border-teal-800/40 text-[#008378] dark:text-teal-400 rounded-full text-xs font-bold">
                📁 {category}
              </span>
              <span className="px-3 py-1 bg-[#f0faf9] dark:bg-teal-900/20 border border-[#008378]/20 dark:border-teal-800/40 text-[#008378] dark:text-teal-400 rounded-full text-xs font-bold">
                📍 {city}
              </span>
              <span className="px-3 py-1 bg-[#f0faf9] dark:bg-teal-900/20 border border-[#008378]/20 dark:border-teal-800/40 text-[#008378] dark:text-teal-400 rounded-full text-xs font-bold">
                ⭐ {maxReviews} reviews
              </span>
            </div>
          </div>

          {/* Intro card */}
          <div className="bg-gradient-to-r from-[#008378] to-[#005f58] text-white rounded-2xl p-5 flex items-start gap-4">
            <Sparkles className="w-6 h-6 shrink-0 mt-0.5 text-teal-200" />
            <div>
              <p className="font-bold text-sm">Here's your full pipeline — {PIPELINE_MODULES.length} modules total.</p>
              <p className="text-xs text-teal-100 mt-1">
                Tap any module to see exactly what it does. Run them in order for best results.
              </p>
            </div>
          </div>

          {/* Module timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#008378] via-[#008378]/30 to-transparent dark:from-teal-600 dark:via-teal-800/30 pointer-events-none" />

            <div className="space-y-3">
              {PIPELINE_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isOpen = expandedModule === mod.id;
                return (
                  <div key={mod.id} className="relative pl-12">
                    {/* Step dot */}
                    <div
                      className="absolute left-0 top-3.5 w-[46px] h-[46px] rounded-full flex items-center justify-center text-white text-xs font-black shadow-md border-2 border-white dark:border-slate-900 z-10"
                      style={{ background: mod.color }}
                    >
                      {mod.id}
                    </div>

                    <button
                      onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                      className="w-full text-left bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 rounded-xl p-4 hover:border-[#008378]/40 dark:hover:border-teal-700/50 transition-all shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{mod.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-neutral-800 dark:text-slate-100 group-hover:text-[#008378] dark:group-hover:text-teal-400 transition-colors">
                              {mod.label}
                            </div>
                            <div className="text-xs text-neutral-400 dark:text-slate-500 font-medium truncate">
                              {mod.tagline}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-neutral-300 dark:text-slate-600 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-3 text-left">
                          <p className="text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
                            {mod.desc}
                          </p>
                          <div className="bg-[#0f1c1b] rounded-lg p-3 font-mono text-[11px] text-green-300 break-all">
                            <span className="text-neutral-500 text-[10px] font-sans font-bold uppercase mr-2">CMD</span>
                            {mod.command(category.toLowerCase(), city)}
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download CTA */}
          <div className="bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mt-2">
            <div>
              <p className="font-black text-neutral-800 dark:text-slate-100 text-sm">Ready to run?</p>
              <p className="text-xs text-neutral-400 dark:text-slate-500 mt-0.5">
                Download your personalized run guide — open it in any browser.
              </p>
            </div>
            <button
              onClick={downloadGuide}
              className="flex items-center gap-2 bg-[#00685f] hover:bg-[#00544c] dark:bg-teal-600 dark:hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Download HTML Guide
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3 — Done ══ */}
      {step === "done" && (
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-neutral-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-5 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-16 h-16 rounded-full bg-[#f0faf9] dark:bg-teal-900/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#008378] dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-800 dark:text-slate-100">Guide Downloaded!</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              Open the <code className="text-[#008378] font-mono text-xs bg-[#f0faf9] px-1.5 py-0.5 rounded">Pipeline_Guide_{category}_{city}.html</code> file in Chrome or any browser to see your step-by-step run instructions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => { setStep("inputs"); }}
              className="flex items-center justify-center gap-2 border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:border-[#008378]/40 dark:hover:border-teal-700/50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
            </button>
            <button
              onClick={downloadGuide}
              className="flex items-center justify-center gap-2 bg-[#008378]/10 dark:bg-teal-900/30 text-[#008378] dark:text-teal-400 border border-[#008378]/20 dark:border-teal-800/40 hover:bg-[#008378]/20 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Re-download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
