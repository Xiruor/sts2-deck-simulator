"use server";

/**
 * 牌组工作台 Server Actions
 * - getDeckById：/decks 页点击"加载"后，通过 /deck?load={deckId} 拉取牌组数据
 */
import { prisma } from "@/lib/db";
import { CHARACTER_NAME_TO_SLUG } from "@/data/characters";
import type { DeckCardEntry } from "@/types/card";

export interface LoadedDeck {
  id: number;
  name: string;
  characterSlug: string;
  cards: DeckCardEntry[];
}

export async function getDeckById(deckId: number): Promise<LoadedDeck | null> {
  if (!Number.isInteger(deckId) || deckId <= 0) return null;
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      character: { select: { name: true } },
      deckCards: true,
    },
  });
  if (!deck) return null;

  return {
    id: deck.id,
    name: deck.name,
    characterSlug: CHARACTER_NAME_TO_SLUG[deck.character.name] ?? "ironclad",
    cards: deck.deckCards.map((dc) => ({
      cardId: String(dc.cardId),
      count: dc.quantity,
      upgraded: dc.isUpgraded,
    })),
  };
}
