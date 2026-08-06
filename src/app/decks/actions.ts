"use server";

/**
 * 我的牌组 Server Actions
 * - deleteDeck：删除指定方案（仅限本人），Server Component 通过 <form action> 调用
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function deleteDeck(formData: FormData) {
  const id = Number(formData.get("deckId"));
  if (!Number.isInteger(id) || id <= 0) return;

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  if (!userId) return;

  // 仅允许删除自己名下的牌组
  const deck = await prisma.deck.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!deck || deck.userId !== userId) return;

  await prisma.deck.delete({ where: { id } });
  revalidatePath("/decks");
}
