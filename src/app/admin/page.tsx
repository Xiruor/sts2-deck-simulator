import Link from "next/link";
import { prisma } from "@/lib/db";

// 服务端实时统计
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [cardCount, deckCount, userCount] = await Promise.all([
    prisma.card.count(),
    prisma.deck.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "卡牌总数", value: cardCount, href: "/admin/cards" },
    { label: "牌组总数", value: deckCount, href: "/decks" },
    { label: "用户数", value: userCount, href: "" },
  ];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-14">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">数据概览与快捷入口</p>
      </header>

      {/* 数据概览 */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-background-secondary p-6 text-center"
          >
            <div className="text-3xl font-bold text-accent">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      {/* 快捷入口 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">快捷入口</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/cards"
            className="group flex flex-col gap-1 rounded-xl border border-border bg-background-secondary p-5 transition-colors hover:border-accent/50"
          >
            <span className="font-semibold group-hover:text-accent">卡牌管理</span>
            <span className="text-xs text-muted-foreground">新增 / 编辑 / 删除卡牌数据</span>
          </Link>
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-background-secondary p-5 opacity-60">
            <span className="font-semibold">用户管理</span>
            <span className="text-xs text-muted-foreground">开发中</span>
          </div>
        </div>
      </section>
    </main>
  );
}
