"use server";

/**
 * 管理后台 · 卡牌 CRUD Server Actions（typed inputs）
 * 所有 Action 均校验用户权限：非 ADMIN 角色直接拒绝。
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CardRarity, CardType } from "@/generated/prisma/client";

export interface CreateCardInput {
  name: string;
  poolId: number;
  cost: number | null;
  type: CardType;
  rarity: CardRarity;
  damage: number | null;
  block: number | null;
  description: string;
  exhaust: boolean;
  upgradedDescription: string | null;
}

export type UpdateCardInput = Partial<CreateCardInput>;

export interface CardActionResult {
  ok: boolean;
  error?: string;
}

const TYPE_OPTIONS: CardType[] = ["ATTACK", "SKILL", "POWER", "STATUS", "CURSE", "QUEST"];
const RARITY_OPTIONS: CardRarity[] = [
  "BASIC", "COMMON", "UNCOMMON", "RARE", "SPECIAL", "ANCIENT", "EVENT", "CURSE", "QUEST", "STATUS",
];

/**
 * 权限守卫：校验当前登录用户是否为 ADMIN。
 * 未登录 / 非 ADMIN → 返回错误提示；通过返回 null。
 */
async function guardAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return "请先登录";
  if (session.user.role !== "ADMIN") return "无权限：仅管理员可操作";
  return null;
}

/**
 * 校验并规整 create/update 的输入数据，返回完整字段对象。
 * 输入缺省字段按默认值补齐，确保返回类型为完整的 CreateCardInput。
 */
function validateInput(
  input: CreateCardInput | UpdateCardInput
): { error: string } | { data: CreateCardInput } {
  const name = input.name?.trim();
  const poolId = input.poolId;
  const type = input.type;
  const rarity = input.rarity;

  if (!name) return { error: "卡牌名称不能为空" };
  if (typeof poolId !== "number" || !Number.isInteger(poolId) || poolId <= 0) {
    return { error: "请选择所属卡池" };
  }
  if (!type || !TYPE_OPTIONS.includes(type)) return { error: "无效的卡牌类型" };
  if (!rarity || !RARITY_OPTIONS.includes(rarity)) return { error: "无效的稀有度" };

  return {
    data: {
      name,
      poolId: poolId as number,
      type,
      rarity,
      cost: input.cost ?? null,
      damage: input.damage ?? null,
      block: input.block ?? null,
      description: input.description ?? "",
      exhaust: input.exhaust ?? false,
      upgradedDescription: input.upgradedDescription ?? null,
    },
  };
}

export async function createCard(input: CreateCardInput): Promise<CardActionResult> {
  const denied = await guardAdmin();
  if (denied) return { ok: false, error: denied };

  const validated = validateInput(input);
  if ("error" in validated) return { ok: false, error: validated.error };

  try {
    // slug/nameEn 由名称 + 时间戳生成，避免与已有数据冲突
    const slug = `${validated.data.name}-${Date.now()}`;
    await prisma.card.create({
      data: { ...validated.data, slug, nameEn: slug },
    });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateCard(id: number, input: UpdateCardInput): Promise<CardActionResult> {
  const denied = await guardAdmin();
  if (denied) return { ok: false, error: denied };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "无效的卡牌ID" };

  const validated = validateInput(input);
  if ("error" in validated) return { ok: false, error: validated.error };

  try {
    await prisma.card.update({ where: { id }, data: validated.data });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteCard(id: number): Promise<CardActionResult> {
  const denied = await guardAdmin();
  if (denied) return { ok: false, error: denied };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "无效的卡牌ID" };

  try {
    await prisma.card.delete({ where: { id } });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch {
    return { ok: false, error: "删除失败（可能已被牌组引用）" };
  }
}
