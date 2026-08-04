"use client";

/**
 * 牌组工作台 · 模块二：拖拽组牌区（页面上半部分）
 * - 左侧：卡牌池（可按关键词筛选，点击卡牌加入牌组；@dnd-kit 拖拽为后续迭代）
 * - 右侧：牌组区（数量 +/- 调整、移除，>30 张黄色提示）
 * - 牌组计数 + 类型速览条（攻击/防御/能力/消耗 四个彩色胶囊实时计数）
 * - 操作按钮：重置为初始牌组 / 清空牌组 / 保存牌组
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDeckStore } from "@/store/deckStore";
import { characters } from "@/data/characters";
import type { DeckCardEntry } from "@/types/card";
import type { CardInfo } from "@/hooks/useCardCatalog";
import GameCard from "@/components/cards/GameCard";
import { cn } from "@/lib/utils";

const CHARACTER_LINKS = characters.map((c) => ({ slug: c.id, name: c.name }));

// 类型速览条配置
const CAPSULES: { key: "attack" | "defense" | "power" | "exhaust"; label: string; color: string }[] = [
  { key: "attack", label: "攻击", color: "#e5484d" },
  { key: "defense", label: "防御", color: "#3b82f6" },
  { key: "power", label: "能力", color: "#d4a017" },
  { key: "exhaust", label: "消耗", color: "#8b5cf6" },
];

export default function DeckWorkbench({
  catalog,
  loading,
}: {
  catalog: CardInfo[];
  loading: boolean;
}) {
  const cards = useDeckStore((s) => s.cards);
  const totalCards = useDeckStore((s) => s.totalCards);
  const selectedCharacter = useDeckStore((s) => s.selectedCharacter);
  const addCard = useDeckStore((s) => s.addCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const updateQuantity = useDeckStore((s) => s.updateQuantity);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const clearDeck = useDeckStore((s) => s.clearDeck);

  // persist 中间件在客户端水合前 store 为默认值，挂载后再渲染避免水合不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState("");

  // 卡池筛选（按卡名关键词）
  const filteredPool = useMemo(
    () =>
      search.trim()
        ? catalog.filter((c) => c.name.includes(search.trim()))
        : catalog,
    [catalog, search]
  );

  // 牌组条目关联卡池信息
  const deckEntries = useMemo(
    () =>
      cards
        .map((entry) => ({
          entry,
          info: catalog.find((c) => String(c.id) === entry.cardId),
        }))
        .filter((e): e is { entry: DeckCardEntry; info: CardInfo } => !!e.info),
    [cards, catalog]
  );

  // 类型速览计数
  const capsuleCounts = useMemo(() => {
    const sum = (pred: (info: CardInfo) => boolean) =>
      deckEntries.reduce((acc, { entry, info }) => (pred(info) ? acc + entry.count : acc), 0);
    return {
      attack: sum((i) => i.type === "攻击"),
      defense: sum((i) => (i.block ?? 0) > 0),
      power: sum((i) => i.type === "能力"),
      exhaust: sum((i) => i.exhaust),
    };
  }, [deckEntries]);

  // 重置为初始牌组（按角色初始牌组卡名匹配卡池）
  const resetToStarter = () => {
    const starter = characters.find((c) => c.id === selectedCharacter);
    if (!starter) return;
    const entries: DeckCardEntry[] = starter.starterDeck
      .map((s) => {
        const card = catalog.find((c) => c.name === s.name);
        return card ? { cardId: String(card.id), count: s.count, upgraded: false } : null;
      })
      .filter((e): e is DeckCardEntry => !!e);
    loadDeck(entries);
  };

  const overLimit = totalCards > 30;

  return (
    <section className="flex flex-col gap-4">
      {/* 角色切换 + 操作按钮 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CHARACTER_LINKS.map((c) => (
            <Link
              key={c.slug}
              href={`/deck?character=${c.slug}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                c.slug === selectedCharacter
                  ? "border-accent bg-accent-soft font-semibold text-accent"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetToStarter}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            重置为初始牌组
          </button>
          <button
            type="button"
            onClick={clearDeck}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
          >
            清空牌组
          </button>
          <a
            href="#deck-save"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#8f73ff]"
          >
            保存牌组
          </a>
        </div>
      </div>

      {/* 类型速览条 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">牌组 {totalCards} 张</span>
        {CAPSULES.map((cap) => (
          <span
            key={cap.key}
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: cap.color }}
          >
            {cap.label} {capsuleCounts[cap.key]}
          </span>
        ))}
        {overLimit && (
          <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
            超过 30 张，建议精简
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* 左侧：卡牌池 */}
        <div className="rounded-lg border border-border bg-background-secondary p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">卡牌池</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索卡牌..."
              className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent"
            />
          </div>
          {loading ? (
            <p className="py-10 text-center text-xs text-muted-foreground">卡池加载中...</p>
          ) : (
            <div className="grid max-h-[560px] grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 overflow-y-auto p-1">
              {filteredPool.map((card) => (
                <GameCard
                  key={card.id}
                  slug={card.slug}
                  name={card.name}
                  cost={card.cost}
                  type={card.type}
                  rarity={card.rarity}
                  character={card.character}
                  description={card.description}
                  upgradedDescription={card.upgradedDescription}
                  exhaust={card.exhaust}
                  size="sm"
                  onClick={() => addCard(String(card.id))}
                />
              ))}
              {filteredPool.length === 0 && (
                <p className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  没有匹配的卡牌
                </p>
              )}
            </div>
          )}
        </div>

        {/* 右侧：牌组区 */}
        <div className="rounded-lg border border-border bg-background-secondary p-3">
          <h3 className="mb-2 text-sm font-semibold">牌组（{totalCards} 张）</h3>
          {!mounted || deckEntries.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {!mounted ? "加载中..." : "点击左侧卡牌加入牌组"}
            </p>
          ) : (
            <ul className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
              {deckEntries.map(({ entry, info }) => (
                <li
                  key={entry.cardId}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1"
                >
                  <span className="w-2 shrink-0 rounded-full" style={{ height: 18, backgroundColor: info.type === "攻击" ? "#e5484d" : info.type === "能力" ? "#d4a017" : "#3b82f6" }} />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {info.name}
                    {entry.upgraded && <span className="text-amber-400">+</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{info.cost ?? "-"}费</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeCard(entry.cardId)}
                      className="flex h-5 w-5 items-center justify-center rounded bg-background-secondary text-xs hover:bg-border"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">{entry.count}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(entry.cardId, entry.count + 1)}
                      className="flex h-5 w-5 items-center justify-center rounded bg-background-secondary text-xs hover:bg-border"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    title="移除该卡"
                    onClick={() => updateQuantity(entry.cardId, 0)}
                    className="shrink-0 text-[10px] text-muted-foreground hover:text-red-400"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
