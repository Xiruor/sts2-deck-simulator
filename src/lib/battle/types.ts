/**
 * 战斗引擎类型定义 —— 纯 TypeScript，不依赖 React。
 * 设计参考 slaytheweb / STS 系开源模拟器：单一状态对象 + 纯函数 action。
 *
 * 本模拟器为简化版（按需求）：
 * - 单玩家 vs 单怪物，无遗物 / 药水 / Buff
 * - 双方都有"每回合攻击 / 每回合格挡"参数，玩家额外有"每回合抽牌 / 每回合能量"
 * - 参数在各自回合开始时结算，与出牌行为相互独立
 * - 格挡在拥有者回合开始刷新为该参数值（出牌获得的格挡持续到下一次刷新）
 */

/** 战斗状态 */
export type BattleStatus = "IDLE" | "PLAYER_TURN" | "ENEMY_TURN" | "VICTORY" | "DEFEAT";

/** 玩家每回合参数（可自定义，默认：攻击0 / 格挡0 / 抽牌5 / 能量3） */
export interface PlayerParams {
  /** 生命上限 */
  maxHp: number;
  /** 每回合攻击（回合开始时自动对怪物造成伤害） */
  perTurnAttack: number;
  /** 每回合格挡（回合开始时刷新为该值） */
  perTurnBlock: number;
  /** 每回合抽牌数 */
  perTurnDraw: number;
  /** 每回合能量 */
  perTurnEnergy: number;
}

/** 怪物每回合参数（可自定义，默认：攻击8 / 格挡8） */
export interface EnemyParams {
  /** 生命上限 */
  maxHp: number;
  /** 每回合攻击（怪物回合开始时攻击玩家） */
  perTurnAttack: number;
  /** 每回合格挡（怪物回合开始时刷新为该值） */
  perTurnBlock: number;
}

/** 战斗中一张卡解析出的生效数值（由组件根据卡池 + 工作台自定义值构建） */
export interface ResolvedCard {
  name: string;
  /** 能量费用；-1 表示 X 费牌（不支持打出） */
  cost: number;
  damage: number;
  block: number;
  draw: number;
  /** 打出后回能（从描述"获得X点能量"解析） */
  energy: number;
  exhaust: boolean;
}

export type CardResolver = (cardId: string) => ResolvedCard | null;

/** 战斗完整状态（单一状态对象） */
export interface BattleState {
  status: BattleStatus;
  turn: number;
  player: {
    hp: number;
    maxHp: number;
    block: number;
    energy: number;
    params: PlayerParams;
  };
  enemy: {
    hp: number;
    maxHp: number;
    block: number;
    params: EnemyParams;
  };
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  exhaustPile: string[];
  /** 战斗日志（由引擎产生，UI 直接渲染） */
  log: string[];
}

/** 引擎动作（reducer 输入） */
export type BattleAction =
  | { type: "START"; deck: string[]; player: PlayerParams; enemy: EnemyParams; resolve: CardResolver }
  | { type: "PLAY_CARD"; cardId: string; resolve: CardResolver }
  | { type: "END_TURN"; resolve: CardResolver };
