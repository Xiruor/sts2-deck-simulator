import type { Character } from "@/types/character";

/**
 * 五大角色基础数据（来源：PRD 模块二 · 各角色初始牌组）
 * 储君与亡灵契约师为续作新增角色，具体卡牌以游戏内实际数据为准
 */
export const characters: Character[] = [
  {
    id: "ironclad",
    pool: "IRONCLAD",
    name: "铁甲战士",
    hp: 80,
    starterRelic: "燃烧之血",
    starterRelicEffect: "每场战斗后回复6HP",
    starterDeck: [
      { name: "打击", count: 5 },
      { name: "防御", count: 4 },
      { name: "痛击", count: 1 },
    ],
  },
  {
    id: "silent",
    pool: "SILENT",
    name: "沉默者",
    hp: 70,
    starterRelic: "蛇戒",
    starterRelicEffect: "战斗开始多抽2张",
    starterDeck: [
      { name: "打击", count: 5 },
      { name: "防御", count: 5 },
      { name: "中和", count: 1 },
      { name: "生还者", count: 1 },
    ],
  },
  {
    id: "defect",
    pool: "DEFECT",
    name: "故障机器人",
    hp: 75,
    starterRelic: "破损核心",
    starterRelicEffect: "战斗开始引导1个闪电法球",
    starterDeck: [
      { name: "打击", count: 4 },
      { name: "防御", count: 4 },
      { name: "闪击", count: 1 },
      { name: "充能", count: 1 },
    ],
  },
  {
    id: "regent",
    pool: "REGENT",
    name: "储君",
    hp: 75,
    starterRelic: "神圣之权",
    starterRelicEffect: "每回合开始获得1点临时能量",
    starterDeck: [
      { name: "打击", count: 5 },
      { name: "防御", count: 4 },
      { name: "辉星", count: 1 },
    ],
  },
  {
    id: "necrobinder",
    pool: "NECROBINDER",
    name: "亡灵契约师",
    hp: 66,
    starterRelic: "缚魂瓶",
    starterRelicEffect: "战斗开始时获得2层缚魂",
    starterDeck: [
      { name: "打击", count: 5 },
      { name: "防御", count: 4 },
      { name: "灾厄", count: 1 },
    ],
  },
];

/** 8 个卡池的展示配置 */
export const pools: { id: string; name: string }[] = [
  ...characters.map((c) => ({ id: c.id, name: c.name })),
  { id: "colorless", name: "无色" },
  { id: "ancient", name: "先古之民" },
  { id: "special", name: "特殊" },
];
