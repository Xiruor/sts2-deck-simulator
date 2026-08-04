"use client";

/**
 * 牌组工作台 · 统计面板
 * - 费用统计 6 项：总卡数 / 平均费用 / 升级卡数 / 平均费伤比 / 平均费防比 / 循环周期
 * - 三张 SVG 图表：0-3 费分布柱状图 + 类型分布饼图 + 稀有度分布饼图
 * - 自定义攻击/格挡/抽牌值参与统计，全部随牌组 store 实时重绘
 */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { useDeckStore } from "@/store/deckStore";
import type { CardInfo } from "@/hooks/useCardCatalog";
import { effectiveBlock, effectiveDamage, effectiveDraw } from "@/lib/cardUtils";
import EChart from "./EChart";

// 深色主题图表通用样式
const AXIS_LINE = "#2a2744";
const LABEL_COLOR = "#9b96b0";

interface Stats {
  totalCards: number;
  avgCost: number | null;
  upgraded: number;
  attackCount: number;
  defenseCount: number;
  powerCount: number;
  exhaustCount: number;
  /** 平均费伤比（无法估计为 null） */
  avgDmgPerCost: number | null;
  /** 平均费防比（无法估计为 null） */
  avgBlockPerCost: number | null;
  /** 循环周期（空牌组为 null） */
  cyclePeriod: number | null;
  /** 0/1/2/3/4+/X 六档费用分布 */
  costCount: number[];
  typeCount: { 攻击: number; 技能: number; 能力: number; 其他: number };
  rarityCount: { 普通: number; 罕见: number; 稀有: number; 其他: number };
}

export default function DeckStats({ catalog }: { catalog: CardInfo[] }) {
  const cards = useDeckStore((s) => s.cards);
  const totalCards = useDeckStore((s) => s.totalCards);

  const stats = useMemo<Stats>(() => {
    const infoMap = new Map(catalog.map((c) => [String(c.id), c]));

    const cost = { value: 0, count: 0 };
    const attack = { damage: 0, cost: 0, count: 0 };
    const defense = { block: 0, cost: 0, count: 0 };
    let upgraded = 0;
    let powerCount = 0;
    let exhaustCount = 0;
    let totalDraw = 0;

    const costCount = [0, 0, 0, 0, 0, 0]; // 0/1/2/3/4+/X
    const typeCount: Stats["typeCount"] = { 攻击: 0, 技能: 0, 能力: 0, 其他: 0 };
    const rarityCount: Stats["rarityCount"] = { 普通: 0, 罕见: 0, 稀有: 0, 其他: 0 };

    for (const entry of cards) {
      const info = infoMap.get(entry.cardId);
      if (!info) continue;
      const { count } = entry;
      if (entry.upgraded) upgraded += count;

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

      // 费用分布（0/1/2/3/4+/X 六档，X 卡 cost=-1）
      if (info.cost !== null && info.cost === -1) {
        costCount[5] += count;
      } else if (info.cost !== null && info.cost >= 0) {
        costCount[Math.min(info.cost, 4)] += count;
      }
      // 平均费用（不可打出卡不计入）
      if (info.cost !== null && info.cost >= 0) {
        cost.value += info.cost * count;
        cost.count += count;
      }
      // 攻击牌：费伤比 = 总攻击 / 总能耗
      if (info.type === "攻击") {
        attack.count += count;
        const dmg = effectiveDamage(entry, info) ?? 0;
        if (dmg > 0 && info.cost !== null && info.cost > 0) {
          attack.damage += dmg * count;
          attack.cost += info.cost * count;
        }
      }
      // 防御牌（带格挡的技能牌）：费防比 = 总格挡 / 总能耗
      if (info.type === "技能") {
        const blk = effectiveBlock(entry, info) ?? 0;
        if (blk > 0) defense.count += count;
        if (blk > 0 && info.cost !== null && info.cost > 0) {
          defense.block += blk * count;
          defense.cost += info.cost * count;
        }
      }
      if (info.type === "能力") powerCount += count;
      if (info.exhaust) exhaustCount += count;

      // 循环周期：带抽牌的卡累计抽牌总数
      const draw = effectiveDraw(entry, info);
      if (draw > 0) totalDraw += draw * count;
    }

    return {
      totalCards,
      avgCost: cost.count > 0 ? cost.value / cost.count : null,
      upgraded,
      attackCount: attack.count,
      defenseCount: defense.count,
      powerCount,
      exhaustCount,
      avgDmgPerCost: attack.cost > 0 ? attack.damage / attack.cost : null,
      avgBlockPerCost: defense.cost > 0 ? defense.block / defense.cost : null,
      cyclePeriod:
        totalCards > 0 ? Math.max(0, totalCards - totalDraw) / 5 : null,
      costCount,
      typeCount,
      rarityCount,
    };
  }, [cards, catalog, totalCards]);

  // 费用曲线（0/1/2/3/4+/X 六档柱状图）
  const costOption = useMemo<EChartsOption>(
    () => ({
      textStyle: { color: LABEL_COLOR },
      tooltip: { trigger: "axis" },
      title: { text: "费用曲线", textStyle: { fontSize: 13, color: LABEL_COLOR }, left: 10, top: 6 },
      grid: { left: 30, right: 12, top: 36, bottom: 24 },
      xAxis: {
        type: "category",
        data: ["0", "1", "2", "3", "4+", "X"],
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
          barWidth: 20,
          itemStyle: { color: "#7c5cff", borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: "top", fontSize: 10, color: LABEL_COLOR },
          data: stats.costCount,
        },
      ],
    }),
    [stats.costCount]
  );

  // 类型分布饼图（ATTACK / SKILL / POWER 比例）
  const typeOption = useMemo<EChartsOption>(
    () => ({
      textStyle: { color: LABEL_COLOR },
      tooltip: { trigger: "item" },
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

  // 稀有度分布饼图
  const rarityOption = useMemo<EChartsOption>(
    () => ({
      textStyle: { color: LABEL_COLOR },
      tooltip: { trigger: "item" },
      title: { text: "稀有度分布", textStyle: { fontSize: 13, color: LABEL_COLOR }, left: 10, top: 6 },
      series: [
        {
          type: "pie",
          radius: ["0%", "65%"],
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

  const formatRatio = (v: number | null) =>
    v === null ? "无法估计" : v.toFixed(2);

  // 类型速览胶囊（与类型分布饼图一致，其他 = 非攻击/技能/能力的卡）
  const typeCapsules: { label: string; color: string; value: number }[] = [
    { label: "攻击", color: "#e5484d", value: stats.attackCount },
    { label: "防御", color: "#3b82f6", value: stats.defenseCount },
    { label: "能力", color: "#d4a017", value: stats.powerCount },
    { label: "消耗", color: "#8b5cf6", value: stats.exhaustCount },
    { label: "其他", color: "#6b6680", value: stats.typeCount["其他"] },
  ];

  const metricItems: { label: string; value: string }[] = [
    { label: "总卡数", value: String(stats.totalCards) },
    { label: "平均费用", value: stats.avgCost === null ? "—" : stats.avgCost.toFixed(2) },
    { label: "升级卡数", value: String(stats.upgraded) },
    { label: "平均费伤比", value: formatRatio(stats.avgDmgPerCost) },
    { label: "平均费防比", value: formatRatio(stats.avgBlockPerCost) },
    { label: "循环周期", value: stats.cyclePeriod === null ? "—" : stats.cyclePeriod.toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 费用统计 6 项 */}
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <h3 className="mb-2 text-sm font-semibold">费用统计</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metricItems.map((m) => (
            <div
              key={m.label}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-center"
            >
              <div className="truncate text-sm font-bold text-accent" title={m.value}>
                {m.value}
              </div>
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 三张 SVG 图表 */}
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <EChart option={costOption} className="h-52 w-full" />
      </div>
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <EChart option={typeOption} className="h-48 w-full" />
        {/* 类型速览条：总卡数 + 攻击/防御/能力/消耗/其他 */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            牌组 {totalCards} 张
          </span>
          {typeCapsules.map((cap) => (
            <span
              key={cap.label}
              className="rounded-full px-2 py-px text-[10px] font-semibold text-white"
              style={{ backgroundColor: cap.color }}
            >
              {cap.label} {cap.value}
            </span>
          ))}
          {totalCards > 30 && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-px text-[10px] font-semibold text-yellow-400">
              超过 30 张，建议精简
            </span>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <EChart option={rarityOption} className="h-48 w-full" />
      </div>
    </div>
  );
}
