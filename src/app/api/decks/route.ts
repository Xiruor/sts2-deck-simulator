import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { CHARACTER_SLUG_TO_DB_ID, CHARACTER_NAME_TO_SLUG } from "@/data/characters";
import type { DeckCardEntry, DeckCardValues } from "@/types/card";

/** 把牌组条目中的自定义数值序列化为 DB JSON 字段 */
function toCustomValues(c: DeckCardEntry) {
  return {
    damage: c.damage ?? null,
    block: c.block ?? null,
    draw: c.draw ?? null,
    damageUp: c.damageUp ?? null,
    blockUp: c.blockUp ?? null,
    drawUp: c.drawUp ?? null,
  };
}

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

function mapDeckCard(dc: {
  cardId: number;
  quantity: number;
  isUpgraded: boolean;
  customValues: unknown;
}): DeckCardEntry {
  return {
    cardId: String(dc.cardId),
    count: dc.quantity,
    upgraded: dc.isUpgraded,
    ...fromCustomValues(dc.customValues),
  };
}

// POST /api/decks —— 保存牌组（匿名可存，登录后关联用户）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "";
    const characterSlug = body?.characterSlug as string | undefined;
    const cards = Array.isArray(body?.cards) ? (body.cards as DeckCardEntry[]) : [];

    const characterId = characterSlug ? CHARACTER_SLUG_TO_DB_ID[characterSlug] : undefined;
    if (!characterId || !name || cards.length === 0) {
      return fail("参数不完整：需要 name / characterSlug / cards", 400);
    }
    if (cards.some((c) => !c.cardId || !Number.isInteger(c.count) || c.count <= 0)) {
      return fail("cards 格式不正确", 400);
    }

    // 可选关联登录用户
    const session = await auth();
    let userId: number | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      userId = user?.id ?? null;
    }

    const deck = await prisma.deck.create({
      data: {
        name,
        characterId,
        userId,
        deckCards: {
          create: cards.map((c) => ({
            cardId: Number(c.cardId),
            quantity: c.count,
            isUpgraded: c.upgraded,
            customValues: toCustomValues(c),
          })),
        },
      },
      include: { character: { select: { name: true } }, deckCards: true },
    });

    return Response.json(
      ok({
        id: deck.id,
        name: deck.name,
        characterSlug:
          CHARACTER_NAME_TO_SLUG[deck.character.name] ??
          "ironclad",
        cards: deck.deckCards.map(mapDeckCard),
        createdAt: deck.createdAt,
      })
    );
  } catch (error) {
    console.error("[api/decks POST]", error);
    return fail("服务内部错误", 500);
  }
}

// GET /api/decks —— 已保存牌组列表（概要）
export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      include: { character: { select: { name: true } }, deckCards: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return Response.json(
      ok(
        decks.map((d) => ({
          id: d.id,
          name: d.name,
          characterSlug: CHARACTER_NAME_TO_SLUG[d.character.name] ?? "ironclad",
          characterName: d.character.name,
          totalCards: d.deckCards.reduce((s, c) => s + c.quantity, 0),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }))
      )
    );
  } catch (error) {
    console.error("[api/decks GET]", error);
    return fail("服务内部错误", 500);
  }
}
