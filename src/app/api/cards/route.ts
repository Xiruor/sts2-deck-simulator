import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/utils";
import type { Prisma, CardType, CardRarity } from "@/generated/prisma/client";

// GET /api/cards?characterId=1&type=ATTACK&rarity=RARE&cost=1&q=打击&page=1&limit=30
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 筛选参数
  const characterId = searchParams.get("characterId");
  const types = searchParams.get("type")?.split(",").filter(Boolean);
  const rarities = searchParams.get("rarity")?.split(",").filter(Boolean);
  const cost = searchParams.get("cost");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  // 上限 1000：支持客户端一次拉取全量卡池（牌组工作台卡池区与总览口径一致）
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit")) || 30));

  try {
    const where: Prisma.CardWhereInput = {
      // 按角色（卡池）筛选
      ...(characterId !== null && characterId !== "" && !Number.isNaN(Number(characterId))
        ? { poolId: Number(characterId) }
        : {}),
      // 按卡牌类型筛选（逗号分隔多选）
      ...(types?.length ? { type: { in: types as CardType[] } } : {}),
      // 按稀有度筛选（逗号分隔多选）
      ...(rarities?.length ? { rarity: { in: rarities as CardRarity[] } } : {}),
      // 按费用筛选（-1 表示 X 费）
      ...(cost !== null && cost !== "" ? { cost: Number(cost) } : {}),
      // 按卡牌名关键字模糊搜索
      ...(q ? { name: { contains: q } } : {}),
    };

    const [total, cards] = await Promise.all([
      prisma.card.count({ where }),
      prisma.card.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // 关联返回角色信息
        include: {
          character: { select: { id: true, name: true, color: true, coverImage: true } },
        },
        orderBy: { id: "asc" },
      }),
    ]);

    return Response.json(ok({ cards, total, page, limit }));
  } catch (error) {
    console.error("[api/cards]", error);
    return fail("服务内部错误", 500);
  }
}
