"use client";
import Color from "color";
import { useEffect, useRef, useState } from "react";
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import config from "@/config";
import ChartExportDropdown from "@/components/ExportCart"; // ✅ Export Dropdown

am4core.useTheme(am4themes_animated);

export default function AspectSentimentSankey({
  duration,
  selectedPlatforms,
  selectedBranches,
}) {
  const chartRef = useRef(null);
  const rawDataRef = useRef([]); // Store raw API data for export
  const [filter, setFilter] = useState("negative");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const baseUrl = config.API_URL;
  const baseExportUrl = config.BASE_URL;

  const ASPECTS = ["Food", "Service", "Price", "Ambiance", "Others"];
  const dummyColor = "#C8C8C8";

  const sentimentPalettes = {
    positive: ["#8BC63E", "#C5ED77"],
    negative: ["#E44119", "#F4BEB0"],
    neutral: ["#11A8D7", "#A0DAF0"],
  };

  const nodeColors = {
    negative: "#E44119",
    positive: "#8BC63E",
    neutral: "#11A8D7",
    food: "#F28E2B",
    service: "#4E79A7",
    price: "#E15759",
    ambiance: "#76B7B2",
    others: "#B0B0B0",
  };

  const getColorBySentiment = (sentiment) =>
    sentimentPalettes[sentiment] || ["#ccc", "#eee"];
  const getRootNodeLabel = (sentiment) =>
    sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  const simulateProgress = () => {
    let percent = 0;
    const interval = setInterval(() => {
      percent += Math.floor(Math.random() * 10) + 5;
      setProgress((prev) => Math.min(percent, 95));
    }, 300);
    return interval;
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setProgress(0); // Reset progress
      const interval = simulateProgress(); // ✅ Start simulating progress

      try {
        const response = await fetch(`${baseUrl}api/sankey`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant: localStorage.getItem("restaurant") || "",
            sentiment: filter,
            startDate: duration?.startDate,
            endDate: duration?.endDate,
            platform: selectedPlatforms ? selectedPlatforms : "",
            branch_name: selectedBranches ? selectedBranches : "",
            db_name: localStorage.getItem("db_name") || "",
          }),
        });

        // ✅ Handle invalid JSON (API sometimes returns NaN which is not valid JSON)
        const responseText = await response.text();
        const sanitizedText = responseText.replace(/:\s*NaN/g, ':null');
        const rawData = JSON.parse(sanitizedText);
        rawDataRef.current = rawData; // Store for export

        clearInterval(interval); // ✅ Stop progress simulation
        setProgress(100); // ✅ Full progress on success

        // ✅ Sanitize & aggregate: only keep required Sankey fields and deduplicate from-to pairs
        const aggregatedMap = new Map();
        rawData.forEach((item) => {
          const key = `${item.from}|||${item.to}`;
          if (!aggregatedMap.has(key)) {
            aggregatedMap.set(key, {
              from: item.from,
              to: item.to,
              value: item.value,
              color: item.color,
            });
          }
        });
        const data = Array.from(aggregatedMap.values());

        // 🔍 Debug logs - check browser console
        console.log("📊 Raw API Data:", rawData);
        console.log("📊 Processed Sankey Data:", data);

        const extractAspectName = (label) =>
          label?.split("\n")[0]?.toLowerCase();
        const actualNodes = new Set(data.map((d) => extractAspectName(d.to)));

        const finalData = [...data];

        const formattedRootFromData = data.find((d) =>
          d.from.toLowerCase().includes(filter.toLowerCase())
        )?.from;

        const hasRealAspects = data.some(
          (d) =>
            ASPECTS.some((asp) =>
              d.to.toLowerCase().startsWith(asp.toLowerCase())
            ) && !d.dummy
        );

        const formattedRoot = hasRealAspects
          ? formattedRootFromData || getRootNodeLabel(filter)
          : `${getRootNodeLabel(filter)}\n0 | 00.0%`;

        ASPECTS.forEach((aspect) => {
          if (!actualNodes.has(aspect.toLowerCase())) {
            finalData.push({
              from: formattedRoot,
              to: `${aspect}\n0 | 00.0%`,
              value: 1,
              color: dummyColor,
              dummy: true,
            });
          }
        });

        if (active) setChartData(finalData);
      } catch (err) {
        console.error("Failed to load Sankey data:", err);
        setChartData([]);
      } finally {
        clearInterval(interval); // ✅ Also safe to clear here
        if (active) {
          setLoading(false);
          setProgress(100); // ✅ Ensure progress ends
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [filter, duration, selectedPlatforms, selectedBranches]);

  useEffect(() => {
    if (chartRef.current) chartRef.current.dispose();
    if (!chartData.length) return;

    const chart = am4core.create("chartdiv", am4charts.SankeyDiagram);
    chartRef.current = chart;
    chart.logo.disabled = true;
    // chart.padding(10, 100, 60, 60);
    const onlyDummy = chartData.every((d) => d.dummy);
    chart.padding(
      onlyDummy ? 10 : 20,
      onlyDummy ? 130 : 280,
      onlyDummy ? 30 : 50,
      10
    );
    // chart.nodeWidth = 30;
    // chart.nodePadding = 35;
    // chart.minNodeSize = 0;
    // chart.minNodePadding = 10;

    chart.nodeWidth = 30;
    chart.nodePadding = 25;
    chart.nodes.template.width = 10;

    chart.dataFields.fromName = "from";
    chart.dataFields.toName = "to";
    chart.dataFields.value = "value";
    chart.data = chartData;

    const gradientColors = getColorBySentiment(filter);
    const sharedGradient = new am4core.LinearGradient();
    sharedGradient.addColor(am4core.color(gradientColors[0]));
    sharedGradient.addColor(am4core.color(gradientColors[1]));
    sharedGradient.rotation = 0;

    const linkTemplate = chart.links.template;
    linkTemplate.colorMode = "solid";
    linkTemplate.fillOpacity = 1;
    // linkTemplate.strokeWidth = 0;
    // linkTemplate.tension = 0.8;

    linkTemplate.adapter.add("fill", (fill, target) => {
      return target.dataItem?.dataContext?.dummy
        ? am4core.color(dummyColor)
        : sharedGradient;
    });

    linkTemplate.tooltipText = "";

    linkTemplate.adapter.add("fillOpacity", (opacity, target) => {
      return target.dataItem?.dataContext?.dummy ? 0.4 : 1;
    });

    const nodeTemplate = chart.nodes.template;
    // nodeTemplate.nameLabel.label.text = "{name}";
    // nodeTemplate.nameLabel.label.fontSize = 12;
    // nodeTemplate.nameLabel.label.fill = am4core.color("#333");
    // nodeTemplate.nameLabel.label.maxWidth = 140;
    // nodeTemplate.nameLabel.label.wrap = true;
    // nodeTemplate.nameLabel.label.lineHeight = 1.2;
    nodeTemplate.nameLabel.label.text = "{name}";
    nodeTemplate.nameLabel.label.fontSize = 12;
    nodeTemplate.nameLabel.label.fill = am4core.color(isDarkMode ? "#fff" : "#333");
    nodeTemplate.nameLabel.label.maxWidth = undefined;
    nodeTemplate.nameLabel.label.wrap = false;
    nodeTemplate.nameLabel.label.truncate = false;
    nodeTemplate.nameLabel.label.lineHeight = 1.2;

    nodeTemplate.tooltipText = "{name}";
    nodeTemplate.strokeWidth = 2;

    chart.nodes.template.adapter.add("fill", (fill, target) => {
      const name = target.dataItem?.name?.toLowerCase() || "";
      const baseName = name.split("\n")[0];
      const isRoot = chartData.some((d) => d.from === target.dataItem?.name);
      const isDummy = chartData.some(
        (d) =>
          (d.to === target.dataItem?.name ||
            d.from === target.dataItem?.name) &&
          d.dummy
      );
      const colorKey = isRoot ? filter : baseName;
      return isDummy
        ? am4core.color("#E0E0E0")
        : am4core.color(nodeColors[colorKey] || "#CCCCCC");
    });

    chart.nodes.template.adapter.add("stroke", (_, target) => target.fill);
    chart.nodes.template.adapter.add("height", (height, target) => {
      const name = target.dataItem?.name?.toLowerCase();
      const data = chartData.find(
        (d) => d.to?.toLowerCase() === name && d.dummy
      );
      return data ? 8 : height;
    });

    return () => chart.dispose();
  }, [chartData, filter, isDarkMode]);

  const selectFilter = (type) => {
    if (!loading && filter !== type) setFilter(type);
  };

  return (
    <article className="flex flex-col justify-center self-stretch py-px my-auto">
      <div className="overflow-hidden rounded-xl bg-white/15 shadow-[0px_1px_7px_0px_rgba(0,0,0,0.13)] h-[60vh]">
        <div className="flex flex-col px-2.5 py-3 w-full rounded-xl">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-[10px] font-semibold dark:text-white  text-gray-700">
              REVIEW UNPACKING <br />{" "}
              <span className="font-medium text-[12px]">
                View in Fullscreen
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {/* Filter Icons */}
              <div className="flex items-center gap-1.5">
                {["positive", "negative", "neutral"].map((type, idx) => {
                  const isSelected = filter === type;

                  const selectedColors = {
                    positive: "bg-[#84CC16]",
                    negative: "bg-[#F57F62]",
                    neutral: "bg-[#11A8D7]",
                  };

                  const defaultGray = "bg-gray-300";

                  const icons = [
                    <path
                      d="M8.36 5.89H5.89V8.36H5.07V5.89H2.59V5.07H5.07V2.59H5.89V5.07H8.36V5.89Z"
                      fill="white"
                    />,
                    <path d="M6.86 5.04H2.05V4.35H6.86V5.04Z" fill="white" />,
                    <path
                      d="M4.7 3.03V9.13H5.93V6.08L7.15 9.13H8.37V3.03H7.15V6.08L5.93 3.03H4.7Z"
                      fill="white"
                    />,
                  ];

                  const sizes = [11, 9, 14];

                  return (
                    <div
                      key={type}
                      className={`flex justify-center items-center w-4 h-4 rounded cursor-pointer z-[10] ${isSelected ? selectedColors[type] : defaultGray
                        } ${loading ? "pointer-events-none opacity-50" : ""}`}
                      onClick={() => selectFilter(type)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={sizes[idx]}
                        height={sizes[idx]}
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        {icons[idx]}
                      </svg>
                    </div>
                  );
                })}
              </div>

              {/* Export Button */}
              {/* <ChartExportDropdown chartRef={chartRef} /> */}
              <ChartExportDropdown
                chartRef={chartRef}
                dataRef={rawDataRef}
                duration={duration}
                platforms={selectedPlatforms}
                branches={selectedBranches}
                aspects={[]}
                exportName="Review_Unpacking"
                baseUrl={baseExportUrl}
              />
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div
          key={filter + (loading ? "-loading" : "")}
          id="chartdiv"
          className="w-full h-[56vh] relative"
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-white/15 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500 mb-2" />
              <span className="text-sm font-medium dark:text-gray-300 text-gray-700">
                {progress}%
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
