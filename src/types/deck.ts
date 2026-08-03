import type { DeckCardEntry } from "./card";

/**
 * 牌组方案（用于 localStorage 与后端持久化）
 */
export interface Deck {
  id?: string;
  characterId: string;
  name: string;
  cards: DeckCardEntry[];
  /** 创建/更新时间戳 */
  createdAt?: number;
}
