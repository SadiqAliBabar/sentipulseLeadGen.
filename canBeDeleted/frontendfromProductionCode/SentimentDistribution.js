'use client';
import React, { useLayoutEffect, useRef, useEffect, useState } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import axios from 'axios';
import config from '@/config';
import ChartExportDropdown from '@/components/ExportCart';

am4core.useTheme(am4themes_animated);

const SentimentChart = ({ duration, selectedPlatforms, selectedBranches }) => {
  const chartRef = useRef(null);
  const baseUrl = config.BASE_URL;

  const resolveFilterValue = (val) => {
    if (!val) return "";
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      if (val.includes("All") || val.includes("all")) return "";
      return val[0] || "";
    }
    if (typeof val === "string") return val === "All" ? "" : val;
    return "";
  };

  useLayoutEffect(() => {
    const chart = am4core.create('sentimentChartDiv', am4charts.PieChart);
    chartRef.current = chart;

    chart.logo.disabled = true;
    chart.innerRadius = am4core.percent(60);
    chart.radius = am4core.percent(100);
    chart.paddingTop = 10;

    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = 'value';
    pieSeries.dataFields.category = 'sentiment';
    pieSeries.slices.template.propertyFields.fill = 'color';

    // ✅ Tooltip showing: Positive: 12 reviews | 63.2%
    pieSeries.slices.template.adapter.add('tooltipText', (text, target) => {
      const data = target?.dataItem?.dataContext;
      const count = data?.count ?? 0;
      const percent = (data?.value ?? 0).toFixed(1);
      return `[bold]${data?.sentiment}[/]: ${count} ${count !== 1 ? '' : ''} | ${percent}%`;
    });

    pieSeries.slices.template.stroke = am4core.color('#fff');
    pieSeries.slices.template.strokeWidth = 0;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template.cornerRadius = 0;
    pieSeries.slices.template.innerCornerRadius = 0;
    pieSeries.slices.template.arc = 240;
    pieSeries.slices.template.zIndex = 1;

    pieSeries.labels.template.disabled = true;
    pieSeries.ticks.template.disabled = true;
    pieSeries.labels.template.fontSize = 11;
    pieSeries.labels.template.fill = am4core.color('#333');
    pieSeries.labels.template.fontFamily = 'Roboto';
    pieSeries.labels.template.wrap = true;
    pieSeries.labels.template.text = '{value.percent.formatNumber("#.0")}%';

    chart.paddingBottom = 11; // ✅ Must allow space for legend

    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.legend.contentAlign = 'center';

    chart.legend.marginTop = 10;
    chart.legend.paddingTop = 10;

    chart.legend.itemContainers.template.layout = 'horizontal';
    chart.legend.itemContainers.template.paddingTop = 5;

    chart.legend.labels.template.fill = am4core.color('#8E8E9B');
    chart.legend.labels.template.fontFamily = 'Roboto';
    chart.legend.labels.template.fontSize = 10;
    chart.legend.labels.template.fontWeight = '500';
    chart.legend.labels.template.paddingTop = 2;

    chart.legend.valueLabels.template.disabled = true;
    chart.legend.markers.template.width = 10;
    chart.legend.markers.template.height = 10;

    chart.legend.maxWidth = 9999;
    chart.legend.wrap = false;


    return () => {
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.post(
          `${baseUrl}reviews/overall-sentiments`,
          Object.assign({}, { ...duration }, {
            platform: resolveFilterValue(selectedPlatforms),
            branch_name: resolveFilterValue(selectedBranches),
          }),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const sentiments = response.data?.data?.overall_sentiments || {};

        const total =
          (sentiments.positive?.count || 0) +
          (sentiments.neutral?.count || 0) +
          (sentiments.negative?.count || 0) || 1;

        const getData = (label, count, color, zIndex) => {
          const percent = parseFloat(((count / total) * 100).toFixed(1));
          return {
            sentiment: label,
            value: percent,
            count,
            color,
            zIndex,
          };
        };

        const formattedData = [
          getData('Positive', sentiments.positive?.count || 0, '#8BC63E', 3),
          getData('Neutral', sentiments.neutral?.count || 0, '#11A8D7', 2),
          getData('Negative', sentiments.negative?.count || 0, '#F57F62', 1),
        ];

        if (chartRef.current) {
          chartRef.current.data = formattedData;
        }
      } catch (error) {
        console.error('Failed to fetch sentiment data:', error);
      }
    };

    fetchData();
  }, [duration, selectedPlatforms, selectedBranches]);

  return (
    <article className="flex flex-col justify-center self-stretch py-px my-auto">
      <div className="overflow-hidden rounded-xl bg-white/15 shadow-[0px_1px_7px_0px_rgba(0,0,0,0.13)] h-[35vh]">
        <div className="flex flex-col px-2.5 py-3 w-full rounded-xl bg-opacity-10">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-[10px] font-semibold dark:text-white text-gray-700">OVERALL</h2>
            <ChartExportDropdown
              chartRef={chartRef}
              duration={duration}
              platforms={selectedPlatforms}
              branches={selectedBranches}
              aspects={[]}
              exportName="Overall_Sentiment"
              baseUrl={baseUrl}
            />
          </div>
          <div id="sentimentChartDiv" className="w-full h-[27vh]" />
        </div>
      </div>
    </article>
  );
};

export default SentimentChart;
