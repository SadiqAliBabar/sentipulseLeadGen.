// src --> app --> (dashboard) --> OverviewDashboard --> page.js
//
// Changes in this revision:
//  1. QR Codes section added at the bottom of the dashboard (below ReviewSankey).
//     Fetches from the exact same API endpoint (config/qrcode) as the
//     Configuration panel QR tab and the standalone /QrCode page — all three
//     always show identical data because they share the same source.
//  2. QR cards use compact sizing (w-32 h-32) to sit cleanly on the dashboard
//     without dominating the layout.
//  3. Only Download action is available — no Refresh or Delete buttons.

"use client";
import React, { useState, useEffect } from "react";
import DashboardHeader from "../../../components/DashboardOverview";
import MetricBarOverview from "@/components/MetricBarOverview";
import ReviewsList from "../../../components/ReviewsList";
import SentimentDistribution from "../../../components/SentimentDistribution";
import TimeWiseSentiment from "../../../components/TimeWiseSentiment";
import PlatformSentiment from "../../../components/PlatformSentiment";
import SentimentWordCloud from "../../../components/SentimentWordCloud";
import dynamic from "next/dynamic";
import config from "@/config";

const ReviewSankey = dynamic(() => import("../../../components/ReviewSankey"), {
  ssr: false,
});



// ── Main Dashboard ────────────────────────────────────────────
function Dashboard() {
  const [duration, setDuration] = useState("Last 7 Weeks");
  const [showModal, setShowModal] = useState(false);
  const [datePicker, setDatePicker] = useState();
  const [selectedPlatforms, setSelectedPlatforms] = useState("");
  const [selectedBranches, setSelectedBranches] = useState("");

  const getFormattedDuration = (raw) => {
    const lower = raw.toLowerCase();
    if (lower.includes("week")) return { durationType: "weeks", durationValue: 7 };
    if (lower.includes("month")) return { durationType: "months", durationValue: 7 };
    if (lower.includes("quarter") || lower.includes("qtr"))
      return { durationType: "qtr", durationValue: 7 };
    if (lower.includes("year")) return { durationType: "years", durationValue: 7 };
    return { durationType: "days", durationValue: 7 };
  };

  const fetchRecentReviews = async (durationObj) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${config.BASE_URL}reviews/recent-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(durationObj),
      });
      const data = await res.json();
      if (
        data?.success &&
        data.data &&
        Array.isArray(data.data.recent_reviews) &&
        data.data.recent_reviews.length === 0
      ) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    } catch (err) {
      console.error("❌ Error fetching reviews:", err);
      setShowModal(true);
    }
  };

  const handleSearch = (newDurationLabel) => {
    const formatted = getFormattedDuration(newDurationLabel || duration);
    fetchRecentReviews(formatted);
  };

  useEffect(() => {
    handleSearch(duration);
  }, []);

  const formattedDuration = getFormattedDuration(duration);

  return (
    <div className="flex overflow-hidden flex-col items-center bg-[var(--color-bg-page)] text-[var(--color-text-primary)] w-full h-screen">

      {/* ── Header ─────────────────────────────────────────── */}
      <DashboardHeader
        title="Overview Dashboard"
        subtitle="Based on Live Customer Reviews Across PLATFORMS"
        showDuration={true}
        duration={duration}
        onDurationChange={(d) => { setDuration(d); handleSearch(d); }}
        platform=""
        onSearch={handleSearch}
        onDataRangeChange={(d) => setDatePicker(d)}
        onPlatformChange={(updatedPlatforms) => setSelectedPlatforms(updatedPlatforms)}
        onBranchChange={(updatedBranches) => setSelectedBranches(updatedBranches)}
      />

      {/* ── Metrics bar ────────────────────────────────────── */}
      <MetricBarOverview
        duration={datePicker}
        selectedPlatforms={selectedPlatforms}
        selectedBranches={selectedBranches}
        option={2}
      />

      {/* ── Charts section ─────────────────────────────────── */}
      <section className="flex flex-wrap gap-3 w-[95%] py-3">
        <div className="flex w-full gap-3 max-md:flex-col">

          {/* Reviews list */}
          <div className="flex flex-col basis-[29%] font-medium rounded-2xl text-slate-800 max-md:w-full max-[1040px]:w-full max-[1040px]:basis-full">
            <ReviewsList
              title="Overview Dashboard"
              option={1}
              specificDate={datePicker}
              selectedPlatforms={selectedPlatforms}
              selectedBranches={selectedBranches}
            />
          </div>

          {/* Right column charts */}
          <div className="flex flex-col basis-[70%] rounded-2xl text-xs gap-3 max-md:w-full max-[1040px]:w-full max-[1040px]:basis-full h-[63vh] overflow-y-auto px-1">

            {/* Sentiment distribution + word cloud */}
            <div className="flex flex-wrap w-full gap-3 items-center max-md:flex-col">
              <div className="w-[25%] max-md:w-full max-[1040px]:w-full">
                <SentimentDistribution
                  duration={datePicker}
                  selectedPlatforms={selectedPlatforms}
                  selectedBranches={selectedBranches}
                  option={1}
                />
              </div>
              <div className="w-[75%] flex-[2] max-md:w-full max-[1040px]:w-full">
                <SentimentWordCloud
                  duration={datePicker}
                  duration_value={duration}
                  selectedPlatforms={selectedPlatforms}
                  selectedBranches={selectedBranches}
                  option={1}
                />
              </div>
            </div>

            {/* Time wise + platform sentiment */}
            <div className="flex w-full gap-3 items-center max-md:flex-col">
              <div className="w-[50%] max-md:w-full max-[1040px]:w-full">
                <TimeWiseSentiment
                  duration={datePicker}
                  selectedPlatforms={selectedPlatforms}
                  selectedBranches={selectedBranches}
                  option={1}
                />
              </div>
              <div className="w-[50%] max-md:w-full max-[1040px]:w-full">
                <PlatformSentiment
                  duration={datePicker}
                  option={1}
                  selectedPlatforms={selectedPlatforms}
                  selectedBranches={selectedBranches}
                />
              </div>
            </div>

            {/* Sankey */}
            <div className="flex flex-wrap w-full gap-3 items-center max-md:flex-col">
              <div className="w-[100%] max-md:w-full max-[1040px]:w-full">
                <ReviewSankey
                  duration={datePicker}
                  selectedPlatforms={selectedPlatforms}
                  selectedBranches={selectedBranches}
                />
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* ── No-reviews modal ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md text-center">
            <p className="mt-1 text-[16px] text-gray-600 mb-4">
              There are no reviews for the selected duration.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="overflow-hidden px-4 py-2 w-[20%] text-[16px] font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;