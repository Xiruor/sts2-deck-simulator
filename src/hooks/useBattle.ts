"use client";

import { create } from "zustand";
import type { DeckCardEntry } from "@/types/card";

interface BattleState {
  /** 抽牌堆（卡ID列表） */
  drawPile: string[];
  /** 手牌 */
  hand: string[];
  /** 弃牌堆 */
  discardPile: string[];
  /** 消耗堆 */
  exhaustPile: string[];
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  turn: number;
  /** 怪物状态（可编辑） */
  monster: { hp: number; maxHp: number; attack: number; block: number };
  start: (cards: DeckCardEntry[], maxHp: number, drawBonus?: number) => void;
  playCard: (cardId: string, cost: number, exhaust: boolean) => void;
  endTurn: () => void;
}

/**
 * 单局战斗模拟器状态（模块五）
 * TODO: 抽牌 / 出牌 / 结束回合的完整逻辑在实现战斗引擎时填充
 */
export const useBattleStore = create<BattleState>((_set) => ({
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: [],
  hp: 80,
  maxHp: 80,
  energy: 3,
  maxEnergy: 3,
  turn: 1,
  monster: { hp: 42, maxHp: 42, attack: 10, block: 0 },
  start: () => {},
  playCard: () => {},
  endTurn: () => {},
}));
