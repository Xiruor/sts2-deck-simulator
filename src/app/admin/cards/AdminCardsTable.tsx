"use client";

/**
 * 管理后台 · 卡牌 CRUD 表格（Client Component）
 * - 列表展示全部卡牌，筛选栏与卡牌总览完全一致（共享 CardFilter + filterCards 逻辑）
 * - 新增 / 编辑共用受控表单对话框（useActionState 管理提交状态）
 * - 删除需二次确认弹窗
 */
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createCard,
  deleteCard,
  updateCard,
  type CreateCardInput,
} from "@/lib/actions/card";
import type { CardRarity, CardType } from "@/generated/prisma/client";
import CardFilter, { type FilterState } from "@/components/cards/CardFilter";
import { filterCards } from "@/lib/cardFilter";

export interface AdminCardRow {
  id: number;
  name: string;
  cost: number | null;
  type: string;
  rarity: string;
  damage: number | null;
  block: number | null;
  description: string;
  exhaust: boolean;
  upgradedDescription: string | null;
  characterName: string;
  poolId: number;
}

const TYPE_LABELS: Record<string, string> = {
  ATTACK: "攻击",
  SKILL: "技能",
  POWER: "能力",
  STATUS: "状态",
  CURSE: "诅咒",
  QUEST: "任务",
};

const RARITY_LABELS: Record<string, string> = {
  BASIC: "基础",
  COMMON: "普通",
  UNCOMMON: "罕见",
  RARE: "稀有",
  SPECIAL: "特殊",
  ANCIENT: "先古之民",
  EVENT: "事件",
  CURSE: "诅咒",
  QUEST: "任务",
  STATUS: "状态",
};

interface FormState {
  ok?: boolean;
  error?: string;
}

/** 受控表单字段（字符串态，便于输入） */
interface CardFormValues {
  name: string;
  poolId: string;
  cost: string;
  type: string;
  rarity: string;
  damage: string;
  block: string;
  description: string;
  exhaust: boolean;
  upgradedDescription: string;
}

const EMPTY_FORM: CardFormValues = {
  name: "",
  poolId: "1",
  cost: "",
  type: "ATTACK",
  rarity: "COMMON",
  damage: "",
  block: "",
  description: "",
  exhaust: false,
  upgradedDescription: "",
};

function rowToForm(row: AdminCardRow): CardFormValues {
  return {
    name: row.name,
    poolId: String(row.poolId),
    cost: row.cost === null ? "" : String(row.cost),
    type: row.type,
    rarity: row.rarity,
    damage: row.damage === null ? "" : String(row.damage),
    block: row.block === null ? "" : String(row.block),
    description: row.description,
    exhaust: row.exhaust,
    upgradedDescription: row.upgradedDescription ?? "",
  };
}

/** 把 FormData 解析为 typed input（受控组件的 name 会同步进 FormData） */
function parseForm(formData: FormData): CreateCardInput {
  const costRaw = String(formData.get("cost") ?? "").trim();
  const damageRaw = String(formData.get("damage") ?? "").trim();
  const blockRaw = String(formData.get("block") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    poolId: Number(formData.get("poolId")),
    cost: costRaw === "" ? null : Number(costRaw),
    type: String(formData.get("type")) as CardType,
    rarity: String(formData.get("rarity")) as CardRarity,
    damage: damageRaw === "" ? null : Number(damageRaw),
    block: blockRaw === "" ? null : Number(blockRaw),
    description: String(formData.get("description") ?? ""),
    exhaust: formData.get("exhaust") === "on",
    upgradedDescription:
      String(formData.get("upgradedDescription") ?? "").trim() || null,
  };
}

const inputCls =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent";
const labelCls = "mb-1 block text-[11px] text-muted-foreground";

/* ---------------- 新增 / 编辑对话框 ---------------- */

function CardFormDialog({
  mode,
  initial,
  characters,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial: AdminCardRow | null;
  characters: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CardFormValues>(
    initial ? rowToForm(initial) : EMPTY_FORM
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const input = parseForm(formData);
      const res =
        mode === "edit" && initial
          ? await updateCard(initial.id, input)
          : await createCard(input);
      return { ok: res.ok, error: res.ok ? undefined : res.error };
    },
    { ok: false }
  );

  const set = (key: keyof CardFormValues, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  // 保存成功（revalidate 后）自动关闭对话框
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(onSaved, 400);
      return () => clearTimeout(t);
    }
  }, [state.ok, onSaved]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-background-secondary p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">
            {mode === "edit" ? `编辑卡牌 #${initial?.id}` : "新增卡牌"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>名称 *</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>所属卡池 *</label>
            <select
              name="poolId"
              value={form.poolId}
              onChange={(e) => set("poolId", e.target.value)}
              className={inputCls}
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>费用（-1=X，留空=不可打出）</label>
            <input
              name="cost"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              className={inputCls}
              placeholder="如 1"
            />
          </div>
          <div>
            <label className={labelCls}>类型</label>
            <select
              name="type"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={inputCls}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>稀有度</label>
            <select
              name="rarity"
              value={form.rarity}
              onChange={(e) => set("rarity", e.target.value)}
              className={inputCls}
            >
              {Object.entries(RARITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>伤害</label>
            <input
              name="damage"
              value={form.damage}
              onChange={(e) => set("damage", e.target.value)}
              className={inputCls}
              placeholder="如 6"
            />
          </div>
          <div>
            <label className={labelCls}>格挡</label>
            <input
              name="block"
              value={form.block}
              onChange={(e) => set("block", e.target.value)}
              className={inputCls}
              placeholder="如 5"
            />
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <input
              name="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>升级后描述</label>
            <input
              name="upgradedDescription"
              value={form.upgradedDescription}
              onChange={(e) => set("upgradedDescription", e.target.value)}
              className={inputCls}
            />
          </div>
          <label className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="exhaust"
              checked={form.exhaust}
              onChange={(e) => set("exhaust", e.target.checked)}
              className="accent-[#7c5cff]"
            />
            消耗
          </label>

          {state.error && (
            <p className="col-span-full rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {state.error}
            </p>
          )}

          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-[#8f73ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "保存中..." : mode === "edit" ? "保存修改" : "创建"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-border px-4 text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            {state.ok && (
              <span className="text-xs text-accent">保存成功，正在刷新…</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- 删除确认弹窗 ---------------- */

function DeleteConfirmDialog({
  card,
  onClose,
  onDeleted,
}: {
  card: AdminCardRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const res = await deleteCard(Number(formData.get("id")));
      return { ok: res.ok, error: res.ok ? undefined : res.error };
    },
    { ok: false }
  );

  // 删除成功（revalidate 后）自动关闭弹窗
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(onDeleted, 400);
      return () => clearTimeout(t);
    }
  }, [state.ok, onDeleted]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background-secondary p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold">删除卡牌</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          确认删除 <span className="font-semibold text-foreground">{card.name}</span>（#{card.id}）吗？此操作不可撤销。
        </p>

        {state.error && (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {state.error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-8 rounded-md border border-border px-4 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            取消
          </button>
          <form action={formAction}>
            <input type="hidden" name="id" value={card.id} />
            <button
              type="submit"
              disabled={pending}
              className="h-8 rounded-md bg-red-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "删除中..." : "确认删除"}
            </button>
          </form>
        </div>

        {state.ok && (
          <p className="mt-3 text-xs text-accent">已删除，正在刷新…</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- 主表格 ---------------- */

export default function AdminCardsTable({
  cards,
  characters,
}: {
  cards: AdminCardRow[];
  characters: { id: number; name: string }[];
}) {
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    character: "全部",
    types: [],
    rarities: [],
    costs: [],
    upgraded: "0",
  });
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit";
    card: AdminCardRow | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<AdminCardRow | null>(null);
  const [message, setMessage] = useState("");

  // 筛选逻辑与卡牌总览完全一致（共享 CardFilter + filterCards）
  const filtered = useMemo(() => {
    const matched = filterCards(
      cards.map((c) => ({
        id: c.id,
        name: c.name,
        type: TYPE_LABELS[c.type] ?? c.type,
        rarity: RARITY_LABELS[c.rarity] ?? c.rarity,
        cost: c.cost,
        character: c.characterName,
      })),
      filter
    );
    const ids = new Set(matched.map((m) => m.id));
    return cards.filter((c) => ids.has(c.id));
  }, [cards, filter]);

  return (
    <div className="space-y-4">
      {/* 筛选栏：与卡牌总览完全一致（共享 CardFilter + filterCards 逻辑） */}
      <CardFilter state={filter} onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))} />

      {/* 列表 */}
      <div className="rounded-xl border border-border bg-background-secondary">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
            共 {filtered.length} 张卡牌
          </span>
          <div className="flex items-center gap-3">
            {message && <span className="text-xs text-accent">{message}</span>}
            <button
              type="button"
              onClick={() => setDialog({ mode: "create", card: null })}
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              ＋ 新增卡牌
            </button>
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-background-secondary text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">名称</th>
                <th className="px-3 py-2 font-medium">角色</th>
                <th className="px-3 py-2 font-medium">费用</th>
                <th className="px-3 py-2 font-medium">类型</th>
                <th className="px-3 py-2 font-medium">稀有度</th>
                <th className="px-3 py-2 font-medium">伤害</th>
                <th className="px-3 py-2 font-medium">格挡</th>
                <th className="px-3 py-2 font-medium">消耗</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => (
                <tr key={card.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{card.id}</td>
                  <td className="px-3 py-1.5 font-medium">{card.name}</td>
                  <td className="px-3 py-1.5 text-muted">{card.characterName}</td>
                  <td className="px-3 py-1.5 text-muted">
                    {card.cost === null ? "-" : card.cost === -1 ? "X" : card.cost}
                  </td>
                  <td className="px-3 py-1.5 text-muted">{TYPE_LABELS[card.type] ?? card.type}</td>
                  <td className="px-3 py-1.5 text-muted">{RARITY_LABELS[card.rarity] ?? card.rarity}</td>
                  <td className="px-3 py-1.5 text-muted">{card.damage ?? "-"}</td>
                  <td className="px-3 py-1.5 text-muted">{card.block ?? "-"}</td>
                  <td className="px-3 py-1.5 text-muted">{card.exhaust ? "是" : "-"}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setDialog({ mode: "edit", card })}
                        className="text-accent hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(card)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增 / 编辑对话框 */}
      {dialog && (
        <CardFormDialog
          key={dialog.mode === "edit" ? `edit-${dialog.card?.id}` : "create"}
          mode={dialog.mode}
          initial={dialog.card}
          characters={characters}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setMessage(dialog.mode === "edit" ? "保存成功" : "创建成功");
            setDialog(null);
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleting && (
        <DeleteConfirmDialog
          card={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setMessage("已删除");
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
