"use client";

import { create } from "zustand";
import type { DeckCardEntry } from "@/types/card";

interface DeckState {
  characterId: string;
  cards: DeckCardEntry[];
  setCharacter: (characterId: string) => void;
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  setUpgraded: (cardId: string, upgraded: boolean) => void;
  reset: (cards: DeckCardEntry[]) => void;
  clear: () => void;
}

/**
 * 牌组构筑工作台的核心状态（模块二）
 * - addCard 同名卡自动合并 count
 * - 牌组变动实时同步到统计面板与战斗模拟器
 */
export const useDeckStore = create<DeckState>((set) => ({
  characterId: "ironclad",
  cards: [],
  setCharacter: (characterId) => set({ characterId }),
  addCard: (cardId) =>
    set((state) => {
      const existing = state.cards.find((c) => c.cardId === cardId);
      if (existing) {
        return {
          cards: state.cards.map((c) =>
            c.cardId === cardId ? { ...c, count: c.count + 1 } : c
          ),
        };
      }
      return { cards: [...state.cards, { cardId, count: 1, upgraded: false }] };
    }),
  removeCard: (cardId) =>
    set((state) => {
      const existing = state.cards.find((c) => c.cardId === cardId);
      if (!existing) return state;
      if (existing.count > 1) {
        return {
          cards: state.cards.map((c) =>
            c.cardId === cardId ? { ...c, count: c.count - 1 } : c
          ),
        };
      }
      return { cards: state.cards.filter((c) => c.cardId !== cardId) };
    }),
  setUpgraded: (cardId, upgraded) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.cardId === cardId ? { ...c, upgraded } : c)),
    })),
  reset: (cards) => set({ cards }),
  clear: () => set({ cards: [] }),
}));
