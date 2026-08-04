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
  const items: CardGridItem[] = cards.map((card) => {
    // 升级数据差异：目前存升级后费用 { cost: number }
    const upgradedData = card.upgradedData as { cost?: number } | null;
    return {
      slug: card.slug,
      name: card.name,
      cost: card.cost,
      type: TYPE_LABELS[card.type],
      rarity: RARITY_LABELS[card.rarity],
      character: card.character.name,
      description: card.description,
      upgradedDescription: card.upgradedDescription ?? undefined,
      upgradedCost: upgradedData?.cost ?? undefined,
      exhaust: card.exhaust,
      imageNormal: card.imageNormal ?? undefined,
      imageUpgraded: card.imageUpgraded ?? undefined,
    };
  });

  return (
    <div className="relative">
      {/* 背景层：纯色，与其他页面最底部背景色一致（bg-background） */}
      <div className="fixed inset-0 -z-10 bg-background" />
      {/* 容器：水平宽度由 1500px 减去间距节约出的 160px 得到 1340px */}
      <div className="mx-auto max-w-[1340px] px-4 py-8">
        {/* 容器：background-secondary 与背景区分，协调不别扭 */}
        <div className="rounded-2xl bg-background-secondary p-4 shadow-2xl">
          <Suspense
            fallback={
              <p className="py-12 text-center text-sm text-muted-foreground">加载中...</p>
            }
          >
            <CardGrid cards={items} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
