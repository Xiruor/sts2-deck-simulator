import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/utils";
import { CHARACTER_NAME_TO_SLUG } from "@/data/characters";
import type { DeckCardEntry, DeckCardValues } from "@/types/card";

/** 把 DB JSON 字段还原为条目自定义数值（仅保留数字） */
function fromCustomValues(json: unknown): DeckCardValues {
  const v = (json ?? {}) as Record<string, number | null | undefined>;
  const out: DeckCardValues = {};
  (["damage", "block", "draw", "damageUp", "blockUp", "drawUp"] as const).forEach(
    (k) => {
      if (typeof v[k] === "number") out[k] = v[k];
    }
  );
  return out;
}

// GET /api/decks/[id] —— 加载已保存的牌组（含自定义数值）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId) || deckId <= 0) return fail("无效的牌组ID", 400);

  try {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        character: { select: { name: true } },
        deckCards: true,
      },
    });
    if (!deck) return fail("牌组不存在", 404);

    const cards: DeckCardEntry[] = deck.deckCards.map((dc) => ({
      cardId: String(dc.cardId),
      count: dc.quantity,
      upgraded: dc.isUpgraded,
      ...fromCustomValues(dc.customValues),
    }));

    return Response.json(
      ok({
        id: deck.id,
        name: deck.name,
        characterSlug: CHARACTER_NAME_TO_SLUG[deck.character.name] ?? "ironclad",
        characterName: deck.character.name,
        cards,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      })
    );
  } catch (error) {
    console.error("[api/decks/:id GET]", error);
    return fail("服务内部错误", 500);
  }
}

// DELETE /api/decks/[id] —— 删除已保存的牌组
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId) || deckId <= 0) return fail("无效的牌组ID", 400);

  try {
    await prisma.deck.delete({ where: { id: deckId } });
    return Response.json(ok({ id: deckId }));
  } catch (error) {
    console.error("[api/decks/:id DELETE]", error);
    return fail("服务内部错误", 500);
  }
}
