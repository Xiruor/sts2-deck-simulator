"use client";

/**
 * 角色卡池数据 Hook —— 通过现有 /api/cards 接口按角色拉取卡池。
 * 用于牌组工作台的卡池区与战斗模拟器的卡牌信息查询。
 */
import { useEffect, useState } from "react";
import { CHARACTER_SLUG_TO_DB_ID } from "@/data/characters";
import type { GameCardRarity, GameCardType } from "@/components/cards/GameCard";

/** 卡池中一张卡的信息（前端统一结构，类型/稀有度已转中文） */
export interface CardInfo {
  id: number;
  slug: string;
  name: string;
  cost: number | null;
  type: GameCardType;
  rarity: GameCardRarity;
  character: string;
  description: string;
  upgradedDescription?: string;
  exhaust: boolean;
  damage: number | null;
  block: number | null;
  imageNormal?: string;
  imageUpgraded?: string;
}

const TYPE_LABELS: Record<string, GameCardType> = {
  ATTACK: "攻击",
  SKILL: "技能",
  POWER: "能力",
  STATUS: "状态",
  CURSE: "诅咒",
  QUEST: "任务",
};

const RARITY_LABELS: Record<string, GameCardRarity> = {
  BASIC: "基础",
  COMMON: "普通",
  UNCOMMON: "罕见",
  RARE: "稀有",
  SPECIAL: "特殊",
  ANCIENT: "先古之民",
  EVENT: "事件",
  CURSE: "诅咒",
  QUEST: "任务",
  STATUS: "状态",
};

/** /api/cards 返回的单张卡牌原始结构 */
interface ApiCard {
  id: number;
  slug: string;
  name: string;
  cost: number | null;
  type: string;
  rarity: string;
  damage: number | null;
  block: number | null;
  description: string;
  upgradedDescription: string | null;
  exhaust: boolean;
  imageNormal: string | null;
  imageUpgraded: string | null;
  character: { name: string } | null;
}

function mapCard(raw: ApiCard): CardInfo {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    cost: raw.cost,
    type: TYPE_LABELS[raw.type] ?? "技能",
    rarity: RARITY_LABELS[raw.rarity] ?? "普通",
    character: raw.character?.name ?? "无色",
    description: raw.description,
    upgradedDescription: raw.upgradedDescription ?? undefined,
    exhaust: raw.exhaust,
    damage: raw.damage ?? null,
    block: raw.block ?? null,
    imageNormal: raw.imageNormal ?? undefined,
    imageUpgraded: raw.imageUpgraded ?? undefined,
  };
}

export function useCardCatalog(characterSlug: string) {
  const [catalog, setCatalog] = useState<CardInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const dbId = CHARACTER_SLUG_TO_DB_ID[characterSlug];

    fetch(`/api/cards?characterId=${dbId}&limit=100`)
      .then((res) => res.json())
      .then((body: { data?: { cards?: ApiCard[] } }) => {
        if (cancelled) return;
        const cards = body?.data?.cards ?? [];
        setCatalog(cards.map(mapCard));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [characterSlug]);

  return { catalog, loading };
}
