"use client";

/**
 * ECharts SVG 渲染封装
 * - 统一使用 SVG 渲染模式（约束：统计图表使用 ECharts 的 SVG 渲染模式）
 * - ResizeObserver 自适应容器宽度，option 变更后 notMerge 重绘
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

export default function EChart({
  option,
  className,
}: {
  option: EChartsOption;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // 初始化图表（SVG 渲染）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: "svg" });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // 同步 option（notMerge：替换整份配置，避免旧数据残留）
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} className={className ?? "h-52 w-full"} />;
}
