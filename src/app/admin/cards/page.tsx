import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminCardsTable, { type AdminCardRow } from "./AdminCardsTable";

// 服务端直接查询数据库
export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const [cards, characters] = await Promise.all([
    prisma.card.findMany({
      include: { character: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.character.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } }),
  ]);

  const rows: AdminCardRow[] = cards.map((card) => ({
    id: card.id,
    name: card.name,
    cost: card.cost,
    type: card.type,
    rarity: card.rarity,
    damage: card.damage,
    block: card.block,
    description: card.description,
    exhaust: card.exhaust,
    upgradedDescription: card.upgradedDescription,
    characterName: card.character.name,
    poolId: card.poolId,
  }));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <header className="mb-4">
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-accent">
          ← 返回概览
        </Link>
        <h1 className="mt-1 text-2xl font-bold">卡牌管理</h1>
      </header>
      <AdminCardsTable cards={rows} characters={characters} />
    </main>
  );
}
