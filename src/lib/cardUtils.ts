/**
 * 卡牌生效数值工具 —— 牌组工作台统计 / 战斗模拟器共用。
 * 规则：用户在工作台自定义的攻击/格挡/抽牌值优先于卡牌基础值；
 * 升级态时优先使用"升级后"一套自定义值，其次回退"升级前"自定义值与卡牌基础值。
 */
import type { DeckCardEntry } from "@/types/card";
import type { CardInfo } from "@/hooks/useCardCatalog";

/** 从卡牌描述解析抽牌数，如"抽2张牌"→2；解析不到返回 0 */
export function parseDrawCount(description: string): number {
  const m = description.match(/抽(\d+)张/);
  return m ? Number(m[1]) : 0;
}

/** 从卡牌描述解析伤害值，如"造成9点伤害"→9；解析不到返回 null */
export function parseDamage(description: string): number | null {
  const m = description.match(/造成(\d+)点伤害/);
  return m ? Number(m[1]) : null;
}

/** 从卡牌描述解析格挡值，如"获得5点格挡"→5；解析不到返回 null */
export function parseBlock(description: string): number | null {
  const m = description.match(/(?:获得|增加)(\d+)点格挡/);
  return m ? Number(m[1]) : null;
}

/**
 * 卡牌默认伤害（无自定义时的基准值，用于输入框 placeholder）：
 * 升级态优先取升级描述解析值，其次卡牌基础伤害
 */
export function defaultDamage(
  entry: DeckCardEntry,
  info: CardInfo
): number | null {
  if (entry.upgraded && info.upgradedDescription) {
    return parseDamage(info.upgradedDescription) ?? info.damage ?? null;
  }
  return info.damage ?? parseDamage(info.description) ?? null;
}

/** 卡牌默认格挡（升级态优先取升级描述解析值） */
export function defaultBlock(
  entry: DeckCardEntry,
  info: CardInfo
): number | null {
  if (entry.upgraded && info.upgradedDescription) {
    return parseBlock(info.upgradedDescription) ?? info.block ?? null;
  }
  return info.block ?? parseBlock(info.description) ?? null;
}

/** 卡牌默认抽牌数（无自定义时解析当前生效描述） */
export function defaultDraw(entry: DeckCardEntry, info: CardInfo): number {
  const desc =
    entry.upgraded && info.upgradedDescription
      ? info.upgradedDescription
      : info.description;
  return parseDrawCount(desc);
}

/** 生效伤害值（无则 null） */
export function effectiveDamage(
  entry: DeckCardEntry,
  info: CardInfo
): number | null {
  const custom = entry.upgraded ? entry.damageUp ?? entry.damage : entry.damage;
  return custom ?? info.damage ?? null;
}

/** 生效格挡值（无则 null） */
export function effectiveBlock(
  entry: DeckCardEntry,
  info: CardInfo
): number | null {
  const custom = entry.upgraded ? entry.blockUp ?? entry.block : entry.block;
  return custom ?? info.block ?? null;
}

/** 生效抽牌数（无自定义时解析卡牌描述） */
export function effectiveDraw(entry: DeckCardEntry, info: CardInfo): number {
  const custom = entry.upgraded ? entry.drawUp ?? entry.draw : entry.draw;
  if (custom !== null && custom !== undefined) return custom;
  const desc =
    entry.upgraded && info.upgradedDescription
      ? info.upgradedDescription
      : info.description;
  return parseDrawCount(desc);
}
