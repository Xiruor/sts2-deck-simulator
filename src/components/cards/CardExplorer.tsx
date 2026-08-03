"use client";

/**
 * 卡牌总览页 —— 顶部筛选栏 + 分组渲染。
 * 筛选逻辑：
 * - 角色（单选）与 搜索 为 AND 关系
 * - 类型 / 稀有度 / 能耗 之间为 OR 关系（组内多选），与角色/搜索为 AND
 * - 特殊分类映射：无色=卡池、事件=稀有度EVENT、先古之民=稀有度ANCIENT、诅咒/任务=类型
 */
import { useMemo, useState } from "react";
import CardGrid, { type CardGridItem } from "./CardGrid";
import { cn } from "@/lib/utils";

// 角色（单选）：全部 + 5 个角色
const CHARACTER_OPTIONS = ["全部", "铁甲战士", "静默猎手", "故障机器人", "亡灵契约师", "储君"];

// 类型（多选）
const TYPE_OPTIONS = ["攻击", "技能", "能力", "无色", "诅咒", "事件", "任务", "状态", "先古之民"];

// 稀有度（多选）
const RARITY_OPTIONS = ["基础", "普通", "罕见", "稀有"];

// 能耗（多选）：0/1/2/3/4+（>=4）/X（-1）
const COST_OPTIONS = ["0", "1", "2", "3", "4+", "X"];

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

// 可切换的筛选 chip
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs transition-colors",
        active
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-border bg-background text-muted-foreground hover:border-blue-400 hover:text-blue-500"
      )}
    >
      {children}
    </button>
  );
}

// 一组多选筛选（空数组 = 全部）
function MultiSelectGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <Chip active={selected.length === 0} onClick={() => onToggle("__clear__")}>
        全部
      </Chip>
      {options.map((o) => (
        <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

export default function CardExplorer({ cards }: { cards: CardGridItem[] }) {
  const [search, setSearch] = useState("");
  const [character, setCharacter] = useState("全部");
  const [types, setTypes] = useState<string[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);
  const [costs, setCosts] = useState<string[]>([]);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    if (value === "__clear__") {
      setter([]);
      return;
    }
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const filtered = useMemo(
    () =>
      cards.filter((card) => {
        // 搜索（卡牌名）
        if (search.trim() && !card.name.includes(search.trim())) return false;
        // 角色（单选，AND）
        if (character !== "全部" && card.character !== character) return false;
        // 类型（OR）
        if (types.length > 0 && !types.some((t) => matchesType(card, t))) return false;
        // 稀有度（OR）
        if (rarities.length > 0 && !rarities.some((r) => matchesRarity(card, r))) return false;
        // 能耗（OR）
        if (costs.length > 0 && !costs.some((c) => matchesCost(card, c))) return false;
        return true;
      }),
    [cards, search, character, types, rarities, costs]
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
    search.trim() !== "" ||
    character !== "全部" ||
    types.length > 0 ||
    rarities.length > 0 ||
    costs.length > 0;

  const resetAll = () => {
    setSearch("");
    setCharacter("全部");
    setTypes([]);
    setRarities([]);
    setCosts([]);
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">卡牌总览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {cards.length} 张卡牌
          {isFiltering && (
            <span className="text-blue-500">
              {" "}
              · 筛选后 {filtered.length} 张
            </span>
          )}
        </p>
      </header>

      {/* 筛选栏 */}
      <div className="mb-8 space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索卡牌名称..."
            className="h-7 w-44 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-blue-500"
          />
          {/* 角色（单选） */}
          <div className="flex items-center gap-1.5">
            <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">角色</span>
            <select
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="h-7 rounded-md border border-border bg-background px-1 text-xs outline-none focus:border-blue-500"
            >
              {CHARACTER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {/* 重置 */}
          {isFiltering && (
            <button
              type="button"
              onClick={resetAll}
              className="ml-auto text-xs text-blue-500 hover:underline"
            >
              重置筛选
            </button>
          )}
        </div>

        <MultiSelectGroup
          label="类型"
          options={TYPE_OPTIONS}
          selected={types}
          onToggle={(v) => toggle(types, v, setTypes)}
        />
        <MultiSelectGroup
          label="稀有度"
          options={RARITY_OPTIONS}
          selected={rarities}
          onToggle={(v) => toggle(rarities, v, setRarities)}
        />
        <MultiSelectGroup
          label="能耗"
          options={COST_OPTIONS}
          selected={costs}
          onToggle={(v) => toggle(costs, v, setCosts)}
        />
      </div>

      {/* 分组展示 */}
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
              <CardGrid cards={items} size="sm" />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
