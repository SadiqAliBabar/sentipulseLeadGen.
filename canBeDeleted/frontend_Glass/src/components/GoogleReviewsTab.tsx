import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  Image as ImageIcon,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Code
} from "lucide-react";

interface GoogleReviewsTabProps {
  lead: Lead;
}

export default function GoogleReviewsTab({ lead }: GoogleReviewsTabProps) {
  const reviewsData = lead.googleReviewsRaw || lead.google_reviews;
  
  const [filter, setFilter] = useState("all");
  const [showRawJson, setShowRawJson] = useState(false);

  if (!reviewsData) {
    return (
      <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-8 border border-neutral-200 dark:border-slate-800 text-center text-neutral-500 dark:text-slate-400 shadow-sm">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-neutral-400 dark:text-slate-500" />
        <h4 className="font-bold text-neutral-700 dark:text-slate-300">No Google Reviews data available for this lead.</h4>
        <p className="text-xs text-neutral-500 mt-1">Make sure the lead object contains `google_reviews` data.</p>
      </div>
    );
  }

  // Safely parse
  const totalScraped = reviewsData.total_scraped ?? 0;
  const avgRating = reviewsData.avg_rating ?? "N/A";
  const originalCount = lead.reviewsCount ?? "N/A";
  const reviews = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];

  // Recalculate latest review
  const sortedReviews = [...reviews].sort((a, b) => {
    const dateA = a.date_iso ? new Date(a.date_iso).getTime() : (a.date_raw ? new Date(a.date_raw).getTime() : 0);
    const dateB = b.date_iso ? new Date(b.date_iso).getTime() : (b.date_raw ? new Date(b.date_raw).getTime() : 0);
    return dateB - dateA; // descending
  });
  
  const calculatedLatest = sortedReviews[0];
  const storedLatest = reviewsData.latest_review;
  
  // Bug fix check
  let isOutdated = false;
  if (calculatedLatest && storedLatest) {
    const calcDate = calculatedLatest.date_iso || calculatedLatest.date_raw;
    const storedDate = storedLatest.date_iso || storedLatest.date_raw;
    if (calcDate && storedDate) {
      if (new Date(calcDate).getTime() > new Date(storedDate).getTime()) {
        isOutdated = true;
      }
    } else if (calculatedLatest.text !== storedLatest.text) {
       isOutdated = true;
    }
  }

  // Counts
  let withText = 0;
  let withoutText = 0;
  let withReply = 0;
  let withoutReply = 0;
  let negative = 0;
  let neutral = 0;
  let positive = 0;
  
  const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviews.forEach(r => {
    if (r.text && r.text.trim().length > 0) withText++;
    else withoutText++;
    
    if (r.owner_reply) withReply++;
    else withoutReply++;
    
    if (r.rating <= 2) negative++;
    else if (r.rating === 3) neutral++;
    else if (r.rating >= 4) positive++;
    
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDist[r.rating as keyof typeof ratingDist]++;
    }
  });

  // Filters
  const filteredReviews = useMemo(() => {
    return sortedReviews.filter(r => {
      if (filter === "all") return true;
      if (filter === "5") return r.rating === 5;
      if (filter === "4") return r.rating === 4;
      if (filter === "3") return r.rating === 3;
      if (filter === "2") return r.rating === 2;
      if (filter === "1") return r.rating === 1;
      if (filter === "has-text") return r.text && r.text.trim().length > 0;
      if (filter === "no-text") return !r.text || r.text.trim().length === 0;
      if (filter === "has-reply") return !!r.owner_reply;
      if (filter === "no-reply") return !r.owner_reply;
      if (filter === "negative") return r.rating <= 2;
      if (filter === "positive") return r.rating >= 4;
      return true;
    });
  }, [sortedReviews, filter]);

  // Review Card UI Component
  const ReviewCard = ({ r }: { r: any; key?: any }) => (
    <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-5 mb-4 shadow-sm hover:border-neutral-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {r.avatar_url ? (
            <img src={r.avatar_url} alt={r.author} className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-slate-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-slate-800 flex items-center justify-center text-neutral-500">
              <User className="w-5 h-5" />
            </div>
          )}
          <div>
            <h5 className="font-bold text-neutral-800 dark:text-slate-200 text-sm">
              {r.profile_url ? <a href={r.profile_url} target="_blank" rel="noreferrer" className="hover:underline">{r.author}</a> : r.author}
            </h5>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-slate-400 mt-0.5">
              <span className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-neutral-300 dark:text-slate-700"}`} />
                ))}
              </span>
              <span>•</span>
              <span>{r.date_iso ? new Date(r.date_iso).toLocaleDateString() : r.date_raw || "Unknown Date"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          {r.likes > 0 && (
            <span className="flex items-center gap-1 font-semibold" title="Likes"><ThumbsUp className="w-3.5 h-3.5" /> {r.likes}</span>
          )}
          {r.photos && r.photos.length > 0 && (
            <span className="flex items-center gap-1 font-semibold" title="Photos"><ImageIcon className="w-3.5 h-3.5" /> {r.photos.length}</span>
          )}
        </div>
      </div>
      <div className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed font-medium">
        {r.text && r.text.trim().length > 0 ? (
          <p className="whitespace-pre-wrap">{r.text}</p>
        ) : (
          <p className="italic text-neutral-400 dark:text-slate-500">No review text provided.</p>
        )}
      </div>
      {r.owner_reply && (
        <div className="mt-4 pl-4 border-l-2 border-emerald-500 dark:border-teal-500 bg-white dark:bg-slate-800/40 p-3 rounded-r-lg border border-r-neutral-200/50 border-y-neutral-200/50 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-emerald-600 dark:text-teal-400">Owner Reply</span>
            {(r.owner_reply.date_iso || r.owner_reply.date_raw) ? (
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-slate-500">• {r.owner_reply.date_iso ? new Date(r.owner_reply.date_iso).toLocaleDateString() : r.owner_reply.date_raw}</span>
            ) : null}
          </div>
          <p className="text-xs text-neutral-600 dark:text-slate-400 whitespace-pre-wrap font-medium">{r.owner_reply.text || r.owner_reply}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Bug Warning if outdated */}
      {isOutdated && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Warning: Outdated Latest Review</h4>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 font-medium">
              Stored `latest_review` appears outdated. The latest review was recalculated from the `reviews[]` array.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Summary Cards & Owner Reply Gap */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">Avg Rating</span>
          <div className="text-4xl font-black text-amber-500 mt-1 mb-2">{avgRating}</div>
          <div className="flex justify-center">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(avgRating) || 0) ? "text-amber-500 fill-amber-500" : "text-neutral-300 dark:text-slate-700"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider">Total Scraped</span>
          <div className="text-4xl font-black text-neutral-800 dark:text-slate-200 mt-1 mb-2">{totalScraped}</div>
          <span className="text-xs font-semibold text-neutral-500">Original Profile: {originalCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-slate-500 tracking-wider mb-3 text-center">Text Content</span>
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300 mb-2">
            <span>With Text</span>
            <span className="bg-[#f8f9fa] dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-slate-700">{withText}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300">
            <span>Without Text</span>
            <span className="bg-[#f8f9fa] dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-slate-700">{withoutText}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border-l-4 border-l-[#00685f] dark:border-l-teal-500 border-t border-b border-r border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-[#00685f] dark:text-teal-400 tracking-wider mb-3 text-center">Owner Reply Gap</span>
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300 mb-2">
            <span>Replied</span>
            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md">{withReply}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-slate-300 mb-2">
            <span>Not Replied</span>
            <span className="text-[#b5005d] dark:text-pink-400 bg-red-50 dark:bg-pink-950/40 px-2.5 py-0.5 rounded-md">{withoutReply}</span>
          </div>
          <div className="text-[9px] text-center mt-1 text-neutral-400 dark:text-slate-500 font-semibold italic">
            Missed replies = Missed trust signals
          </div>
        </div>
      </div>

      {/* Section 2: Rating Distribution & Sentiment summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h4 className="font-black text-sm text-neutral-800 dark:text-slate-200 mb-5">Rating Distribution</h4>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = ratingDist[stars as keyof typeof ratingDist];
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-4 text-xs font-bold text-neutral-700 dark:text-slate-300">
                  <span className="w-12 text-right">{stars} Star</span>
                  <div className="flex-1 bg-neutral-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${stars >= 4 ? "bg-emerald-500" : stars === 3 ? "bg-amber-400" : "bg-[#b5005d] dark:bg-pink-500"}`} 
                      style={{ width: `${percentage}%` }} 
                    />
                  </div>
                  <span className="w-8 text-right text-neutral-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <h4 className="font-black text-sm text-neutral-800 dark:text-slate-200 mb-5">Sentiment Breakdown</h4>
          <div className="flex gap-4">
             <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800">
               <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{positive}</span>
               <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-500">Positive<br/>(4-5★)</span>
             </div>
             <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800">
               <span className="block text-3xl font-black text-amber-600 dark:text-amber-400 mb-1">{neutral}</span>
               <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 dark:text-amber-500">Neutral<br/>(3★)</span>
             </div>
             <div className="flex-1 bg-red-50 dark:bg-pink-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-pink-800">
               <span className="block text-3xl font-black text-[#b5005d] dark:text-pink-400 mb-1">{negative}</span>
               <span className="text-[10px] uppercase font-black tracking-wider text-red-700 dark:text-pink-500">Negative<br/>(1-2★)</span>
             </div>
          </div>
        </div>
      </div>

      {/* Section 6: Highlighted Latest / Negative Review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculatedLatest && (
          <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-5 shadow-sm">
             <h4 className="font-black text-sm text-neutral-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00685f] dark:text-teal-400" />
                Latest Review
             </h4>
             <ReviewCard r={calculatedLatest} />
          </div>
        )}
        
        {/* Find the most recent negative review to highlight */}
        {(() => {
          const latestNegative = sortedReviews.find(r => r.rating <= 2);
          if (!latestNegative) return (
             <div className="bg-[#f8f9fa] dark:bg-slate-900/60 border border-neutral-200/40 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-center flex-col text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-neutral-800 dark:text-slate-200">No Negative Reviews</h4>
                <p className="text-xs text-neutral-500 font-semibold mt-1">This profile has an excellent track record.</p>
             </div>
          );
          return (
             <div className="bg-[#fcf3f6] dark:bg-pink-950/20 border-l-4 border-l-[#b5005d] border border-neutral-200/40 dark:border-pink-900/50 rounded-xl p-5 shadow-sm">
               <h4 className="font-black text-sm text-[#b5005d] dark:text-pink-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Recent Negative Review
               </h4>
               <ReviewCard r={latestNegative} />
             </div>
          )
        })()}
      </div>

      {/* Section 4 & 5: Filters and Reviews List */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-neutral-100 dark:border-slate-800 pb-5">
          <h4 className="font-black text-lg text-neutral-800 dark:text-slate-200">All Reviews <span className="text-neutral-400 text-sm">({reviews.length})</span></h4>
          
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#f8f9fa] dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#00685f]/50 transition-shadow w-full sm:w-auto cursor-pointer"
          >
            <option value="all">All Ratings & Reviews</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
            <option value="positive">Positive (4-5★)</option>
            <option value="negative">Negative (1-2★)</option>
            <option value="has-text">Has Text</option>
            <option value="no-text">No Text</option>
            <option value="has-reply">Has Owner Reply</option>
            <option value="no-reply">No Owner Reply</option>
          </select>
        </div>

        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((r, i) => <ReviewCard key={i} r={r} />)
          ) : (
            <div className="text-center py-12 text-neutral-400 dark:text-slate-500 font-bold text-sm bg-[#f8f9fa] dark:bg-slate-800/40 rounded-xl border border-dashed border-neutral-200 dark:border-slate-700">
              No reviews match the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON Toggle for Debugging */}
      <div className="bg-white dark:bg-slate-900/40 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-8">
        <button 
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neutral-700 dark:text-slate-300">
            <Code className="w-4 h-4 text-neutral-500 dark:text-slate-400" />
            Raw Reviews JSON
          </div>
          {showRawJson ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
        </button>
        {showRawJson && (
          <div className="p-4 bg-neutral-900 dark:bg-[#0b0f19] overflow-x-auto max-h-[500px] overflow-y-auto">
            <pre className="text-xs text-emerald-400 font-mono">
              {JSON.stringify(reviewsData, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
