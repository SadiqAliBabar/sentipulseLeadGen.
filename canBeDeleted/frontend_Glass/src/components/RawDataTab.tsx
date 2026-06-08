import React, { useState, useMemo } from "react";
import { Lead } from "../types";
import { 
  Check, 
  Copy, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Layers,
  HelpCircle
} from "lucide-react";

interface RawDataTabProps {
  lead: Lead | null | undefined;
}

export default function RawDataTab({ lead }: RawDataTabProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMatchingOnly, setShowMatchingOnly] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Helper to copy content to clipboard
  const handleCopy = () => {
    if (!lead) return;
    navigator.clipboard.writeText(JSON.stringify(lead, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  // Safe key extraction and summary
  const leadKeys = useMemo(() => {
    if (!lead) return [];
    return Object.keys(lead).sort();
  }, [lead]);

  const placeId = lead ? (lead as any).place_id || (lead as any).placeId || "Not Available" : "Not Available";

  // Data modules helper for Checklist
  const checkModules = useMemo(() => {
    if (!lead) return [];

    const getModuleSize = (val: any) => {
      if (val === null || val === undefined) return null;
      if (Array.isArray(val)) return `${val.length} items`;
      if (typeof val === "object") {
        // Handle specific sub-lists if present
        if (val.reviews && Array.isArray(val.reviews)) return `${val.reviews.length} reviews`;
        if (val.results && Array.isArray(val.results)) return `${val.results.length} keywords`;
        if (val.competitors && Array.isArray(val.competitors)) return `${val.competitors.length} competitors`;
        return `${Object.keys(val).length} fields`;
      }
      return "1 field";
    };

    return [
      {
        name: "Overview / basic fields",
        exists: !!(lead.name || lead.rating || lead.phone || lead.website),
        size: `${leadKeys.filter(k => !k.endsWith("Raw") && !k.endsWith("_audit") && k !== "reviews" && k !== "reviewSummary" && k !== "competitors").length} fields`
      },
      {
        name: "gbp_audit",
        exists: !!((lead as any).gbp_audit || lead.gbpAuditRaw),
        size: getModuleSize((lead as any).gbp_audit || lead.gbpAuditRaw)
      },
      {
        name: "google_reviews",
        exists: !!((lead as any).google_reviews || lead.reviews),
        size: getModuleSize((lead as any).google_reviews || lead.reviews)
      },
      {
        name: "review_summary",
        exists: !!((lead as any).review_summary || lead.reviewSummary),
        size: getModuleSize((lead as any).review_summary || lead.reviewSummary)
      },
      {
        name: "website_crawl",
        exists: !!((lead as any).website_crawl || lead.websiteCrawlRaw),
        size: getModuleSize((lead as any).website_crawl || lead.websiteCrawlRaw)
      },
      {
        name: "seo_audit",
        exists: !!((lead as any).seo_audit || lead.seoAuditRaw),
        size: getModuleSize((lead as any).seo_audit || lead.seoAuditRaw)
      },
      {
        name: "lighthouse_seo",
        exists: !!((lead as any).lighthouse_seo || lead.lighthouseSeoRaw),
        size: getModuleSize((lead as any).lighthouse_seo || lead.lighthouseSeoRaw)
      },
      {
        name: "rank_tracker",
        exists: !!((lead as any).rank_tracker || lead.rankTrackerRaw),
        size: getModuleSize((lead as any).rank_tracker || lead.rankTrackerRaw)
      },
      {
        name: "pagespeed",
        exists: !!((lead as any).pagespeed || lead.pagespeedRaw),
        size: getModuleSize((lead as any).pagespeed || lead.pagespeedRaw)
      },
      {
        name: "neighbors",
        exists: !!((lead as any).neighbors || (lead as any).neighboursRaw || lead.competitors),
        size: getModuleSize((lead as any).neighbors || (lead as any).neighboursRaw || lead.competitors)
      }
    ];
  }, [lead, leadKeys]);

  // JSON viewer logic (split by lines for highlighting and filtering)
  const rawJsonLines = useMemo(() => {
    if (!lead) return [];
    return JSON.stringify(lead, null, 2).split("\n");
  }, [lead]);

  // Processed JSON lines for display (search filters applied)
  const processedLines = useMemo(() => {
    if (!rawJsonLines.length) return [];
    
    return rawJsonLines.map((text, index) => {
      const lineNum = index + 1;
      const lowercaseText = text.toLowerCase();
      const lowercaseQuery = searchQuery.trim().toLowerCase();
      const isMatch = lowercaseQuery ? lowercaseText.includes(lowercaseQuery) : false;
      return { text, lineNum, isMatch };
    });
  }, [rawJsonLines, searchQuery]);

  // Count matches
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return processedLines.filter(line => line.isMatch).length;
  }, [processedLines, searchQuery]);

  // Filtered list if "show matching only" is true
  const visibleLines = useMemo(() => {
    if (showMatchingOnly && searchQuery.trim()) {
      return processedLines.filter(line => line.isMatch);
    }
    return processedLines;
  }, [processedLines, showMatchingOnly, searchQuery]);

  // Helper to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Helper to highlight parts of text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    try {
      const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, "gi"));
      return (
        <span>
          {parts.map((part, i) => 
            part.toLowerCase() === highlight.toLowerCase() ? (
              <mark key={i} className="bg-amber-500/35 text-amber-200 font-bold px-0.5 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  };

  // Loading/Empty States
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-[fadeIn_0.3s_ease-out]">
        <AlertCircle className="w-12 h-12 text-neutral-400 dark:text-slate-600 mb-3" />
        <h4 className="text-lg font-black text-neutral-800 dark:text-slate-200">No Lead Data Selected</h4>
        <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-[320px] mt-1 leading-relaxed">
          Please select a lead from the sidebar list to inspect its raw MongoDB database records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* SECTION 1: RAW DATA SUMMARY */}
      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#00685f] dark:text-teal-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-slate-350">
            Raw Data Summary
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 text-xs">
          <div className="bg-white dark:bg-slate-950/40 border border-neutral-200/50 dark:border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">
              Lead ID
            </span>
            <span className="font-mono font-bold text-neutral-800 dark:text-slate-200 break-all select-all">
              {lead.id}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-950/40 border border-neutral-200/50 dark:border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">
              Business Name
            </span>
            <span className="font-heavy text-neutral-800 dark:text-slate-250">
              {lead.name}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-950/40 border border-neutral-200/50 dark:border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">
              Google Place ID
            </span>
            <span className="font-mono font-bold text-neutral-800 dark:text-slate-200 break-all select-all">
              {placeId}
            </span>
          </div>
        </div>

        {/* Top level keys list */}
        <div className="bg-white dark:bg-slate-950/30 border border-neutral-200/40 dark:border-slate-850 p-4.5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-400 tracking-wider">
              Available Top-Level Keys ({leadKeys.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {leadKeys.map((key) => {
              const isRawModule = key.endsWith("Raw") || key.endsWith("_audit") || 
                ["website_crawl", "seo_audit", "lighthouse_seo", "rank_tracker", "pagespeed", "neighbors", "google_reviews"].includes(key);
              
              return (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isRawModule
                      ? "bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40"
                      : "bg-neutral-50 text-neutral-600 border border-neutral-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/60"
                  }`}
                  title={isRawModule ? "JSON Module / Audit Payload" : "Top level standard property"}
                >
                  {key}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: DATA AVAILABILITY CHECKLIST */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#00685f] dark:text-teal-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-slate-350">
            Data Availability Checklist
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {checkModules.map((mod, i) => (
            <div 
              key={i} 
              className={`p-3.5 rounded-xl border flex flex-col justify-between h-24 transition-all ${
                mod.exists 
                  ? "bg-emerald-50/20 border-emerald-200/50 dark:bg-emerald-950/10 dark:border-emerald-800/40" 
                  : "bg-red-50/10 border-red-200/30 dark:bg-pink-950/5 dark:border-pink-950/30"
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-0.5">
                  Module
                </span>
                <span className="text-xs font-bold text-neutral-800 dark:text-slate-200 truncate block">
                  {mod.name}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 mt-2">
                <div className="flex items-center gap-1">
                  {mod.exists ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Available</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-[#b5005d] dark:text-pink-500 shrink-0" />
                      <span className="text-[10px] font-black uppercase text-[#b5005d] dark:text-pink-400">Missing</span>
                    </>
                  )}
                </div>
                {mod.exists && mod.size && (
                  <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {mod.size}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 & 4: FULL JSON VIEWER & QUICK FINDER */}
      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00685f] dark:text-teal-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-slate-350">
              Full Document JSON Viewer
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border bg-white hover:bg-neutral-50 border-neutral-200 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-800 text-[#00685f] dark:text-teal-400 cursor-pointer"
              title="Copy JSON string to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>

            {/* Expand / Collapse Height */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border bg-white hover:bg-neutral-50 border-neutral-200 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-800 text-[#00685f] dark:text-teal-400 cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Compact View</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expand View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 4: Search input */}
        <div className="mb-4 bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-neutral-200/50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-neutral-400" />
            </span>
            <input
              type="text"
              placeholder="Search keys, values or keywords (e.g. 'pagespeed', 'google_reviews')..."
              className="w-full bg-[#f8f9fa] dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs font-semibold text-neutral-800 dark:text-slate-200 placeholder-neutral-400 focus:outline-none focus:border-[#00685f] dark:focus:border-teal-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.trim() && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-[10px] font-black text-neutral-500 dark:text-slate-400 uppercase">
                {matchCount === 0 ? "No matches" : `${matchCount} line match${matchCount > 1 ? "es" : ""}`}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-neutral-300 dark:border-slate-700 text-[#00685f] focus:ring-[#00685f] w-3.5 h-3.5 dark:bg-slate-900"
                  checked={showMatchingOnly}
                  onChange={(e) => setShowMatchingOnly(e.target.checked)}
                />
                <span className="text-[10px] font-black text-[#2D3748] dark:text-slate-400 uppercase">
                  Show matches only
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Code Block Viewer */}
        <div 
          className={`w-full overflow-auto rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0f141f] shadow-inner transition-all duration-300 ${
            isExpanded ? "max-h-[850px]" : "max-h-[420px]"
          }`}
        >
          {visibleLines.length > 0 ? (
            <table className="w-full border-collapse font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              <tbody>
                {visibleLines.map((line) => (
                  <tr 
                    key={line.lineNum} 
                    className={`group ${
                      line.isMatch 
                        ? "bg-amber-100/50 dark:bg-amber-950/15 border-l-2 border-amber-500" 
                        : "hover:bg-neutral-50 dark:hover:bg-slate-850/40"
                    }`}
                  >
                    {/* Line number column */}
                    <td className="w-12 text-right select-none pr-3 py-0.5 border-r border-neutral-200 dark:border-slate-800/80 text-neutral-400 dark:text-slate-600 font-bold bg-neutral-50 dark:bg-[#0b0e14]">
                      {line.lineNum}
                    </td>
                    {/* Content column */}
                    <td className="pl-4 py-0.5 whitespace-pre break-words break-all text-neutral-800 dark:text-slate-300">
                      {line.isMatch 
                        ? highlightText(line.text, searchQuery) 
                        : line.text
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 italic text-xs">
              No lines found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: DEVELOPER NOTES */}
      <div className="bg-[#fff9fa] dark:bg-pink-950/5 border border-pink-200/40 dark:border-pink-900/20 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-[#b5005d] dark:text-pink-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-pink-300">
            Developer / Debugging Notes
          </h4>
        </div>
        
        <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-slate-400 font-semibold list-disc list-inside">
          <li>
            If a dashboard tab shows a <span className="text-[#b5005d] dark:text-pink-400 font-bold">failed/empty state</span> but this Raw Data viewer contains details, verify that the frontend UI component maps properties correctly (e.g., lowercase vs uppercase keys).
          </li>
          <li>
            For <span className="text-neutral-800 dark:text-slate-200 font-bold">PageSpeed</span>, this project maps parameters from the <code className="font-mono text-purple-600 dark:text-purple-400 font-black">pagespeed.PHONE</code> and <code className="font-mono text-purple-600 dark:text-purple-400 font-black">pagespeed.DESKTOP</code> properties. Check details inside these nested objects.
          </li>
          <li>
            For <span className="text-neutral-800 dark:text-slate-200 font-bold">reviews</span>, the <code className="font-mono text-purple-600 dark:text-purple-400 font-black">latest_review</code> string may be stale. We calculate the newest reviews dynamically from <code className="font-mono text-purple-600 dark:text-purple-400 font-black">google_reviews.reviews</code> sorted descending by the ISO date string.
          </li>
          <li>
            If any nested data objects are <span className="text-neutral-500 font-bold">missing or null</span>, the frontend components must display a clean, placeholder empty state instead of crashing. Use safe optional chaining (<code className="font-mono text-purple-600 dark:text-purple-400 font-black">?.</code>) for all nested properties.
          </li>
        </ul>
      </div>

    </div>
  );
}
