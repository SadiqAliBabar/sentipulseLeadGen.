import React, { useState, useMemo, useEffect } from "react";
import WebsiteCrawlTab from "./WebsiteCrawlTab";
import { Lead } from "../types";
import { DENTIST_LEADS } from "../data";
import GoogleReviewsTab from "./GoogleReviewsTab";
import LinksAuditTab from "./LinksAuditTab";
import { LighthouseSEOTab } from "./LighthouseSEOTab";
import RankTrackerTab from "./RankTrackerTab";
import RawDataTab from "./RawDataTab";
import NeighborsTab from "./NeighborsTab";
import { 
  Star, 
  Phone, 
  Globe, 
  TrendingDown, 
  TrendingUp, 
  Check,
  AlertTriangle, 
  MapPin, 
  Sparkles,
  Inbox,
  X,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertCircle
} from "lucide-react";

interface DashboardViewProps {
  category: string;
  onCategoryChange: (category: string) => void;
  isDarkMode?: boolean;
}

export default function DashboardView({ category, onCategoryChange, isDarkMode = false }: DashboardViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([category]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("lead-1");
  const [activeFilter, setActiveFilter] = useState<
    "filter-criteria" | "filter-criteria-website" | "all" | "all-website"
  >("filter-criteria");
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "gbp" | "review-summary" | "google-reviews" | "performance" | "onpage-seo" | "lighthouse-seo" | "seo-deep-audit" | "links-audit" | "neighbors" | "rank-tracker" | "website-crawl" | "raw-data"
  >("overview");

  useEffect(() => {
    setActiveDetailTab("overview");
  }, [selectedLeadId, category]);

  useEffect(() => {
    fetch("http://localhost:8000/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => {
        if (data && data.categories && data.categories.length > 0) {
          const list = [...data.categories];
          // Avoid pushing if a plural/singular variant already exists
          const exists = list.some(c => 
            c.toLowerCase() === category.toLowerCase() || 
            c.toLowerCase() === category.toLowerCase() + "s" ||
            c.toLowerCase() + "s" === category.toLowerCase()
          );
          if (!exists) {
            list.push(category);
          }
          setAvailableCategories(list);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch categories from backend, using fallback list:", err);
        setAvailableCategories(["dentist", "gyms"]);
      });
  }, []);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadLeads = (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    fetch(`http://localhost:8000/api/leads/${category.toLowerCase()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.leads && data.leads.length > 0) {
          const mappedLeads = data.leads.map((lead: any) => ({
            ...lead,
            id: lead.id || lead._id || String(Math.random()),
          }));
          setLeads(mappedLeads);
          if (mappedLeads.length > 0) {
            // Check if selected lead still exists in the newly fetched leads
            const exists = mappedLeads.some((l: any) => l.id === selectedLeadId);
            if (!exists) {
              setSelectedLeadId(mappedLeads[0].id);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Backend leads fetch failed, using static fallback leads:", err);
        // Fall back to static leads only if fetching dentist
        if (category.toLowerCase() === "dentist") {
          setLeads(DENTIST_LEADS);
          setSelectedLeadId(DENTIST_LEADS[0].id);
        }
      })
      .finally(() => {
        if (showIndicator) setIsRefreshing(false);
      });
  };

  useEffect(() => {
    setLeads([]);
    loadLeads();
  }, [category]);

  // Campaign State
  const [campLead, setCampLead] = useState<Lead | null>(null);
  const [campaignSuccess, setCampaignSuccess] = useState<boolean>(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");

  // Select active lead
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0];
  }, [leads, selectedLeadId]);

  // Filtering leads based on active chip filter and search query
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Search Query Filter
      if (searchQuery.trim() !== "") {
        const matchesName = lead.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesWeb = lead.website.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesName && !matchesWeb) return false;
      }

      // 2. Tab Filter
      switch (activeFilter) {
        case "filter-criteria":
          return lead.filteredByCriteria && !lead.filteredByCriteriaWithWebsite;
        case "filter-criteria-website":
          return lead.filteredByCriteriaWithWebsite;
        case "all-website":
          return lead.hasWebsite;
        case "all":
        default:
          return true;
      }
    });
  }, [leads, activeFilter, searchQuery]);

  // Automatically update active selection if current selection gets filtered out of the active list
  useMemo(() => {
    if (filteredLeads.length > 0 && !filteredLeads.some((l) => l.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  // Triggering Outreach Campaign Flow
  const handleOpenCampaign = (lead: Lead) => {
    setCampLead(lead);
    setCustomSubject(`Partnership Proposal: Enhancing Online Visibility For ${lead.name}`);
    setCustomBody(
      `Hello Clinical Operations Team,\n\n` +
      `I recently compiled a Local-SEO audit for ${lead.name} in Lahore using our pipeline. ` +
      `We found several immediate critical areas which, if resolved, could increase your local search ranking substantially.\n\n` +
      `Key Discoveries:\n` +
      `• Google Business Profile completeness is currently at ${lead.gbpScore}% (${lead.gbpStatus}).\n` +
      `• Your website mobile response score is ${lead.mobileSpeed}/100.\n` +
      `• SEO Audit Grade is currently listed as a ${lead.seoGrade}.\n\n` +
      `We estimate correcting these issues can unlock PKR ${lead.revenueImpact.replace("PKR ", "")} in additional monthly dental care client revenue.\n\n` +
      `Would you be open to a 10-minute preview review of the checklist?\n\n` +
      `Best regards,\n` +
      `LeadGen Automation Agent`
    );
    setCampaignSuccess(false);
    setIsCampaignModalOpen(true);
  };

  const handleLaunchCampaign = () => {
    setCampaignSuccess(true);
    setTimeout(() => {
      setIsCampaignModalOpen(false);
      setCampaignSuccess(false);
      // Optional: Add indicator that campaign is running for this lead
    }, 1800);
  };

  return (
    <div 
      className="relative pt-24 h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] w-full flex flex-col px-4 md:px-8 pb-[3vh] select-none transition-colors duration-300 overflow-hidden" 
      id="dashboard-root"
    >
      




      {/* Main Split-Screen Panel Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Side: Leads Selection Sidebar Panel (2/12 wide) */}
        <div className="lg:col-span-2 flex flex-col gap-3 h-full pr-1 overflow-hidden">
          
          {/* Category Selector Dropdown */}
          <div className="flex-none bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden relative">
            <select
              value={availableCategories.find(c => c.toLowerCase() === category.toLowerCase() || c.toLowerCase() + "s" === category.toLowerCase() || c.toLowerCase() === category.toLowerCase() + "s") || category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-black tracking-wide bg-transparent text-[#2D3748] dark:text-white focus:outline-none cursor-pointer appearance-none pr-8 uppercase"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-[#0b0f19] text-[#2D3748] dark:text-white">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#2D3748] dark:text-white">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Filters Sidebar Module - Fixed Header */}
          <div className="flex-none bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs font-black tracking-wide bg-transparent text-[#2D3748] dark:text-white focus:outline-none cursor-pointer appearance-none pr-8 uppercase"
            >
              <option className="bg-white dark:bg-[#0b0f19] text-[#2D3748] dark:text-white" value="filter-criteria">Filter by criteria</option>
              <option className="bg-white dark:bg-[#0b0f19] text-[#2D3748] dark:text-white" value="filter-criteria-website">Criteria + Website</option>
              <option className="bg-white dark:bg-[#0b0f19] text-[#2D3748] dark:text-white" value="all">Without filter</option>
              <option className="bg-white dark:bg-[#0b0f19] text-[#2D3748] dark:text-white" value="all-website">All + Website</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#2D3748] dark:text-white">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
          
          {/* Refresh button moved to sidebar */}
          <button
            onClick={() => loadLeads(true)}
            disabled={isRefreshing}
            className={`flex-none flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border bg-white text-[#00685f] border-neutral-200/80 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 dark:bg-slate-900/60 dark:text-teal-400 dark:border-slate-800/80 dark:hover:bg-slate-800`}
            title="Refresh lead data from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>

          {/* Scrollable Leads List Segment */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-2">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer relative shadow-sm hover:translate-x-1 hover:shadow-md ${
                      isSelected
                        ? "border-2 border-[#00685f] dark:border-teal-500 bg-[#f4fffc] dark:bg-teal-950/20"
                        : "border-neutral-200/80 dark:border-slate-800/80"
                    }`}
                    id={`lead-card-${lead.id}`}
                  >
                    {/* Dynamic Globe icon at top-right indicating active website */}
                    {lead.hasWebsite && (
                      <span className="absolute top-4 right-4 text-[#008378] dark:text-teal-400" title="Website available">
                        <Globe className="w-4 h-4" />
                      </span>
                    )}

                    <h4 className="font-hanken font-extrabold text-[15px] text-[#2D3748] dark:text-slate-200 pr-6 truncate">
                      {lead.name}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-2 text-sm text-[#3d4947]/70 dark:text-slate-400 font-semibold">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span className="text-[#191c1d] dark:text-slate-200 font-bold">{lead.rating}</span>
                      <span>({lead.reviewsCount} Reviews)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-neutral-200 dark:border-slate-800 text-center text-[#3d4947]/50 dark:text-slate-400/60 mt-2">
                <Inbox className="w-10 h-10 mx-auto text-neutral-300 dark:text-slate-700 mb-2" />
                <p className="font-bold text-sm">No matches identified</p>
                <p className="text-xs">Adjust filters or refine search text</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Lead Details Dashboard (10/12 wide) */}
        {selectedLead ? (
          <div className="lg:col-span-10 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xl p-6 md:p-8 relative flex flex-col h-full overflow-hidden">
            
            {/* Header profile and start campaign action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-slate-800 pb-5 mb-6">
              <div>
                <h3 className="text-2xl font-black font-sans text-[#2D3748] dark:text-slate-100 leading-tight">
                  {selectedLead.name}, {selectedLead.location}
                </h3>
                
                {/* Contact + Web indicators */}
                <div className="flex flex-wrap items-center mt-2.5 gap-x-4 gap-y-1.5 text-xs font-semibold text-[#3d4947]/75 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-neutral-800 dark:text-slate-200 font-bold">{selectedLead.rating}</span>
                    <span>({selectedLead.reviewsCount} Reviews)</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
                    <span className="text-neutral-700 dark:text-slate-300">+{selectedLead.phone}</span>
                  </div>

                  {selectedLead.hasWebsite && (
                    <a
                      href={`https://${selectedLead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      referrerPolicy="no-referrer"
                      className="flex items-center gap-1 text-[#008378] dark:text-teal-400 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{selectedLead.website}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Start Campaign Action Button */}
              <button
                onClick={() => handleOpenCampaign(selectedLead)}
                className="px-5 py-3 rounded-md text-xs font-black tracking-wider bg-[#b5005d] text-white hover:brightness-110 active:scale-95 shadow-lg shadow-[#b5005d]/10 transition-all cursor-pointer whitespace-nowrap self-start dark:bg-pink-950/60 dark:text-pink-300 dark:border dark:border-pink-800/50 dark:hover:bg-pink-950/80"
                id="btn-start-campaign"
              >
                Start Campaign
              </button>
            </div>

            {/* Sub-tab navigation menu inside detail panel */}
            <div className="flex border-b border-neutral-200 dark:border-slate-800 mb-6 gap-6 overflow-x-auto select-none pb-2" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "gbp", label: "GBP Audit" },
                { id: "google-reviews", label: "Google Reviews" },
                { id: "review-summary", label: "Review Summary" },
                { id: "performance", label: "PageSpeed" },
                { id: "lighthouse-seo", label: "Lighthouse SEO" },
                { id: "seo-deep-audit", label: "SEO Deep Audit" },
                { id: "neighbors", label: "Neighbors" },
                { id: "rank-tracker", label: "Rank Tracker" },
                { id: "website-crawl", label: "Website Crawl" },
                { id: "raw-data", label: "Raw Data" }
              ].filter((tab) => selectedLead.hasWebsite || ["overview", "gbp", "google-reviews", "review-summary", "neighbors", "rank-tracker", "raw-data"].includes(tab.id)).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`py-2 text-sm font-bold tracking-wide capitalize whitespace-nowrap relative transition-colors cursor-pointer ${
                    activeDetailTab === tab.id
                      ? "text-[#00685f] dark:text-teal-400"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  {activeDetailTab === tab.id && (
                    <span className="absolute bottom-[-9px] left-0 right-0 h-[3px] bg-[#00685f] dark:bg-teal-400 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto pr-2 mt-4 pb-12">


            {activeDetailTab === "overview" && (
              <div className="space-y-6 animate-[fadeIn_0.3s_ease-out] mb-8">
                {/* 1. Business Header */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <h3 className="text-2xl font-black font-sans text-neutral-800 dark:text-slate-100">{selectedLead.name}</h3>
                      <p className="text-sm font-bold text-neutral-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                        {selectedLead.category || (selectedLead as any).categories?.[0] || category}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-slate-300 font-semibold">
                      {(selectedLead as any).address && (
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-400" /> {(selectedLead as any).address}</div>
                      )}
                      {(selectedLead as any).phone && (
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-neutral-400" /> {(selectedLead as any).phone}</div>
                      )}
                      {((selectedLead as any).website || selectedLead.website) && (
                        <a href={(((selectedLead as any).website || selectedLead.website).startsWith('http') ? ((selectedLead as any).website || selectedLead.website) : "https://" + ((selectedLead as any).website || selectedLead.website))} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#00685f] dark:text-teal-400 hover:underline">
                          <Globe className="w-4 h-4" /> {(selectedLead as any).website || selectedLead.website}
                        </a>
                      )}
                      {(selectedLead as any).link && (
                        <a href={(selectedLead as any).link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                          <MapPin className="w-4 h-4" /> Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Quick Score Cards */}
                {(() => {
                  const gbpScore = (selectedLead as any).gbp_audit?.completeness_score ?? (selectedLead as any).gbpAuditRaw?.completeness_score;
                  const lhScore = (selectedLead as any).lighthouse_seo?.score ?? (selectedLead as any).lighthouseSeoRaw?.score;
                  const pagespeed = (selectedLead as any).pagespeed || selectedLead.pagespeedRaw || {};
                  const mobileScore = pagespeed.PHONE?.lab?.score ?? pagespeed.mobile?.lab?.score;
                  const desktopScore = pagespeed.DESKTOP?.lab?.score ?? pagespeed.desktop?.lab?.score;
                  const rankTracker = (selectedLead as any).rank_tracker || (selectedLead as any).rankTrackerRaw || {};
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4">
                        <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">Google Rating</span>
                        <div className="text-2xl font-black mt-1 flex items-center gap-2 text-amber-500">
                          {selectedLead.rating ?? "N/A"} <Star className="w-5 h-5 fill-current" />
                        </div>
                        <p className="text-[10px] font-semibold text-neutral-400 dark:text-slate-500 mt-1">{selectedLead.reviewsCount ?? (selectedLead as any).reviews_count ?? 0} Reviews</p>
                      </div>
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4">
                        <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">GBP Score</span>
                        <div className="text-2xl font-black mt-1 text-[#00685f] dark:text-teal-400">
                          {gbpScore != null ? `${gbpScore}%` : "Not Available"}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4">
                        <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">Lighthouse SEO</span>
                        <div className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
                          {lhScore != null ? lhScore : "Not Available"}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4">
                        <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">Mobile PageSpeed</span>
                        <div className="text-2xl font-black mt-1 text-orange-600 dark:text-orange-400">
                          {mobileScore != null ? mobileScore : "Not Available"}
                        </div>
                        <p className="text-[10px] font-semibold text-neutral-400 dark:text-slate-500 mt-1">Desktop: {desktopScore != null ? desktopScore : "N/A"}</p>
                      </div>
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4 col-span-2 md:col-span-4 flex justify-between items-center">
                         <div>
                            <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">Best Keyword Rank</span>
                            <div className="text-xl font-black mt-1 text-blue-600 dark:text-blue-400">
                              {rankTracker.best_rank != null ? `#${rankTracker.best_rank}` : "Not Available"}
                            </div>
                         </div>
                         <div className="text-right">
                           <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 tracking-wider">Keywords Ranked</span>
                           <div className="text-lg font-bold text-neutral-700 dark:text-slate-300 mt-1">
                             {rankTracker.keywords_ranked ?? 0} / {rankTracker.keywords_checked ?? rankTracker.results?.length ?? 0}
                           </div>
                         </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 4. Key Issues Section */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-[#b5005d] dark:text-pink-500" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-neutral-800 dark:text-slate-200">Key Issues</h4>
                    </div>
                    {(() => {
                      const issues: { title: string; desc: string }[] = [];
                      const gbpAudit = (selectedLead as any).gbp_audit || (selectedLead as any).gbpAuditRaw;
                      const seoAudit = (selectedLead as any).seo_audit || (selectedLead as any).seoAuditRaw;
                      const lhSeo = (selectedLead as any).lighthouse_seo || (selectedLead as any).lighthouseSeoRaw;
                      const ps = (selectedLead as any).pagespeed || selectedLead.pagespeedRaw;
                      
                      if (gbpAudit?.missing_items?.length) {
                        issues.push({ title: "GBP Missing Items", desc: gbpAudit.missing_items.join(", ") });
                      }
                      if (seoAudit?.on_page_seo?.issues?.length) {
                        issues.push({ title: "On-Page SEO Issues", desc: seoAudit.on_page_seo.issues.map((i:any)=>i.issue).join(", ") });
                      }
                      if (seoAudit?.broken_links?.broken_count > 0) {
                        issues.push({ title: `Broken Links (${seoAudit.broken_links.broken_count})`, desc: (seoAudit.broken_links.broken_urls || []).slice(0,3).join(", ") + "..." });
                      }
                      if (lhSeo?.failed_audits?.length) {
                        issues.push({ title: "Lighthouse SEO Audits Failed", desc: lhSeo.failed_audits.slice(0,3).map((a:any)=>a.id).join(", ") });
                      }
                      const psPhoneCat = ps?.PHONE?.field_data?.overall_category;
                      if (psPhoneCat && psPhoneCat !== "FAST" && psPhoneCat !== "AVERAGE") {
                        issues.push({ title: "Mobile PageSpeed", desc: `Overall category: ${psPhoneCat}` });
                      }
                      if (ps?.PHONE?.lab?.lcp > 2500) {
                        issues.push({ title: "Mobile LCP Slow", desc: `LCP is ${ps.PHONE.lab.lcp}ms` });
                      }
                      if (ps?.DESKTOP?.lab?.cls > 0.1) {
                        issues.push({ title: "Desktop CLS High", desc: `CLS is ${ps.DESKTOP.lab.cls}` });
                      }

                      if (issues.length == 0) return <p className="text-xs text-neutral-500">No critical issues found in the data.</p>;
                      
                      return (
                        <ul className="space-y-3">
                          {issues.map((iss, i) => (
                            <li key={i} className="text-xs font-semibold">
                              <span className="text-[#b5005d] dark:text-pink-400 font-bold block mb-0.5">{iss.title}</span>
                              <span className="text-neutral-600 dark:text-slate-400 break-words">{iss.desc}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>

                  {/* 5. Quick Opportunities Section */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-[#00685f] dark:text-teal-400" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-neutral-800 dark:text-slate-200">Quick Opportunities</h4>
                    </div>
                    {(() => {
                      const rankTracker = (selectedLead as any).rank_tracker || (selectedLead as any).rankTrackerRaw;
                      const results = rankTracker?.results || [];
                      const opps = results.filter((r: any) => !r.found || r.rank > 20 || (r.rank > 10 && r.rank <= 20)); // page 2 or above or >20

                      if (opps.length == 0) return <p className="text-xs text-neutral-500">No immediate ranking opportunities found or rank data missing.</p>;

                      return (
                        <ul className="space-y-3">
                          {opps.slice(0, 5).map((opp: any, i: number) => (
                            <li key={i} className="flex justify-between items-center bg-[#f8f9fa] dark:bg-slate-800/50 p-2 rounded-lg text-xs font-semibold">
                              <span className="text-neutral-700 dark:text-slate-300 font-bold max-w-[50%] truncate" title={opp.keyword}>{opp.keyword}</span>
                              <div className="flex items-center gap-2 text-neutral-500">
                                {opp.found ? (
                                  <>
                                    <span>Rank: {opp.rank}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-[9px] uppercase">Page {Math.ceil(opp.rank / 10)}</span>
                                  </>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[9px] uppercase">Not Found</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            {activeDetailTab === "gbp" && (() => {
              const gbpAudit = (selectedLead as any).gbp_audit || selectedLead.gbpAuditRaw || {};
              const signals = gbpAudit.signals || {};
              const missingItems = gbpAudit.missing_items || [];
              const completeness_score = gbpAudit.completeness_score ?? selectedLead.gbpScore;
              
              let scoreStatus = "Not Available";
              let statusColor = "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
              let strokeColor = "text-neutral-300 dark:text-slate-700";
              let scorePercentage = 0;
              
              if (completeness_score !== null && completeness_score !== undefined) {
                scorePercentage = Number(completeness_score);
                if (scorePercentage <= 40) { scoreStatus = "Weak"; statusColor = "bg-red-50 text-[#b5005d] border-red-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-850/50"; strokeColor = "text-[#b5005d] dark:text-pink-500"; }
                else if (scorePercentage <= 70) { scoreStatus = "Needs Improvement"; statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-850/50"; strokeColor = "text-amber-500"; }
                else if (scorePercentage <= 90) { scoreStatus = "Good"; statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-850/50"; strokeColor = "text-[#008378] dark:text-teal-400"; }
                else { scoreStatus = "Excellent"; statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-850/50"; strokeColor = "text-[#008378] dark:text-teal-400"; }
              }

              const signalFields = [
                { key: "has_phone", label: "Phone" },
                { key: "has_website", label: "Website" },
                { key: "has_hours", label: "Business Hours" },
                { key: "has_address", label: "Address" },
                { key: "has_description", label: "Business Description" },
                { key: "has_photos", label: "Photos" },
                { key: "photos_enough", label: "At Least 10 Photos" },
                { key: "has_categories", label: "Categories" },
                { key: "has_attributes", label: "Attributes" },
                { key: "has_menu", label: "Menu / Services" },
                { key: "has_qa", label: "Q&A Section" },
                { key: "has_google_posts", label: "Google Posts" },
                { key: "has_opening_date", label: "Opening Date" },
                { key: "has_service_areas", label: "Service Areas" }
              ];

              const rawFields = [
                { key: "description", label: "Description", val: gbpAudit.description },
                { key: "opening_date", label: "Opening Date", val: gbpAudit.opening_date },
                { key: "photos_count", label: "Photos Count", val: gbpAudit.photos_count },
                { key: "has_menu", label: "Has Menu", val: gbpAudit.has_menu },
                { key: "attributes", label: "Attributes", val: gbpAudit.attributes },
                { key: "qa_count", label: "Q&A Count", val: gbpAudit.qa_count },
                { key: "has_google_posts", label: "Has Google Posts", val: gbpAudit.has_google_posts },
                { key: "service_areas", label: "Service Areas", val: gbpAudit.service_areas }
              ];

              const recommendations: string[] = [];
              if (signals.has_description === false) recommendations.push("Add a clear business description with main services and location.");
              if (signals.has_photos === false) recommendations.push("Upload real clinic photos, staff photos, reception photos, and treatment room photos.");
              if (signals.photos_enough === false) recommendations.push("Add at least 10 high-quality photos.");
              if (signals.has_attributes === false) recommendations.push("Add business attributes such as payments, accessibility, and amenities.");
              if (signals.has_qa === false) recommendations.push("Add common patient questions and answers.");
              if (signals.has_google_posts === false) recommendations.push("Publish weekly Google Posts about services, offers, and updates.");
              if (signals.has_opening_date === false) recommendations.push("Add opening or established date to build trust.");
              if (signals.has_service_areas === false) recommendations.push("Add service areas if the business serves nearby locations.");

              return (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                  {/* Section 1: GBP Completeness Score */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-white to-[#f8f9fa] dark:from-slate-900 dark:to-slate-900/80 border border-neutral-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="relative flex shrink-0 items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-neutral-100 dark:text-slate-800" />
                          <circle
                            cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={2 * Math.PI * 60}
                            strokeDashoffset={2 * Math.PI * 60 * (1 - scorePercentage / 100)}
                            strokeLinecap="round"
                            className={`${strokeColor} transition-all duration-1000 ease-out`}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-4xl font-black tracking-tighter text-neutral-800 dark:text-slate-100">
                            {completeness_score !== null && completeness_score !== undefined ? completeness_score : "N/A"}
                          </span>
                          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-widest mt-0.5">/ 100</span>
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 mb-3">
                          <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-2xl tracking-tight">GBP Completeness</h4>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor}`}>{scoreStatus}</span>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-slate-350 font-medium leading-relaxed max-w-xl">
                          {scorePercentage >= 80 ? "Exceptional! This profile is highly optimized and well-positioned to capture local search intent." : scorePercentage >= 50 ? "Moderate visibility. The profile exists but misses critical conversion elements." : "Critical gap identified. Essential details are missing, severely impacting local map pack visibility and seeker trust."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: GBP Signals Grid */}
                  <div>
                    <h5 className="text-lg font-black text-neutral-800 dark:text-slate-200 tracking-tight mb-4 px-2">GBP Signals</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {signalFields.map(field => {
                        const val = signals[field.key];
                        let statusText = "Not Available";
                        let statusClass = "bg-neutral-50 border-neutral-200 dark:bg-slate-800/50 dark:border-slate-700 text-neutral-500 dark:text-slate-400";
                        let Icon = Clock;
                        
                        if (val === true) {
                          statusText = "Available";
                          statusClass = "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400";
                          Icon = Check;
                        } else if (val === false) {
                          statusText = "Missing";
                          statusClass = "bg-red-50/50 border-red-100 dark:bg-pink-900/10 dark:border-pink-800/30 text-[#b5005d] dark:text-pink-400";
                          Icon = X;
                        }

                        return (
                          <div key={field.key} className={`flex items-center justify-between p-4 rounded-xl border ${statusClass} backdrop-blur-sm transition-all`}>
                            <span className="font-bold text-sm truncate mr-2">{field.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-wide">{statusText}</span>
                              <Icon className="w-4 h-4 stroke-[3]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Recommendations */}
                  <div>
                    <h5 className="text-lg font-black text-neutral-800 dark:text-slate-200 tracking-tight mb-4 px-2">Recommendations</h5>
                    {recommendations.length > 0 ? (
                      <div className="space-y-2">
                        {recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-4 bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl">
                            <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center">
                              <span className="text-[10px] font-black">{idx + 1}</span>
                            </div>
                            <p className="text-sm font-medium text-neutral-700 dark:text-slate-300 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 p-4 rounded-xl text-center">
                        <span className="text-sm font-semibold text-neutral-500 dark:text-slate-400">Profile is well optimized. No immediate recommendations.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            
            {activeDetailTab === "google-reviews" && (
              <GoogleReviewsTab lead={selectedLead} />
            )}

            {activeDetailTab === "review-summary" && (
              <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                {(() => {
                  const rs = selectedLead.reviewSummary || selectedLead.review_summary;
                  const gr = selectedLead.googleReviewsRaw || selectedLead.google_reviews;
                  const reviews = gr?.reviews || [];
                  const hasReviews = reviews.length > 0;

                  // Section 1: Sentiment / Rating Overview
                  const total = rs?.total_reviews ?? reviews.length;
                  const positive = rs?.sentiment_counts?.positive ?? reviews.filter((r: any) => r.rating >= 4).length;
                  const neutral = rs?.sentiment_counts?.neutral ?? reviews.filter((r: any) => r.rating === 3).length;
                  const negative = rs?.sentiment_counts?.negative ?? reviews.filter((r: any) => r.rating <= 2).length;
                  const withText = rs?.reviews_with_text ?? reviews.filter((r: any) => r.text && r.text.trim().length > 0).length;
                  const withoutText = total - withText;
                  const avgRatingStr = selectedLead.rating?.toFixed(1) || "0.0";

                  // Section 2: Rating Distribution
                  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  reviews.forEach((r: any) => {
                    if (r.rating >= 1 && r.rating <= 5) {
                      dist[r.rating as keyof typeof dist]++;
                    }
                  });

                  // Helper for matching
                  const matchKeywords = (text: string, keywords: string[]) => {
                    const lowerText = text.toLowerCase();
                    return keywords.some(kw => lowerText.includes(kw));
                  };

                  // Section 3: Top Positive Review Signals
                  let positiveThemes: Array<{theme: string, count: number, sample?: string}> = rs?.positive_themes || [];
                  if (!positiveThemes.length && hasReviews) {
                    const themesMap = [
                      { id: "Professional doctors", keywords: ["professional", "competent", "expert", "skilled"] },
                      { id: "Clean clinic", keywords: ["clean", "hygienic", "maintained"] },
                      { id: "Helpful staff", keywords: ["staff", "cooperative", "helpful", "friendly"] },
                      { id: "Comfortable treatment", keywords: ["painless", "comfortable", "pain-free"] },
                      { id: "Modern equipment", keywords: ["equipment", "machines", "technology", "digital"] },
                      { id: "Strong recommendation", keywords: ["recommended", "highly recommended"] }
                    ];
                    
                    themesMap.forEach(t => {
                      const matched = reviews.filter((r: any) => r.rating >= 4 && r.text && matchKeywords(r.text, t.keywords));
                      if (matched.length > 0) {
                        positiveThemes.push({ theme: t.id, count: matched.length, sample: matched[0].text });
                      }
                    });
                    positiveThemes.sort((a, b) => b.count - a.count);
                  }

                  // Section 4: Top Negative Review Signals
                  let negativeThemes: Array<{theme: string, count: number, sample?: string}> = rs?.negative_themes || [];
                  if (!negativeThemes.length && hasReviews) {
                    const themesMap = [
                      { id: "Expensive pricing", keywords: ["expensive", "high", "price", "charges", "fees"] },
                      { id: "Waiting or appointment issue", keywords: ["wait", "waiting", "appointment", "time"] },
                      { id: "Professionalism issue", keywords: ["unprofessional", "rude", "responsibility"] },
                      { id: "Bad experience", keywords: ["worst", "bad experience", "not recommend"] },
                      { id: "Treatment complaint", keywords: ["root canal", "filling", "extraction", "implant", "treatment"] },
                      { id: "Reception or payment issue", keywords: ["receptionist", "reception", "debit card", "payment"] },
                      { id: "Patient handling issue", keywords: ["multiple patients", "busy", "occupied"] }
                    ];
                    
                    themesMap.forEach(t => {
                      const matched = reviews.filter((r: any) => r.rating <= 3 && r.text && matchKeywords(r.text, t.keywords));
                      if (matched.length > 0) {
                        negativeThemes.push({ theme: t.id, count: matched.length, sample: matched[0].text });
                      }
                    });
                    negativeThemes.sort((a, b) => b.count - a.count);
                  }

                  // Section 5: Recent Negative Alerts
                  const recentNegative = [...reviews]
                    .filter((r: any) => r.rating <= 2)
                    .sort((a: any, b: any) => new Date(b.date_iso || 0).getTime() - new Date(a.date_iso || 0).getTime())
                    .slice(0, 5);

                  // Section 6: Owner Reply Gap
                  const withReply = reviews.filter((r: any) => r.owner_reply).length;
                  const withoutReply = total - withReply;
                  const negativeWithoutReply = reviews.filter((r: any) => r.rating <= 2 && !r.owner_reply).length;

                  // Section 7: Suggested Actions
                  const suggestions: string[] = [];
                  negativeThemes.forEach(t => {
                    if (t.theme === "Expensive pricing") suggestions.push("Add clear pricing guidance and explain treatment cost before starting.");
                    if (t.theme === "Waiting or appointment issue") suggestions.push("Improve appointment scheduling and update patients if delays happen.");
                    if (t.theme === "Professionalism issue") suggestions.push("Train staff and doctors on patient communication and complaint handling.");
                    if (t.theme === "Treatment complaint") suggestions.push("Add second-opinion protocol and explain diagnosis before treatment.");
                    if (t.theme === "Reception or payment issue") suggestions.push("Display payment policy clearly and train reception staff.");
                    if (t.theme === "Patient handling issue") suggestions.push("Avoid handling too many patients at the same time.");
                  });

                  if (total === 0 && !rs) {
                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-neutral-200 dark:border-slate-800 text-center text-[#3d4947]/50 dark:text-slate-400/60">
                        <AlertCircle className="w-10 h-10 mx-auto text-neutral-300 dark:text-slate-700 mb-2" />
                        <p className="font-bold text-sm">No Review Data Available</p>
                        <p className="text-xs">Both review summary and google reviews are empty.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Section 1: Sentiment / Rating Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center col-span-2">
                          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Average Rating</span>
                          <span className="text-3xl font-black text-amber-500">{avgRatingStr} ★</span>
                          <span className="text-[10px] text-neutral-500 dark:text-slate-400 mt-1">{total} Total Reviews</span>
                        </div>
                        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 border-b-4 border-b-[#00685f] rounded-xl p-4 flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Positive</span>
                          <span className="text-xl font-black text-[#00685f] dark:text-teal-400">{positive}</span>
                        </div>
                        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 border-b-4 border-b-amber-500 rounded-xl p-4 flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Neutral</span>
                          <span className="text-xl font-black text-amber-500">{neutral}</span>
                        </div>
                        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 border-b-4 border-b-[#b5005d] rounded-xl p-4 flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Negative</span>
                          <span className="text-xl font-black text-[#b5005d] dark:text-pink-500">{negative}</span>
                        </div>
                        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">With Text</span>
                          <span className="text-xl font-black text-neutral-700 dark:text-slate-300">{withText}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section 2: Rating Distribution */}
                        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                          <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Star className="w-4 h-4 text-amber-500" /> Rating Distribution
                          </h4>
                          <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map(stars => {
                              const count = dist[stars as keyof typeof dist];
                              const percentage = hasReviews ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={stars} className="flex items-center gap-3 text-xs">
                                  <span className="w-12 text-neutral-600 dark:text-slate-400 font-bold">{stars} Star</span>
                                  <div className="flex-1 bg-neutral-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${stars >= 4 ? 'bg-[#00685f] dark:bg-teal-400' : stars === 3 ? 'bg-amber-400' : 'bg-[#b5005d] dark:bg-pink-500'}`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-right font-semibold text-neutral-500 dark:text-slate-400">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 3: LLM Summary */}
                        {(rs?.summary || rs?.overallSummary) && (
                          <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm col-span-1 lg:col-span-2 mt-6">
                            <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                              <FileText className="w-4 h-4 text-blue-500" /> Overall Verdict
                            </h4>
                            <p className="text-sm text-neutral-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                              {rs.overallSummary || rs.summary}
                            </p>
                          </div>
                        )}

                        {/* Section 4 & 5: Recurring and Isolated Issues */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          {rs?.recurring_issues && rs.recurring_issues.length > 0 && (
                            <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                              <h4 className="font-black text-[#b5005d] dark:text-pink-500 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                                <AlertCircle className="w-4 h-4" /> Recurring Issues
                              </h4>
                              <ul className="space-y-3">
                                {Array.isArray(rs.recurring_issues) ? (
                                  rs.recurring_issues.map((issue: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-slate-300">
                                      <span className="text-[#b5005d] mt-1">•</span>
                                      <span>{typeof issue === 'string' ? issue : issue.issue || JSON.stringify(issue)}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-sm text-neutral-700 dark:text-slate-300">{rs.recurring_issues}</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {rs?.isolated_issues && rs.isolated_issues.length > 0 && (
                            <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                              <h4 className="font-black text-amber-500 dark:text-amber-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-4 h-4" /> Isolated Issues
                              </h4>
                              <ul className="space-y-3">
                                {Array.isArray(rs.isolated_issues) ? (
                                  rs.isolated_issues.map((issue: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-slate-300">
                                      <span className="text-amber-500 mt-1">•</span>
                                      <span>{typeof issue === 'string' ? issue : issue.issue || JSON.stringify(issue)}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-sm text-neutral-700 dark:text-slate-300">{rs.isolated_issues}</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 5: Recent Negative Alerts */}
                      {recentNegative.length > 0 && (
                        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                          <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-4 h-4 text-[#b5005d]" /> Recent Negative Alerts
                          </h4>
                          <div className="space-y-4">
                            {recentNegative.map((r, i) => (
                              <div key={i} className="bg-[#f8f9fa] dark:bg-slate-800/40 rounded-xl p-4 border border-neutral-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-bold text-neutral-800 dark:text-slate-200 text-sm">{r.author || "Anonymous"}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <div className="flex text-[#b5005d]">
                                        {[...Array(5)].map((_, idx) => (
                                          <Star key={idx} className={`w-3 h-3 ${idx < r.rating ? "fill-current" : "text-neutral-300 dark:text-slate-600"}`} />
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-neutral-400">{r.date || (r.date_iso ? new Date(r.date_iso).toLocaleDateString() : "Unknown Date")}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 text-[10px]">
                                    {r.owner_reply ? (
                                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase font-bold">Replied</span>
                                    ) : (
                                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded uppercase font-bold">Not Replied</span>
                                    )}
                                    {r.likes > 0 && <span className="text-neutral-400">{r.likes} likes</span>}
                                  </div>
                                </div>
                                {r.text && <p className="text-xs text-neutral-600 dark:text-slate-400 mt-2">{r.text}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 8: Raw Review Summary JSON */}
                      <details className="bg-neutral-50 dark:bg-slate-800/20 border border-neutral-200 dark:border-slate-800 rounded-xl p-4 text-xs">
                        <summary className="font-bold text-neutral-600 dark:text-slate-400 cursor-pointer outline-none">
                          View Raw Source Data
                        </summary>
                        <div className="mt-4 overflow-x-auto">
                          {!rs ? (
                            <p className="text-neutral-500 italic mb-2">review_summary is not available yet. This tab is currently using calculated fallback from Google reviews.</p>
                          ) : (
                            <pre className="text-[10px] text-neutral-700 dark:text-slate-300">
                              {JSON.stringify(rs, null, 2)}
                            </pre>
                          )}
                        </div>
                      </details>
                    </>
                  );
                })()}
              </div>
            )}

            {activeDetailTab === "performance" && (
              <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                {(() => {
                  const pagespeed = selectedLead.pagespeed || selectedLead.pagespeedRaw || {};
                  const mobileData = pagespeed.PHONE || {};
                  const desktopData = pagespeed.DESKTOP || {};
                  
                  const mobileScore = mobileData.lab?.score ?? 0;
                  const desktopScore = desktopData.lab?.score ?? 0;
                  
                  const mobileSuccess = mobileData.status === "success";
                  const desktopSuccess = desktopData.status === "success";

                  const getScoreLabel = (score: number) => {
                    if (score >= 90) return { label: "Excellent", color: "text-emerald-500" };
                    if (score >= 70) return { label: "Good", color: "text-emerald-400" };
                    if (score >= 50) return { label: "Needs Improvement", color: "text-amber-500" };
                    return { label: "Poor", color: "text-[#b5005d]" };
                  };

                  const allOpportunities = [
                    ...(mobileData.opportunities || []).map((o: any) => ({ ...o, strategy: "Mobile" })),
                    ...(desktopData.opportunities || []).map((o: any) => ({ ...o, strategy: "Desktop" }))
                  ];

                  return (
                    <>
                      {/* Section 1: Top PageSpeed Summary */}
                      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="mb-4">
                          <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-1">PageSpeed Overview</h4>
                          <div className="text-xs text-neutral-500 dark:text-slate-400 space-y-1">
                            <div><span className="font-semibold text-neutral-400">URL:</span> <span className="break-all">{pagespeed.url || "Not Available"}</span></div>
                            <div><span className="font-semibold text-neutral-400">Checked:</span> {pagespeed.checked_at ? new Date(pagespeed.checked_at).toLocaleString() : "Not Available"}</div>
                            <div><span className="font-semibold text-neutral-400">Source:</span> {pagespeed.source || "Not Available"}</div>
                            <div><span className="font-semibold text-neutral-400">Overall Status:</span> {pagespeed.overall_status || "Not Available"}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
                            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-2">Mobile Score</span>
                            <span className={`text-4xl font-black ${getScoreLabel(mobileScore).color}`}>{mobileSuccess ? mobileScore : "N/A"}</span>
                            {mobileSuccess && <span className="text-xs font-semibold mt-1 text-neutral-500">{getScoreLabel(mobileScore).label}</span>}
                          </div>
                          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
                            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-2">Desktop Score</span>
                            <span className={`text-4xl font-black ${getScoreLabel(desktopScore).color}`}>{desktopSuccess ? desktopScore : "N/A"}</span>
                            {desktopSuccess && <span className="text-xs font-semibold mt-1 text-neutral-500">{getScoreLabel(desktopScore).label}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Core Web Vitals Cards */}
                      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-4">Core Web Vitals</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Mobile */}
                          <div>
                            <h5 className="text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-3">Mobile</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {["fcp", "lcp", "tbt", "cls", "si", "tti"].map(metric => {
                                const val = mobileData.lab ? (mobileData.lab[`${metric}_display`] || mobileData.lab[metric] || mobileData.lab[`${metric}_ms`] || "N/A") : "N/A";
                                return (
                                  <div key={metric} className="bg-[#f8f9fa] dark:bg-slate-800/40 p-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase">{metric}</span>
                                    <span className="font-bold text-neutral-700 dark:text-slate-300">{val}</span>
                                  </div>
                                );
                              })}
                              {mobileData.lab?.seo_score && (
                                <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex justify-between items-center col-span-2">
                                  <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase">SEO Score</span>
                                  <span className="font-bold text-neutral-700 dark:text-slate-300">{mobileData.lab.seo_score}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Desktop */}
                          <div>
                            <h5 className="text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-3">Desktop</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {["fcp", "lcp", "tbt", "cls", "si", "tti"].map(metric => {
                                const val = desktopData.lab ? (desktopData.lab[`${metric}_display`] || desktopData.lab[metric] || desktopData.lab[`${metric}_ms`] || "N/A") : "N/A";
                                return (
                                  <div key={metric} className="bg-[#f8f9fa] dark:bg-slate-800/40 p-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase">{metric}</span>
                                    <span className="font-bold text-neutral-700 dark:text-slate-300">{val}</span>
                                  </div>
                                );
                              })}
                              {desktopData.lab?.seo_score && (
                                <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex justify-between items-center col-span-2">
                                  <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase">SEO Score</span>
                                  <span className="font-bold text-neutral-700 dark:text-slate-300">{desktopData.lab.seo_score}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Mobile Performance Details */}
                      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-4">Mobile Performance Details</h4>
                        {mobileSuccess ? (
                          <div className="text-xs space-y-2 text-neutral-600 dark:text-slate-400">
                            <div><span className="font-bold">Strategy:</span> {mobileData.strategy || "N/A"}</div>
                            <div><span className="font-bold">Status:</span> {mobileData.status || "N/A"}</div>
                            <div><span className="font-bold">Score:</span> {mobileData.lab?.score ?? "N/A"}</div>
                            <div><span className="font-bold">SEO Score:</span> {mobileData.lab?.seo_score ?? "N/A"}</div>
                            {mobileData.field_data && (
                              <div className="mt-4">
                                <span className="font-bold block mb-1">Field Data:</span>
                                <ul className="list-disc list-inside pl-2 space-y-1">
                                  <li>Overall Category: {mobileData.field_data.overall_category || "N/A"}</li>
                                  <li>LCP Category: {mobileData.field_data.lcp?.category || "N/A"}</li>
                                  <li>FCP Category: {mobileData.field_data.fcp?.category || "N/A"}</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-[#b5005d] font-bold">
                            Mobile PageSpeed scan failed or pending. {mobileData.error && `Error: ${mobileData.error}`}
                          </div>
                        )}
                      </div>

                      {/* Section 4: Desktop Performance Details */}
                      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-4">Desktop Performance Details</h4>
                        {desktopSuccess ? (
                          <div className="text-xs space-y-2 text-neutral-600 dark:text-slate-400">
                            <div><span className="font-bold">Strategy:</span> {desktopData.strategy || "N/A"}</div>
                            <div><span className="font-bold">Status:</span> {desktopData.status || "N/A"}</div>
                            <div><span className="font-bold">Score:</span> {desktopData.lab?.score ?? "N/A"}</div>
                            <div><span className="font-bold">SEO Score:</span> {desktopData.lab?.seo_score ?? "N/A"}</div>
                            {desktopData.field_data && (
                              <div className="mt-4">
                                <span className="font-bold block mb-1">Field Data:</span>
                                <ul className="list-disc list-inside pl-2 space-y-1">
                                  <li>Overall Category: {desktopData.field_data.overall_category || "N/A"}</li>
                                  <li>LCP Category: {desktopData.field_data.lcp?.category || "N/A"}</li>
                                  <li>FCP Category: {desktopData.field_data.fcp?.category || "N/A"}</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-[#b5005d] font-bold">
                            Desktop PageSpeed scan failed or pending. {desktopData.error && `Error: ${desktopData.error}`}
                          </div>
                        )}
                      </div>

                      {/* Section 5: Opportunities */}
                      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
                        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-4">Opportunities</h4>
                        {allOpportunities.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                              <thead className="bg-[#f8f9fa] dark:bg-slate-800/40 text-neutral-500 dark:text-slate-400">
                                <tr>
                                  <th className="p-3 font-bold uppercase">Strategy</th>
                                  <th className="p-3 font-bold uppercase min-w-[250px]">Opportunity Title</th>
                                  <th className="p-3 font-bold uppercase text-right">Savings (ms)</th>
                                  <th className="p-3 font-bold uppercase">ID</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60">
                                {allOpportunities.map((opp, idx) => (
                                  <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/20">
                                    <td className="p-3 text-neutral-600 dark:text-slate-300 font-bold">{opp.strategy}</td>
                                    <td className="p-3 text-neutral-700 dark:text-slate-200 whitespace-normal break-words">{opp.title}</td>
                                    <td className="p-3 text-right text-orange-600 dark:text-orange-400 font-black">{opp.savings_ms ? `${opp.savings_ms} ms` : "N/A"}</td>
                                    <td className="p-3 text-neutral-400 dark:text-slate-500 text-[10px] uppercase">{opp.id}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-500 italic">No opportunities available.</div>
                        )}
                      </div>



                      {/* Section 7: Recommendations */}
                      {(() => {
                        const recs: string[] = [];
                        const mobileLcpCat = mobileData.field_data?.lcp?.category;
                        const mobileLcpMs = mobileData.lab?.lcp_ms || 0;
                        const fcpCat = mobileData.field_data?.fcp?.category || desktopData.field_data?.fcp?.category;
                        const mobileCls = parseFloat(mobileData.lab?.cls || "0");
                        const desktopCls = parseFloat(desktopData.lab?.cls || "0");
                        
                        if (mobileLcpCat === "SLOW" || mobileLcpMs > 4000) {
                          recs.push("Optimize hero image, server response, and render-blocking resources.");
                        }
                        if (fcpCat === "SLOW") {
                          recs.push("Reduce render-blocking CSS and JavaScript.");
                        }
                        if (mobileCls > 0.1 || desktopCls > 0.1) {
                          recs.push("Reserve image/banner space and avoid layout shifts.");
                        }
                        if (allOpportunities.some(o => o.id === "unused-css-rules")) {
                          recs.push("Remove or defer unused CSS.");
                        }
                        if (allOpportunities.some(o => o.id === "unused-javascript")) {
                          recs.push("Remove or delay unused JavaScript.");
                        }

                        if (recs.length > 0) {
                          return (
                            <div className="bg-amber-50 dark:bg-yellow-900/10 border border-amber-200 dark:border-yellow-700/30 rounded-2xl p-6 shadow-sm">
                              <h4 className="font-black text-amber-700 dark:text-yellow-500 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">Recommendations</h4>
                              <ul className="space-y-2">
                                {recs.map((r, i) => (
                                  <li key={i} className="flex gap-2 text-xs text-neutral-700 dark:text-slate-300">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Section 8: Raw PageSpeed JSON */}
                      <details className="bg-neutral-50 dark:bg-slate-800/20 border border-neutral-200 dark:border-slate-800 rounded-xl p-4 text-xs">
                        <summary className="font-bold text-neutral-600 dark:text-slate-400 cursor-pointer outline-none">
                          View Raw PageSpeed Data
                        </summary>
                        <div className="mt-4 overflow-x-auto">
                          <pre className="text-[10px] text-neutral-700 dark:text-slate-300">
                            {JSON.stringify(pagespeed, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </>
                  );
                })()}
              </div>
            )}

            {activeDetailTab === "seo-deep-audit" && (() => {
              const seoAudit = (selectedLead as any).seoAuditRaw || {};
              const crawlSeo = (selectedLead as any).websiteCrawlRaw?.seo || {};

              const brokenLinks = seoAudit.broken_links || {};
              const og = crawlSeo.open_graph || {};
              const tw = crawlSeo.twitter_card || {};
              
              const hasMetadata = crawlSeo.title || crawlSeo.meta_description || crawlSeo.canonical_url;
              const socialFound = seoAudit.social_media?.detected;
              const socialPlatforms = seoAudit.social_media?.platforms || [];

              return (
              <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                
                {/* Section 1: SEO Health Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400">HTTPS Status</span>
                    <span className={`text-lg font-black ${seoAudit.https?.detected ? 'text-emerald-500' : 'text-red-500'}`}>
                      {seoAudit.https?.detected ? 'Secure' : 'Insecure / N/A'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400">Blog Setup</span>
                    <span className={`text-lg font-black ${seoAudit.blog?.detected ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {seoAudit.blog?.detected ? 'Active' : 'Missing'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400">CTA Detected</span>
                    <span className={`text-lg font-black ${seoAudit.cta?.detected ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {seoAudit.cta?.detected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400">Online Booking</span>
                    <span className={`text-lg font-black ${seoAudit.booking?.detected ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {seoAudit.booking?.detected ? 'Enabled' : 'Missing'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400">Social Media</span>
                    <span className={`text-lg font-black ${socialFound ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {socialFound ? 'Detected' : 'Missing'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Page Metadata (Simplified) */}
                  <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex justify-between items-center">
                    <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[14px] uppercase tracking-wider">
                      Page Metadata
                    </h4>
                    <span className={`px-3 py-1 rounded text-xs font-black uppercase ${hasMetadata ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                      {hasMetadata ? 'Available' : 'Missing'}
                    </span>
                  </div>

                  {/* Social Metadata (Simplified) */}
                  <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex justify-between items-center">
                    <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[14px] uppercase tracking-wider">
                      Social Metadata
                    </h4>
                    <span className="text-xs font-bold text-neutral-600 dark:text-slate-400">
                      {(!Object.keys(og).length && !Object.keys(tw).length) ? 'None' : 
                        [Object.keys(og).length ? 'Open Graph' : null, Object.keys(tw).length ? 'Twitter' : null].filter(Boolean).join(', ')
                      }
                    </span>
                  </div>
                </div>

                {/* On-Page SEO Issues & Broken Links */}
                <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[16px] mb-4 uppercase tracking-wider border-b border-neutral-100 dark:border-slate-800 pb-3">
                    On-Page SEO & Link Issues
                  </h4>
                  <div className="space-y-3">
                    {(!seoAudit.on_page_seo?.issues?.length && !(brokenLinks.broken_count > 0)) && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> No on-page SEO or broken link issues found.
                      </div>
                    )}

                    {seoAudit.on_page_seo?.issues?.map((issue: any, idx: number) => (
                      <div key={'seo-'+idx} className="bg-red-50 dark:bg-pink-950/20 p-4 rounded-xl border border-red-100 dark:border-pink-900/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-sm text-neutral-800 dark:text-slate-200">{typeof issue === 'string' ? issue : (issue.issue || issue.title || "Optimization Opportunity")}</span>
                          {typeof issue !== 'string' && issue.details && <p className="text-xs text-neutral-600 dark:text-slate-400 mt-1">{issue.details}</p>}
                        </div>
                      </div>
                    ))}

                    {brokenLinks.all_results?.filter((l: any) => l.broken).map((link: any, idx: number) => (
                      <div key={'link-'+idx} className="bg-red-50 dark:bg-pink-950/20 p-4 rounded-xl border border-red-100 dark:border-pink-900/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-sm text-neutral-800 dark:text-slate-200">Broken Link Found</span>
                          <p className="text-xs text-neutral-600 dark:text-slate-400 mt-1 break-all">{link.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schema.org & Contact Signals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Schema */}
                  <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[14px] mb-4 uppercase tracking-wider">
                      Schema.org Markup
                    </h4>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-neutral-500">Structured Data:</span>
                      <span className={`text-xs font-bold ${crawlSeo.schema_org?.has_structured_data ? 'text-emerald-500' : 'text-amber-500'}`}>{crawlSeo.schema_org?.has_structured_data ? 'Found' : 'Missing'}</span>
                    </div>
                    {crawlSeo.schema_org?.schema_types && crawlSeo.schema_org.schema_types.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Schema Types Found:</span>
                        <div className="flex flex-wrap gap-2">
                          {crawlSeo.schema_org.schema_types.map((type: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-[#00685f]/10 text-[#00685f] dark:bg-teal-900/30 dark:text-teal-400 text-[10px] font-bold rounded">{type}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Contact Signals */}
                  <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h4 className="font-sans font-black text-neutral-800 dark:text-slate-200 text-[14px] mb-4 uppercase tracking-wider">
                      Contact Signals (Scraped)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500">Phone Numbers:</span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                          {crawlSeo.contact_info?.phones?.length ? crawlSeo.contact_info.phones.join(', ') : 'None Found'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500">Emails:</span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                          {crawlSeo.contact_info?.emails?.length ? crawlSeo.contact_info.emails.join(', ') : 'None Found'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500">Addresses:</span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-slate-300 line-clamp-1" title={crawlSeo.contact_info?.addresses?.join(', ')}>
                          {crawlSeo.contact_info?.addresses?.length ? crawlSeo.contact_info.addresses.join(', ') : 'None Found'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              );
            })()}



            {activeDetailTab === "lighthouse-seo" && (
              <LighthouseSEOTab lead={selectedLead} />
            )}

            {activeDetailTab === "seo-deep-audit" && (
              <LinksAuditTab lead={selectedLead} />
            )}

            {activeDetailTab === "neighbors" && (
              <NeighborsTab lead={selectedLead} />
            )}

            {activeDetailTab === "rank-tracker" && (
              <RankTrackerTab lead={selectedLead} />
            )}

            {activeDetailTab === "website-crawl" && (
              <WebsiteCrawlTab lead={selectedLead} />
            )}

            {activeDetailTab === "raw-data" && (
              <RawDataTab lead={selectedLead} />
            )}

            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white dark:bg-slate-900/40 border border-neutral-100 dark:border-slate-800 rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500">
            Please select a dental clinic to reveal diagnostics.
          </div>
        )}
      </div>

      {/* Campaign Outreach Orchestration Modal Dialog */}
      {isCampaignModalOpen && campLead && (
        <div className="fixed inset-0 bg-neutral-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[640px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="bg-[#f8f9fa] dark:bg-slate-950/40 border-b border-neutral-200/70 dark:border-slate-800 p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-pink-50 text-[#b5005d] dark:bg-pink-950/60 dark:text-pink-300">
                  <Sparkles className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <h4 className="text-base font-extrabold text-[#2D3748] dark:text-slate-100">
                    New Automated Outreach Campaign
                  </h4>
                  <p className="text-[10px] uppercase font-black text-neutral-400 dark:text-slate-500 mt-0.5">
                    Stage 10: SEO Outreach
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                id="btn-close-campaign"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {campaignSuccess ? (
                /* Successful send notification state */
                <div className="flex flex-col items-center justify-center py-10 text-center animate-[scaleIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="w-16 h-16 bg-[#00685f]/15 dark:bg-teal-950/60 rounded-full flex items-center justify-center text-[#006a61] dark:text-teal-300 mb-4">
                    <Check className="w-8 h-8 stroke-[3.5]" />
                  </div>
                  <h5 className="text-xl font-extrabold text-[#2D3748] dark:text-slate-100 mb-1">
                    Email Campaign Dispatched Successfully!
                  </h5>
                  <p className="text-xs text-[#3d4947]/75 dark:text-slate-400 max-w-[420px] leading-relaxed font-semibold">
                    An outreach presentation with custom diagnostic highlights has been sent to <span className="font-bold text-neutral-800 dark:text-slate-200">{campLead.website}</span>. Admins have been self-CC'd.
                  </p>
                  
                  {/* Projected metrics summary indicator */}
                  <div className="mt-5 px-6 py-2 bg-[#f4fffc] dark:bg-emerald-950/40 border border-neutral-200/90 dark:border-emerald-800/50 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">
                      Target Valuation
                    </span>
                    <span className="text-base font-heavy text-[#00685f] dark:text-teal-300 block">
                      PKR {campLead.revenueImpact.replace("PKR ", "")} potential yield
                    </span>
                  </div>
                </div>
              ) : (
                /* Email Parameter Editing form screen */
                <div className="space-y-4">
                  
                  {/* Lead Info Pill info */}
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200/40 dark:border-slate-800 rounded-xl text-neutral-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block">
                        Prospect Detail
                      </span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                        {campLead.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block">
                        Estimated Scope
                      </span>
                      <span className="text-xs font-bold text-[#00685f] dark:text-teal-400">
                        {campLead.revenueImpact}
                      </span>
                    </div>
                  </div>

                  {/* Subject input */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Email Subject Heading:
                    </label>
                    <input
                      type="text"
                      className="border border-neutral-300 dark:border-slate-700 dark:bg-slate-950/40 rounded-lg p-2.5 text-xs font-semibold text-neutral-800 dark:text-slate-200 focus:outline-none focus:border-[#00685f] dark:focus:border-teal-500"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                    />
                  </div>

                  {/* Body Textarea */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-[#2D3748]/60 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Custom Pitch Body Content:
                    </label>
                    <textarea
                      rows={8}
                      className="border border-neutral-300 dark:border-slate-700 dark:bg-slate-950/40 rounded-lg p-3 text-xs font-semibold text-neutral-700 dark:text-slate-300 leading-relaxed focus:outline-none focus:border-[#00685f] dark:focus:border-teal-500"
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                    />
                  </div>

                  {/* Bottom triggers */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setIsCampaignModalOpen(false)}
                      className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide border border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLaunchCampaign}
                      className="px-5 py-2.5 rounded-lg text-xs font-black tracking-wide bg-[#b5005d] text-white hover:brightness-110 active:scale-95 shadow-md shadow-[#b5005d]/10 dark:bg-pink-950/60 dark:text-pink-300 dark:border dark:border-pink-850/50 dark:hover:bg-pink-900/60 dark:shadow-pink-950/20 transition-colors cursor-pointer"
                    >
                      Dispatch Automated Campaign
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
