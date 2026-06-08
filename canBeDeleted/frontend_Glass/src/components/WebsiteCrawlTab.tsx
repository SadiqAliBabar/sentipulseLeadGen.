import React, { useState } from "react";
import { 
  Globe, AlertTriangle, CheckCircle, Clock, Link as LinkIcon, 
  ExternalLink, Image as ImageIcon, FileText, ChevronDown, ChevronUp,
  Code, Database, Activity, Layout
} from "lucide-react";

export default function WebsiteCrawlTab({ lead }: { lead: any }) {
  const crawl = lead?.websiteCrawlRaw || lead?.website_crawl;

  const [showFullMarkdown, setShowFullMarkdown] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showRawCleanHtml, setShowRawCleanHtml] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const [internalLinksPage, setInternalLinksPage] = useState(0);
  const linksPerPage = 10;

  if (!crawl) {
    return (
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-100 dark:border-slate-800 rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500">
        No Website Crawl Data Available.
      </div>
    );
  }

  const isSuccess = crawl.success;
  const internalLinks = crawl.links?.internal || [];
  const externalLinks = crawl.links?.external || [];
  const images = crawl.media?.images || [];
  
  const displayedInternalLinks = internalLinks.slice(internalLinksPage * linksPerPage, (internalLinksPage + 1) * linksPerPage);

  const formatText = (text: any, maxLen: number) => {
    if (!text) return "Not Available";
    const str = String(text);
    return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Section 1: Crawl Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Crawl Status</span>
          <div className="flex items-center gap-1.5">
            {isSuccess ? <CheckCircle className="w-4 h-4 text-[#00685f] dark:text-teal-400" /> : <AlertTriangle className="w-4 h-4 text-[#b5005d] dark:text-pink-400" />}
            <span className={`text-lg font-bold ${isSuccess ? 'text-[#00685f] dark:text-teal-400' : 'text-[#b5005d] dark:text-pink-400'}`}>
              {isSuccess ? "Success" : "Failed"}
            </span>
          </div>
        </div>

        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Status Code</span>
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
            <span className="text-lg font-bold text-neutral-800 dark:text-slate-200">
              {crawl.status_code || "Not Available"}
            </span>
          </div>
        </div>

        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">Crawled At</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
            <span className="text-sm font-bold text-neutral-800 dark:text-slate-200 truncate" title={crawl.crawled_at}>
              {crawl.crawled_at ? new Date(crawl.crawled_at).toLocaleString() : "Not Available"}
            </span>
          </div>
        </div>

        <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-1">URL</span>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate" title={crawl.url}>
              {crawl.url || "Not Available"}
            </span>
          </div>
        </div>
      </div>

      {(!isSuccess && (crawl.error || crawl.skipped_reason)) && (
        <div className="bg-red-50 dark:bg-pink-950/40 border border-red-200 dark:border-pink-800/50 p-4 rounded-xl">
          <span className="text-[10px] font-black uppercase text-[#b5005d] dark:text-pink-400 tracking-wider mb-1 block">Error / Skipped Reason</span>
          <p className="text-sm text-neutral-800 dark:text-slate-200 font-semibold">{crawl.error || crawl.skipped_reason}</p>
        </div>
      )}

      {/* Section 2: Page Metadata */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2">
          <Layout className="w-5 h-5 text-indigo-500" />
          Page Metadata
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">Page Title</span>
            <span className="text-sm font-semibold text-neutral-800 dark:text-slate-200 block">{crawl.title || crawl.metadata?.title || "Not Available"}</span>
            <span className="text-[10px] text-neutral-500 dark:text-slate-400 mt-1 block">Length: {(crawl.title || crawl.metadata?.title || "").length}</span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">Page Description</span>
            <span className="text-sm font-semibold text-neutral-800 dark:text-slate-200 block">{crawl.description || crawl.metadata?.description || "Not Available"}</span>
            <span className="text-[10px] text-neutral-500 dark:text-slate-400 mt-1 block">Length: {(crawl.description || crawl.metadata?.description || "").length}</span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">Keywords</span>
            <span className="text-sm font-semibold text-neutral-800 dark:text-slate-200 block">{crawl.metadata?.keywords || "Not Available"}</span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 block mb-1">Author</span>
            <span className="text-sm font-semibold text-neutral-800 dark:text-slate-200 block">{crawl.metadata?.author || "Not Available"}</span>
          </div>
        </div>
      </div>

      {/* Section 3: Content Preview */}
      {crawl.markdown && (
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Content Preview (Markdown)
            </h4>
            <span className="px-2 py-1 bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 text-xs font-black rounded uppercase">
              Len: {crawl.markdown_length || crawl.markdown.length}
            </span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800">
            <pre className="text-xs text-neutral-700 dark:text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
              {showFullMarkdown ? crawl.markdown : crawl.markdown.slice(0, 1500) + (crawl.markdown.length > 1500 ? "\n\n... (truncated)" : "")}
            </pre>
          </div>
          {crawl.markdown.length > 1500 && (
            <button 
              onClick={() => setShowFullMarkdown(!showFullMarkdown)}
              className="mt-3 flex items-center gap-1 text-xs font-bold text-[#00685f] dark:text-teal-400 hover:underline"
            >
              {showFullMarkdown ? <><ChevronUp className="w-4 h-4"/> Show less</> : <><ChevronDown className="w-4 h-4"/> Show full markdown</>}
            </button>
          )}
        </div>
      )}

      {/* Section 4 & 5: Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal Links */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-500" />
              Internal Links ({internalLinks.length})
            </h4>
          </div>
          {internalLinks.length > 0 ? (
            <div className="flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar border border-neutral-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 uppercase font-black">
                    <tr>
                      <th className="p-3">Text</th>
                      <th className="p-3">Href</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {displayedInternalLinks.map((link: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-neutral-800 dark:text-slate-200 max-w-[150px] truncate" title={link.text}>{link.text || "No text"}</td>
                        <td className="p-3 text-blue-600 dark:text-blue-400 max-w-[200px] truncate" title={link.href}>
                          <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">{link.href}</a>
                        </td>
                        <td className="p-3 font-bold text-neutral-600 dark:text-slate-400">{link.status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-3">
                <button 
                  disabled={internalLinksPage === 0} 
                  onClick={() => setInternalLinksPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-300"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">
                  Page {internalLinksPage + 1} of {Math.ceil(internalLinks.length / linksPerPage) || 1}
                </span>
                <button 
                  disabled={(internalLinksPage + 1) * linksPerPage >= internalLinks.length} 
                  onClick={() => setInternalLinksPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-neutral-200 dark:border-slate-700 disabled:opacity-50 text-neutral-600 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-slate-400 italic">No internal links found.</p>
          )}
        </div>

        {/* External Links */}
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-orange-500" />
              External Links ({externalLinks.length})
            </h4>
          </div>
          {externalLinks.length > 0 ? (
            <div className="flex-1 overflow-auto max-h-[350px] custom-scrollbar border border-neutral-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 uppercase font-black sticky top-0">
                  <tr>
                    <th className="p-3">Text</th>
                    <th className="p-3">Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                  {externalLinks.map((link: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-neutral-800 dark:text-slate-200 max-w-[150px] truncate" title={link.text}>{link.text || "No text"}</td>
                      <td className="p-3 text-blue-600 dark:text-blue-400 max-w-[200px] truncate" title={link.href}>
                         <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">{link.base_domain || link.href}</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-slate-400 italic">No external links found.</p>
          )}
        </div>
      </div>

      {/* Section 6: Media Summary */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-pink-500" />
          Media Summary
        </h4>
        <div className="flex gap-4 mb-4">
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 px-4 py-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Images</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">{images.length}</span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 px-4 py-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Videos</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">{(crawl.media?.videos || []).length}</span>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-slate-800/40 px-4 py-2 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Audios</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">{(crawl.media?.audios || []).length}</span>
          </div>
        </div>

        {images.length > 0 && (
          <div className="overflow-x-auto custom-scrollbar border border-neutral-100 dark:border-slate-800 rounded-xl max-h-[300px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 uppercase font-black sticky top-0">
                <tr>
                  <th className="p-3 w-16">Preview</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Alt Text</th>
                  <th className="p-3">Format</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {images.slice(0, 50).map((img: any, idx: number) => (
                  <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-slate-800/40">
                    <td className="p-2">
                      {img.src && img.src.startsWith('http') ? (
                        <img src={img.src} alt={img.alt || ''} className="w-10 h-10 object-cover rounded bg-neutral-200 dark:bg-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-neutral-200 dark:bg-slate-700 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-blue-600 dark:text-blue-400 max-w-[200px] truncate" title={img.src}>
                      {img.src ? <a href={img.src} target="_blank" rel="noreferrer" className="hover:underline">{img.src}</a> : "-"}
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-slate-300">
                      {img.alt ? <span title={img.alt}>{formatText(img.alt, 50)}</span> : <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-[10px]">Missing alt</span>}
                    </td>
                    <td className="p-3 text-neutral-500 dark:text-slate-400 font-bold uppercase">{img.format || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 7: Crawl SEO Snapshot */}
      {crawl.seo && (
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Crawl SEO Snapshot
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-3 rounded-xl border border-neutral-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 block mb-1">Language</span>
              <span className="text-sm font-bold text-neutral-800 dark:text-slate-200 uppercase">{crawl.seo.lang || "Not set"}</span>
            </div>
            <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-3 rounded-xl border border-neutral-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 block mb-1">H1 Count</span>
              <span className="text-sm font-bold text-neutral-800 dark:text-slate-200">{crawl.seo.h1_count ?? "N/A"}</span>
            </div>
            <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-3 rounded-xl border border-neutral-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 block mb-1">Canonical URL</span>
              <span className="text-sm font-bold text-neutral-800 dark:text-slate-200 truncate block" title={crawl.seo.canonical_url}>
                {crawl.seo.canonical_url || "Not set"}
              </span>
            </div>
            <div className="bg-[#f8f9fa] dark:bg-slate-800/40 p-3 rounded-xl border border-neutral-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400 block mb-1">Images Missing Alt</span>
              <span className={`text-sm font-bold ${crawl.seo.images_missing_alt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {crawl.seo.images_missing_alt ?? "N/A"}
              </span>
            </div>
          </div>
          {crawl.seo.schema_org_types && crawl.seo.schema_org_types.length > 0 && (
             <div className="mt-4 flex gap-2 items-center flex-wrap">
               <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-slate-400">Schema.org Types:</span>
               {crawl.seo.schema_org_types.map((type: string, idx: number) => (
                 <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-800/50">
                   {type}
                 </span>
               ))}
             </div>
          )}
        </div>
      )}

      {/* Section 8: Response Headers */}
      {crawl.response_headers && (
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setShowHeaders(!showHeaders)}>
            <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-500" />
              Response Headers
            </h4>
            {showHeaders ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </div>
          {showHeaders && (
            <div className="mt-4 bg-[#f8f9fa] dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                  {Object.entries(crawl.response_headers).map(([key, value]: [string, any], idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 pr-4 font-bold text-neutral-600 dark:text-slate-400">{key}</td>
                      <td className="py-2 text-neutral-800 dark:text-slate-200 break-all">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 9: Raw Crawl Data */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="font-black text-neutral-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-neutral-500" />
          Raw Data Explorer
        </h4>
        
        <div className="space-y-3">
          {/* Raw JSON */}
          <div className="border border-neutral-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full px-4 py-3 bg-[#f8f9fa] dark:bg-slate-800/60 flex justify-between items-center text-sm font-bold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Raw website_crawl JSON</span>
              {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawJson && (
              <div className="p-4 bg-white dark:bg-slate-900 max-h-[400px] overflow-auto custom-scrollbar">
                <pre className="text-[10px] font-mono text-neutral-600 dark:text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(crawl, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Raw Clean HTML */}
          {crawl.cleaned_html && (
            <div className="border border-neutral-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowRawCleanHtml(!showRawCleanHtml)}
                className="w-full px-4 py-3 bg-[#f8f9fa] dark:bg-slate-800/60 flex justify-between items-center text-sm font-bold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Raw cleaned_html</span>
                {showRawCleanHtml ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRawCleanHtml && (
                <div className="p-4 bg-white dark:bg-slate-900 max-h-[400px] overflow-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-neutral-600 dark:text-slate-400 whitespace-pre-wrap">
                    {crawl.cleaned_html}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Raw HTML */}
          {crawl.html && (
            <div className="border border-neutral-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="w-full px-4 py-3 bg-[#f8f9fa] dark:bg-slate-800/60 flex justify-between items-center text-sm font-bold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Raw full html</span>
                {showRawHtml ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRawHtml && (
                <div className="p-4 bg-white dark:bg-slate-900 max-h-[400px] overflow-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-neutral-600 dark:text-slate-400 whitespace-pre-wrap">
                    {crawl.html}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
