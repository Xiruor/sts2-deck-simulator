/**
 * 卡牌类型 —— 与 PRD 字段规则一致
 */

export type CardType = "ATTACK" | "SKILL" | "POWER" | "CURSE" | "STATUS" | "TASK";

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "OTHER";

/**
 * 8 个卡池：5 角色 + 无色 + 先古之民 + 特殊
 */
export type CardPool =
  | "IRONCLAD"
  | "SILENT"
  | "DEFECT"
  | "REGENT"
  | "NECROBINDER"
  | "COLORLESS"
  | "ANCIENT"
  | "SPECIAL";

/** 升级态的数值覆盖 */
export interface UpgradedValues {
  damage?: number;
  block?: number;
  cost?: number;
  description?: string;
}

export interface Card {
  id: string;
  characterId?: string | null;
  pool: CardPool;
  name: string;
  type: CardType;
  rarity: Rarity;
  /** 能量费用：0-4，-1 表示 X 费 */
  cost: number;
  damage?: number | null;
  block?: number | null;
  description: string;
  exhaust: boolean;
  upgradedValues?: UpgradedValues | null;
}

/** 工作台自定义数值（覆盖卡牌基础值，用于战斗模拟） */
export interface DeckCardValues {
  /** 自定义攻击值（升级前） */
  damage?: number | null;
  /** 自定义格挡值（升级前） */
  block?: number | null;
  /** 自定义抽牌数（升级前） */
  draw?: number | null;
  /** 自定义攻击值（升级后） */
  damageUp?: number | null;
  /** 自定义格挡值（升级后） */
  blockUp?: number | null;
  /** 自定义抽牌数（升级后） */
  drawUp?: number | null;
}

/** 牌组中的一张卡（含数量与升级态） */
export interface DeckCardEntry extends DeckCardValues {
  cardId: string;
  count: number;
  upgraded: boolean;
}
