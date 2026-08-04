/**
 * 卡牌筛选共享逻辑 —— 卡牌总览页（CardGrid）与牌组工作台卡池（DeckWorkbench）共用。
 * 规则与 CardFilter 的筛选状态一一对应：
 * - 搜索（卡牌名）与角色为 AND 关系
 * - 类型 / 稀有度 / 能耗 为 OR 关系，且与角色 / 搜索为 AND 关系
 */
import type { FilterState } from "@/components/cards/CardFilter";

/** 可筛选卡牌的最小结构（CardGridItem 与 CardInfo 均满足） */
export interface FilterableCard {
  name: string;
  type: string;
  rarity: string;
  cost: number | null;
  character: string;
}

/** 特殊分类映射：无色=卡池、事件=稀有度EVENT、先古之民=稀有度ANCIENT、诅咒/任务/状态=类型 */
export function matchesType(card: FilterableCard, t: string): boolean {
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

export function matchesRarity(card: FilterableCard, r: string): boolean {
  return card.rarity === r;
}

export function matchesCost(card: FilterableCard, c: string): boolean {
  if (c === "X") return card.cost === -1;
  if (c === "4+") return card.cost !== null && card.cost >= 4;
  return card.cost === Number(c);
}

export function filterCards<T extends FilterableCard>(
  cards: T[],
  state: FilterState
): T[] {
  return cards.filter((card) => {
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
  });
}
