import React from "react";
import { Lead } from "../types";
import { Star, Award } from "lucide-react";

interface NeighborsTabProps {
  lead: Lead;
}

export default function NeighborsTab({ lead }: NeighborsTabProps) {
  // 1. Data Resolution Logic
  const resolvedData = (() => {
    // Prioritize neighboursRaw because it contains the full data with ratings
    if ((lead as any)?.neighboursRaw?.top_3 && Array.isArray((lead as any).neighboursRaw.top_3)) {
      return (lead as any).neighboursRaw.top_3;
    }

    const keys = ["neighbors", "competitors", "nearby_businesses", "local_competitors"];
    
    for (const key of keys) {
      const val = (lead as any)?.[key];
      if (!val) continue;

      if (Array.isArray(val)) {
        return val;
      }

      if (typeof val === "object") {
        for (const innerKey of Object.keys(val)) {
          if (Array.isArray(val[innerKey])) {
            return val[innerKey];
          }
        }
      }
    }
    return [];
  })();

  const allNeighbors = resolvedData;
  const leadRating = Number(lead.rating) || 0;
  
  // Find top three neighbors overall to display in the table
  const topNeighbors = allNeighbors
    .map((n: any) => ({ ...n, numericRating: Number(n.rating) || 0 }))
    .sort((a: any, b: any) => b.numericRating - a.numericRating)
    .slice(0, 3);

  // If ANY competitor has a strictly higher rating, the lead is NOT leading
  // (so we hide the message). If NO competitor is higher, we show it.
  const isLeading = topNeighbors.length === 0 || !topNeighbors.some((n: any) => n.numericRating > leadRating);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {isLeading && (
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-6 border border-neutral-200 dark:border-slate-800 text-center shadow-sm">
          <Award className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
          <h4 className="font-bold text-neutral-800 dark:text-slate-200 text-lg">
            This lead leads all the competitors nearby.
          </h4>
        </div>
      )}

      {topNeighbors.length > 0 && (
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-250 dark:border-slate-850 px-5 py-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-slate-300">
              Competitor Comparison
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-semibold text-xs text-neutral-700 dark:text-slate-300">
              <thead>
                <tr className="bg-neutral-50 dark:bg-slate-800/20 border-b border-neutral-250 dark:border-slate-850 text-[10px] text-neutral-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Business</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Reviews</th>
                  <th className="p-4">Distance</th>
                  <th className="p-4">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-850">
                {/* Current Lead Row */}
                <tr className="bg-emerald-50/50 dark:bg-emerald-900/10 transition-colors">
                  <td className="p-4 font-bold text-emerald-700 dark:text-emerald-400 text-[13px] whitespace-nowrap">
                    {lead.name} (Current Lead)
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>{leadRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-emerald-700 dark:text-emerald-400">
                    {lead.reviewsCount ?? (lead as any).reviews_count ?? 0}
                  </td>
                  <td className="p-4 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    —
                  </td>
                  <td className="p-4">
                    {lead.hasWebsite || lead.website ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                        Has Website
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/50">
                        No Website
                      </span>
                    )}
                  </td>
                </tr>
                
                {/* Competitors Rows */}
                {topNeighbors.map((comp: any, idx: number) => {
                  const hasWeb = comp.website && comp.website !== "Not Available";
                  const reviewsVal = comp.reviews_count ?? comp.reviewsCount;
                  const distance = typeof comp.distance === 'number' ? `${comp.distance.toFixed(2)} km` : (comp.distance || (comp.distance_km ? `${comp.distance_km.toFixed(2)} km` : "Not Available"));

                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-bold text-neutral-800 dark:text-slate-200 text-[13px] whitespace-nowrap max-w-[200px] truncate" title={comp.name || "Not Available"}>
                        {comp.name || "Not Available"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-neutral-800 dark:text-slate-200">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                          <span>{typeof comp.rating === "number" ? comp.rating.toFixed(1) : "Not Available"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-slate-400">
                        {typeof reviewsVal === "number" ? reviewsVal : "Not Available"}
                      </td>
                      <td className="p-4 text-neutral-500 dark:text-slate-400 whitespace-nowrap">
                        {distance}
                      </td>
                      <td className="p-4">
                        {hasWeb ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                            Has Website
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/50">
                            No Website
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
