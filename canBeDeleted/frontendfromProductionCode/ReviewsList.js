"use client";
import React, { useState, useRef, useEffect } from "react";
import config from "@/config";
import { format, subDays } from "date-fns";
import * as ExcelJS from "exceljs";
import { moment } from "moment";
import { IoFilterOutline } from "react-icons/io5";
import { IoIosArrowDown } from "react-icons/io";
import { CiFilter } from "react-icons/ci";

function ReviewsList({
  duration,
  option,
  specificDate,
  title,
  customHeight = "60vh",
  selectedPlatforms,
  selectedBranches,
}) {
  // Normalize specificDate: can be a string (single date) or an object { startDate, endDate }
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  let datePayload = null;
  if (specificDate) {
    if (
      typeof specificDate === "object" &&
      specificDate.startDate &&
      specificDate.endDate
    ) {
      datePayload = {
        startDate: specificDate.startDate,
        endDate: specificDate.endDate,
      };
    } else if (typeof specificDate === "string") {
      datePayload = { date: specificDate };
    }
  }
  const finalDate =
    datePayload && datePayload.date ? datePayload.date : yesterdayStr;

  // Resolve platform/location values for API payloads.
  // If the parent passes an array (multi-select) or a single string, normalize to a single value.
  const resolveFilterValue = (val) => {
    if (!val) return "";
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      // Treat explicit 'All' as no-filter
      if (val.includes("All") || val.includes("all")) return "";
      // prefer first item for payload
      return val[0] || "";
    }
    if (typeof val === "string") {
      return val === "All" ? "" : val;
    }
    return "";
  };

  const [platformFilter, setPlatformFilter] = useState(["All"]);
  const [fetchedReviews, setFetchedReviews] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const baseUrl = config.BASE_URL;
  const [disabledFilters, setDisabledFilters] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);
  const sectionRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [sortOption, setSortOption] = useState(""); // e.g. "date-asc", "rating-desc"
  const [activeSortField, setActiveSortField] = useState("");
  const platforms = ["All", "Foodpanda", "Google", "In-House"];
  //  "Instagram", "Facebook"
  const [selectedFilters, setSelectedFilters] = useState([]);
  const sortDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const toggleDisableFilter = (type) => {
    setDisabledFilters((prev) =>
      prev.includes(type) ? prev.filter((f) => f !== type) : [...prev, type]
    );
  };

  const colorMap = {
    positive: "bg-lime-300/90 text-black dark:text-white",
    neutral: "bg-[#11A8D7]/50 text-black dark:text-white",
    negative: "bg-[#F57F62]/50 text-black dark:text-white",
  };
  useEffect(() => {
    function handleClickOutside(event) {
      // Sort dropdown
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target)
      ) {
        setShowExportDropdown(false);
      }

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setShowSortDropdown(false);
      }

      // Filter dropdown
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (title === "Executive Dashboard") {
    useEffect(() => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      fetch(`${baseUrl}reviews/recent-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // prefer sending a range payload when provided; include platform and location
        body: JSON.stringify(
          Object.assign(
            {},
            datePayload || { startDate: finalDate, endDate: finalDate },
            {
              platform: resolveFilterValue(selectedPlatforms),
              branch_name: resolveFilterValue(selectedBranches),
            }
          )
        ),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log(finalDate + " reviews: ");

            setFetchedReviews(data.data.recent_reviews || []);
          }
        })
        .catch(console.error);
    }, [finalDate, option, specificDate, selectedPlatforms, selectedBranches]);
  } else if (title === "Overview Dashboard") {
    useEffect(() => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      fetch(`${baseUrl}reviews/recent-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // prefer sending a range payload when provided; include platform and location
        body: JSON.stringify(
          Object.assign(
            {},
            datePayload || { startDate: finalDate, endDate: finalDate },
            {
              platform: resolveFilterValue(selectedPlatforms),
              branch_name: resolveFilterValue(selectedBranches),
            }
          )
        ),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log(finalDate + " reviews: ");

            setFetchedReviews(data.data.recent_reviews || []);
          }
        })
        .catch(console.error);
    }, [finalDate, option, specificDate, selectedPlatforms, selectedBranches]);
  } else {
    useEffect(() => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      fetch(`${baseUrl}reviews/recent-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // include platform and location when not using datePayload
        body: JSON.stringify(
          Object.assign({}, duration, {
            platform: resolveFilterValue(selectedPlatforms),
            branch_name: resolveFilterValue(selectedBranches),
          })
        ),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setFetchedReviews(data.data.recent_reviews || []);
          }
        })
        .catch(console.error);
    }, [duration, option]);
  }

  const filteredReviews = fetchedReviews.filter((review) => {
    const sentiment = review.sentiment?.toLowerCase() || "";
    const platform = review.platform?.toLowerCase() || "";

    const normalizedFilters = platformFilter.map((p) => p.toLowerCase());
    const matchesSentiment = !disabledFilters.includes(sentiment);
    const matchesPlatform =
      normalizedFilters.includes("all") || normalizedFilters.includes(platform);

    return matchesSentiment && matchesPlatform;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortOption === "date-asc") {
      return new Date(a.date) - new Date(b.date);
    } else if (sortOption === "date-desc") {
      return new Date(b.date) - new Date(a.date);
    } else if (sortOption === "rating-asc") {
      return (a.rating || 0) - (b.rating || 0);
    } else if (sortOption === "rating-desc") {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortOption === "sent_rating-asc") {
      return (a.sent_rating || 0) - (b.sent_rating || 0);
    } else if (sortOption === "sent_rating-desc") {
      return (b.sent_rating || 0) - (a.sent_rating || 0);
    }
    return 0;
  });

  function handleFullscreen() {
    if (sectionRef.current?.requestFullscreen) {
      sectionRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (sectionRef.current?.webkitRequestFullscreen) {
      sectionRef.current.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else if (sectionRef.current?.msRequestFullscreen) {
      sectionRef.current.msRequestFullscreen();
      setIsFullscreen(true);
    }
    setShowExportDropdown(false);
  }

  useEffect(() => {
    const exitHandler = () => {
      if (
        !document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement
      ) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", exitHandler);
    document.addEventListener("webkitfullscreenchange", exitHandler);
    document.addEventListener("msfullscreenchange", exitHandler);
    return () => {
      document.removeEventListener("fullscreenchange", exitHandler);
      document.removeEventListener("webkitfullscreenchange", exitHandler);
      document.removeEventListener("msfullscreenchange", exitHandler);
    };
  }, []);

  async function handleExport() {
    if (!filteredReviews.length) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reviews");

    // ✅ 1. ADD START & END DATE TOP LEFT
    // There are 7 columns (User, Date, Branch, Platform, Platform Rating, SentiPulse Rating, Review), so merge through G
    // ❌ Remove mergeCells completely
    // sheet.mergeCells("A1", "G1");
    // sheet.mergeCells("A2", "G2");

    // Row 1 → Put Start Date in A1 ONLY
    sheet.getCell("A1").value = `Start Date:`;
    sheet.getCell("B1").value = `${datePayload?.startDate || finalDate}`;

    // Row 2 → Put End Date in A1 ONLY (or A2 if you want separate row & same column)
    sheet.getCell("A2").value = `End Date:`;
    sheet.getCell("B2").value = `${datePayload?.endDate || finalDate}`;

    // Styling
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(2).font = { bold: true };

    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(2).alignment = { vertical: "middle", horizontal: "left" };

    // ✅ 2. HEADING row (sticky)
    const HEADER = [
      "Users",
      "Date",
      "Branch",
      "Platform",
      "Platform Rating",
      "SentiPulse Rating",
      "Email",
      "Contact",
      "Review"
    ];

    // Add an empty row (row 3 will be header) and then add the header row
    sheet.addRow([]);
    const headerRow = sheet.addRow(HEADER);

    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // ✅ Styling Header Background
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    });

    // ✅ 3. Convert data rows
    // Add rows as arrays in the same column order as HEADER so values reliably appear in the sheet
    filteredReviews.forEach((rev) => {
      const row = sheet.addRow([
        rev.user,
        rev.date ? new Date(rev.date).toLocaleDateString() : "",
        rev.branch_name || "",
        rev.platform || "",
        rev.rating || "",
        rev.sent_rating || "",
        rev.email?.trim() || "-",
        rev.contact?.trim() || "-",
        rev.text || "",
      ]);

      row.eachCell((cell, colNumber) => {
        if (colNumber === 9) {
          // ✅ Review column → LEFT aligned (recommended)
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
        } else {
          // ✅ All other columns → Center aligned
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    // ✅ 4. Dynamic Min-Width for Each Column
    // Use explicit column indexes (1..HEADER.length) to compute widths safely in browser
    // for (let i = 1; i <= HEADER.length; i++) {
    //   const col = sheet.getColumn(i);
    //   let maxLength = 10; // minimum width

    //   col.eachCell({ includeEmpty: true }, (cell) => {
    //     const cellValue = cell.value ? cell.value.toString() : "";
    //     maxLength = Math.max(maxLength, cellValue.length + 5);
    //   });

    //   col.width = maxLength;
    // }

    for (let i = 1; i <= HEADER.length; i++) {
      const col = sheet.getColumn(i);
      let maxLength = 10;

      col.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, val.length + 1);
      });

      col.width = maxLength;
    }

    // ✅ 5. Make Header Sticky (Freeze Pane)
    sheet.views = [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 4,
      },
    ];

    // ✅ 6. Download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reviews_Export_${datePayload?.startDate || finalDate}_to_${datePayload?.endDate || finalDate
      }`; // ✅ your custom name
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatReviewText(text, others_part, sentiment) {
    const bgClass = colorMap[sentiment] || "bg-gray-100";

    if (!others_part || !text.includes(others_part)) {
      return (
        <p className="dark:text-white text-[11px] mt-1 text-gray-800 text-justify leading-relaxed max-w-[500px]">
          {text}
        </p>
      );
    }

    const parts = text.split(others_part);
    return (
      <p className="dark:text-white text-[11px] mt-1 text-gray-800 text-justify leading-relaxed max-w-[500px]">
        {parts[0]}
        <span className={`${bgClass} font-medium px-1 rounded`}>
          {others_part}
        </span>
        {parts[1]}
      </p>
    );
  }

  function formatReviewDate(dateString) {
    if (!dateString) return "";
    return format(new Date(dateString), "dd-MMM-yy hh:mm a");
  }


  // TODO: this fuction change the date format like 20 days ago
  function getTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString); // dateString has +00:00, so it's UTC

    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    return "Just now";

  }

  return (
    <section
      className={`grow pt-2 rounded-2xl overflow-hidden max-md:mt-3 ${isFullscreen
        ? "bg-white shadow-[0px_1px_7px_rgba(0,0,0,0.13)] w-full h-screen fixed top-0 left-0 z-[9999]"
        : "bg-white/15 shadow-[0px_1px_7px_rgba(0,0,0,0.13)] w-full"
        }`}
      style={!isFullscreen ? { height: customHeight } : undefined}
    >
      <div className={`h-full overflow-y-scroll pr-2 `} id="style-2">
        <div className="flex z-10 flex-col items-start px-3.5 pb-10 w-full max-md:pb-24">
          <div className="flex justify-between items-center w-full h-7.5 max-md:mr-0.5">
            <h2 className="text-[10px] font-semibold leading-none text-gray-700 dark:text-white">
              REVIEWS
            </h2>
            <div className="flex items-center flex-wrap gap-1.5">
              {/* Positive */}
              <div
                className={`flex justify-center items-center w-4 h-4 rounded cursor-pointer ${disabledFilters.includes("positive")
                  ? "bg-gray-300"
                  : "bg-[#8BC63E]"
                  }`}
                onClick={() => toggleDisableFilter("positive")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                >
                  <path
                    d="M8.36372 5.88946H5.89091V8.36227H5.06664V5.88946H2.59383V5.06519H5.06664V2.59238H5.89091V5.06519H8.36372V5.88946Z"
                    fill="white"
                  />
                </svg>
              </div>

              {/* Negative */}
              <div
                className={`flex justify-center items-center w-4 h-4 rounded cursor-pointer ${disabledFilters.includes("negative")
                  ? "bg-gray-300"
                  : "bg-[#F57F62]"
                  }`}
                onClick={() => toggleDisableFilter("negative")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="9"
                  height="9"
                  viewBox="0 0 9 9"
                  fill="none"
                >
                  <path
                    d="M6.86081 5.04157H2.05258V4.35468H6.86081V5.04157Z"
                    fill="white"
                  />
                </svg>
              </div>

              {/* Neutral */}
              <div
                className={`flex justify-center items-center w-4 h-4 rounded cursor-pointer ${disabledFilters.includes("neutral")
                  ? "bg-gray-300"
                  : "bg-[#11A8D7]"
                  }`}
                onClick={() => toggleDisableFilter("neutral")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M4.70474 3.03387V9.13562H5.92509V6.08475L7.14544 9.13562H8.36579V3.03387H7.14544V6.08475L5.92509 3.03387H4.70474Z"
                    fill="white"
                  />
                </svg>
              </div>

              {option === 1 && (
                <div className="relative flex gap-2 justify-center items-center">
                  {/* Filter (Funnel) Icon */}
                  <div
                    onClick={() => setShowDropdown(!showDropdown)}
                    ref={dropdownRef}
                  >
                    {/* <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      stroke="black"
                      strokeWidth="1"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 4h16l-6 8v6l-4 2v-8L4 4z"
                        stroke="black"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg> */}
                    <CiFilter className="text-lg text-black dark:text-white" />
                  </div>

                  {/* Sort Icon */}
                  <div onClick={() => setShowSortDropdown(!showSortDropdown)}>
                    {/* <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      stroke="black"
                      strokeWidth="1.2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M3 6h18M6 12h12M10 18h4"
                        stroke="black"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg> */}
                    <IoFilterOutline className="text-lg text-black dark:text-white" />
                  </div>

                  {showSortDropdown && (
                    <div
                      ref={sortDropdownRef}
                      className="absolute right-0 top-[26px] z-50 bg-white rounded shadow-lg py-2 w-[150px] text-[11px]"
                    >
                      {["Date", "Platform Rating", "SentiPulse Rating"].map((field) => {
                        let baseKey = field.toLowerCase();
                        if (baseKey === "sentipulse rating") {
                          baseKey = "sent_rating";
                        }
                        if (baseKey === "platform rating") {
                          baseKey = "rating";
                        }
                        const isAsc = sortOption === `${baseKey}-asc`;
                        const isDesc = sortOption === `${baseKey}-desc`;

                        return (
                          <div
                            key={field}
                            className="flex justify-between items-center px-4 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                          >
                            <span>{field}</span>
                            <div className="flex items-center gap-1">
                              {/* Ascending Button */}
                              <button
                                onClick={() => {
                                  setSortOption(`${baseKey}-asc`);
                                  setActiveSortField(baseKey);
                                  setShowSortDropdown(false);
                                }}
                                className={`w-5 h-5 border rounded cursor-pointer flex items-center justify-center transition-all duration-150
                ${isAsc
                                    ? "border-purple-500"
                                    : "border-gray-300 hover:border-purple-400"
                                  }`}
                                title="Sort ascending"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={isAsc ? "#7B1FA2" : "#B39DDB"}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="transition-all duration-150"
                                >
                                  <path d="M18 15l-6-6-6 6" />
                                </svg>
                              </button>

                              {/* Descending Button */}
                              <button
                                onClick={() => {
                                  setSortOption(`${baseKey}-desc`);
                                  setActiveSortField(baseKey);
                                  setShowSortDropdown(false);
                                }}
                                className={`w-5 h-5 border rounded cursor-pointer flex items-center justify-center transition-all duration-150
                ${isDesc
                                    ? "border-red-500"
                                    : "border-gray-300 hover:border-red-400"
                                  }`}
                                title="Sort descending"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={isDesc ? "#D32F2F" : "#EF9A9A"}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="transition-all duration-150"
                                >
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Filter Dropdown */}
                  {showDropdown && (
                    <div
                      ref={filterDropdownRef}
                      className="absolute right-0 top-[26px] z-50 bg-white rounded shadow-lg py-2 w-[120px]"
                    >
                      {platforms.map((platform) => (
                        <label
                          key={platform}
                          className="flex items-center text-[10px] px-4 py-1.5 text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={platform}
                            checked={platformFilter.includes(platform)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "All") {
                                setPlatformFilter(["All"]);
                              } else {
                                setPlatformFilter((prev) => {
                                  const updated = prev.includes(value)
                                    ? prev.filter((p) => p !== value)
                                    : [
                                      ...prev.filter((p) => p !== "All"),
                                      value,
                                    ];
                                  return updated.length === 0
                                    ? ["All"]
                                    : updated;
                                });
                              }
                            }}
                            className="mr-2"
                          />

                          {platform}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div
                className="relative flex justify-center items-center"
                ref={exportDropdownRef}
              >
                <button
                  title="Export Options"
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                >
                  {/* <svg
                    className="w-4 h-auto "
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg> */}
                  <IoIosArrowDown className="text-lg text-black dark:text-white" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 top-[26px] z-50 bg-white rounded shadow-lg py-2 w-[130px] text-[11px]">
                    <button
                      onClick={() => {
                        handleExport();
                        setShowExportDropdown(false);
                      }}
                      className="flex items-center px-4 py-1.5 text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={handleFullscreen}
                      className="flex items-center px-4 py-1.5 text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Fullscreen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {title !== "Executive Dashboard" &&
            filteredReviews &&
            filteredReviews.length > 0 ? (
            sortedReviews
              .filter(
                (r) =>
                  selectedFilters.length === 0 ||
                  selectedFilters.includes(r.sentiment)
              )

              .map((review, i) => (
                <div
                  key={
                    review.review_id || review.id || review._id || Math.random()
                  }
                  className="flex justify-between items-start py-3 w-full"
                >
                  <div className="flex gap-3 w-full">
                    {/* Reviewer Image or Initial */}
                    {review.reviewerPhotoUrl?.trim() ? (
                      <img
                        src={review.reviewerPhotoUrl}
                        alt="User avatar"
                        className="w-8 h-8 rounded-full object-cover mt-1"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        display: review.reviewerPhotoUrl?.trim()
                          ? "none"
                          : "flex",
                      }}
                      className="w-8 h-8 rounded-full bg-[#F4511E] text-white flex items-center justify-center text-base mt-1 shrink-0 dark:text-white"
                      title={review.user}
                    >
                      {review.user?.charAt(0).toUpperCase() || "?"}
                    </div>

                    {/* Review Content */}
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center w-[150px]">
                        <span
                          className="dark:text-white text-[10px] font-semibold text-gray-800 block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                          title={review.user}
                        >
                          {review.user.length > 15
                            ? `${review.user.slice(0, 15)}...`
                            : review.user}
                        </span>
                        <span className="dark:text-white text-[#4F7A94] font-[400] text-[10px] leading-[13.861px] text-right whitespace-nowrap">
                          {formatReviewDate(review.date)}
                        </span>
                      </div>
                      {formatReviewText(
                        review.text,
                        review.others_part,
                        review.sentiment
                      )}
                    </div>
                  </div>

                  {/* Rating and Platform */}
                  <div className="self-center flex items-center gap-1 pl-3 pt-5 text-sm text-gray-700 mt-[-20px]">
                    <div className="flex flex-col justify-center items-center">
                      <div className="flex gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 13 13"
                          fill="none"
                        >
                          <path
                            d="M5.08738 3.73488C5.61872 2.7817 5.88439 2.30511 6.28158 2.30511C6.67877 2.30511 6.94444 2.7817 7.47578 3.73488L7.61325 3.98147C7.76424 4.25234 7.83973 4.38777 7.95745 4.47713C8.07516 4.56649 8.22176 4.59966 8.51497 4.666L8.7819 4.72639C9.8137 4.95985 10.3296 5.07658 10.4523 5.47127C10.5751 5.86597 10.2234 6.27725 9.51996 7.0998L9.33798 7.3126C9.13809 7.54634 9.03815 7.66321 8.99319 7.8078C8.94823 7.95238 8.96334 8.10832 8.99356 8.42018L9.02107 8.7041C9.12742 9.80156 9.18059 10.3503 8.85925 10.5942C8.53792 10.8382 8.05488 10.6158 7.08881 10.1709L6.83887 10.0559C6.56434 9.92947 6.42708 9.86627 6.28158 9.86627C6.13608 9.86627 5.99882 9.92947 5.72429 10.0559L5.47435 10.1709C4.50828 10.6158 4.02524 10.8382 3.70391 10.5942C3.38257 10.3503 3.43574 9.80156 3.54209 8.7041L3.5696 8.42018C3.59982 8.10832 3.61493 7.95238 3.56997 7.8078C3.52501 7.66321 3.42507 7.54634 3.22518 7.3126L3.0432 7.0998C2.33978 6.27725 1.98808 5.86597 2.11082 5.47127C2.23356 5.07658 2.74946 4.95985 3.78126 4.72639L4.04819 4.666C4.3414 4.59966 4.488 4.56649 4.60571 4.47713C4.72343 4.38777 4.79892 4.25234 4.94991 3.98147L5.08738 3.73488Z"
                            fill="#FFC700"
                          />
                        </svg>
                        <p className="dark:text-white text-[#7B849A] font-['Inter'] text-[12px] font-normal not-italic">
                          {review.rating}
                        </p>
                      </div>
                      <div className="flex gap-2 border-t border-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill={review.sent_rating ? "#C80E00" : "none"}
                          stroke="#C80E00"
                          strokeWidth="1.5"
                          style={{ transform: "scale(0.70)" }} // 👈 perfect resize without distorting viewBox
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09 C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>

                        <p className="text-[#7B849A] font-['Inter'] text-[12px] font-normal not-italic">
                          {review.sent_rating}
                        </p>
                      </div>
                    </div>

                    {/* Platform Icon */}
                    <div className="flex items-center gap-1 ml-2 mr-2 w-4 h-4">
                      {review.review_url ? (
                        <a
                          href={review.review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full"
                        >
                          <img
                            src={`./${review.platform.toLowerCase()}.png`}
                            alt={review.platform}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </a>
                      ) : (
                        <div className="w-full h-full">
                          <img
                            src={`./${review.platform.toLowerCase()}.png`}
                            alt={review.platform}
                            className="w-full h-full object-contain cursor-pointer"
                            title="No URL Available"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          ) : title === "Executive Dashboard" &&
            filteredReviews &&
            filteredReviews.length > 0 ? (
            sortedReviews
              .filter(
                (r) =>
                  selectedFilters.length === 0 ||
                  selectedFilters.includes(r.sentiment)
              )

              .map((review) => (
                <div
                  key={
                    review.review_id || review.id || review._id || Math.random()
                  }
                  className="flex justify-between items-start py-3 w-full"
                >
                  <div className="flex gap-3 w-full">
                    {/* Reviewer Image or Initial */}
                    {review.reviewerPhotoUrl?.trim() ? (
                      <img
                        src={review.reviewerPhotoUrl}
                        alt="User avatar"
                        className="w-8 h-8 rounded-full object-cover mt-1"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        display: review.reviewerPhotoUrl?.trim()
                          ? "none"
                          : "flex",
                      }}
                      className="dark:text-white w-8 h-8 rounded-full bg-[#F4511E] text-white flex items-center justify-center text-base mt-1 shrink-0"
                      title={review.user}
                    >
                      {review.user?.charAt(0).toUpperCase() || "?"}
                    </div>

                    {/* Review Content */}
                    <div className="flex flex-col ">
                      <div className="flex justify-between items-center w-[150px] dark:text-white">
                        <span
                          className="dark:text-white text-[10px] font-semibold text-gray-800 block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                          title={review.user}
                        >
                          {review.user.length > 15
                            ? `${review.user.slice(0, 15)}...`
                            : review.user}
                        </span>
                        <span className="dark:text-white text-[#4F7A94] font-[400] text-[10px] leading-[13.861px] text-right whitespace-nowrap">
                          {formatReviewDate(review.date)}
                        </span>
                      </div>
                      {formatReviewText(
                        review.text,
                        review.others_part,
                        review.sentiment
                      )}
                    </div>
                  </div>

                  {/* Rating and Platform */}
                  <div className="self-center flex items-center gap-1 pl-3 pt-1 text-sm text-gray-700 mt-[-20px]">
                    <div className="flex flex-col justify-center items-center">
                      <div className="flex gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 13 13"
                          fill="none"
                        >
                          <path
                            d="M5.08738 3.73488C5.61872 2.7817 5.88439 2.30511 6.28158 2.30511C6.67877 2.30511 6.94444 2.7817 7.47578 3.73488L7.61325 3.98147C7.76424 4.25234 7.83973 4.38777 7.95745 4.47713C8.07516 4.56649 8.22176 4.59966 8.51497 4.666L8.7819 4.72639C9.8137 4.95985 10.3296 5.07658 10.4523 5.47127C10.5751 5.86597 10.2234 6.27725 9.51996 7.0998L9.33798 7.3126C9.13809 7.54634 9.03815 7.66321 8.99319 7.8078C8.94823 7.95238 8.96334 8.10832 8.99356 8.42018L9.02107 8.7041C9.12742 9.80156 9.18059 10.3503 8.85925 10.5942C8.53792 10.8382 8.05488 10.6158 7.08881 10.1709L6.83887 10.0559C6.56434 9.92947 6.42708 9.86627 6.28158 9.86627C6.13608 9.86627 5.99882 9.92947 5.72429 10.0559L5.47435 10.1709C4.50828 10.6158 4.02524 10.8382 3.70391 10.5942C3.38257 10.3503 3.43574 9.80156 3.54209 8.7041L3.5696 8.42018C3.59982 8.10832 3.61493 7.95238 3.56997 7.8078C3.52501 7.66321 3.42507 7.54634 3.22518 7.3126L3.0432 7.0998C2.33978 6.27725 1.98808 5.86597 2.11082 5.47127C2.23356 5.07658 2.74946 4.95985 3.78126 4.72639L4.04819 4.666C4.3414 4.59966 4.488 4.56649 4.60571 4.47713C4.72343 4.38777 4.79892 4.25234 4.94991 3.98147L5.08738 3.73488Z"
                            fill="#FFC700"
                          />
                        </svg>
                        <p className="dark:text-white text-[#7B849A] font-['Inter'] text-[12px] font-normal not-italic">
                          {review.rating}
                        </p>
                      </div>
                      <div className="flex gap-2 border-t border-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill={review.sent_rating ? "#C80E00" : "none"}
                          stroke="#C80E00"
                          strokeWidth="1.5"
                          style={{ transform: "scale(0.70)" }} // 👈 perfect resize without distorting viewBox
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09 C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>

                        <p className="dark:text-white text-[#7B849A] font-['Inter'] text-[12px] font-normal not-italic">
                          {review.sent_rating}
                        </p>
                      </div>
                    </div>

                    {/* Platform Icon */}
                    <div className="flex items-center gap-1 ml-2 mr-2 w-4 h-4">
                      {review.review_url ? (
                        <a
                          href={review.review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full dark:text-white"
                        >
                          <img
                            src={`./${review.platform.toLowerCase()}.png`}
                            alt={review.platform}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </a>
                      ) : (
                        <div className="w-full h-full">
                          <img
                            src={`./${review.platform.toLowerCase()}.png`}
                            alt={review.platform}
                            className="w-full h-full object-contain cursor-pointer"
                            title="No URL Available"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="w-full min-h-[150px] flex flex-col items-center justify-center text-gray-500">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                className="mb-3 opacity-50"
              >
                <path
                  d="M19 21H5C4.44771 21 4 20.5523 4 20V4C4 3.44771 4.44771 3 5 3H14L20 9V20C20 20.5523 19.5523 21 19 21Z"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 10L15 16"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M15 10L9 16"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>

              <p className="text-sm font-medium text-black dark:text-white">
                No reviews available for this selection.
              </p>
              <p className="text-xs mt-1 text-black dark:text-white">
                Try adjusting the filters or check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ReviewsList;
