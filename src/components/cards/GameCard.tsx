"use client";

/**
 * 统一卡牌组件 —— 所有卡牌共用，通过 props 传入不同数据。
 * 用 React.memo 包裹，避免 600+ 张卡牌同时渲染时的性能问题。
 *
 * 配色体系：
 * - 卡牌本体外框：按角色 / 特殊类型（诅咒/状态/任务）/ 先古之民决定，渐变加深
 * - 左上角费用徽章：按角色决定底座颜色（先古之民继承所属角色）
 * - 插画围边：角色与无色卡牌按稀有度着色；诅咒/状态/任务/先古之民固定色
 * - 插画下方深色底板：按角色 / 特殊类型决定
 */
import { memo, useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GameCardType = "攻击" | "技能" | "能力" | "诅咒" | "状态" | "任务";
export type GameCardRarity =
  | "基础"
  | "普通"
  | "罕见"
  | "稀有"
  | "先古之民"
  | "特殊"
  | "事件"
  | "诅咒"
  | "任务"
  | "状态";

export interface GameCardProps {
  slug: string;
  name: string;
  cost: number | null;
  type: GameCardType;
  rarity: GameCardRarity;
  character: string;
  description: string;
  upgradedDescription?: string;
  exhaust?: boolean;
  upgraded?: boolean;
  size?: "sm" | "md" | "lg";
  isSelected?: boolean;
  imageNormal?: string;
  imageUpgraded?: string;
  onClick?: () => void;
}

// ------------------------------------------------------------
// 样式系统
// ------------------------------------------------------------

interface CardStyle {
  /** 卡牌本体外框（渐变边框，边缘加深） */
  frame: string;
  /** 插画下方深色底板背景 */
  plate: string;
  /** 左上角费用圆形徽章 */
  crystal: { bg: string; text: string };
  /** 插画围边（插画区边框） */
  artBorder: string;
  /** 外层附加光效（先古之民白色发光描边） */
  glow?: string;
}

// 角色卡牌：外框 + 徽章 + 底板（插画围边按稀有度，见 RARITY_ART_BORDER）
const CHARACTER_STYLES: Record<string, Omit<CardStyle, "artBorder">> = {
  // 铁血战士：砖红（暗红褐）/ 橘红·朱砂红徽章 / 深棕灰（炭褐）底板
  铁甲战士: {
    frame: "bg-gradient-to-br from-[#a12f24] to-[#57160f]",
    plate: "bg-[#33251d]",
    crystal: { bg: "bg-gradient-to-br from-[#fb923c] to-[#c2410c]", text: "text-white" },
  },
  // 静默猎手：深草绿（暗翠绿，手绘渐变，边缘加深）/ 亮青绿徽章 / 暗墨绿底板
  静默猎手: {
    frame: "bg-gradient-to-br from-[#1e7a46] to-[#0a331f]",
    plate: "bg-[#143027]",
    crystal: { bg: "bg-gradient-to-br from-[#2dd4bf] to-[#0f766e]", text: "text-teal-950" },
  },
  // 兼容旧数据中的"静默猎人"写法
  静默猎人: {
    frame: "bg-gradient-to-br from-[#1e7a46] to-[#0a331f]",
    plate: "bg-[#143027]",
    crystal: { bg: "bg-gradient-to-br from-[#2dd4bf] to-[#0f766e]", text: "text-teal-950" },
  },
  // 故障机器人：深海蓝（青蓝蓝绿调）/ 浅天蓝徽章 / 深灰蓝（炭蓝灰）底板
  故障机器人: {
    frame: "bg-gradient-to-br from-[#155e75] to-[#082f42]",
    plate: "bg-[#1e2a38]",
    crystal: { bg: "bg-gradient-to-br from-[#7dd3fc] to-[#0284c7]", text: "text-sky-950" },
  },
  // 亡灵契约师：暗紫红（豆沙玫红）/ 浅粉紫徽章 / 深棕灰（灰褐）底板
  亡灵契约师: {
    frame: "bg-gradient-to-br from-[#9c4a68] to-[#4a1f30]",
    plate: "bg-[#34272b]",
    crystal: { bg: "bg-gradient-to-br from-[#e9d5ff] to-[#a855f7]", text: "text-purple-950" },
  },
  // 储君：暗棕褐（古铜棕）/ 橙红徽章 / 炭灰（冷深灰）底板
  储君: {
    frame: "bg-gradient-to-br from-[#8a5a2b] to-[#3f2a10]",
    plate: "bg-[#2f3642]",
    crystal: { bg: "bg-gradient-to-br from-[#fb923c] to-[#dc2626]", text: "text-white" },
  },
  // 无色：中灰 / 浅灰白徽章 / 深炭灰底板
  无色: {
    frame: "bg-gradient-to-br from-[#73737a] to-[#3b3b40]",
    plate: "bg-[#232327]",
    crystal: { bg: "bg-gradient-to-br from-[#f3f4f6] to-[#9ca3af]", text: "text-gray-800" },
  },
};

// 未知角色回退（沿用无色）
const DEFAULT_CHARACTER_STYLE = CHARACTER_STYLES["无色"];

// 特殊类型：覆盖角色样式（诅咒/状态/任务无费用徽章）
const TYPE_STYLES: Partial<Record<GameCardType, CardStyle>> = {
  // 诅咒：纯黑灰框 / 无徽章 / 淡紫插画围边 / 近黑深灰底板
  诅咒: {
    frame: "bg-gradient-to-br from-[#4a4a52] to-[#161618]",
    plate: "bg-[#141417]",
    crystal: { bg: "bg-gradient-to-br from-[#c4b5fd] to-[#7c3aed]", text: "text-purple-950" },
    artBorder: "border-[#c4b5fd]",
  },
  // 状态：中灰框 / 无徽章 / 近白灰插画围边 / 深炭灰底板
  状态: {
    frame: "bg-gradient-to-br from-[#73737a] to-[#3b3b40]",
    plate: "bg-[#232327]",
    crystal: { bg: "bg-gradient-to-br from-[#e5e7eb] to-[#9ca3af]", text: "text-gray-800" },
    artBorder: "border-[#e5e7eb]",
  },
  // 任务：岩石灰（石材质感）框 / 无徽章 / 岩石浅灰插画围边 / 暗咖啡底板
  任务: {
    frame: "bg-gradient-to-br from-[#57534e] to-[#292524]",
    plate: "bg-[#2a1f14]",
    crystal: { bg: "bg-gradient-to-br from-[#a8a29e] to-[#57534e]", text: "text-stone-100" },
    artBorder: "border-[#a8a29e]",
  },
};

// 先古之民：暗紫玫红框 + 浅白发光描边 / 近白灰插画围边 / 近黑暗紫灰底板
// 费用徽章继承所属角色，未归属时回退浅粉紫
const ANCIENT_STYLE: CardStyle = {
  frame: "bg-gradient-to-br from-[#9f2f6a] to-[#3d0f2b]",
  plate: "bg-[#171021]",
  crystal: { bg: "bg-gradient-to-br from-[#e9d5ff] to-[#a855f7]", text: "text-purple-950" },
  artBorder: "border-[#e5e7eb]",
  glow: "shadow-[0_0_0_1px_rgba(255,255,255,0.55),0_0_12px_3px_rgba(255,255,255,0.22)]",
};

// 角色与无色卡牌的插画围边：按稀有度（基础/普通=浅灰白，罕见=浅亮蓝，稀有=金色）
const RARITY_ART_BORDER: Record<GameCardRarity, string> = {
  基础: "border-[#e5e7eb]",
  普通: "border-[#e5e7eb]",
  罕见: "border-[#7dd3fc]",
  稀有: "border-[#fbbf24]",
  先古之民: "border-[#e5e7eb]",
  特殊: "border-[#e5e7eb]",
  事件: "border-[#e5e7eb]",
  诅咒: "border-[#c4b5fd]",
  任务: "border-[#a8a29e]",
  状态: "border-[#e5e7eb]",
};

function resolveCardStyle(
  character: string,
  type: GameCardType,
  rarity: GameCardRarity
): CardStyle {
  // 1. 诅咒 / 状态 / 任务：固定样式覆盖角色样式
  const typeStyle = TYPE_STYLES[type];
  if (typeStyle) return typeStyle;

  // 2. 先古之民：徽章继承所属角色
  if (rarity === "先古之民" || character === "先古之民") {
    const owner = CHARACTER_STYLES[character];
    return {
      ...ANCIENT_STYLE,
      crystal: owner ? owner.crystal : ANCIENT_STYLE.crystal,
    };
  }

  // 3. 角色 / 无色：外框与徽章按角色，插画围边按稀有度
  const charStyle = CHARACTER_STYLES[character] ?? DEFAULT_CHARACTER_STYLE;
  return {
    ...charStyle,
    artBorder: RARITY_ART_BORDER[rarity] ?? RARITY_ART_BORDER["基础"],
  };
}

// 类型 emoji（图片加载失败时的占位图标）
const TYPE_EMOJI: Record<GameCardType, string> = {
  攻击: "\u2694\uFE0F",
  技能: "\u2728", 
  能力: "\uD83C\uDF00",
  诅咒: "\uD83D\uDC80",
  状态: "\uD83D\uDD17",
  任务: "\uD83D\uDDFA\uFE0F",
};     
    
// 占位渐变背景
const TYPE_FALLBACK_BG: Record<GameCardType, string> = {
  攻击: "from-red-900/70 to-red-950",
  技能: "from-blue-900/70 to-blue-950",
  能力: "from-green-900/70 to-green-950",
  诅咒: "from-purple-900/70 to-purple-950",
  状态: "from-gray-800 to-gray-950",
  任务: "from-amber-900/70 to-amber-950",
}; 

// 三种尺寸
const SIZE_CLASSES = {
  sm: {
    card: "w-full h-44",
    crystal: "h-5 w-5 text-[11px]",
    name: "text-xs",
    desc: "text-[10px]",
    info: "text-[9px]",
  },
  md: {
    card: "w-full h-60",
    crystal: "h-6 w-6 text-xs",
    name: "text-sm",
    desc: "text-[11px]",
    info: "text-[10px]",
  },
  lg: {
    card: "w-full h-80",
    crystal: "h-7 w-7 text-sm",
    name: "text-base",
    desc: "text-xs",
    info: "text-[11px]",
  },
} as const;

/**
 * 关键词高亮：正则匹配描述文本
 * - 伤害数值 → 红色 #f87171  
 * - 格挡 → 蓝色  #60a5fa
 * - 消耗 / 保留 / 固有 → 紫色 #a78bfa
 * - 抽牌 / 弃牌 → 青色 #22d3ee
 */
const KEYWORD_RE = /(\d+点伤害|\d+点格挡|伤害|格挡|消耗|保留|固有|抽牌|弃牌|\d+)/g;

const KEYWORD_COLORS: { test: (s: string) => boolean; color: string }[] = [
  { test: (s) => s.includes("伤害"), color: "#f87171" },
  { test: (s) => s.includes("格挡"), color: "#60a5fa" },
  { test: (s) => s === "消耗" || s === "保留" || s === "固有", color: "#a78bfa" },
  { test: (s) => s === "抽牌" || s === "弃牌", color: "#22d3ee" },
];

function highlightDescription(text: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;
  KEYWORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEYWORD_RE.exec(text)) !== null) {  
    if (m[0].length === 0) {
      KEYWORD_RE.lastIndex++;
      continue;
    }
    const { color } = KEYWORD_COLORS.find((k) => k.test(m[0])) ?? {};
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      color ? (
        <span key={index++} style={{ color }}>
          {m[0]}
        </span>
      ) : (
        m[0]
      )
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function GameCardInner({
  name,
  cost,
  type,
  rarity,
  character,
  description,
  upgradedDescription,
  upgraded = false,
  size = "sm",
  isSelected = false,
  imageNormal,
  imageUpgraded,
  onClick,
}: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const s = SIZE_CLASSES[size];
  const style = useMemo(() => resolveCardStyle(character, type, rarity), [character, type, rarity]);

  // 升级态优先显示升级图，其次基础图
  const imgUrl = (upgraded ? imageUpgraded : imageNormal) || imageNormal || null;
  const showFallback = imgError || imgUrl === null;

  const body = useMemo(
    () => highlightDescription(upgraded && upgradedDescription ? upgradedDescription : description),
    [description, upgradedDescription, upgraded]
  );

  return (
    <div
      title={`${name} · ${character}`}
      onClick={onClick}
      className={cn(
        // 外层：加粗渐变边框（模拟手绘渐变 + 边缘加深），4px
        "relative rounded-lg p-1 transition-transform duration-150",
        style.frame,
        style.glow ?? "shadow-md",
        onClick && "cursor-pointer hover:scale-105 hover:z-10",
        isSelected && "ring-2 ring-amber-400 scale-105"
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-[4px] text-white",
          style.plate,
          s.card
        )}
      >
        {/* 插画区：加粗围边（4px），贴边无间隙 */}
        <div className={cn("relative h-[44%] w-full shrink-0 overflow-hidden border-4", style.artBorder)}>
          {showFallback ? (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center bg-gradient-to-br",
                TYPE_FALLBACK_BG[type]
              )}
            >
              <span className="text-3xl opacity-80">{TYPE_EMOJI[type]}</span>
            </div>
          ) : (
            // 图片懒加载，加载失败时降级为渐变占位，不显示破图
            <img
              src={imgUrl}
              alt={name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* 卡名（升级态加 "+"） */}
        <div className={cn("shrink-0 px-1 pt-1 text-center font-semibold leading-tight", s.name)}>
          {name}
          {upgraded && <span className="text-amber-400">+</span>}
        </div>

        {/* 描述区 */}
        <div className={cn("flex-1 overflow-hidden px-1.5 py-1 leading-tight", s.desc)}>
          {body}
        </div>

        {/* 底部类型/稀有度信息条 */}
        <div
          className={cn(
            "shrink-0 border-t border-white/10 bg-black/30 px-1 py-0.5 text-center text-gray-300",
            s.info
          )}
        >
          {type} · {rarity}
        </div>
      </div>

      {/* 费用水晶（左上） */}
      {cost !== null && (
        <div
          className={cn(
            "absolute left-1 top-1 z-10 flex items-center justify-center rounded-full",
            "bg-gradient-to-br font-bold shadow",
            style.crystal.bg,
            style.crystal.text,
            s.crystal
          )}
        >
          {cost === -1 ? "X" : cost}
        </div>
      )}

      {/* 升级标记（右上） */}
      {upgraded && (
        <div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black shadow">
          +
        </div>
      )}
    </div>
  );
}

// React.memo 包裹：props 为基本类型，浅比较即可避免无效重渲染
const GameCard = memo(GameCardInner);
GameCard.displayName = "GameCard";

export default GameCard;
