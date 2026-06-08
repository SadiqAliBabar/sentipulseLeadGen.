import React, { useState, useMemo } from "react";
import { Lead } from "../types";
import {
  Star,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Code,
  TrendingUp,
  TrendingDown,
  MapPin,
  Award,
  Info,
  HelpCircle,
  Activity,
  Sparkles,
  ArrowUpDown,
  Filter
} from "lucide-react";

interface RankTrackerTabProps {
  lead: Lead;
}

export default function RankTrackerTab({ lead }: RankTrackerTabProps) {
  // Access either rank_tracker or rankTrackerRaw
  const rankTracker = lead?.rank_tracker || lead?.rankTrackerRaw;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showRawJson, setShowRawJson] = useState(false);
  const [sortField, setSortField] = useState<"keyword" | "found" | "rank" | "page" | "status" | "priority">("keyword");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Empty state if rank tracker is missing
  if (!rankTracker) {
    return (
      <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-10 border border-neutral-200 dark:border-slate-800 text-center text-neutral-500 dark:text-slate-400 shadow-sm animate-[fadeIn_0.3s_ease-out]">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-neutral-400 dark:text-slate-500" />
        <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-lg">No Rank Tracker Data Available</h4>
        <p className="text-xs text-neutral-500 mt-2 max-w-md mx-auto">
          The rank tracking audit has not been executed for this lead or the data is missing. Please run the Rank Tracker stage.
        </p>
      </div>
    );
  }

  // Safe variables
  const city = rankTracker.city || "Not Available";
  const results = Array.isArray(rankTracker.results) ? rankTracker.results : [];
  
  // Calculate checked and ranked if missing
  const keywordsChecked = rankTracker.keywords_checked ?? results.length;
  const keywordsRanked = rankTracker.keywords_ranked ?? results.filter(r => r.found && r.rank !== null).length;
  const keywordsNotFound = keywordsChecked - keywordsRanked;
  
  const bestRankVal = rankTracker.best_rank;
  const bestRank = bestRankVal !== null && bestRankVal !== undefined ? `#${bestRankVal}` : "Not Available";
  
  // Safe Date Formatting
  const getFormattedDate = (dateObj: any) => {
    if (!dateObj) return "Not Available";
    const rawDate = dateObj.$date || dateObj;
    if (!rawDate) return "Not Available";
    try {
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return "Not Available";
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return "Not Available";
    }
  };
  const checkedAt = getFormattedDate(rankTracker.checked_at);

  // Status and Priority helper functions
  const getStatus = (found: boolean, rank: number | null) => {
    if (!found || rank === null) return "Missing";
    if (rank <= 3) return "Excellent";
    if (rank <= 10) return "Good";
    if (rank <= 20) return "Needs Push";
    if (rank <= 50) return "Weak";
    return "Very Weak";
  };

  const getPriority = (found: boolean, rank: number | null) => {
    if (!found || rank === null) return "High";
    if (rank > 20) return "High";
    if (rank >= 11 && rank <= 20) return "Medium";
    if (rank >= 4 && rank <= 10) return "Low";
    return "Maintain";
  };

  // Section 2: Health Counts
  const healthCounts = useMemo(() => {
    let top3 = 0;
    let page1 = 0;
    let page2 = 0;
    let page3Plus = 0;
    let notFound = 0;

    results.forEach((r: any) => {
      const rank = r.rank;
      const found = r.found;
      const page = r.page;

      if (!found || rank === null) {
        notFound++;
      } else {
        if (rank <= 3) top3++;
        
        // Page 1 is rank 1-10 or page 1
        if (page === 1 || (rank >= 1 && rank <= 10)) {
          page1++;
        }
        
        // Page 2 is rank 11-20 or page 2
        if (page === 2 || (rank >= 11 && rank <= 20)) {
          page2++;
        }
        
        // Page 3+ is rank > 20 or page >= 3
        if (page >= 3 || rank > 20) {
          page3Plus++;
        }
      }
    });

    return { top3, page1, page2, page3Plus, notFound };
  }, [results]);

  // Section 3: Sorting and Filtering logic
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredResults = useMemo(() => {
    let list = results.filter((r: any) => {
      if (!r.keyword) return false;
      return r.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Apply filters
    list = list.filter((r: any) => {
      if (activeFilter === "all") return true;
      const rank = r.rank;
      const found = r.found;
      const page = r.page;

      if (activeFilter === "top3") {
        return found && rank !== null && rank <= 3;
      }
      if (activeFilter === "page1") {
        return found && (page === 1 || (rank !== null && rank <= 10));
      }
      if (activeFilter === "page2") {
        return found && (page === 2 || (rank !== null && rank >= 11 && rank <= 20));
      }
      if (activeFilter === "weak") {
        return found && (page >= 3 || (rank !== null && rank > 20));
      }
      if (activeFilter === "notfound") {
        return !found || rank === null;
      }
      return true;
    });

    // Apply sorting
    list.sort((a: any, b: any) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Custom values for calculated fields
      if (sortField === "status") {
        valA = getStatus(a.found, a.rank);
        valB = getStatus(b.found, b.rank);
      } else if (sortField === "priority") {
        valA = getPriority(a.found, a.rank);
        valB = getPriority(b.found, b.rank);
      }

      // Handle nulls / undefined for sorting
      if (sortField === "rank") {
        valA = a.rank === null ? 99999 : a.rank;
        valB = b.rank === null ? 99999 : b.rank;
      }
      if (sortField === "page") {
        valA = a.page === null ? 99999 : a.page;
        valB = b.page === null ? 99999 : b.page;
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc"
          ? valA - valB
          : valB - valA;
      }
    });

    return list;
  }, [results, searchQuery, activeFilter, sortField, sortOrder]);

  // Section 5: Winning Keywords
  // Show keywords with rank <= 10 and found true. Sort by best rank first.
  const winners = useMemo(() => {
    const winnerList = results.filter((r: any) => r.found && r.rank !== null && r.rank <= 10);
    
    return winnerList.map((r: any) => {
      let maintainAction = "";
      if (r.rank <= 3) {
        maintainAction = "Top ranking position. Monitor CTR, keep content fresh, and maintain high local relevance.";
      } else {
        maintainAction = "Improve title tags, reviews, content freshness, and CTR to push into top 3.";
      }
      return {
        ...r,
        maintainAction
      };
    }).sort((a: any, b: any) => (a.rank ?? 9999) - (b.rank ?? 9999));
  }, [results]);

  // Styling helper for status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Excellent":
        return "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50";
      case "Good":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50";
      case "Needs Push":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-950/40 dark:text-yellow-350 dark:border-yellow-800/50";
      case "Weak":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-350 dark:border-orange-900/40";
      case "Very Weak":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-pink-950/40 dark:text-pink-350 dark:border-pink-900/40";
      case "Missing":
      default:
        return "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/80";
    }
  };

  // Styling helper for opportunity priority
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-50 text-[#b5005d] border-red-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-850/50";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-950/40 dark:text-yellow-350 dark:border-yellow-800/50";
      case "Low":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50";
      case "Maintain":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-350 dark:border-emerald-800/50";
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Section 1: Rank Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* City Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>Target City</span>
          </div>
          <div className="text-lg font-black text-neutral-800 dark:text-slate-200 mt-2 truncate">
            {city}
          </div>
        </div>

        {/* Keywords Checked Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider block">
            Keywords Checked
          </span>
          <div className="text-2xl font-black text-neutral-800 dark:text-slate-100 mt-1">
            {keywordsChecked}
          </div>
        </div>

        {/* Keywords Ranked Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider block">
            Keywords Ranked
          </span>
          <div className="text-2xl font-black text-[#00685f] dark:text-teal-400 mt-1">
            {keywordsRanked}
          </div>
        </div>

        {/* Keywords Not Found Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider block">
            Not Found
          </span>
          <div className="text-2xl font-black text-[#b5005d] dark:text-pink-400 mt-1">
            {keywordsNotFound}
          </div>
        </div>

        {/* Best Rank Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">
            <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
            <span>Best Rank</span>
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {bestRank}
          </div>
        </div>

        {/* Checked At Card */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center transition-all hover:shadow-md col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Checked At</span>
          </div>
          <div className="text-[11px] font-bold text-neutral-500 dark:text-slate-400 mt-2 leading-relaxed">
            {checkedAt}
          </div>
        </div>
      </div>

      {/* Section 2: Ranking Health Counts */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="font-sans font-black text-sm text-neutral-800 dark:text-slate-200 mb-5 uppercase tracking-wide flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-[#00685f] dark:text-teal-400" />
          Ranking Health Distribution
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-xl p-4 text-center">
            <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{healthCounts.top3}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-500">Top 3 Rank</span>
            <span className="block text-[9px] text-neutral-400 dark:text-slate-500 mt-1 font-semibold">Rank #1 to #3</span>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/40 rounded-xl p-4 text-center">
            <span className="block text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{healthCounts.page1}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-blue-700 dark:text-blue-500">Page 1 Rank</span>
            <span className="block text-[9px] text-neutral-400 dark:text-slate-500 mt-1 font-semibold">Rank #1 to #10</span>
          </div>
          <div className="bg-amber-50/50 dark:bg-yellow-950/10 border border-amber-100/50 dark:border-yellow-900/30 rounded-xl p-4 text-center">
            <span className="block text-3xl font-black text-amber-600 dark:text-amber-500 mb-1">{healthCounts.page2}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 dark:text-amber-400">Page 2 Rank</span>
            <span className="block text-[9px] text-neutral-400 dark:text-slate-500 mt-1 font-semibold">Rank #11 to #20</span>
          </div>
          <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/30 rounded-xl p-4 text-center">
            <span className="block text-3xl font-black text-orange-600 dark:text-orange-500 mb-1">{healthCounts.page3Plus}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-orange-700 dark:text-orange-400">Page 3+ Rank</span>
            <span className="block text-[9px] text-neutral-400 dark:text-slate-500 mt-1 font-semibold">Rank &gt; #20</span>
          </div>
          <div className="bg-red-50/50 dark:bg-pink-950/15 border border-red-100/50 dark:border-pink-900/30 rounded-xl p-4 text-center col-span-2 md:col-span-1">
            <span className="block text-3xl font-black text-[#b5005d] dark:text-pink-400 mb-1">{healthCounts.notFound}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-red-700 dark:text-pink-400">Not Found</span>
            <span className="block text-[9px] text-neutral-400 dark:text-slate-500 mt-1 font-semibold">Unranked</span>
          </div>
        </div>
      </div>

      {/* Section 3: Keyword Ranking Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-neutral-100 dark:border-slate-800 pb-5">
          <h4 className="font-sans font-black text-base text-neutral-800 dark:text-slate-200">
            Keyword Ranking Results <span className="text-neutral-400 text-xs font-bold font-sans">({filteredResults.length} keywords)</span>
          </h4>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#f8f9fa] dark:bg-slate-800/80 border border-neutral-250 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-neutral-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#00685f]/30 focus:border-[#00685f] dark:focus:border-teal-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full sm:w-auto flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2.5 bg-[#f8f9fa] dark:bg-slate-800/80 border border-neutral-250 dark:border-slate-700/80 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#00685f]/35 cursor-pointer"
              >
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="all">All Keywords</option>
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="top3">Top 3 (Rank 1-3)</option>
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="page1">Page 1 (Rank 1-10)</option>
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="page2">Page 2 (Rank 11-20)</option>
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="weak">Weak (Rank &gt; 20)</option>
                <option className="bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200" value="notfound">Not Found / Missing</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-750 dark:text-slate-300">
            <thead>
              <tr className="bg-neutral-50 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
                <th
                  onClick={() => handleSort("keyword")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Keyword
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("found")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Found
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("rank")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Rank
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("page")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Page
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Status
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("priority")}
                  className="p-3.5 text-[9px] font-black uppercase tracking-wider text-neutral-450 dark:text-slate-400 text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    Opportunity Priority
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60">
              {filteredResults.length > 0 ? (
                filteredResults.map((result: any, idx: number) => {
                  const status = getStatus(result.found, result.rank);
                  const priority = getPriority(result.found, result.rank);
                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-3.5 font-bold text-neutral-800 dark:text-slate-200 max-w-[200px] truncate" title={result.keyword}>
                        {result.keyword}
                      </td>
                      <td className="p-3.5 text-center">
                        {result.found ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800/40">Yes</span>
                        ) : (
                          <span className="text-neutral-500 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/80">No</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-black text-neutral-800 dark:text-slate-100">
                        {result.rank !== null ? `#${result.rank}` : "-"}
                      </td>
                      <td className="p-3.5 text-center font-medium text-neutral-500 dark:text-slate-400">
                        {result.page !== null ? `Page ${result.page}` : "-"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusBadge(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getPriorityBadge(priority)}`}>
                          {priority}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-neutral-400 dark:text-slate-500 font-bold text-sm bg-neutral-50 dark:bg-slate-800/20">
                    No keywords found matching query/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Section 5: Winning Keywords */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <h4 className="font-sans font-black text-sm text-neutral-800 dark:text-slate-200 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-500/10" />
            Winning Keywords (Top 10)
          </h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mb-4">
            Strongest search terms driving visibility. Keep these maintained to prevent ranking drops.
          </p>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {winners.length > 0 ? (
              winners.map((win: any, i: number) => (
                <div
                  key={i}
                  className="bg-[#f4fffc]/60 dark:bg-emerald-950/5 border border-neutral-200/50 dark:border-emerald-900/20 p-4 rounded-xl flex flex-col gap-2 hover:border-[#00685f]/30 dark:hover:border-teal-850/40 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-neutral-800 dark:text-slate-200 text-sm break-words flex-1">
                      {win.keyword}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase shrink-0 ${
                      win.rank <= 3 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60" 
                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50"
                    }`}>
                      {win.rank <= 3 ? "Top 3 Winner" : "Top 10 Winner"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-slate-400">
                    <span>Rank:</span>
                    <span className="text-[#00685f] dark:text-teal-400 font-black">
                      #{win.rank} (Page {win.page})
                    </span>
                  </div>

                  <div className="mt-1 pl-3 border-l-2 border-emerald-500 dark:border-teal-500">
                    <p className="text-[11px] text-neutral-600 dark:text-slate-400 font-medium leading-relaxed">
                      {win.maintainAction}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-neutral-400 dark:text-slate-500 italic font-bold">
                No winning keywords (ranked top 10) found. Improve rankings to establish winners!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 6: Raw Rank Tracker JSON */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-750 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-slate-300">
            <Code className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
            Raw Rank Tracker JSON Data
          </div>
          {showRawJson ? (
            <ChevronUp className="w-5 h-5 text-neutral-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-500" />
          )}
        </button>
        {showRawJson && (
          <div className="p-4 bg-neutral-900 dark:bg-[#0b0f19] border-t border-neutral-200 dark:border-slate-850 overflow-x-auto max-h-[500px] overflow-y-auto">
            <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
              {JSON.stringify(rankTracker, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
