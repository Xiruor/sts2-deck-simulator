"use client";

/**
 * 牌组工作台 / 战斗模拟器共享的 Zustand Store
 * - persist 中间件保存到 localStorage，key 为 "deck-storage"
 * - 同名卡自动合并 count，totalCards 实时同步
 * - 每张卡可自定义 攻击/格挡/抽牌 数值（升级前与升级后各一套），战斗模拟读取这些覆盖值
 * - 牌组数据在 /deck 与 /battle 之间通过本 store 共享
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeckCardEntry, DeckCardValues } from "@/types/card";

interface DeckState {
  /** 当前选中的角色 slug（ironclad / silent / ...） */
  selectedCharacter: string;
  /** 牌组卡牌列表（cardId 为数据库 Card.id 的字符串形式） */
  cards: DeckCardEntry[];
  /** 牌组总卡数（各条目 count 之和） */
  totalCards: number;
  setCharacter: (characterId: string) => void;
  /** 加入卡牌，quantity 默认 1；已存在则累加数量 */
  addCard: (cardId: string, quantity?: number) => void;
  removeCard: (cardId: string) => void;
  /** 将某张卡的数量设为指定值，quantity <= 0 时移除 */
  updateQuantity: (cardId: string, quantity: number) => void;
  /** 更新某张卡的自定义数值（攻击/格挡/抽牌，升级前后） */
  updateCardValues: (cardId: string, values: Partial<DeckCardValues>) => void;
  /** 切换某张卡的升级态 */
  setUpgraded: (cardId: string, upgraded: boolean) => void;
  /** 拖拽排序：把 activeCardId 移动到 overCardId 的位置 */
  reorderCards: (activeCardId: string, overCardId: string) => void;
  clearDeck: () => void;
  /** 整体替换牌组（用于加载存档 / 分享还原 / 重置） */
  loadDeck: (cards: DeckCardEntry[]) => void;
}

const sumCards = (cards: DeckCardEntry[]) =>
  cards.reduce((sum, c) => sum + c.count, 0);

export const useDeckStore = create<DeckState>()(
  persist(
    (set) => ({
      selectedCharacter: "ironclad",
      cards: [],
      totalCards: 0,
      setCharacter: (characterId) => set({ selectedCharacter: characterId }),
      addCard: (cardId, quantity = 1) =>
        set((state) => {
          const existing = state.cards.find((c) => c.cardId === cardId);
          const cards = existing
            ? state.cards.map((c) =>
                c.cardId === cardId ? { ...c, count: c.count + quantity } : c
              )
            : [...state.cards, { cardId, count: quantity, upgraded: false }];
          return { cards, totalCards: sumCards(cards) };
        }),
      removeCard: (cardId) =>
        set((state) => {
          const existing = state.cards.find((c) => c.cardId === cardId);
          if (!existing) return state;
          const cards =
            existing.count > 1
              ? state.cards.map((c) =>
                  c.cardId === cardId ? { ...c, count: c.count - 1 } : c
                )
              : state.cards.filter((c) => c.cardId !== cardId);
          return { cards, totalCards: sumCards(cards) };
        }),
      updateQuantity: (cardId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const cards = state.cards.filter((c) => c.cardId !== cardId);
            return { cards, totalCards: sumCards(cards) };
          }
          const cards = state.cards.some((c) => c.cardId === cardId)
            ? state.cards.map((c) =>
                c.cardId === cardId ? { ...c, count: quantity } : c
              )
            : [...state.cards, { cardId, count: quantity, upgraded: false }];
          return { cards, totalCards: sumCards(cards) };
        }),
      updateCardValues: (cardId, values) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.cardId === cardId ? { ...c, ...values } : c
          ),
        })),
      setUpgraded: (cardId, upgraded) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.cardId === cardId ? { ...c, upgraded } : c
          ),
        })),
      reorderCards: (activeCardId, overCardId) =>
        set((state) => {
          if (activeCardId === overCardId) return state;
          const from = state.cards.findIndex((c) => c.cardId === activeCardId);
          const to = state.cards.findIndex((c) => c.cardId === overCardId);
          if (from < 0 || to < 0) return state;
          const cards = [...state.cards];
          const [moved] = cards.splice(from, 1);
          cards.splice(to, 0, moved);
          return { cards };
        }),
      clearDeck: () => set({ cards: [], totalCards: 0 }),
      loadDeck: (cards) => set({ cards, totalCards: sumCards(cards) }),
    }),
    { name: "deck-storage" }
  )
);
