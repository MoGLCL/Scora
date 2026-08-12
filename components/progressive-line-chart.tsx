"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface ProgressiveLineChartProps {
  timeRange?: "2026" | "q2" | "last30";
}

export function ProgressiveLineChart({ timeRange = "2026" }: ProgressiveLineChartProps) {
  // Generate 1000 progressive points for ALL 5 metrics datasets using exact Chart.js sample loop
  const { data1, data2, data3, data4, data5 } = useMemo(() => {
    const d1: { x: number; y: number }[] = [];
    const d2: { x: number; y: number }[] = [];
    const d3: { x: number; y: number }[] = [];
    const d4: { x: number; y: number }[] = [];
    const d5: { x: number; y: number }[] = [];

    let p1 = 100;
    let p2 = 80;
    let p3 = 45;
    let p4 = 60;
    let p5 = 30;

    for (let i = 0; i < 1000; i++) {
      p1 += 5 - Math.random() * 10;
      d1.push({ x: i, y: p1 });

      p2 += 5 - Math.random() * 10;
      d2.push({ x: i, y: p2 });

      p3 += 3 - Math.random() * 6;
      d3.push({ x: i, y: p3 });

      p4 += 4 - Math.random() * 8;
      d4.push({ x: i, y: p4 });

      p5 += 2 - Math.random() * 4;
      d5.push({ x: i, y: p5 });
    }

    return { data1: d1, data2: d2, data3: d3, data4: d4, data5: d5 };
  }, [timeRange]);

  const totalDuration = 10000;
  const delayBetweenPoints = totalDuration / data1.length;

  const previousY = (ctx: any) =>
    ctx.index === 0
      ? ctx.chart.scales.y?.getPixelForValue(100) || 0
      : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1]?.getProps(["y"], true).y;

  const animation: any = {
    x: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: NaN,
      delay(ctx: any) {
        if (ctx.type !== "data" || ctx.xStarted) {
          return 0;
        }
        ctx.xStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
    y: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: previousY,
      delay(ctx: any) {
        if (ctx.type !== "data" || ctx.yStarted) {
          return 0;
        }
        ctx.yStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
  };

  const chartData = {
    datasets: [
      {
        label: "حركة السيولة والتعاقدات (EGP Volume)",
        borderColor: "#056B38",
        borderWidth: 1.5,
        radius: 0,
        data: data1,
      },
      {
        label: "عدد الزوار والمشاهدات اليومية (Daily Visitors)",
        borderColor: "#0284C7",
        borderWidth: 1.5,
        radius: 0,
        data: data2,
      },
      {
        label: "التسجيلات الجديدة للمطورين والعملاء (New Signups)",
        borderColor: "#8B5CF6",
        borderWidth: 1.5,
        radius: 0,
        data: data3,
      },
      {
        label: "تقييمات الذكاء الاصطناعي الآلية (AI Assessments)",
        borderColor: "#D97706",
        borderWidth: 1.5,
        radius: 0,
        data: data4,
      },
      {
        label: "المشاريع المنجزة والمسلمة (Completed Projects)",
        borderColor: "#F43F5E",
        borderWidth: 1.5,
        radius: 0,
        data: data5,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        rtl: true,
        labels: {
          color: "#05291A",
          font: {
            family: "var(--font-body), sans-serif",
            size: 11,
            weight: "bold",
          },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        rtl: true,
        backgroundColor: "#05291A",
        titleColor: "#ffffff",
        bodyColor: "#E8FAF0",
        borderColor: "#D1E3D6",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        type: "linear",
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#526B5E",
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#526B5E",
          font: {
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="relative flex-1 w-full min-h-[280px] md:min-h-[320px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
