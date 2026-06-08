import { useState, useEffect, useRef, WheelEvent, TouchEvent } from "react";
import { STAGES } from "../data";
import { ViewMode } from "../types";
import { 
  X, 
  Search, 
  CheckSquare, 
  MessageSquare, 
  Sparkles, 
  BarChart4, 
  Globe, 
  Activity, 
  Map, 
  FileText, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Play
} from "lucide-react";

interface ProcessLoopProps {
  onViewChange: (view: ViewMode) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  isDarkMode?: boolean;
}

// Icon mapper for steps
const getIcon = (iconName: string, className: string = "w-5 h-5") => {
  switch (iconName) {
    case "search":
      return <Search className={className} />;
    case "fact_check":
      return <CheckSquare className={className} />;
    case "reviews":
      return <MessageSquare className={className} />;
    case "auto_awesome":
      return <Sparkles className={className} />;
    case "leaderboard":
      return <BarChart4 className={className} />;
    case "language":
      return <Globe className={className} />;
    case "query_stats":
      return <Activity className={className} />;
    case "map":
      return <Map className={className} />;
    case "description":
      return <FileText className={className} />;
    case "outgoing_mail":
      return <Mail className={className} />;
    default:
      return <Globe className={className} />;
  }
};

const PALETTE = [
  "#22d3ee", // cyan
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow/amber
  "#22c55e", // green
  "#6bd8cb", // mint/teal
  "#b1f661", // lime
  "#ffd9e2", // blush pink
  "#008378", // deep teal
  "#b5005d"  // magenta
];

const COMPLETED_COLOR = "#e5e7eb"; // light grey

export default function ProcessLoop({ onViewChange, category, onCategoryChange, isDarkMode = false }: ProcessLoopProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [currentStageProgress, setCurrentStageProgress] = useState<number>(0); // how many stages have been simulated as "completed"
  const [isCardOpen, setIsCardOpen] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleteState, setIsCompleteState] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>("Click 'Run Module' to start simulation");

  // Dynamic parameters form state for all stages
  const [stageParams, setStageParams] = useState<Record<number, Record<string, any>>>({
    0: { targetArea: "Lahore, Pakistan", category: category, scrapeMode: "Grid block search (80 Area divisions)" },
    1: { minPhotos: 10, auditEngine: "Playwright + PageSpeed API Unified" },
    2: { maxReviews: 50, workers: 5 },
    3: { model: "llama-3.3-70b-versatile", sanitize: true },
    4: { keywordsToGenerate: 14, captchaSolver: true },
    5: { depthLimit: 3, crawlerType: "Crawl4AI + AsyncWebCrawler" },
    6: { brokenLimit: 30, timeoutLimit: "8s" },
    7: { localGroupSize: 5, radiusRange: 2.5 },
    8: { generationEngine: "Groq gpt-oss-120b compiler" },
    9: { ccOption: true, targetEmail: "sadiqalibabar@gmail.com" }
  });

  const handleParamChange = (stageIdx: number, paramKey: string, value: any) => {
    setStageParams((prev) => ({
      ...prev,
      [stageIdx]: {
        ...prev[stageIdx],
        [paramKey]: value
      }
    }));
    if (stageIdx === 0 && paramKey === "category") {
      onCategoryChange(value);
    }
  };

  useEffect(() => {
    setStageParams((prev) => ({
      ...prev,
      0: {
        ...prev[0],
        category: category
      }
    }));
  }, [category]);

  const lastScrollTime = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const activeStage = STAGES[activeIndex];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const stepAngle = 360 / STAGES.length;

  // Handle scrolling with touch/mouse trackpads
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (isRunning || isCardOpen) return;
    const now = Date.now();
    if (now - lastScrollTime.current < 350) return;

    if (Math.abs(e.deltaY) > 8) {
      if (e.deltaY > 0) {
        if (activeIndex < STAGES.length - 1) {
          setActiveIndex((prev) => prev + 1);
          lastScrollTime.current = now;
        } else {
          setActiveIndex(0); // circle around
          lastScrollTime.current = now;
        }
      } else {
        if (activeIndex > 0) {
          setActiveIndex((prev) => prev - 1);
          lastScrollTime.current = now;
        } else {
          setActiveIndex(STAGES.length - 1); // circle around
          lastScrollTime.current = now;
        }
      }
    }
  };

  // Keyboard navigation helpers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCardOpen && isRunning) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setActiveIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : STAGES.length - 1));
      } else if (e.key === "Escape") {
        setIsCardOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCardOpen, isRunning]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isRunning || isCardOpen) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY;
    const now = Date.now();

    if (now - lastScrollTime.current < 400 && Math.abs(diff) > 30) {
      if (diff > 0) {
        setActiveIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0));
      } else {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : STAGES.length - 1));
      }
      lastScrollTime.current = now;
    }
  };

  const toggleDetails = () => {
    setIsCardOpen(!isCardOpen);
  };

  // Simulated module execution with custom parameters
  const runModule = () => {
    if (isCompleteState) {
      // Go directly to Dashboard View
      onViewChange("dashboard");
      return;
    }
    if (isRunning) return;

    setIsRunning(true);
    setProgressMsg("Connecting to local API stream...");

    // Map UI stage name to backend Python module name
    const mapStageToModuleName = (stageName: string): string => {
      switch (stageName) {
        case "Lead Discovery": return "lead_discovery";
        case "Lead Auditor": return "lead_auditor";
        case "Reviews Scraper": return "lead_reviews_scraper";
        case "Summarize Info": return "summarize_info";
        case "Rank Tracker": return "rank_tracker";
        case "Website Crawler": return "website_crawler";
        case "SEO Deep Audit": return "seo_deepaudit";
        case "Neighbour Finder": return "neighbour_finder";
        case "SEO Report": return "seo_report";
        case "SEO Outreach": return "seo_outreach";
        default: return stageName.toLowerCase().replace(/ /g, "_");
      }
    };

    const category = stageParams[0]?.category || "dentist";
    const targetArea = stageParams[0]?.targetArea || "Lahore, Pakistan";
    const city = targetArea.split(",")[0].trim();
    const stageName = mapStageToModuleName(activeStage.name);

    // Call FastAPI backend to run the stage in background
    fetch("http://localhost:8000/api/run-stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stage_name: stageName,
        category: category.toLowerCase(),
        city: city,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Backend returned error status:", res.status);
        }
      })
      .catch((err) => {
        console.error("Failed to connect to FastAPI backend:", err);
      });

    // Generate dynamic execution logs based on parameters
    const getSimulatedSteps = () => {
      const params = stageParams[activeIndex] || {};
      switch (activeIndex) {
        case 0:
          return [
            `Initializing coordinates split matrix for ${params.targetArea || "Lahore"}...`,
            `Launching chromium headless automation instances...`,
            `Querying Maps places API for niche category "${params.category || "dentist"}"...`,
            `Filtering results by criteria via ${params.scrapeMode || "Grid Search"}...`,
            `Deduplicating entries. 142 complete leads catalogued successfully!`
          ];
        case 1:
          return [
            `Booting Playwright browser sessions context...`,
            `Calling Google PSI endpoint with strategized profiles...`,
            `Matching completeness elements (Target: >${params.minPhotos || 10} pictures)...`,
            `Calculated completeness index for dentists dataset via ${params.auditEngine}...`,
            `Dossier fields upgraded. Pagespeed Core Web Vitals saved!`
          ];
        case 2:
          return [
            `Spawning scraping process with count of ${params.workers || 5} concurrent thread pools...`,
            `Parsing raw Reviews container nodes...`,
            `Extracting review elements. Limit capped to ${params.maxReviews || 50} per clinic profile...`,
            `Converting timestamps to ISO-8601 formatting logs...`,
            `Syncing review objects into MongoDB dossier!`
          ];
        case 3:
          return [
            `Formatting raw extracted reviews strings...`,
            `Dispatching context vectors to Groq summary endpoint...`,
            `Triggering summary model: "${params.model || "llama-3.3-70b"}"...`,
            params.sanitize 
              ? `Formatting compiler JSON fences blocks automatically...`
              : `Skipping JSON fence sanitation checks...`,
            `Compiled isolated vs recurring complaints classification logs!`
          ];
        case 4:
          return [
            `Synthesizing ${params.keywordsToGenerate || 14} localized search keywords...`,
            `Launching cold rank scans queries on Google SERP...`,
            params.captchaSolver 
              ? `Engaging SeleniumBase Undetected Chrome antidetect modules...`
              : `Caution: automation bypass modules disabled...`,
            `Comparing domain target match indexes in memory...`,
            `Local rankings checklist indexed successfully.`
          ];
        case 5:
          return [
            `Initializing AsyncWebCrawler request sequence...`,
            `Applying depth bounds constraint: limit ${params.depthLimit || 3} deep levels...`,
            `Executing crawling pipelines via specialized ${params.crawlerType || "Crawl4AI"}...`,
            `Converting raw DOM HTML elements structure to layout Markdown...`,
            `SEO onpage signal markers recorded.`
          ];
        case 6:
          return [
            `Initiating secure protocol redirection audit checks...`,
            `Reading semantic layout headings & title metadata lengths...`,
            `Testing up to ${params.brokenLimit || 30} links for dead assets...`,
            `Awaiting response confirmation (Limit: ${params.timeoutLimit || "8s"})...`,
            `Audit block generated with zero critical payload failures!`
          ];
        case 7:
          return [
            `Loading database spatial coordinate metrics...`,
            `Calculating distance vectors using Haversine formulas grid...`,
            `Matching nearest ${params.localGroupSize || 5} peers within ${params.radiusRange || 2.5}km...`,
            `Aggregating group average ratings and total reviews volume...`,
            `Competitive density isolation indexes finalized.`
          ];
        case 8:
          return [
            `Gathering comprehensive metrics dossier for target clinic...`,
            `Assembling contextual prompts for five specialized modules...`,
            `Engaging Groq reports orchestration layer: ${params.generationEngine}...`,
            `Computing overall weighted grade...`,
            `Executive summary compile complete!`
          ];
        case 9:
          return [
            `Retrieving audited on-page vulnerabilities...`,
            `Structuring personalized business impact estimates...`,
            params.ccOption 
              ? `Routing copies to admin recipient list for outreach validation...`
              : `Routing individual lead outreach...`,
            `Ready! Outbound email subject & template compiled for ${params.targetEmail || "contact"}!`,
            `Outreach dispatcher initialized.`
          ];
        default:
          return [
            "Accessing geographic metadata...",
            "Simulating crawling processes...",
            "Analyzing structured JSON structures...",
            "Compiling module payloads...",
            "Saving local database records..."
          ];
      }
    };

    const steps = getSimulatedSteps();
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgressMsg(steps[stepIdx]);
        stepIdx++;
      }
    }, 450);

    setTimeout(() => {
      clearInterval(interval);
      setIsRunning(false);
      setIsCompleteState(true);
      setProgressMsg("Module run successful");
      // Update max pipeline progress reached
      if (activeIndex >= currentStageProgress) {
        setCurrentStageProgress(activeIndex + 1);
      }
    }, 2400);
  };

  useEffect(() => {
    // Reset running states when step index changes
    setIsRunning(false);
    setIsCompleteState(false);
    setProgressMsg("Operational module holds pending parameters");
  }, [activeIndex]);

  const nextStep = () => {
    setActiveIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0));
  };

  const prevStep = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : STAGES.length - 1));
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#f8f9fa] dark:bg-[#0b0f19] overflow-hidden select-none transition-colors duration-300"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Decorative Outer Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e1e3e4_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-40 dark:opacity-20 pointer-events-none" />

      {/* Main Container */}
      <div className={`relative z-20 flex flex-col items-center justify-center p-6 transition-all duration-500 ${isCardOpen ? "translate-y-[-50px] scale-95 opacity-80" : ""}`}>
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="font-hanken text-[13px] text-[#191c1d] dark:text-slate-200 font-extrabold tracking-[0.25em] uppercase mb-2">
            Process Loop
          </h2>
          <div className="h-1.5 w-12 bg-[#00685f] dark:bg-teal-400 mx-auto rounded-full" />
        </div>

        {/* Central Dynamic Wheel Wrapper */}
        <div className="relative flex items-center justify-center w-[480px] h-[480px] md:w-[500px] md:h-[500px]">
          
          {/* Wheel Ring element with dynamic rotation */}
          <div 
            className="absolute inset-0 w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: `rotate(${-activeIndex * stepAngle}deg)` }}
          >
            {/* SVG Ring Segments */}
            <svg 
              className="w-full h-full -rotate-90 absolute inset-0" 
              viewBox="0 0 160 160"
            >
              {/* Background ring */}
              <circle 
                className="stroke-[#e7e8e9] dark:stroke-slate-800 fill-none" 
                cx="80" 
                cy="80" 
                r="45" 
                strokeWidth="2" 
                opacity={isDarkMode ? 0.4 : 0.25}
              />
              
              {/* Individual colorful segmented arcs */}
              {STAGES.map((_, i) => {
                const arc = circumference / STAGES.length;
                const isSelected = i === activeIndex;
                const isPrevious = i < currentStageProgress;
                
                let strokeColor = PALETTE[i % PALETTE.length];
                if (!isSelected && isPrevious) {
                  strokeColor = isDarkMode ? "#334155" : COMPLETED_COLOR;
                }

                return (
                  <circle
                    key={i}
                    cx="80"
                    cy="80"
                    r="45"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? "4.5" : "2"}
                    strokeDasharray={`${arc - 1.8} ${circumference}`}
                    strokeDashoffset={-(i * arc)}
                    style={{
                      transition: "stroke-width 0.35s ease, stroke 0.35s ease, opacity 0.35s ease",
                      opacity: isSelected ? 1 : isPrevious ? 0.6 : 0.45
                    }}
                  />
                );
              })}
            </svg>

            {/* Floating Labels revolving dynamically outside the wheel circle */}
            {STAGES.map((step, i) => {
              const isSelected = i === activeIndex;
              const angle = i * stepAngle;
              
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 select-none pointer-events-none whitespace-nowrap transition-all duration-500 origin-[0_50%] font-hanken text-[12px] font-black uppercase tracking-wider text-[#2D3748] dark:text-slate-200"
                  style={{
                    transform: `rotate(${angle}deg) translate(${isSelected ? "172px" : "158px"}, -50%)`,
                    opacity: isSelected ? 1 : 0,
                    visibility: isSelected ? "visible" : "hidden"
                  }}
                >
                  {step.name}
                </div>
              );
            })}
          </div>

          {/* Center Interactive Button Card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <button 
              onClick={toggleDetails}
              className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-full border border-neutral-200/80 dark:border-slate-800 flex flex-col items-center justify-center w-64 h-64 shadow-2xl dark:shadow-black/40 transition-transform hover:scale-104 active:scale-96 group pointer-events-auto cursor-pointer focus:outline-none"
              id="center-dial-trigger"
            >
              <span className="text-[10px] font-black text-[#3d4947] dark:text-slate-400 tracking-[0.2em] uppercase select-none">
                Current Stage
              </span>
              
              <span className="text-7xl font-black text-[#191c1d] dark:text-slate-100 italic leading-none my-1 font-sans select-none">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              
              {/* Glowing Outline Action Button */}
              <div className="mt-3 px-6 py-2 bg-[#f3f4f5] dark:bg-slate-800 rounded-full border-2 border-[#b5005d] dark:border-pink-500 shadow-[3.5px_3.5px_0px_0px_#2D3748] dark:shadow-[3.5px_3.5px_0px_0px_#1e293b] group-hover:bg-[#b5005d] dark:group-hover:bg-pink-900/60 transition-colors duration-300">
                <span className="text-[11px] font-bold text-[#b5005d] dark:text-pink-300 group-hover:text-white tracking-widest uppercase block whitespace-nowrap">
                  {activeStage.name}
                </span>
              </div>
              
              <span className="text-[10px] font-extrabold text-[#3d4947]/60 dark:text-slate-500 mt-3 tracking-widest uppercase">
                {isCardOpen ? "Close Panel" : "Inspect Data"}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Helpful Instructions */}
        <div className="mt-8 max-w-[460px] text-center px-4">
          <p className="text-xs font-semibold text-[#2D3748]/50 dark:text-slate-400 leading-relaxed">
            Use your mouse scroll, keyboard arrows, or side buttons to rotate the {STAGES.length} pipeline stages. Click center card to reveal module logs and activate testing.
          </p>
        </div>
      </div>

      {/* Glassmorphic Sliding Drawer Overlay Card */}
      <div 
        className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 w-[92%] max-w-[620px] bg-white dark:bg-slate-900 rounded-t-[28px] border-x border-t border-neutral-200/70 dark:border-slate-800 p-6 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto max-h-[85vh] ${
          isCardOpen 
            ? "translate-y-[-24px] shadow-[0_-20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.4)] opacity-100" 
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        id="sliding-inspect-card"
      >
        {/* Animated Glow Border if running */}
        {isRunning && (
          <div className="absolute inset-0 rounded-t-[28px] overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-pink-400 to-emerald-400 animate-[pulse_1s_infinite] opacity-100" />
          </div>
        )}

        <div className="relative z-10 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-slate-800 text-[#2D3748] dark:text-slate-200">
                  {getIcon(activeStage.icon, "w-4 h-4 text-[#00685f] dark:text-teal-400")}
                </span>
                <span className="text-[10px] font-black text-[#b5005d] dark:text-pink-400 tracking-widest uppercase">
                  Stage {String(activeIndex + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-xl font-extrabold italic text-[#2D3748] dark:text-slate-100 uppercase mt-1">
                {activeStage.name}
              </h3>
            </div>
            <button 
              onClick={() => setIsCardOpen(false)}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              id="close-sliding-card"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body description */}
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-slate-300 font-semibold text-xs leading-relaxed">
              {activeStage.desc}
            </p>

            {/* Configurable form parameter list for stage */}
            <div className="border-t border-b border-light-200 dark:border-slate-800 py-4 my-2">
              <h4 className="text-xs font-black text-[#3d4947] dark:text-slate-300 tracking-wider uppercase mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00685f] dark:bg-teal-400" />
                Interactive Module Configuration Parameters
              </h4>
              
              <div className="space-y-3">
                {/* Stage 1 Forms: Discovery */}
                {activeIndex === 0 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Target Area / Location</label>
                      <input 
                        type="text" 
                        value={stageParams[0]?.targetArea || ""} 
                        onChange={(e) => handleParamChange(0, "targetArea", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#00685f]/20 dark:focus:ring-teal-500/20 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">The geographic target region or city.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Category / Niche Keyword</label>
                      <input 
                        type="text" 
                        value={stageParams[0]?.category || ""} 
                        onChange={(e) => handleParamChange(0, "category", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-955/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#00685f]/20 dark:focus:ring-teal-500/20 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Business category (e.g. dentist, plumber) to search.</span>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Search Block Mode</label>
                      <select 
                        value={stageParams[0]?.scrapeMode || ""} 
                        onChange={(e) => handleParamChange(0, "scrapeMode", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="Sequential block search">Sequential block search (Simple non-headless)</option>
                        <option value="Grid block search (80 Area divisions)">Grid block search (Advanced 80 concurrent divisions)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Shreds the target city coordinates dynamically to bypass raw results limits.</span>
                    </div>
                  </div>
                )}

                {/* Stage 2 Forms: Auditor */}
                {activeIndex === 1 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Minimum Photos Required</label>
                      <input 
                        type="number" 
                        value={stageParams[1]?.minPhotos || ""} 
                        onChange={(e) => handleParamChange(1, "minPhotos", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Count of images needed to pass quality threshold scans.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Audit Mode & Engine</label>
                      <select 
                        value={stageParams[1]?.auditEngine || ""} 
                        onChange={(e) => handleParamChange(1, "auditEngine", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="Playwright + PageSpeed API Unified">Playwright + PageSpeed API Unified</option>
                        <option value="Raw Google Business Profile Scraping">Raw Google Business Profile Scraping</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Chooses the pipeline scanner to analyze profile completeness.</span>
                    </div>
                  </div>
                )}

                {/* Stage 3 Forms: Reviews */}
                {activeIndex === 2 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Maximum Reviews Scraped</label>
                      <input 
                        type="number" 
                        value={stageParams[2]?.maxReviews || ""} 
                        onChange={(e) => handleParamChange(2, "maxReviews", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Caps the review mine count to prevent excessive wait loops.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Concurrent Scraper Worker Threads</label>
                      <input 
                        type="number" 
                        value={stageParams[2]?.workers || ""} 
                        onChange={(e) => handleParamChange(2, "workers", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Controls parallel worker threads launched simultaneously.</span>
                    </div>
                  </div>
                )}

                {/* Stage 4 Forms: Summarizer */}
                {activeIndex === 3 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Intel Summary AI model</label>
                      <select 
                        value={stageParams[3]?.model || ""} 
                        onChange={(e) => handleParamChange(3, "model", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Primary fast-inference)</option>
                        <option value="groq-gpt-oss-120b">Groq gpt-oss-120b (Complex synthesis)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Selects the model to parse reviews into recurring complaints.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Fenced JSON Sanitizer</label>
                      <select 
                        value={String(stageParams[3]?.sanitize || "true")} 
                        onChange={(e) => handleParamChange(3, "sanitize", e.target.value === "true")}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="true">Active (Strip fences & auto-close syntax)</option>
                        <option value="false">Raw un-sanitized payload parsing</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Safeguards the structured format returned by the endpoint from crashing.</span>
                    </div>
                  </div>
                )}

                {/* Stage 5 Forms: Rank Tracker */}
                {activeIndex === 4 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Target Search Keywords</label>
                      <input 
                        type="number" 
                        value={stageParams[4]?.keywordsToGenerate || ""} 
                        onChange={(e) => handleParamChange(4, "keywordsToGenerate", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Generates high-intent search queries based on the city.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">CAPTCHA Bypass Solver Mode</label>
                      <select 
                        value={String(stageParams[4]?.captchaSolver || "true")} 
                        onChange={(e) => handleParamChange(4, "captchaSolver", e.target.value === "true")}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="true">SeleniumBase UC (Undetected Browser Mode)</option>
                        <option value="false">Standard automated browser (High trigger risk)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Launches an antidetect wrapper to bypass Google anti-automation sweeps.</span>
                    </div>
                  </div>
                )}

                {/* Stage 6 Forms: Web Crawler */}
                {activeIndex === 5 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Max Deep Link Depth</label>
                      <input 
                        type="number" 
                        value={stageParams[5]?.depthLimit || ""} 
                        onChange={(e) => handleParamChange(5, "depthLimit", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Caps how deep inside the domain links will be recursively scanned.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Crawler Type</label>
                      <select 
                        value={stageParams[5]?.crawlerType || ""} 
                        onChange={(e) => handleParamChange(5, "crawlerType", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="Crawl4AI + AsyncWebCrawler">Crawl4AI + AsyncWebCrawler</option>
                        <option value="Basic BeatifulSoup Scraper">Basic BeautifulSoup Scraper</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Use Crawl4AI markdown conversion for high quality LLM audits.</span>
                    </div>
                  </div>
                )}

                {/* Stage 7 Forms: SEO Deep Audit */}
                {activeIndex === 6 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Max Broken Link Checks</label>
                      <input 
                        type="number" 
                        value={stageParams[6]?.brokenLimit || ""} 
                        onChange={(e) => handleParamChange(6, "brokenLimit", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Caps checked internal/external links to keep auditing swift.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">HTTP Request Timeout limit</label>
                      <input 
                        type="text" 
                        value={stageParams[6]?.timeoutLimit || ""} 
                        onChange={(e) => handleParamChange(6, "timeoutLimit", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Bounces dead connections if responsive signals fail to return.</span>
                    </div>
                  </div>
                )}

                {/* Stage 8 Forms: Neighbour finder */}
                {activeIndex === 7 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Computed N-Neighbours group</label>
                      <input 
                        type="number" 
                        value={stageParams[7]?.localGroupSize || ""} 
                        onChange={(e) => handleParamChange(7, "localGroupSize", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">How many local clinics group for averages calculation.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Search Radius threshold (km)</label>
                      <input 
                        type="number" 
                        value={stageParams[7]?.radiusRange || ""} 
                        onChange={(e) => handleParamChange(7, "radiusRange", Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Borders of Haversine distance computations matrix.</span>
                    </div>
                  </div>
                )}

                {/* Stage 9 Forms: SEO Report */}
                {activeIndex === 8 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Groq report compilation scale</label>
                      <select 
                        value={stageParams[8]?.generationEngine || ""} 
                        onChange={(e) => handleParamChange(8, "generationEngine", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="Groq gpt-oss-120b compiler">Groq gpt-oss-120b compiler (Precision details)</option>
                        <option value="llama-3.3-70b-versatile-compiler">llama-3.3-70b-versatile compiler (Failsafe fallback)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Directly orchestrates Groq's multi-section executive reports builder.</span>
                    </div>
                  </div>
                )}

                {/* Stage 10 Forms: Outreach */}
                {activeIndex === 9 && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Default Pitch CC option</label>
                      <select 
                        value={String(stageParams[9]?.ccOption || "true")} 
                        onChange={(e) => handleParamChange(9, "ccOption", e.target.value === "true")}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      >
                        <option value="true">Active (Send copy to administrator inbox)</option>
                        <option value="false">Off (Dispatch prospect pitch single instance)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">Mainkeeps records alignment while monitoring outreach.</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-wider mb-1">Target Address</label>
                      <input 
                        type="text" 
                        value={stageParams[9]?.targetEmail || ""} 
                        onChange={(e) => handleParamChange(9, "targetEmail", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-neutral-200/80 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-950/40 text-[#2D3748] dark:text-slate-200 rounded-lg focus:border-[#00685f] dark:focus:border-teal-500 outline-none"
                      />
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 block mt-0.5">The primary lead email extracted by crawler.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Core Action triggers */}
            <div className="pt-3 flex flex-col items-center">
              
              {/* Finish simulation feedback message */}
              {isCompleteState && (
                <span className="text-xs font-black text-[#b5005d] dark:text-pink-400 tracking-wide uppercase mb-3 animate-[bounce_1.5s_infinite]">
                  ✨ Module execution complete
                </span>
              )}

              {/* Running Status loader text */}
              {isRunning && (
                <div className="flex flex-col items-center mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#00685f] dark:bg-teal-400 animate-ping" />
                    <span className="text-xs font-heavy text-[#00685f] dark:text-teal-400 italic">
                      {progressMsg}
                    </span>
                  </div>
                  <div className="w-48 bg-neutral-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden font-semibold">
                    <div className="bg-[#00685f] dark:bg-teal-400 h-full rounded-full animate-[shimmer_2s_infinite]" style={{ width: "80%" }} />
                  </div>
                </div>
              )}

              <button 
                onClick={runModule}
                disabled={isRunning}
                className={`w-full font-hanken font-extrabold py-3.5 px-6 rounded-xl uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                  isCompleteState
                    ? "bg-[#b5005d] text-white hover:brightness-110 active:shadow-inner dark:bg-pink-950/60 dark:text-pink-300 dark:border dark:border-pink-850/50"
                    : isRunning
                    ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed dark:bg-slate-800/40 dark:text-slate-600 dark:border-slate-800"
                    : "bg-white border-2 border-[#2D3748] text-[#2D3748] hover:bg-neutral-50 active:bg-neutral-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                id="btn-run-simulation"
              >
                {isCompleteState ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    View Scraped Leads Inside Dashboard
                  </>
                ) : isRunning ? (
                  "Processing Stage..."
                ) : (
                  <>
                    Run Module Log
                  </>
                )}
              </button>

              {!isRunning && !isCompleteState && (
                <p className="text-[10px] font-black text-[#00685f] dark:text-teal-400 tracking-wider uppercase mt-2.5">
                  Simulated Time: {activeStage.eta}s ETA
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
