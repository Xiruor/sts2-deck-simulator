"use server";

/**
 * 我的牌组 Server Actions
 * - deleteDeck：删除指定方案（Server Component 通过 <form action> 调用）
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function deleteDeck(formData: FormData) {
  const id = Number(formData.get("deckId"));
  if (!Number.isInteger(id) || id <= 0) return;
  await prisma.deck.delete({ where: { id } });
  revalidatePath("/decks");
}
