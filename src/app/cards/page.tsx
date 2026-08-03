import { Suspense } from "react";
import { prisma } from "@/lib/db";
import CardGrid, { type CardGridItem } from "@/components/cards/CardGrid";
import type { CardRarity, CardType } from "@/generated/prisma/client";

// 服务端渲染时直接查询数据库
export const dynamic = "force-dynamic";

// 类型枚举 → 中文（与 GameCard 组件类型对应）
const TYPE_LABELS: Record<CardType, CardGridItem["type"]> = {
  ATTACK: "攻击",
  SKILL: "技能",
  POWER: "能力",
  STATUS: "状态",
  CURSE: "诅咒",
  QUEST: "任务",
};

// 稀有度枚举 → 中文
const RARITY_LABELS: Record<CardRarity, CardGridItem["rarity"]> = {
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

export default async function CardsPage() {
  const cards = await prisma.card.findMany({
    include: { character: { select: { name: true } } },
    orderBy: { id: "asc" },
  });

  // 转成前端组件所需的数据结构（保持查询顺序）
  const items: CardGridItem[] = cards.map((card) => ({
    slug: card.slug,
    name: card.name,
    cost: card.cost,
    type: TYPE_LABELS[card.type],
    rarity: RARITY_LABELS[card.rarity],
    character: card.character.name,
    description: card.description,
    upgradedDescription: card.upgradedDescription ?? undefined,
    exhaust: card.exhaust,
    imageNormal: card.imageNormal ?? undefined,
    imageUpgraded: card.imageUpgraded ?? undefined,
  }));

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8">
      <Suspense
        fallback={
          <p className="py-12 text-center text-sm text-muted-foreground">加载中...</p>
        }
      >
        <CardGrid cards={items} />
      </Suspense>

      <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        本项目为非官方粉丝工具，卡牌图片版权归Mega Crit, LLC所有。图片来源于公开Wiki，仅用于信息参考。如有侵权请联系移除。
      </footer>
    </main>
  );
}
