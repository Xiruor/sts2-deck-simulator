"use client";

/**
 * 战斗模拟器（Task 5，内嵌遗物系统）
 * - 状态机：IDLE → DRAW_PHASE → PLAY_PHASE → ENEMY_PHASE → END_TURN（回合循环）
 * - 伤害计算：基础伤害 + 力量，目标易伤 ×1.5，格挡抵消
 * - Buff/Debuff：力量 / 敏捷 / 易伤 / 脆弱 / 虚弱，回合结束衰减
 * - 遗物：展示当前角色初始遗物 + 触发日志（完整遗物系统后续迭代）
 * - 牌组数据从 Zustand store（/deck 工作台）读取，通过 URL 角色拉取卡池
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDeckStore } from "@/store/deckStore";
import { characters } from "@/data/characters";
import { useCardCatalog, type CardInfo } from "@/hooks/useCardCatalog";
import GameCard from "@/components/cards/GameCard";
import { shuffle, cn } from "@/lib/utils";

type Phase = "IDLE" | "DRAW_PHASE" | "PLAY_PHASE" | "ENEMY_PHASE" | "END_TURN";

interface Buffs {
  strength: number;
  dexterity: number;
  vulnerable: number;
  frail: number;
  weak: number;
}

const NO_BUFFS: Buffs = { strength: 0, dexterity: 0, vulnerable: 0, frail: 0, weak: 0 };

const PHASE_LABELS: Record<Phase, string> = {
  IDLE: "待开始",
  DRAW_PHASE: "抽牌阶段",
  PLAY_PHASE: "出牌阶段",
  ENEMY_PHASE: "敌人回合",
  END_TURN: "回合结束",
};

function BuffChips({ buffs, show }: { buffs: Buffs; show: ("strength" | "dexterity" | "vulnerable" | "frail" | "weak")[] }) {
  const labels: Record<string, [string, string]> = {
    strength: ["力量", "#e5484d"],
    dexterity: ["敏捷", "#3b82f6"],
    vulnerable: ["易伤", "#f59e0b"],
    frail: ["脆弱", "#8b5cf6"],
    weak: ["虚弱", "#64748b"],
  };
  return (
    <div className="flex flex-wrap gap-1">
      {show.map((k) => {
        if (buffs[k] <= 0) return null;
        const [label, color] = labels[k];
        return (
          <span
            key={k}
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {label} {buffs[k]}
          </span>
        );
      })}
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
            pile.map((id) => (
              <div key={`${id}-${Math.random()}`} className="truncate py-0.5 text-[10px] text-muted">
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

  const char = characters.find((c) => c.id === selectedCharacter);

  const [phase, setPhase] = useState<Phase>("IDLE");
  const [turn, setTurn] = useState(1);
  const [playerHp, setPlayerHp] = useState(char?.hp ?? 80);
  const [playerEnergy, setPlayerEnergy] = useState(3);
  const [playerBlock, setPlayerBlock] = useState(0);
  const [playerBuffs, setPlayerBuffs] = useState<Buffs>(NO_BUFFS);
  const [monster, setMonster] = useState({ hp: 42, maxHp: 42, attack: 10, block: 0 });
  const [monsterBuffs, setMonsterBuffs] = useState<Buffs>(NO_BUFFS);
  const [drawPile, setDrawPile] = useState<string[]>([]);
  const [hand, setHand] = useState<string[]>([]);
  const [discardPile, setDiscardPile] = useState<string[]>([]);
  const [exhaustPile, setExhaustPile] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // 日志自动滚动到底部
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev, line]);
  }, []);

  const resetPlayer = useCallback(() => {
    setPlayerHp(char?.hp ?? 80);
    setPlayerEnergy(3);
    setPlayerBlock(0);
    setPlayerBuffs(NO_BUFFS);
    setMonsterBuffs(NO_BUFFS);
    setTurn(1);
  }, [char]);

  /** 开始模拟：从 store 读取牌组 → 洗牌 → 抽 5 张 */
  const startBattle = useCallback(() => {
    if (deckCards.length === 0) {
      pushLog("牌组为空，请先到「组牌工作台」组牌。");
      return;
    }
    resetPlayer();
    setMonster((m) => ({ ...m, hp: m.maxHp, block: 0 }));
    setDiscardPile([]);
    setExhaustPile([]);

    const expanded = deckCards.flatMap((e) => Array<string>(e.count).fill(e.cardId));
    const shuffled = shuffle(expanded);
    const drawn = shuffled.slice(0, Math.min(5, shuffled.length));

    setDrawPile(shuffled.slice(5));
    setHand(drawn);
    setPhase("PLAY_PHASE");
    setLog([]);
    pushLog(`战斗开始（第 1 回合）：抽 ${drawn.length} 张牌。`);
    if (char?.starterRelic) {
      pushLog(`【${char.starterRelic}】触发：${char.starterRelicEffect}`);
    }
  }, [deckCards, resetPlayer, pushLog, char]);

  /** 出牌：费用校验 → 结算伤害/格挡 → 移入弃牌堆或消耗堆 */
  const playCard = useCallback(
    (cardId: string) => {
      if (phase !== "PLAY_PHASE") return;
      const info = catalogMap.get(cardId);
      if (!info || info.cost === null) return;
      if (playerEnergy < info.cost) {
        pushLog(`能量不足，无法打出「${info.name}」。`);
        return;
      }

      setPlayerEnergy((e) => e - (info.cost ?? 0));

      // 伤害结算：基础伤害 + 力量，目标易伤 ×1.5，格挡抵消
      if (info.damage && info.damage > 0) {
        setMonster((m) => {
          let dmg = info.damage! + playerBuffs.strength;
          if (monsterBuffs.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
          const absorbed = Math.min(m.block, dmg);
          const dealt = Math.max(0, dmg - m.block);
          pushLog(
            `「${info.name}」造成 ${dmg} 点伤害，格挡抵消 ${absorbed}，实际 ${dealt}。`
          );
          return { ...m, block: m.block - absorbed, hp: Math.max(0, m.hp - dealt) };
        });
      }

      // 格挡结算：基础格挡 + 敏捷，脆弱时 ×0.75
      if (info.block && info.block > 0) {
        let block = info.block + playerBuffs.dexterity;
        if (playerBuffs.frail > 0) block = Math.floor(block * 0.75);
        setPlayerBlock((b) => b + block);
        pushLog(`「${info.name}」获得 ${block} 点格挡。`);
      }

      // 移入手牌外
      setHand((h) => h.filter((id, idx) => !(id === cardId && idx === h.indexOf(cardId))));
      if (info.exhaust) {
        setExhaustPile((p) => [...p, cardId]);
        pushLog(`「${info.name}」被消耗。`);
      } else {
        setDiscardPile((p) => [...p, cardId]);
      }
    },
    [phase, catalogMap, playerEnergy, playerBuffs, monsterBuffs, pushLog]
  );

  /** 结束回合：弃手牌 → 敌人行动 → Buff 衰减 → 抽 5 张进入下一回合 */
  const endTurn = useCallback(() => {
    if (phase !== "PLAY_PHASE") return;
    setPhase("ENEMY_PHASE");

    // 弃掉全部手牌
    setDiscardPile((p) => [...p, ...hand]);
    setHand([]);

    // 敌人行动（虚弱 → 攻击 ×0.75）
    const enemyDmg = monsterBuffs.weak > 0
      ? Math.floor(monster.attack * 0.75)
      : monster.attack;
    const absorbed = Math.min(playerBlock, enemyDmg);
    const dealt = Math.max(0, enemyDmg - playerBlock);
    setPlayerBlock(0);
    setPlayerHp((hp) => Math.max(0, hp - dealt));
    pushLog(
      `敌人攻击：${monster.attack} 点伤害，格挡抵消 ${absorbed}，实际 ${dealt}。`
    );

    // Buff 回合结束衰减
    const decay = (b: Buffs): Buffs => ({
      strength: b.strength,
      dexterity: b.dexterity,
      vulnerable: Math.max(0, b.vulnerable - 1),
      frail: Math.max(0, b.frail - 1),
      weak: Math.max(0, b.weak - 1),
    });
    setMonsterBuffs(decay);

    // 抽下一回合手牌
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    setPlayerEnergy(3);
    setDrawPile((pile) => {
      let remaining = pile;
      if (pile.length < 5) {
        remaining = shuffle([...pile, ...discardPile]);
        setDiscardPile([]);
      }
      const drawn = remaining.slice(0, Math.min(5, remaining.length));
      setHand(drawn);
      setPhase("PLAY_PHASE");
      pushLog(`第 ${nextTurn} 回合：抽 ${drawn.length} 张牌。`);
      return remaining.slice(5);
    });
  }, [phase, hand, monster, monsterBuffs, playerBlock, turn, discardPile, pushLog]);

  // 怪物参数可编辑
  const editMonster = (key: "hp" | "maxHp" | "attack" | "block", value: number) => {
    setMonster((m) => ({ ...m, [key]: Math.max(0, value) }));
  };

  const canPlay = (info: CardInfo | undefined) =>
    phase === "PLAY_PHASE" && !!info && info.cost !== null && info.cost <= playerEnergy;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">战斗模拟器</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            使用「组牌工作台」中的牌组进行回合制战斗
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-background-secondary px-3 py-1 text-xs text-muted-foreground">
            第 {turn} 回合 · {PHASE_LABELS[phase]}
          </span>
          {phase === "IDLE" ? (
            <button
              type="button"
              onClick={startBattle}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              开始模拟
            </button>
          ) : (
            <button
              type="button"
              onClick={endTurn}
              disabled={phase !== "PLAY_PHASE"}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              结束回合
            </button>
          )}
        </div>
      </header>

      {/* 1. 角色状态区（左）+ 怪物状态区（右） */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {/* 角色 */}
        <div className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{char?.name ?? "角色"}</h2>
            <div className="flex gap-3 text-xs">
              <span className="font-semibold text-red-400">HP {playerHp}</span>
              <span className="font-semibold text-amber-400">能量 {playerEnergy}/3</span>
              <span className="font-semibold text-blue-400">格挡 {playerBlock}</span>
            </div>
          </div>
          <BuffChips
            buffs={playerBuffs}
            show={["strength", "dexterity", "frail"]}
          />
        </div>

        {/* 怪物（可编辑 HP/攻击/格挡） */}
        <div className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-400">怪物</h2>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                HP
                <input
                  type="number"
                  value={monster.hp}
                  onChange={(e) => editMonster("hp", Number(e.target.value))}
                  className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs outline-none"
                />
              </label>
              <label className="flex items-center gap-1">
                攻击
                <input
                  type="number"
                  value={monster.attack}
                  onChange={(e) => editMonster("attack", Number(e.target.value))}
                  className="h-6 w-12 rounded border border-border bg-background px-1 text-center text-xs outline-none"
                />
              </label>
              <label className="flex items-center gap-1">
                格挡
                <input
                  type="number"
                  value={monster.block}
                  onChange={(e) => editMonster("block", Number(e.target.value))}
                  className="h-6 w-12 rounded border border-border bg-background px-1 text-center text-xs outline-none"
                />
              </label>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded bg-background">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${(monster.hp / monster.maxHp) * 100}%` }}
            />
          </div>
          <div className="mt-2">
            <BuffChips buffs={monsterBuffs} show={["vulnerable", "weak", "strength"]} />
          </div>
        </div>
      </div>

      {/* 2. 手牌区域（点击出牌） */}
      <div className="mb-4 rounded-lg border border-border bg-background-secondary p-4">
        <h2 className="mb-2 text-sm font-bold">
          手牌（{hand.length}）
          <span className="ml-2 text-xs font-normal text-muted-foreground">点击卡牌打出</span>
        </h2>
        {phase === "IDLE" ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            尚未开始战斗。可先在
            <Link href="/deck" className="mx-1 text-accent hover:underline">组牌工作台</Link>
            组好牌组，再回来开始模拟。
          </p>
        ) : hand.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">手牌为空</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
            {hand.map((id, idx) => {
              const info = catalogMap.get(id);
              if (!info) return null;
              const playable = canPlay(info);
              return (
                <div
                  key={`${id}-${idx}`}
                  className={cn(!playable && "pointer-events-none opacity-40 grayscale")}
                  title={playable ? "点击出牌" : phase === "PLAY_PHASE" ? "能量不足" : "当前不可出牌"}
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
        <PileView title="抽牌堆" pile={drawPile} color="#7c5cff" catalogMap={catalogMap} />
        <PileView title="弃牌堆" pile={discardPile} color="#38bdf8" catalogMap={catalogMap} />
        <PileView title="消耗堆" pile={exhaustPile} color="#8b5cf6" catalogMap={catalogMap} />
      </div>

      {/* 4. 遗物栏（战斗中效果触发提示） */}
      <div className="mb-4 rounded-lg border border-border bg-background-secondary p-4">
        <h2 className="mb-2 text-sm font-bold">遗物</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs">
            {char?.starterRelic ?? "无初始遗物"}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {char?.starterRelicEffect ?? ""}
            </span>
          </span>
          <span className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
            遗物槽（战斗中按触发点结算，完整系统后续迭代）
          </span>
        </div>
      </div>

      {/* 6. 战斗日志 */}
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <h2 className="mb-2 text-sm font-bold">战斗日志</h2>
        <div
          ref={logRef}
          className="h-40 overflow-y-auto rounded-md border border-border bg-background p-2 text-xs leading-relaxed text-muted"
        >
          {log.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">暂无日志</p>
          ) : (
            log.map((line, i) => (
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
