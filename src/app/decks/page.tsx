import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteDeck } from "./actions";

// 服务端直接查询数据库，实时反映最新存档
export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const session = await auth();
  const userEmail = session?.user?.email;

  // 未登录：提示登录后可跨设备同步
  if (!userEmail) {
    return (
      <main className="mx-auto max-w-[1000px] px-4 py-14">
        <h1 className="text-2xl font-bold">我的牌组</h1>
        <div className="mt-6 rounded-xl border border-border bg-background-secondary p-10 text-center">
          <p className="text-sm text-muted-foreground">登录后可跨设备同步牌组。</p>
          <Link
            href="/admin/login"
            className="mt-4 inline-block rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
          >
            去登录
          </Link>
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      decks: {
        include: { character: true, deckCards: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const decks = user?.decks ?? [];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-14">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的牌组</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {decks.length} 个已保存方案</p>
        </div>
        <Link
          href="/deck"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
        >
          去组牌
        </Link>
      </header>

      {decks.length === 0 ? (
        <div className="rounded-xl border border-border bg-background-secondary p-10 text-center text-sm text-muted-foreground">
          暂无保存的牌组方案，去
          <Link href="/deck" className="mx-1 text-accent hover:underline">牌组工作台</Link>
          组一副吧。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background-secondary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">方案名</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">卡牌数</th>
                <th className="px-4 py-3 font-medium">保存时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => {
                const cardCount = deck.deckCards.reduce((s, c) => s + c.quantity, 0);
                return (
                  <tr key={deck.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{deck.name}</td>
                    <td className="px-4 py-3 text-muted">{deck.character.name}</td>
                    <td className="px-4 py-3 text-muted">{cardCount} 张</td>
                    <td className="px-4 py-3 text-muted">
                      {deck.updatedAt.toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/deck?load=${deck.id}`}
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          加载
                        </Link>
                        <form action={deleteDeck}>
                          <input type="hidden" name="deckId" value={deck.id} />
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground hover:text-red-400"
                          >
                            删除
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
