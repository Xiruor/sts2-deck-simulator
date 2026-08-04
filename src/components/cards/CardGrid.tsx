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
import { filterCards } from "@/lib/cardFilter";

export interface CardGridItem {
  slug: string;
  name: string;
  cost: number | null;
  type: GameCardType;
  rarity: GameCardRarity;
  character: string;
  description: string;
  upgradedDescription?: string;
  upgradedCost?: number;
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
      upgraded: searchParams.get("up") === "1" ? "1" : "0",
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
      if (next.upgraded === "1") params.set("up", "1");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [state, router]
  );

  const filtered = useMemo(() => filterCards(cards, state), [cards, state]);

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
              {/* 手机2列 / 小平板3列 / 桌面(≥768px)6列；每列宽决定卡牌大小，cqw 随之等比例缩放 */}
              <div className="grid grid-cols-2 gap-x-[2.44%] gap-y-2 sm:grid-cols-3 md:grid-cols-6">
                {items.map((card) => {
                  // 仅可升级卡（有升级描述）进入升级态
                  const upgraded =
                    state.upgraded === "1" && card.upgradedDescription !== undefined;
                  return (
                    <div
                      key={card.slug}
                      className="@container transition-all duration-150 hover:-translate-y-1.5 hover:scale-[1.03] hover:z-10 hover:shadow-2xl"
                    >
                      <GameCard
                        {...card}
                        size="xl"
                        upgraded={upgraded}
                        cost={upgraded ? (card.upgradedCost ?? card.cost) : card.cost}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
