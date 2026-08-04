"use client";

/**
 * 牌组工作台 · 拖拽组牌区
 * - 左侧：卡牌池 —— 与卡牌总览页完全一致的筛选栏（CardFilter + 共享筛选逻辑），卡牌等比例缩放可拖拽，点击也可加入
 * - 右侧：牌组区 —— 每种卡只显示一行（数量 + 自定义 攻击/格挡/抽牌），可拖拽排序，可拖到垃圾桶删除
 * - 升级快捷键 S：聚焦某行后按 S（或点击行内 S 按钮）快速切换"升级前 / 升级后"数值编辑
 * - 牌组总卡数 + 类型速览条（攻击/防御/能力/消耗）
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDeckStore } from "@/store/deckStore";
import { characters } from "@/data/characters";
import type { DeckCardEntry } from "@/types/card";
import type { CardInfo } from "@/hooks/useCardCatalog";
import GameCard from "@/components/cards/GameCard";
import CardFilter, { type FilterState } from "@/components/cards/CardFilter";
import { filterCards } from "@/lib/cardFilter";
import {
  defaultBlock,
  defaultDamage,
  defaultDraw,
} from "@/lib/cardUtils";
import { cn } from "@/lib/utils";

const CHARACTER_LINKS = characters.map((c) => ({ slug: c.id, name: c.name }));

/** 仅 攻击/技能/能力 可自定义数值（诅咒/状态/任务除外） */
const CUSTOMIZABLE_TYPES = new Set(["攻击", "技能", "能力"]);

/** 数值输入框：值为空（null）表示沿用卡牌基础值，placeholder 展示默认值 */
function NumInput({
  value,
  onChange,
  placeholder,
  title,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  title?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={0}
      value={text}
      placeholder={placeholder ?? ""}
      title={title}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") onChange(null);
        else {
          const n = Number(t);
          if (!Number.isNaN(n) && n >= 0) onChange(n);
        }
      }}
      onBlur={() => setText(value == null ? "" : String(value))}
      className="h-5 w-11 rounded border border-border bg-background px-1 text-center text-[10px] text-foreground outline-none focus:border-accent"
    />
  );
}

/** 数量输入框（受控、可连续输入，min=1） */
function QtyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={1}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const n = Number(t);
        if (!Number.isNaN(n) && n >= 1) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      className="h-5 w-8 rounded border border-border bg-background text-center text-[11px] outline-none focus:border-accent"
    />
  );
}

/** 卡池中的一张可拖拽卡牌（@container 容器查询实现等比例缩放） */
function PoolCard({
  card,
  showUpgraded,
}: {
  card: CardInfo;
  showUpgraded: boolean;
}) {
  const addCard = useDeckStore((s) => s.addCard);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `pool-${card.id}`,
  });
  const upgraded = showUpgraded && card.upgradedDescription !== undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={`拖拽或点击加入牌组：${card.name}`}
      className={cn(
        "@container transition-all duration-150",
        isDragging
          ? "z-0 scale-95 opacity-30"
          : "hover:z-10 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl"
      )}
    >
      <GameCard
        slug={card.slug}
        name={card.name}
        cost={card.cost}
        type={card.type}
        rarity={card.rarity}
        character={card.character}
        description={card.description}
        upgradedDescription={card.upgradedDescription}
        exhaust={card.exhaust}
        imageNormal={card.imageNormal}
        imageUpgraded={card.imageUpgraded}
        size="xl"
        upgraded={upgraded}
        onClick={() => addCard(String(card.id))}
      />
    </div>
  );
}

/** 牌组中的一行（可排序、可编辑数值、可删除） */
function DeckRow({
  entry,
  info,
}: {
  entry: DeckCardEntry;
  info: CardInfo;
}) {
  const updateQuantity = useDeckStore((s) => s.updateQuantity);
  const updateCardValues = useDeckStore((s) => s.updateCardValues);
  const setUpgraded = useDeckStore((s) => s.setUpgraded);

  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `deck-${entry.cardId}` });

  const canCustomize = CUSTOMIZABLE_TYPES.has(info.type);
  const defaults = {
    damage: defaultDamage(entry, info),
    block: defaultBlock(entry, info),
    draw: defaultDraw(entry, info),
  };

  // 升级快捷键：聚焦该行时按 S 切换 升级前/升级后 编辑（输入框内输入字母不触发）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      setUpgraded(entry.cardId, !entry.upgraded);
    }
  };

  const typeColor =
    info.type === "攻击"
      ? "#e5484d"
      : info.type === "能力"
        ? "#d4a017"
        : "#3b82f6";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      title="按 S 键切换编辑升级前 / 升级后数值"
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-border bg-background px-1.5 py-1 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40",
        isDragging && "opacity-40"
      )}
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-muted hover:text-foreground active:cursor-grabbing"
        title="拖拽排序"
      >
        <span className="text-[10px] leading-none">⠿</span>
      </button>
      <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ backgroundColor: typeColor }} />
      <span className="min-w-0 flex-1 truncate text-xs">
        {info.name}
        {entry.upgraded && <span className="text-green-400">+</span>}
      </span>
      <span className="shrink-0 rounded bg-background-secondary px-1 py-px text-[10px] text-muted-foreground">
        {info.cost ?? "-"}费
      </span>

      {/* 数量编辑 */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => updateQuantity(entry.cardId, entry.count - 1)}
          className="flex h-5 w-5 items-center justify-center rounded bg-background-secondary text-xs hover:bg-border"
        >
          −
        </button>
        <QtyInput
          value={entry.count}
          onChange={(n) => updateQuantity(entry.cardId, n)}
        />
        <button
          type="button"
          onClick={() => updateQuantity(entry.cardId, entry.count + 1)}
          className="flex h-5 w-5 items-center justify-center rounded bg-background-secondary text-xs hover:bg-border"
        >
          +
        </button>
      </div>

      {/* 升级快捷键 S：切换 升级前/升级后 数值编辑 */}
      <button
        type="button"
        onClick={() => setUpgraded(entry.cardId, !entry.upgraded)}
        className={cn(
          "flex h-5 w-7 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors",
          entry.upgraded
            ? "border-green-500/60 bg-green-500/15 text-green-400"
            : "border-border bg-background-secondary text-muted hover:border-green-500/50 hover:text-green-400"
        )}
        title="升级快捷键 S：点击切换编辑升级前 / 升级后数值"
      >
        S
      </button>
      <span
        className={cn(
          "shrink-0 text-[9px]",
          entry.upgraded ? "text-green-400" : "text-muted-foreground"
        )}
      >
        {entry.upgraded ? "升级后" : "基础"}
      </span>

      {/* 自定义数值：按类型限制可编辑项（攻击=攻+抽，技能=防+抽，能力=抽） */}
      {canCustomize && (
        <div className="flex shrink-0 items-center gap-1">
          {info.type === "攻击" && (
            <>
              <span className="text-[9px] text-red-400/80">攻</span>
              <NumInput
                value={entry.upgraded ? entry.damageUp : entry.damage}
                placeholder={defaults.damage == null ? "" : String(defaults.damage)}
                title="自定义攻击值（留空沿用卡牌基础值）"
                onChange={(v) =>
                  updateCardValues(entry.cardId, entry.upgraded ? { damageUp: v } : { damage: v })
                }
              />
            </>
          )}
          {info.type === "技能" && (
            <>
              <span className="text-[9px] text-blue-400/80">防</span>
              <NumInput
                value={entry.upgraded ? entry.blockUp : entry.block}
                placeholder={defaults.block == null ? "" : String(defaults.block)}
                title="自定义格挡值（留空沿用卡牌基础值）"
                onChange={(v) =>
                  updateCardValues(entry.cardId, entry.upgraded ? { blockUp: v } : { block: v })
                }
              />
            </>
          )}
          <span className="text-[9px] text-cyan-400/80">抽</span>
          <NumInput
            value={entry.upgraded ? entry.drawUp : entry.draw}
            placeholder={defaults.draw == null ? "" : String(defaults.draw)}
            title="自定义抽牌数（留空解析卡牌描述）"
            onChange={(v) =>
              updateCardValues(entry.cardId, entry.upgraded ? { drawUp: v } : { draw: v })
            }
          />
        </div>
      )}

      {/* 删除 */}
      <button
        type="button"
        title="移除该卡（也可拖到下方垃圾桶）"
        onClick={() => updateQuantity(entry.cardId, 0)}
        className="shrink-0 px-0.5 text-[11px] text-muted-foreground hover:text-red-400"
      >
        ×
      </button>
    </li>
  );
}

type ActiveDrag =
  | { kind: "pool"; card: CardInfo }
  | { kind: "deck"; card: CardInfo; name: string; count: number };

/**
 * 牌组区放置容器（拖入空白区域即添加）。
 * 必须作为 DndContext 的子组件渲染，useDroppable 才能正确注册到当前 DndContext。
 */
function DeckArea({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "deck-area" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-background-secondary p-3 transition-colors",
        isOver && "border-accent/70 ring-2 ring-accent/30"
      )}
    >
      {children}
    </div>
  );
}

/** 垃圾桶放置区（拖入删除） */
function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "trash-zone" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mt-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-xs transition-all",
        isOver
          ? "border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          : "border-border text-muted-foreground"
      )}
    >
      <span className="text-sm">🗑</span>
      拖拽牌组中的卡牌到此处删除
    </div>
  );
}

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
  const updateQuantity = useDeckStore((s) => s.updateQuantity);
  const reorderCards = useDeckStore((s) => s.reorderCards);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const clearDeck = useDeckStore((s) => s.clearDeck);

  // persist 中间件在客户端水合前 store 为默认值，挂载后再渲染避免水合不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    character: "全部",
    types: [],
    rarities: [],
    costs: [],
    upgraded: "0",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 卡池筛选（与卡牌总览页完全一致的逻辑）
  const filteredPool = useMemo(() => filterCards(catalog, filter), [catalog, filter]);

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

  // 重置为初始牌组（按角色初始牌组卡名匹配卡池，优先当前角色池避免重名卡错配）
  const resetToStarter = () => {
    const starter = characters.find((c) => c.id === selectedCharacter);
    if (!starter) return;
    const entries: DeckCardEntry[] = starter.starterDeck
      .map((s) => {
        const card =
          catalog.find((c) => c.name === s.name && c.character === starter.name) ??
          catalog.find((c) => c.name === s.name);
        return card ? { cardId: String(card.id), count: s.count, upgraded: false } : null;
      })
      .filter((e): e is DeckCardEntry => !!e);
    loadDeck(entries);
  };

  // 拖拽开始：记录被拖卡片用于 DragOverlay
  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("pool-")) {
      const card = catalog.find((c) => String(c.id) === id.slice(5));
      if (card) setActiveDrag({ kind: "pool", card });
    } else if (id.startsWith("deck-")) {
      const hit = deckEntries.find((d) => d.entry.cardId === id.slice(5));
      if (hit)
        setActiveDrag({
          kind: "deck",
          card: hit.info,
          name: hit.info.name,
          count: hit.entry.count,
        });
    }
  };

  // 拖拽结束：池→牌组添加；牌组内排序；牌组→垃圾桶删除
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("pool-")) {
      const cardId = activeId.slice(5);
      if (overId === "deck-area" || overId.startsWith("deck-")) addCard(cardId);
    } else if (activeId.startsWith("deck-")) {
      const cardId = activeId.slice(5);
      if (overId === "trash-zone") updateQuantity(cardId, 0);
      else if (overId.startsWith("deck-")) reorderCards(cardId, overId.slice(5));
    }
  };

  // 垃圾桶 / 牌组容器放置区为独立子组件（TrashZone / DeckArea），在 DndContext 内渲染以正确注册 droppable

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

      {/* 类型速览已移至右侧统计面板（类型分布饼图下方），见 DeckStats */}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* 左侧：卡牌池（筛选栏与总览页一致，卡牌等比例缩放） */}
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">卡牌池</h3>
              <span className="text-[10px] text-muted-foreground">
                共 {catalog.length} 张 · 筛选后 {filteredPool.length} 张
              </span>
            </div>
            <CardFilter state={filter} onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))} />
            {loading ? (
              <p className="py-10 text-center text-xs text-muted-foreground">卡池加载中...</p>
            ) : filteredPool.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">没有匹配的卡牌</p>
            ) : (
              <div className="grid max-h-[540px] grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2 overflow-y-auto p-1">
                {filteredPool.map((card) => (
                  <PoolCard key={card.id} card={card} showUpgraded={filter.upgraded === "1"} />
                ))}
              </div>
            )}
          </div>

          {/* 右侧：牌组区 */}
          <DeckArea>
            <h3 className="mb-2 text-sm font-semibold">牌组（{totalCards} 张）</h3>
            {!mounted || deckEntries.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                {!mounted ? "加载中..." : "从左侧拖拽或点击卡牌加入牌组"}
              </p>
            ) : (
              <SortableContext
                items={deckEntries.map((d) => `deck-${d.entry.cardId}`)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="max-h-[540px] space-y-1 overflow-y-auto pr-1">
                  {deckEntries.map(({ entry, info }) => (
                    <DeckRow key={entry.cardId} entry={entry} info={info} />
                  ))}
                </ul>
              </SortableContext>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              拖拽行可排序；拖到下方垃圾桶删除；聚焦某行后按 S 键快速切换升级前 / 升级后数值编辑。
            </p>
          </DeckArea>
        </div>

        {/* 垃圾桶 */}
        <TrashZone />

        {/* 拖拽视觉反馈 */}
        <DragOverlay dropAnimation={null}>
          {activeDrag?.kind === "pool" && (
            <div className="w-40 rotate-3 cursor-grabbing">
              <GameCard
                slug={activeDrag.card.slug}
                name={activeDrag.card.name}
                cost={activeDrag.card.cost}
                type={activeDrag.card.type}
                rarity={activeDrag.card.rarity}
                character={activeDrag.card.character}
                description={activeDrag.card.description}
                upgradedDescription={activeDrag.card.upgradedDescription}
                exhaust={activeDrag.card.exhaust}
                size="md"
              />
            </div>
          )}
          {activeDrag?.kind === "deck" && (
            <div className="flex items-center gap-2 rounded-md border border-accent/60 bg-background px-2.5 py-1.5 shadow-xl">
              <span className="h-3.5 w-1 rounded-full bg-accent" />
              <span className="text-xs font-semibold">{activeDrag.name}</span>
              <span className="text-[10px] text-muted-foreground">×{activeDrag.count}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
