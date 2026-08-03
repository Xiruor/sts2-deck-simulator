"use client";

/**
 * 卡牌总览网格（Client Component）：
 * - 通过 useSearchParams / useRouter 将筛选状态同步到 URL（?q= &char= &type= &rarity= &cost=）
 * - 渲染筛选面板 CardFilter + 过滤 + 按卡池分组展示 GameCard
 * - 筛选逻辑：角色（单选）与搜索为 AND 关系；类型/稀有度/能耗为 OR 关系，且与角色/搜索为 AND 关系
 */
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GameCard, { type GameCardRarity, type GameCardType } from "./GameCard";
import CardFilter, { type FilterState } from "./CardFilter";

export interface CardGridItem {
  slug: string;
  name: string;
  cost: number | null;
  type: GameCardType;
  rarity: GameCardRarity;
  character: string;
  description: string;
  upgradedDescription?: string;
  exhaust?: boolean;
  imageNormal?: string;
  imageUpgraded?: string;
}

// 分组展示顺序（5 角色 + 特殊卡池）
const GROUP_ORDER = [
  "铁甲战士",
  "静默猎手",
  "故障机器人",
  "亡灵契约师",
  "储君",
  "无色",
  "事件",
  "诅咒",
  "状态",
  "任务",
];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

// 特殊分类映射：无色=卡池、事件=稀有度EVENT、先古之民=稀有度ANCIENT、诅咒/任务=类型
function matchesType(card: CardGridItem, t: string): boolean {
  switch (t) {
    case "攻击":
      return card.type === "攻击";
    case "技能":
      return card.type === "技能";
    case "能力":
      return card.type === "能力";
    case "无色":
      return card.character === "无色";
    case "诅咒":
      return card.type === "诅咒";
    case "事件":
      return card.rarity === "事件";
    case "任务":
      return card.type === "任务";
    case "状态":
      return card.type === "状态";
    case "先古之民":
      return card.rarity === "先古之民";
    default:
      return false;
  }
}

function matchesRarity(card: CardGridItem, r: string): boolean {
  return card.rarity === r;
}

function matchesCost(card: CardGridItem, c: string): boolean {
  if (c === "X") return card.cost === -1;
  if (c === "4+") return card.cost !== null && card.cost >= 4;
  return card.cost === Number(c);
}

export default function CardGrid({ cards }: { cards: CardGridItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 解析筛选状态（URL 是筛选状态的唯一数据源）
  const state: FilterState = useMemo(
    () => ({
      search: searchParams.get("q") ?? "",
      character: searchParams.get("char") ?? "全部",
      types: parseList(searchParams.get("type")),
      rarities: parseList(searchParams.get("rarity")),
      costs: parseList(searchParams.get("cost")),
    }),
    [searchParams]
  );

  // 筛选状态变更 -> 写回 URL（replace 避免堆叠历史记录）
  const handleChange = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...state, ...patch };
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("q", next.search.trim());
      if (next.character !== "全部") params.set("char", next.character);
      if (next.types.length) params.set("type", next.types.join(","));
      if (next.rarities.length) params.set("rarity", next.rarities.join(","));
      if (next.costs.length) params.set("cost", next.costs.join(","));
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [state, router]
  );

  const filtered = useMemo(
    () =>
      cards.filter((card) => {
        // 搜索（卡牌名，AND）
        if (state.search.trim() && !card.name.includes(state.search.trim())) return false;
        // 角色（单选，AND）
        if (state.character !== "全部" && card.character !== state.character) return false;
        // 类型（OR）
        if (state.types.length > 0 && !state.types.some((t) => matchesType(card, t))) return false;
        // 稀有度（OR）
        if (state.rarities.length > 0 && !state.rarities.some((r) => matchesRarity(card, r))) {
          return false;
        }
        // 能耗（OR）
        if (state.costs.length > 0 && !state.costs.some((c) => matchesCost(card, c))) return false;
        return true;
      }),
    [cards, state]
  );

  // 按固定顺序分组
  const groups = useMemo(() => {
    const map = new Map<string, CardGridItem[]>();
    for (const card of filtered) {
      const g = map.get(card.character);
      if (g) g.push(card);
      else map.set(card.character, [card]);
    }
    return GROUP_ORDER.filter((c) => map.has(c)).map((c) => ({
      character: c,
      items: map.get(c)!,
    }));
  }, [filtered]);

  const isFiltering =
    state.search.trim() !== "" ||
    state.character !== "全部" ||
    state.types.length > 0 ||
    state.rarities.length > 0 ||
    state.costs.length > 0;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">卡牌总览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {cards.length} 张卡牌
          {isFiltering && <span className="text-blue-500"> · 筛选后 {filtered.length} 张</span>}
        </p>
      </header>

      <CardFilter state={state} onChange={handleChange} />

      {groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">没有匹配的卡牌</p>
      ) : (
        <div className="space-y-10">
          {groups.map(({ character, items }) => (
            <section key={character}>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                {character}
                <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
              </h2>
              <div className="grid max-h-[500px] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 overflow-y-auto p-1">
                {items.map((card) => (
                  <GameCard key={card.slug} {...card} size="sm" />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
