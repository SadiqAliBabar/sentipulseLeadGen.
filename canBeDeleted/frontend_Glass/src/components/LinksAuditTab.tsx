import React, { useState, useMemo } from "react";
import { 
  Globe, AlertTriangle, CheckCircle, Clock, Link as LinkIcon, 
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, Search, 
  AlertCircle, ShieldAlert, Sparkles, HelpCircle, FileText, Code,
  MessageCircle, Facebook, Linkedin, Instagram, Youtube, MapPin
} from "lucide-react";

interface LinksAuditTabProps {
  lead: any;
}

export default function LinksAuditTab({ lead }: LinksAuditTabProps) {
  // Safe extraction of crawl and seo_audit data
  const crawl = lead?.websiteCrawlRaw || lead?.website_crawl;
  const seoAudit = lead?.seoAuditRaw || lead?.seo_audit;

  // Collapse states for raw JSON
  const [showRawCrawlJson, setShowRawCrawlJson] = useState(false);
  const [showRawSeoJson, setShowRawSeoJson] = useState(false);

  // Search/filter states
  const [internalSearch, setInternalSearch] = useState("");
  const [externalSearch, setExternalSearch] = useState("");
  const [checkedSearch, setCheckedSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");

  // Pagination states
  const [internalPage, setInternalPage] = useState(0);
  const [externalPage, setExternalPage] = useState(0);
  const [checkedPage, setCheckedPage] = useState(0);
  const rowsPerPage = 10;

  // Copy state for visual feedback
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  // Safe data properties
  const internalLinks = useMemo(() => crawl?.links?.internal || [], [crawl]);
  const externalLinks = useMemo(() => crawl?.links?.external || [], [crawl]);
  const brokenUrls = useMemo(() => seoAudit?.broken_links?.broken_urls || [], [seoAudit]);
  const allResults = useMemo(() => seoAudit?.broken_links?.all_results || [], [seoAudit]);
  
  const checkedCount = seoAudit?.broken_links?.checked ?? 0;
  const brokenCount = seoAudit?.broken_links?.broken_count ?? 0;

  // Platform Matcher helper
  const getPlatform = (href: string, baseDomain: string): string => {
    const url = (href || "").toLowerCase();
    const domain = (baseDomain || "").toLowerCase();
    
    if (domain.includes("facebook.com") || url.includes("facebook.com") || url.includes("fb.com")) return "Facebook";
    if (domain.includes("wa.me") || url.includes("wa.me") || domain.includes("whatsapp.com") || url.includes("whatsapp.com") || url.startsWith("whatsapp:")) return "WhatsApp";
    if (domain.includes("google.com/maps") || url.includes("google.com/maps") || url.includes("maps.google") || url.includes("maps.app.goo.gl")) return "Google Maps";
    if (domain.includes("youtube.com") || url.includes("youtube.com") || domain.includes("youtu.be") || url.includes("youtu.be")) return "YouTube";
    if (domain.includes("instagram.com") || url.includes("instagram.com")) return "Instagram";
    if (domain.includes("linkedin.com") || url.includes("linkedin.com")) return "LinkedIn";
    
    return "Other";
  };

  // Platform style decorator
  const getPlatformBadgeClass = (platform: string): string => {
    switch (platform) {
      case "Facebook": return "bg-blue-600/10 text-blue-500 border border-blue-500/20";
      case "WhatsApp": return "bg-emerald-600/10 text-emerald-500 border border-emerald-500/20";
      case "Google Maps": return "bg-red-600/10 text-red-500 border border-red-500/20";
      case "YouTube": return "bg-rose-600/10 text-rose-500 border border-rose-500/20";
      case "Instagram": return "bg-pink-600/10 text-pink-500 border border-pink-500/20";
      case "LinkedIn": return "bg-indigo-600/10 text-indigo-500 border border-indigo-500/20";
      default: return "bg-slate-600/10 text-slate-500 border border-slate-500/20";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Facebook": return <Facebook className="w-3.5 h-3.5" />;
      case "WhatsApp": return <MessageCircle className="w-3.5 h-3.5" />;
      case "Google Maps": return <MapPin className="w-3.5 h-3.5" />;
      case "YouTube": return <Youtube className="w-3.5 h-3.5" />;
      case "Instagram": return <Instagram className="w-3.5 h-3.5" />;
      case "LinkedIn": return <Linkedin className="w-3.5 h-3.5" />;
      default: return <Globe className="w-3.5 h-3.5" />;
    }
  };

  // Section 1 Calculations
  const timeoutCount = useMemo(() => {
    return allResults.filter((r: any) => r?.status === "timeout").length;
  }, [allResults]);

  const uniqueDomainsCount = useMemo(() => {
    const domains = new Set<string>();
    internalLinks.forEach((l: any) => {
      if (l?.base_domain) domains.add(l.base_domain.toLowerCase());
    });
    externalLinks.forEach((l: any) => {
      if (l?.base_domain) domains.add(l.base_domain.toLowerCase());
    });
    return domains.size;
  }, [internalLinks, externalLinks]);

  // Section 3: Filtered Internal Links
  const filteredInternalLinks = useMemo(() => {
    const query = internalSearch.toLowerCase().trim();
    if (!query) return internalLinks;
    return internalLinks.filter((l: any) => 
      (l?.href || "").toLowerCase().includes(query) || 
      (l?.text || "").toLowerCase().includes(query) || 
      (l?.title || "").toLowerCase().includes(query)
    );
  }, [internalLinks, internalSearch]);

  // Section 4: Filtered External Links
  const filteredExternalLinks = useMemo(() => {
    let result = externalLinks;
    const query = externalSearch.toLowerCase().trim();
    
    // Search filter
    if (query) {
      result = result.filter((l: any) => 
        (l?.href || "").toLowerCase().includes(query) || 
        (l?.text || "").toLowerCase().includes(query) || 
        (l?.title || "").toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (platformFilter !== "All") {
      result = result.filter((l: any) => {
        const platform = getPlatform(l?.href, l?.base_domain);
        return platform === platformFilter;
      });
    }

    return result;
  }, [externalLinks, externalSearch, platformFilter]);

  // Section 2 Checked links filter
  const filteredCheckedLinks = useMemo(() => {
    const query = checkedSearch.toLowerCase().trim();
    if (!query) return allResults;
    return allResults.filter((r: any) => 
      (r?.url || "").toLowerCase().includes(query) || 
      String(r?.status || "").toLowerCase().includes(query)
    );
  }, [allResults, checkedSearch]);

  // Section 5: Link Quality Notes Generation
  const qualityNotes = useMemo(() => {
    const notes: Array<{ type: "warning" | "success" | "info"; text: string }> = [];

    if (brokenCount > 0) {
      notes.push({
        type: "warning",
        text: "Fix broken links to avoid poor user experience and SEO issues."
      });
    }

    const hasWhatsApp = externalLinks.some((l: any) => 
      getPlatform(l?.href, l?.base_domain) === "WhatsApp"
    );
    if (hasWhatsApp) {
      notes.push({
        type: "success",
        text: "WhatsApp booking/contact link is available."
      });
    }

    const hasFacebook = externalLinks.some((l: any) => 
      getPlatform(l?.href, l?.base_domain) === "Facebook"
    );
    if (hasFacebook) {
      notes.push({
        type: "success",
        text: "Facebook social signal is available."
      });
    }

    if (internalLinks.length >= 10) {
      notes.push({
        type: "success",
        text: "Website has internal linking structure."
      });
    }

    if (timeoutCount > 0) {
      notes.push({
        type: "warning",
        text: "Some links timed out during checking; re-check before marking them broken."
      });
    }

    return notes;
  }, [brokenCount, externalLinks, internalLinks, timeoutCount]);

  // Pagination bounds
  const paginatedInternalLinks = useMemo(() => {
    const start = internalPage * rowsPerPage;
    return filteredInternalLinks.slice(start, start + rowsPerPage);
  }, [filteredInternalLinks, internalPage]);

  const paginatedExternalLinks = useMemo(() => {
    const start = externalPage * rowsPerPage;
    return filteredExternalLinks.slice(start, start + rowsPerPage);
  }, [filteredExternalLinks, externalPage]);

  const paginatedCheckedLinks = useMemo(() => {
    const start = checkedPage * rowsPerPage;
    return filteredCheckedLinks.slice(start, start + rowsPerPage);
  }, [filteredCheckedLinks, checkedPage]);

  // Empty state if both crawl and seo_audit data are missing
  if (!crawl && !seoAudit) {
    return (
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <HelpCircle className="w-12 h-12 text-neutral-400 dark:text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-neutral-700 dark:text-slate-300">No Links Audit Data</h4>
        <p className="text-xs text-neutral-500 dark:text-slate-500 mt-1">
          Crawled website link resources or broken link analyzer logs are not available for this lead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out] mb-8 text-neutral-800 dark:text-slate-200">
      
      {/* Section 1: Link Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">Internal Links</span>
          <span className="text-2xl font-black text-[#00685f] dark:text-teal-400 mt-2 block">
            {internalLinks.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">External Links</span>
          <span className="text-2xl font-black text-neutral-800 dark:text-slate-200 mt-2 block">
            {externalLinks.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">Checked Links</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 block">
            {checkedCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">Broken Links</span>
          <span className={`text-2xl font-black mt-2 block ${brokenCount > 0 ? "text-[#b5005d] dark:text-pink-400 animate-pulse" : "text-emerald-600 dark:text-emerald-400"}`}>
            {brokenCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">Timeout Links</span>
          <span className={`text-2xl font-black mt-2 block ${timeoutCount > 0 ? "text-amber-500" : "text-neutral-500 dark:text-slate-400"}`}>
            {timeoutCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 p-4.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest block">Unique Domains</span>
          <span className="text-2xl font-black text-neutral-800 dark:text-slate-200 mt-2 block">
            {uniqueDomainsCount}
          </span>
        </div>
      </div>

      {/* Section 2: Broken Links Detailed Section */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-[16px] uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#b5005d] dark:text-pink-400" />
            Broken Link Diagnostics
          </h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mt-1">
            Analyze critical broken and status-checked endpoints on the target web domain.
          </p>
        </div>

        {/* Warning cards for broken URLs */}
        {brokenUrls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brokenUrls.map((url: string, index: number) => (
              <div 
                key={index} 
                className="bg-red-50 dark:bg-pink-950/20 border border-red-200/60 dark:border-pink-850/30 p-4 rounded-xl flex items-start gap-3.5 relative overflow-hidden"
              >
                <div className="mt-0.5 text-red-500 bg-red-100 dark:text-pink-300 dark:bg-pink-950/50 p-1.5 rounded border border-red-200 dark:border-pink-800/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-neutral-800 dark:text-slate-200 block truncate" title={url}>
                    {url}
                  </span>
                  <span className="text-[10px] text-[#b5005d] dark:text-pink-300 block font-semibold mt-1 uppercase">
                    Status: Critical. Reference target is broken, causing organic visitor attrition and SEO penalties.
                  </span>
                </div>
                <button 
                  onClick={() => handleCopy(url)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-300 transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl === url ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-900/30 p-4.5 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">All Good</p>
              <p className="text-[10px] text-neutral-500 dark:text-slate-400 mt-0.5">No immediate broken link endpoints detected in standard crawler passes.</p>
            </div>
          </div>
        )}

        {/* Checked Links Table */}
        <div className="border border-neutral-100 dark:border-slate-800 rounded-xl overflow-hidden mt-4">
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-slate-300">
              Crawler Target Checked Logs ({allResults.length})
            </span>
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
              </span>
              <input
                type="text"
                value={checkedSearch}
                onChange={(e) => {
                  setCheckedSearch(e.target.value);
                  setCheckedPage(0);
                }}
                placeholder="Search checked URLs..."
                className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00685f]/40 dark:focus:ring-teal-400/40 text-neutral-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-neutral-50/50 dark:bg-slate-800/20 border-b border-neutral-200 dark:border-slate-800 text-neutral-400 dark:text-slate-500">
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Target URL</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider text-center w-28">Status</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider text-right w-28">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60 text-neutral-700 dark:text-slate-300">
                {paginatedCheckedLinks.length > 0 ? (
                  paginatedCheckedLinks.map((item: any, idx: number) => {
                    const isBroken = item?.broken === true;
                    const isTimeout = item?.status === "timeout";
                    
                    return (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-3 max-w-xs md:max-w-md truncate font-bold text-neutral-800 dark:text-slate-200 font-mono">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate" title={item?.url}>{item?.url || "Not Available"}</span>
                            <button
                              onClick={() => handleCopy(item?.url)}
                              className="shrink-0 p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-400 transition-colors"
                              title="Copy Full URL"
                            >
                              {copiedUrl === item?.url ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            isTimeout 
                              ? "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30"
                              : isBroken 
                              ? "bg-red-50 text-red-600 border border-red-200/50 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-850/50"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-850/50"
                          }`}>
                            {item?.status || "Not Available"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-black uppercase text-[9px] tracking-wider ${
                            isBroken ? "text-[#b5005d] dark:text-pink-400" : "text-emerald-700 dark:text-emerald-400"
                          }`}>
                            {isBroken ? "Broken" : "Passed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-neutral-400 dark:text-slate-500 italic">
                      No matching checked URLs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Checked Pagination */}
          {filteredCheckedLinks.length > rowsPerPage && (
            <div className="bg-[#f8f9fa] dark:bg-slate-800/20 border-t border-neutral-200 dark:border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs font-semibold">
              <button 
                disabled={checkedPage === 0} 
                onClick={() => setCheckedPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-350 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Prev
              </button>
              <span className="text-neutral-500 dark:text-slate-400">
                Page {checkedPage + 1} of {Math.ceil(filteredCheckedLinks.length / rowsPerPage)}
              </span>
              <button 
                disabled={(checkedPage + 1) * rowsPerPage >= filteredCheckedLinks.length} 
                onClick={() => setCheckedPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-350 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Internal Links Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-[16px] uppercase tracking-wide flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-500" />
              Internal Crawled Links ({internalLinks.length})
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mt-0.5">
              Explore linking structures, anchor titles, and scores of internal site references.
            </p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
            </span>
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => {
                setInternalSearch(e.target.value);
                setInternalPage(0);
              }}
              placeholder="Search by anchor, text, or url..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00685f]/40 dark:focus:ring-teal-400/40 text-neutral-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="border border-neutral-100 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 text-neutral-400 dark:text-slate-500">
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Anchor / Text</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Target URL</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Base Domain</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Title Attribute</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider text-right w-24">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60 text-neutral-700 dark:text-slate-350">
                {paginatedInternalLinks.length > 0 ? (
                  paginatedInternalLinks.map((link: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-3 max-w-[150px] truncate font-bold text-neutral-800 dark:text-slate-200" title={link?.text}>
                        {link?.text || <span className="text-neutral-400 dark:text-slate-600 italic">No Anchor Text</span>}
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-blue-600 dark:text-blue-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <a href={link?.href} target="_blank" rel="noreferrer" className="hover:underline truncate" title={link?.href}>
                            {link?.href || "Not Available"}
                          </a>
                          {link?.href && (
                            <button
                              onClick={() => handleCopy(link.href)}
                              className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-400 transition-colors shrink-0"
                              title="Copy URL"
                            >
                              {copiedUrl === link.href ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-neutral-500 dark:text-slate-400" title={link?.base_domain}>
                        {link?.base_domain || "Not Available"}
                      </td>
                      <td className="p-3 max-w-[120px] truncate text-neutral-500 dark:text-slate-400" title={link?.title}>
                        {link?.title || <span className="text-neutral-400 dark:text-slate-650 italic">None</span>}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-neutral-800 dark:text-slate-200">
                          {link?.total_score !== null && link?.total_score !== undefined 
                            ? link.total_score 
                            : link?.intrinsic_score !== null && link?.intrinsic_score !== undefined
                            ? link.intrinsic_score
                            : "Not Available"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-400 dark:text-slate-500 italic">
                      No internal links matched your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Internal Pagination */}
          {filteredInternalLinks.length > rowsPerPage && (
            <div className="bg-[#f8f9fa] dark:bg-slate-800/20 border-t border-neutral-200 dark:border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs font-semibold">
              <button 
                disabled={internalPage === 0} 
                onClick={() => setInternalPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-350 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Prev
              </button>
              <span className="text-neutral-500 dark:text-slate-400">
                Page {internalPage + 1} of {Math.ceil(filteredInternalLinks.length / rowsPerPage)}
              </span>
              <button 
                disabled={(internalPage + 1) * rowsPerPage >= filteredInternalLinks.length} 
                onClick={() => setInternalPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-350 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: External Links Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-[16px] uppercase tracking-wide flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-orange-500" />
              External References ({externalLinks.length})
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mt-0.5">
              Review external connections, widgets, social signals, and external scores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search filter */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
              </span>
              <input
                type="text"
                value={externalSearch}
                onChange={(e) => {
                  setExternalSearch(e.target.value);
                  setExternalPage(0);
                }}
                placeholder="Search external links..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00685f]/40 dark:focus:ring-teal-400/40 text-neutral-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Platform filter tab bar */}
        <div className="flex gap-2 overflow-x-auto select-none py-1 pb-2 border-b border-neutral-100 dark:border-slate-800/60" style={{ scrollbarWidth: 'none' }}>
          {["All", "Facebook", "WhatsApp", "Google Maps", "YouTube", "Instagram", "LinkedIn", "Other"].map((p) => {
            const count = externalLinks.filter(l => p === "All" || getPlatform(l?.href, l?.base_domain) === p).length;
            
            return (
              <button
                key={p}
                onClick={() => {
                  setPlatformFilter(p);
                  setExternalPage(0);
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  platformFilter === p 
                    ? "bg-[#00685f] text-white dark:bg-teal-500/20 dark:text-teal-400 dark:border dark:border-teal-500/30"
                    : "bg-[#f8f9fa] border border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {p} ({count})
              </button>
            );
          })}
        </div>

        <div className="border border-neutral-100 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-[#f8f9fa] dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 text-neutral-400 dark:text-slate-500">
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Anchor / Text</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Target URL</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Base Domain</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Platform</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider">Title</th>
                  <th className="p-3 text-[9px] font-black uppercase tracking-wider text-right w-24">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800/60 text-neutral-700 dark:text-slate-350">
                {paginatedExternalLinks.length > 0 ? (
                  paginatedExternalLinks.map((link: any, idx: number) => {
                    const platform = getPlatform(link?.href, link?.base_domain);
                    
                    return (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-3 max-w-[150px] truncate font-bold text-neutral-800 dark:text-slate-200" title={link?.text}>
                          {link?.text || <span className="text-neutral-400 dark:text-slate-655 italic">No Anchor Text</span>}
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-blue-600 dark:text-blue-400 font-mono">
                          <div className="flex items-center gap-1.5">
                            <a href={link?.href} target="_blank" rel="noreferrer" className="hover:underline truncate" title={link?.href}>
                              {link?.href || "Not Available"}
                            </a>
                            {link?.href && (
                              <button
                                onClick={() => handleCopy(link.href)}
                                className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-400 transition-colors shrink-0"
                                title="Copy URL"
                              >
                                {copiedUrl === link.href ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-neutral-500 dark:text-slate-400" title={link?.base_domain}>
                          {link?.base_domain || "Not Available"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide flex items-center gap-1 w-max ${getPlatformBadgeClass(platform)}`}>
                            {getPlatformIcon(platform)}
                            {platform}
                          </span>
                        </td>
                        <td className="p-3 max-w-[120px] truncate text-neutral-500 dark:text-slate-400" title={link?.title}>
                          {link?.title || <span className="text-neutral-400 dark:text-slate-655 italic">None</span>}
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-neutral-800 dark:text-slate-200">
                            {link?.total_score !== null && link?.total_score !== undefined 
                              ? link.total_score 
                              : link?.intrinsic_score !== null && link?.intrinsic_score !== undefined
                              ? link.intrinsic_score
                              : "Not Available"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 dark:text-slate-500 italic">
                      No external links matched your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* External Pagination */}
          {filteredExternalLinks.length > rowsPerPage && (
            <div className="bg-[#f8f9fa] dark:bg-slate-800/20 border-t border-neutral-200 dark:border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs font-semibold">
              <button 
                disabled={externalPage === 0} 
                onClick={() => setExternalPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-355 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Prev
              </button>
              <span className="text-neutral-500 dark:text-slate-400">
                Page {externalPage + 1} of {Math.ceil(filteredExternalLinks.length / rowsPerPage)}
              </span>
              <button 
                disabled={(externalPage + 1) * rowsPerPage >= filteredExternalLinks.length} 
                onClick={() => setExternalPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-355 hover:bg-neutral-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Link Quality Notes */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-[16px] uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Link Quality Recommendations
          </h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold mt-0.5">
            Rule-based audit insights derived from scanned internal reference pathways and outbound social signals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qualityNotes.length > 0 ? (
            qualityNotes.map((note, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  note.type === "warning" 
                    ? "bg-red-50/50 border-red-200/50 dark:bg-pink-950/10 dark:border-pink-850/20" 
                    : note.type === "success" 
                    ? "bg-emerald-50/40 border-emerald-200/40 dark:bg-emerald-950/10 dark:border-emerald-850/20"
                    : "bg-neutral-50/60 border-neutral-200/50 dark:bg-slate-800/20 dark:border-slate-800"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {note.type === "warning" ? (
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-pink-400" />
                  ) : note.type === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
                  )}
                </div>
                <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                  {note.text}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-xs text-neutral-500 italic p-4">
              No quality insights triggered for this lead domain.
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Raw Links JSON */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="font-sans font-black text-neutral-800 dark:text-slate-100 text-[16px] uppercase tracking-wide flex items-center gap-2">
          <Code className="w-5 h-5 text-neutral-500" />
          Raw Links Data Explorer
        </h4>
        
        <div className="space-y-3">
          {/* Raw website_crawl.links JSON */}
          <div className="border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowRawCrawlJson(!showRawCrawlJson)}
              className="w-full px-4.5 py-3 bg-[#f8f9fa] dark:bg-slate-800/40 flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Raw website_crawl.links JSON
              </span>
              {showRawCrawlJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawCrawlJson && (
              <div className="p-4.5 bg-white dark:bg-slate-900 max-h-[400px] border-t border-neutral-100 dark:border-slate-800 overflow-auto custom-scrollbar">
                <pre className="text-[10px] font-mono text-neutral-600 dark:text-slate-400 whitespace-pre-wrap">
                  {crawl?.links ? JSON.stringify(crawl.links, null, 2) : '"Not Available"'}
                </pre>
              </div>
            )}
          </div>

          {/* Raw seo_audit.broken_links JSON */}
          <div className="border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowRawSeoJson(!showRawSeoJson)}
              className="w-full px-4.5 py-3 bg-[#f8f9fa] dark:bg-slate-800/40 flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#b5005d]" />
                Raw seo_audit.broken_links JSON
              </span>
              {showRawSeoJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawSeoJson && (
              <div className="p-4.5 bg-white dark:bg-slate-900 max-h-[400px] border-t border-neutral-100 dark:border-slate-800 overflow-auto custom-scrollbar">
                <pre className="text-[10px] font-mono text-neutral-600 dark:text-slate-400 whitespace-pre-wrap">
                  {seoAudit?.broken_links ? JSON.stringify(seoAudit.broken_links, null, 2) : '"Not Available"'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
