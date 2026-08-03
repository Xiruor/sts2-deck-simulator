import type { Rarity } from "./card";

/**
 * 遗物 —— 效果分为四类，按时机触发
 */
export type RelicEffectType = "DRAW" | "ENERGY" | "STAT" | "MECHANIC";

export type RelicTriggerTiming = "BATTLE_START" | "TURN_START" | "PLAY_CARD" | "ON_DAMAGE";

export interface Relic {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  effectType: RelicEffectType;
  triggerTiming: RelicTriggerTiming;
  /** null 表示通用遗物 */
  characterId?: string | null;
}
