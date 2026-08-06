"use client";

/**
 * 战斗模拟器（基于自建战斗引擎 src/lib/battle）
 * - 单玩家 vs 单怪物，无遗物 / 药水 / Buff（按需求简化）
 * - 双方"每回合攻击 / 每回合格挡"可在页面自定义，玩家额外自定义"每回合抽牌 / 每回合能量"
 * - 回合循环：玩家回合开始（回能→抽牌→格挡刷新→自动攻击）→ 出牌 → 结束回合
 *   → 怪物回合（格挡刷新→攻击玩家）→ 下一回合
 * - 卡牌只结算攻击 / 格挡，抽牌与回能通过描述解析（工作台自定义值优先）
 * - 消耗牌进消耗堆，本场战斗不能再打出
 * - 牌组数据从 Zustand store（/deck 工作台）读取
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useDeckStore } from "@/store/deckStore";
import { useCardCatalog, type CardInfo } from "@/hooks/useCardCatalog";
import GameCard from "@/components/cards/GameCard";
import { effectiveBlock, effectiveDamage, effectiveDraw, parseDrawCount, parseEnergyCount } from "@/lib/cardUtils";
import { cn } from "@/lib/utils";
import { battleReducer, createInitialState } from "@/lib/battle/engine";
import type { BattleStatus, EnemyParams, PlayerParams, ResolvedCard } from "@/lib/battle/types";

const PHASE_LABELS: Record<BattleStatus, string> = {
  IDLE: "待开始",
  PLAYER_TURN: "出牌阶段",
  ENEMY_TURN: "怪物行动",
  VICTORY: "战斗胜利",
  DEFEAT: "战斗失败",
};

/** 数值输入框（IDLE 时可编辑，战斗进行中禁用） */
function NumInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        min={0}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-6 w-12 rounded border border-border bg-background px-1 text-center text-xs text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

/** HP 血条 + 数字 */
function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const width = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded bg-background">
        <div className={cn("h-full transition-all", color)} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        HP {hp}/{maxHp}
      </p>
    </div>
  );
}

/** 点击牌堆后查看列表 */
function PileView({
  title,
  pile,
  color,
  catalogMap,
}: {
  title: string;
  pile: string[];
  color: string;
  catalogMap: Map<string, CardInfo>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-background p-2 text-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold"
      >
        <span className="mr-1" style={{ color }}>
          {title}
        </span>
        <span className="rounded-full bg-background-secondary px-1.5 text-[10px] text-muted-foreground">
          {pile.length}
        </span>
      </button>
      {open && (
        <div className="mt-1 max-h-28 overflow-y-auto text-left">
          {pile.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-muted-foreground">空</p>
          ) : (
            pile.map((id, i) => (
              <div key={`${id}-${i}`} className="truncate py-0.5 text-[10px] text-muted">
                {catalogMap.get(id)?.name ?? id}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function BattleArena() {
  const deckCards = useDeckStore((s) => s.cards);
  const selectedCharacter = useDeckStore((s) => s.selectedCharacter);
  const { catalog } = useCardCatalog(selectedCharacter);
  const catalogMap = useMemo(() => new Map(catalog.map((c) => [String(c.id), c])), [catalog]);
  // 牌组条目映射（含工作台自定义攻击/格挡/抽牌数值）
  const entryMap = useMemo(() => new Map(deckCards.map((e) => [e.cardId, e])), [deckCards]);
  // 展开牌组（按数量展开为卡牌 id 列表）
  const expandedDeck = useMemo(() => deckCards.flatMap((e) => Array<string>(e.count).fill(e.cardId)), [deckCards]);

  // 战斗状态（引擎 reducer）
  const [battle, dispatch] = useReducer(battleReducer, undefined, createInitialState);

  // 玩家 / 怪物可自定义参数（IDLE 时可编辑，开始模拟时快照进战斗状态）
  const [playerParams, setPlayerParams] = useState<PlayerParams>({
    maxHp: 80,
    perTurnAttack: 0,
    perTurnBlock: 0,
    perTurnDraw: 5,
    perTurnEnergy: 3,
  });
  const [enemyParams, setEnemyParams] = useState<EnemyParams>({
    maxHp: 42,
    perTurnAttack: 8,
    perTurnBlock: 8,
  });

  const setPlayerParam = (key: keyof PlayerParams, value: number) =>
    setPlayerParams((p) => ({ ...p, [key]: value }));
  const setEnemyParam = (key: keyof EnemyParams, value: number) =>
    setEnemyParams((p) => ({ ...p, [key]: value }));

  // 日志自动滚动到底部
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [battle.log]);

  /** 卡牌生效数值解析：工作台自定义值优先，抽牌/回能从生效描述解析 */
  const resolveCard = useCallback(
    (cardId: string): ResolvedCard | null => {
      const info = catalogMap.get(cardId);
      if (!info) return null;
      const entry = entryMap.get(cardId);
      const desc =
        entry?.upgraded && info.upgradedDescription ? info.upgradedDescription : info.description;
      return {
        name: info.name,
        cost: info.cost ?? -1,
        damage: entry ? effectiveDamage(entry, info) ?? 0 : info.damage ?? 0,
        block: entry ? effectiveBlock(entry, info) ?? 0 : info.block ?? 0,
        draw: entry ? effectiveDraw(entry, info) : parseDrawCount(desc),
        energy: parseEnergyCount(desc),
        exhaust: info.exhaust,
      };
    },
    [catalogMap, entryMap]
  );

  const startBattle = useCallback(() => {
    dispatch({
      type: "START",
      deck: expandedDeck,
      player: playerParams,
      enemy: enemyParams,
      resolve: resolveCard,
    });
  }, [expandedDeck, playerParams, enemyParams, resolveCard]);

  const endTurn = useCallback(() => {
    dispatch({ type: "END_TURN", resolve: resolveCard });
  }, [resolveCard]);

  const playCard = useCallback(
    (cardId: string) => {
      dispatch({ type: "PLAY_CARD", cardId, resolve: resolveCard });
    },
    [resolveCard]
  );

  const canPlay = (info: CardInfo | undefined) =>
    battle.status === "PLAYER_TURN" &&
    !!info &&
    info.cost !== null &&
    info.cost >= 0 &&
    info.cost <= battle.player.energy;

  const configDisabled = battle.status !== "IDLE";
  const inBattle = battle.status !== "IDLE";

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">战斗模拟器</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            使用「组牌工作台」中的牌组进行回合制战斗（简化版：无遗物/药水/Buff）
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-background-secondary px-3 py-1 text-xs text-muted-foreground">
            {inBattle ? `第 ${battle.turn} 回合 · ` : ""}
            {PHASE_LABELS[battle.status]}
          </span>
          {battle.status === "IDLE" ? (
            <button
              type="button"
              onClick={startBattle}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              开始模拟
            </button>
          ) : battle.status === "PLAYER_TURN" ? (
            <button
              type="button"
              onClick={endTurn}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              结束回合
            </button>
          ) : (
            <button
              type="button"
              onClick={startBattle}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              重新模拟
            </button>
          )}
        </div>
      </header>

      {/* 胜利 / 失败提示 */}
      {(battle.status === "VICTORY" || battle.status === "DEFEAT") && (
        <div
          className={cn(
            "mb-4 rounded-lg border p-3 text-center text-sm font-bold",
            battle.status === "VICTORY"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          )}
        >
          {battle.status === "VICTORY" ? "战斗胜利！" : "战斗失败…"} 可调整双方参数后重新模拟。
        </div>
      )}

      {/* 1. 玩家状态区（左）+ 怪物状态区（右） */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {/* 玩家 */}
        <div className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">玩家</h2>
            <div className="flex gap-3 text-xs">
              <span className="font-semibold text-amber-400">能量 {battle.player.energy}</span>
              <span className="font-semibold text-blue-400">格挡 {battle.player.block}</span>
            </div>
          </div>
          <HpBar hp={battle.player.hp} maxHp={battle.player.maxHp} color="bg-emerald-500" />
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2">
            <NumInput label="生命" value={playerParams.maxHp} disabled={configDisabled} onChange={(v) => setPlayerParam("maxHp", v)} />
            <NumInput label="每回合攻击" value={playerParams.perTurnAttack} disabled={configDisabled} onChange={(v) => setPlayerParam("perTurnAttack", v)} />
            <NumInput label="每回合格挡" value={playerParams.perTurnBlock} disabled={configDisabled} onChange={(v) => setPlayerParam("perTurnBlock", v)} />
            <NumInput label="每回合抽牌" value={playerParams.perTurnDraw} disabled={configDisabled} onChange={(v) => setPlayerParam("perTurnDraw", v)} />
            <NumInput label="每回合能量" value={playerParams.perTurnEnergy} disabled={configDisabled} onChange={(v) => setPlayerParam("perTurnEnergy", v)} />
          </div>
        </div>

        {/* 怪物 */}
        <div className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-400">怪物</h2>
            <div className="flex gap-3 text-xs">
              <span className="font-semibold text-red-400">HP {battle.enemy.hp}</span>
              <span className="font-semibold text-blue-400">格挡 {battle.enemy.block}</span>
            </div>
          </div>
          <HpBar hp={battle.enemy.hp} maxHp={battle.enemy.maxHp} color="bg-red-500" />
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2">
            <NumInput label="生命" value={enemyParams.maxHp} disabled={configDisabled} onChange={(v) => setEnemyParam("maxHp", v)} />
            <NumInput label="每回合攻击" value={enemyParams.perTurnAttack} disabled={configDisabled} onChange={(v) => setEnemyParam("perTurnAttack", v)} />
            <NumInput label="每回合格挡" value={enemyParams.perTurnBlock} disabled={configDisabled} onChange={(v) => setEnemyParam("perTurnBlock", v)} />
          </div>
        </div>
      </div>

      {/* 2. 手牌区域（点击出牌） */}
      <div className="mb-4 rounded-lg border border-border bg-background-secondary p-4">
        <h2 className="mb-2 text-sm font-bold">
          手牌（{battle.hand.length}）
          <span className="ml-2 text-xs font-normal text-muted-foreground">点击卡牌打出</span>
        </h2>
        {battle.status === "IDLE" ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            尚未开始战斗。可先在
            <Link href="/deck" className="mx-1 text-accent hover:underline">组牌工作台</Link>
            组好牌组，再回来开始模拟。
          </p>
        ) : battle.hand.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">手牌为空</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
            {battle.hand.map((id, idx) => {
              const info = catalogMap.get(id);
              if (!info) return null;
              const entry = entryMap.get(id);
              const playable = canPlay(info);
              return (
                <div
                  key={`${id}-${idx}`}
                  className={cn(!playable && "pointer-events-none opacity-40 grayscale")}
                  title={playable ? "点击出牌" : battle.status === "PLAYER_TURN" ? "能量不足或不可打出" : "当前不可出牌"}
                >
                  <GameCard
                    slug={info.slug}
                    name={info.name}
                    cost={info.cost}
                    type={info.type}
                    rarity={info.rarity}
                    character={info.character}
                    description={info.description}
                    upgradedDescription={info.upgradedDescription}
                    exhaust={info.exhaust}
                    upgraded={entry?.upgraded}
                    size="sm"
                    onClick={() => playCard(id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 抽牌堆 | 弃牌堆 | 消耗堆 */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <PileView title="抽牌堆" pile={battle.drawPile} color="#7c5cff" catalogMap={catalogMap} />
        <PileView title="弃牌堆" pile={battle.discardPile} color="#38bdf8" catalogMap={catalogMap} />
        <PileView title="消耗堆" pile={battle.exhaustPile} color="#8b5cf6" catalogMap={catalogMap} />
      </div>

      {/* 4. 战斗日志 */}
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <h2 className="mb-2 text-sm font-bold">战斗日志</h2>
        <div
          ref={logRef}
          className="h-40 overflow-y-auto rounded-md border border-border bg-background p-2 text-xs leading-relaxed text-muted"
        >
          {battle.log.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">暂无日志</p>
          ) : (
            battle.log.map((line, i) => (
              <p key={i} className="border-b border-border/40 py-0.5 last:border-0">
                {line}
              </p>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
