import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/utils";

// GET /api/cards/[id] —— 按 ID 获取单张卡牌详情（含关联角色信息）
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = Number(id);

  // 参数校验
  if (!Number.isInteger(cardId) || cardId <= 0) {
    return fail("无效的卡牌ID", 400);
  }

  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        character: { select: { id: true, name: true, color: true, coverImage: true } },
      },
    });

    if (!card) {
      return fail("卡牌不存在", 404);
    }

    return Response.json(ok(card));
  } catch (error) {
    console.error("[api/cards/:id]", error);
    return fail("服务内部错误", 500);
  }
}
