import type { CardPool } from "./card";

/**
 * 角色 —— 5 个可玩角色
 */
export interface Character {
  /** 路由标识：ironclad / silent / ... */
  id: string;
  /** 卡池标识 */
  pool: CardPool;
  /** 显示名 */
  name: string;
  /** 初始生命值 */
  hp: number;
  /** 初始遗物名 */
  starterRelic: string;
  /** 初始遗物效果 */
  starterRelicEffect: string;
  /** 初始牌组构成 */
  starterDeck: { name: string; count: number }[];
}
