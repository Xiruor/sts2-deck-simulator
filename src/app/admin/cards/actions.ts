"use server";

/**
 * 管理后台 · 卡牌 CRUD Server Actions（Task 8）
 * 表单字段：名称、费用、类型、稀有度、伤害、格挡、描述、消耗、升级态 + 所属卡池
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { CardRarity, CardType } from "@/generated/prisma/client";

const TYPE_OPTIONS: CardType[] = ["ATTACK", "SKILL", "POWER", "STATUS", "CURSE", "QUEST"];
const RARITY_OPTIONS: CardRarity[] = [
  "BASIC", "COMMON", "UNCOMMON", "RARE", "SPECIAL", "ANCIENT", "EVENT", "CURSE", "QUEST", "STATUS",
];

function parseCost(raw: string): number | null {
  const v = raw.trim();
  if (v === "" || v === "null") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseNullableNumber(raw: string): number | null {
  const v = raw.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type")) as CardType;
  const rarity = String(formData.get("rarity")) as CardRarity;
  const poolId = Number(formData.get("poolId"));
  if (!name) throw new Error("卡牌名称不能为空");
  if (!TYPE_OPTIONS.includes(type)) throw new Error("无效的卡牌类型");
  if (!RARITY_OPTIONS.includes(rarity)) throw new Error("无效的稀有度");
  if (!Number.isInteger(poolId) || poolId <= 0) throw new Error("请选择所属卡池");

  return {
    name,
    cost: parseCost(String(formData.get("cost") ?? "")),
    type,
    rarity,
    damage: parseNullableNumber(String(formData.get("damage") ?? "")),
    block: parseNullableNumber(String(formData.get("block") ?? "")),
    description: String(formData.get("description") ?? ""),
    exhaust: formData.get("exhaust") === "on",
    upgradedDescription: String(formData.get("upgradedDescription") ?? "") || null,
    poolId,
  };
}

export async function createCard(formData: FormData) {
  try {
    const data = parseForm(formData);
    // slug/nameEn 由名称 + 时间戳生成，避免与已有数据冲突
    const slug = `${data.name}-${Date.now()}`;
    await prisma.card.create({
      data: { ...data, slug, nameEn: slug },
    });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateCard(formData: FormData) {
  try {
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("无效的卡牌ID");
    const data = parseForm(formData);
    await prisma.card.update({ where: { id }, data });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteCard(formData: FormData) {
  try {
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("无效的卡牌ID");
    await prisma.card.delete({ where: { id } });
    revalidatePath("/admin/cards");
    return { ok: true };
  } catch {
    return { ok: false, error: "删除失败（可能已被牌组引用）" };
  }
}
