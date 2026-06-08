import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

export const LighthouseSEOTab = ({ lead }: { lead: any }) => {
  const lhData = lead?.lighthouse_seo || (lead as any)?.lighthouseSeoRaw || (lead as any)?.lighthouse_seo_raw;

  const score = lhData?.score;
  const status = lhData?.status;
  const source = lhData?.source;
  const url = lhData?.url;
  const checkedAt = lhData?.checked_at;
  const passedCount = lhData?.passed_count;
  const failedCount = lhData?.failed_count;
  const failedAudits = lhData?.failed_audits || [];

  // score >= 90 = Excellent
  // score >= 70 and < 90 = Good
  // score >= 50 and < 70 = Needs Improvement
  // score < 50 = Poor

  let statusLabel = "Not Available";
  let statusColor = "text-neutral-500";
  let statusBg = "bg-neutral-100 dark:bg-slate-800";
  let strokeColor = "#edeeef";

  if (typeof score === 'number') {
    if (score >= 90) {
      statusLabel = "Excellent";
      statusColor = "text-[#00685f] dark:text-teal-400";
      statusBg = "bg-[#f4fffc] border-[#00685f]/30 dark:bg-teal-950/40 dark:border-teal-800/50";
      strokeColor = "#00685f";
    } else if (score >= 70) {
      statusLabel = "Good";
      statusColor = "text-amber-600 dark:text-amber-400";
      statusBg = "bg-amber-50 border-amber-200/50 dark:bg-amber-950/40 dark:border-amber-800/50";
      strokeColor = "#f59e0b";
    } else if (score >= 50) {
      statusLabel = "Needs Improvement";
      statusColor = "text-orange-600 dark:text-orange-400";
      statusBg = "bg-orange-50 border-orange-200/50 dark:bg-orange-950/40 dark:border-orange-800/50";
      strokeColor = "#f97316";
    } else {
      statusLabel = "Poor";
      statusColor = "text-[#b5005d] dark:text-pink-400";
      statusBg = "bg-red-50 border-red-200/50 dark:bg-pink-950/40 dark:border-pink-850/50";
      strokeColor = "#b5005d";
    }
  }

  const strokeDashoffset = typeof score === 'number' ? 251 - (251 * score) / 100 : 251;

  const totalChecks = (typeof passedCount === 'number' && typeof failedCount === 'number') ? passedCount + failedCount : null;
  const passPercentage = totalChecks ? Math.round((passedCount / totalChecks) * 100) : null;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Section 1: Lighthouse SEO Summary */}
      <div className="bg-[#f8f9fa] dark:bg-slate-900/40 border border-neutral-200/50 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="40"
              stroke="#edeeef"
              className="dark:stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="40"
              stroke={strokeColor}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="251"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-neutral-800 dark:text-slate-200">{score ?? "N/A"}</span>
            <span className="text-[8px] font-black text-neutral-400 dark:text-slate-500 uppercase">Score</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBg} ${statusColor}`}>
            Status: {statusLabel}
          </span>
          <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[18px] mt-2 leading-snug">
            Lighthouse SEO Quality Report
          </h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mt-1">
            Checked At: {checkedAt ? new Date(checkedAt).toLocaleString() : "Not Available"}
          </p>
          <div className="mt-2 text-xs text-neutral-600 dark:text-slate-400 font-medium">
            <span className="block">Source: {source || "Not Available"}</span>
            <span className="block mt-0.5 truncate">
              URL: {url ? <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{url}</a> : "Not Available"}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Passed vs Failed Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-neutral-200/50 dark:border-slate-800 flex flex-col shadow-sm">
          <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Passed Checks</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{passedCount ?? "Not Available"}</span>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-neutral-200/50 dark:border-slate-800 flex flex-col shadow-sm">
          <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Failed Checks</span>
          <span className="text-2xl font-black text-[#b5005d] dark:text-pink-400 mt-1">{failedCount ?? "Not Available"}</span>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-neutral-200/50 dark:border-slate-800 flex flex-col shadow-sm">
          <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Total Checks</span>
          <span className="text-2xl font-black text-neutral-800 dark:text-slate-200 mt-1">{totalChecks ?? "Not Available"}</span>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-neutral-200/50 dark:border-slate-800 flex flex-col shadow-sm">
          <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Pass Percentage</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{passPercentage !== null ? `${passPercentage}%` : "Not Available"}</span>
        </div>
      </div>

      {/* Section 3 & 4: Failed Audits & Recommendations */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 px-5 py-4">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-slate-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed Audits & Recommendations
          </span>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-slate-800/60 font-semibold text-xs text-[#2D3748] dark:text-slate-350">
          {failedAudits && failedAudits.length > 0 ? (
            failedAudits.map((audit: any, idx: number) => {
              // Rule-based recommendations
              let recommendation = "Review this audit's guidelines to improve SEO performance.";
              if (audit.id === "robots-txt") {
                recommendation = "Fix robots.txt format so search engines can crawl the website correctly.";
              } else if (audit.title?.toLowerCase().includes("crawl")) {
                recommendation = "Check crawlability and indexing settings.";
              } else if (audit.title?.toLowerCase().includes("document")) {
                recommendation = "Review page metadata and document structure.";
              }

              return (
                <div key={idx} className="p-5 flex items-start gap-4 hover:bg-neutral-50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="mt-0.5 text-[#b5005d] bg-red-50 p-1.5 rounded-lg border border-red-200/50 dark:text-pink-400 dark:bg-pink-950/40 dark:border-pink-850/50">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 dark:text-slate-200 text-[14px]">{audit.label || audit.id}</span>
                      <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase bg-red-100 dark:bg-pink-950 text-[#b5005d] dark:text-pink-300">
                        Audit Failed
                      </span>
                    </div>
                    <h5 className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1.5 italic">"{audit.title}"</h5>
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-300 block mb-1">Recommendation</span>
                          <span className="text-blue-700 dark:text-blue-200">{recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-neutral-400 dark:text-slate-500 italic">
              No failed Lighthouse SEO audits found.
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Raw Lighthouse SEO JSON */}
      <details className="bg-neutral-50 dark:bg-slate-800/20 border border-neutral-200 dark:border-slate-800 rounded-xl p-4 text-xs group">
        <summary className="font-bold text-neutral-600 dark:text-slate-400 cursor-pointer outline-none flex justify-between items-center">
          <span>View Raw Lighthouse SEO Data</span>
          <span className="text-[10px] font-normal opacity-50 group-open:hidden">Click to expand</span>
        </summary>
        <div className="mt-4 overflow-x-auto">
          {!lhData ? (
            <p className="text-neutral-500 italic mb-2">lead.lighthouse_seo data is not available.</p>
          ) : (
            <pre className="text-[10px] text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-lg border border-neutral-200/50 dark:border-slate-700">
              {JSON.stringify(lhData, null, 2)}
            </pre>
          )}
        </div>
      </details>
    </div>
  );
};
