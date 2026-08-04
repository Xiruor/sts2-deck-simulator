import Link from "next/link";
import LoadSharedDeck, { type SharedDeckData } from "./LoadSharedDeck";

/**
 * 分享还原页（Task 7）
 * - 从 URL 解析 Base64URL 编码串（格式：{ c: 角色slug, cards: [[cardId,count,upgraded], ...] }）
 * - 解码成功 → 客户端加载器自动写入 store 并跳转 /deck
 * - 解码失败 → 显示"链接无效"错误页
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let data: SharedDeckData | null = null;
  try {
    const json = JSON.parse(Buffer.from(code, "base64url").toString("utf-8"));
    if (typeof json?.c === "string" && Array.isArray(json?.cards)) {
      const cards = json.cards
        .filter(
          (item: unknown) =>
            Array.isArray(item) &&
            item.length === 3 &&
            typeof item[0] === "string" &&
            Number.isInteger(item[1]) &&
            item[1] > 0
        )
        .map((item: unknown[]) => ({
          cardId: item[0] as string,
          count: item[1] as number,
          upgraded: item[2] === 1,
        }));
      if (cards.length > 0) {
        data = { characterSlug: json.c as string, cards };
      }
    }
  } catch {
    // 解码失败走错误页
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-400">链接无效</h1>
        <p className="text-sm text-muted-foreground">
          该分享链接无法解析，可能已过期或链接不完整。
        </p>
        <Link
          href="/deck"
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
        >
          返回牌组工作台
        </Link>
      </main>
    );
  }

  return <LoadSharedDeck data={data} />;
}
