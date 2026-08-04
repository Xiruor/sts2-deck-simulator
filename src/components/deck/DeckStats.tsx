"use client";

/**
 * 牌组工作台 · 模块三：统计面板（页面右侧中段）
 * - 概览指标条：总卡数 / 平均费用 / 平均费伤比 / 平均费防比 / 升级卡数
 * - 类型分布饼图 + 稀有度分布环形图 + 能量费用曲线柱状图（ECharts）
 * - 全部随牌组 store 变动实时重绘
 */
import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useDeckStore } from "@/store/deckStore";
import type { CardInfo } from "@/hooks/useCardCatalog";

// 深色主题图表通用样式
const AXIS_LINE = "#2a2744";
const LABEL_COLOR = "#9b96b0";

function BaseOption(patch: EChartsOption): EChartsOption {
  return {
    textStyle: { color: LABEL_COLOR },
    tooltip: { trigger: "item" },
    ...patch,
  };
}

export default function DeckStats({ catalog }: { catalog: CardInfo[] }) {
  const cards = useDeckStore((s) => s.cards);
  const totalCards = useDeckStore((s) => s.totalCards);

  // 统计卡片映射：cardId -> 数量/升级态
  const stats = useMemo(() => {
    const infoMap = new Map(catalog.map((c) => [String(c.id), c]));
    const totalCost = { value: 0, count: 0 };
    const totalDamage = { value: 0, count: 0 };
    const totalBlock = { value: 0, count: 0 };
    let upgraded = 0;

    const typeCount: Record<string, number> = { 攻击: 0, 技能: 0, 能力: 0, 其他: 0 };
    const rarityCount: Record<string, number> = { 普通: 0, 罕见: 0, 稀有: 0, 其他: 0 };
    const costCount: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0, X: 0, 无: 0 };

    for (const { cardId, count, upgraded: isUpgraded } of cards) {
      const info = infoMap.get(cardId);
      if (!info) continue;
      if (isUpgraded) upgraded += count;

      // 类型分布
      if (info.type === "攻击" || info.type === "技能" || info.type === "能力") {
        typeCount[info.type] += count;
      } else {
        typeCount["其他"] += count;
      }

      // 稀有度分布（基础并入普通，其余归其他）
      if (info.rarity === "普通" || info.rarity === "基础") rarityCount["普通"] += count;
      else if (info.rarity === "罕见") rarityCount["罕见"] += count;
      else if (info.rarity === "稀有") rarityCount["稀有"] += count;
      else rarityCount["其他"] += count;

      // 费用分布
      if (info.cost === null) costCount["无"] += count;
      else if (info.cost === -1) costCount["X"] += count;
      else if (info.cost >= 4) costCount["4+"] += count;
      else costCount[String(info.cost)] += count;

      // 平均费用（不可打出卡不计入）
      if (info.cost !== null && info.cost >= 0) {
        totalCost.value += info.cost * count;
        totalCost.count += count;
      }
      // 费伤比：伤害卡的总伤害 / 总费用
      if (info.damage && info.damage > 0 && info.cost !== null && info.cost > 0) {
        totalDamage.value += info.damage * count;
        totalDamage.count += info.cost * count;
      }
      // 费防比：格挡卡的总格挡 / 总费用
      if (info.block && info.block > 0 && info.cost !== null && info.cost > 0) {
        totalBlock.value += info.block * count;
        totalBlock.count += info.cost * count;
      }
    }

    const avgCost = totalCost.count > 0 ? totalCost.value / totalCost.count : 0;
    const avgDmgPerCost = totalDamage.count > 0 ? totalDamage.value / totalDamage.count : 0;
    const avgBlockPerCost = totalBlock.count > 0 ? totalBlock.value / totalBlock.count : 0;

    return {
      totalCards,
      avgCost,
      avgDmgPerCost,
      avgBlockPerCost,
      upgraded,
      typeCount,
      rarityCount,
      costCount,
    };
  }, [cards, catalog, totalCards]);

  // 类型分布饼图
  const typeOption = useMemo<EChartsOption>(
    () =>
      BaseOption({
        title: { text: "类型分布", textStyle: { fontSize: 13, color: LABEL_COLOR }, left: 10, top: 6 },
        series: [
          {
            type: "pie",
            radius: ["0%", "65%"],
            center: ["50%", "58%"],
            label: { fontSize: 10, color: LABEL_COLOR },
            itemStyle: { borderColor: "#0f0e1a", borderWidth: 2 },
            data: [
              { name: "攻击", value: stats.typeCount["攻击"], itemStyle: { color: "#e5484d" } },
              { name: "技能", value: stats.typeCount["技能"], itemStyle: { color: "#3b82f6" } },
              { name: "能力", value: stats.typeCount["能力"], itemStyle: { color: "#d4a017" } },
              { name: "其他", value: stats.typeCount["其他"], itemStyle: { color: "#6b6680" } },
            ],
          },
        ],
      }),
    [stats.typeCount]
  );

  // 稀有度分布环形图
  const rarityOption = useMemo<EChartsOption>(
    () =>
      BaseOption({
        title: { text: "稀有度分布", textStyle: { fontSize: 13, color: LABEL_COLOR }, left: 10, top: 6 },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            center: ["50%", "58%"],
            label: { fontSize: 10, color: LABEL_COLOR },
            itemStyle: { borderColor: "#0f0e1a", borderWidth: 2 },
            data: [
              { name: "普通", value: stats.rarityCount["普通"], itemStyle: { color: "#9ca3af" } },
              { name: "罕见", value: stats.rarityCount["罕见"], itemStyle: { color: "#38bdf8" } },
              { name: "稀有", value: stats.rarityCount["稀有"], itemStyle: { color: "#fbbf24" } },
              { name: "其他", value: stats.rarityCount["其他"], itemStyle: { color: "#8b5cf6" } },
            ],
          },
        ],
      }),
    [stats.rarityCount]
  );

  // 能量费用曲线柱状图
  const costOption = useMemo<EChartsOption>(
    () =>
      BaseOption({
        title: { text: "费用分布", textStyle: { fontSize: 13, color: LABEL_COLOR }, left: 10, top: 6 },
        grid: { left: 30, right: 10, top: 36, bottom: 24 },
        xAxis: {
          type: "category",
          data: ["0", "1", "2", "3", "4+", "X", "无"],
          axisLine: { lineStyle: { color: AXIS_LINE } },
          axisLabel: { fontSize: 10, color: LABEL_COLOR },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          axisLine: { lineStyle: { color: AXIS_LINE } },
          axisLabel: { fontSize: 10, color: LABEL_COLOR },
          splitLine: { lineStyle: { color: AXIS_LINE } },
        },
        series: [
          {
            type: "bar",
            barWidth: 14,
            itemStyle: { color: "#7c5cff", borderRadius: [3, 3, 0, 0] },
            data: ["0", "1", "2", "3", "4+", "X", "无"].map((k) => stats.costCount[k] ?? 0),
          },
        ],
      }),
    [stats.costCount]
  );

  const metricItems = [
    { label: "总卡数", value: stats.totalCards },
    { label: "平均费用", value: stats.avgCost.toFixed(2) },
    { label: "平均费伤比", value: stats.avgDmgPerCost.toFixed(2) },
    { label: "平均费防比", value: stats.avgBlockPerCost.toFixed(2) },
    { label: "升级卡数", value: stats.upgraded },
  ];

  return (
    <section className="flex flex-col gap-4">
      {/* 概览指标条 */}
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <h3 className="mb-2 text-sm font-semibold">概览指标</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
          {metricItems.map((m) => (
            <div key={m.label} className="rounded-md border border-border bg-background px-2 py-1.5 text-center">
              <div className="text-base font-bold text-accent">{m.value}</div>
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 三张图表 */}
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <ReactECharts option={typeOption} style={{ height: 200 }} notMerge />
      </div>
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <ReactECharts option={rarityOption} style={{ height: 200 }} notMerge />
      </div>
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <ReactECharts option={costOption} style={{ height: 220 }} notMerge />
      </div>
    </section>
  );
}
