"use client";

/**
 * 管理后台 · 卡牌 CRUD 表格（Client Component）
 * - 列表展示全部卡牌，支持按名称/角色关键字过滤
 * - 新增 / 编辑共用一张表单，删除直接调用 Server Action
 */
import { useMemo, useState } from "react";
import { createCard, deleteCard, updateCard } from "./actions";

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

const EMPTY_FORM = {
  name: "",
  poolId: 1,
  cost: "",
  type: "ATTACK",
  rarity: "COMMON",
  damage: "",
  block: "",
  description: "",
  exhaust: false,
  upgradedDescription: "",
};

export default function AdminCardsTable({
  cards,
  characters,
}: {
  cards: AdminCardRow[];
  characters: { id: number; name: string }[];
}) {
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<number | null>(null); // null = 新增，其余为卡牌 id
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      filter.trim()
        ? cards.filter(
            (c) =>
              c.name.includes(filter.trim()) || c.characterName.includes(filter.trim())
          )
        : cards,
    [cards, filter]
  );

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (card: AdminCardRow) => {
    setEditing(card.id);
    setForm({
      name: card.name,
      poolId: card.poolId,
      cost: card.cost === null ? "" : String(card.cost),
      type: card.type,
      rarity: card.rarity,
      damage: card.damage === null ? "" : String(card.damage),
      block: card.block === null ? "" : String(card.block),
      description: card.description,
      exhaust: card.exhaust,
      upgradedDescription: card.upgradedDescription ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res =
      editing === null
        ? await createCard(formData)
        : await updateCard(formData);
    setMessage(res.ok ? "保存成功" : (res as { error?: string }).error ?? "保存失败");
    if (res.ok) startCreate();
  };

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputCls =
    "h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent";
  const labelCls = "mb-1 block text-[11px] text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* 表单 */}
      <div className="rounded-xl border border-border bg-background-secondary p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{editing === null ? "新增卡牌" : `编辑卡牌 #${editing}`}</h2>
          <button
            type="button"
            onClick={startCreate}
            className="text-xs font-semibold text-accent hover:underline"
          >
            ＋ 新增
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {editing !== null && <input type="hidden" name="id" value={editing} />}
          <div>
            <label className={labelCls}>名称 *</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls + " w-full"}
            />
          </div>
          <div>
            <label className={labelCls}>所属卡池 *</label>
            <select
              name="poolId"
              value={form.poolId}
              onChange={(e) => set("poolId", Number(e.target.value))}
              className={inputCls + " w-full"}
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
              className={inputCls + " w-full"}
              placeholder="如 1"
            />
          </div>
          <div>
            <label className={labelCls}>类型</label>
            <select
              name="type"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={inputCls + " w-full"}
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
              className={inputCls + " w-full"}
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
              className={inputCls + " w-full"}
              placeholder="如 6"
            />
          </div>
          <div>
            <label className={labelCls}>格挡</label>
            <input
              name="block"
              value={form.block}
              onChange={(e) => set("block", e.target.value)}
              className={inputCls + " w-full"}
              placeholder="如 5"
            />
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <input
              name="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls + " w-full"}
            />
          </div>
          <div>
            <label className={labelCls}>升级后描述</label>
            <input
              name="upgradedDescription"
              value={form.upgradedDescription}
              onChange={(e) => set("upgradedDescription", e.target.value)}
              className={inputCls + " w-full"}
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
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-[#8f73ff]"
            >
              {editing === null ? "创建" : "保存修改"}
            </button>
            {message && (
              <span className="text-xs text-accent">{message}</span>
            )}
          </div>
        </form>
      </div>

      {/* 列表 */}
      <div className="rounded-xl border border-border bg-background-secondary">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
            共 {filtered.length} 张卡牌
          </span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="按名称/角色过滤..."
            className={inputCls + " w-44"}
          />
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
                        onClick={() => startEdit(card)}
                        className="text-accent hover:underline"
                      >
                        编辑
                      </button>
                      <form
                        action={async (formData) => {
                          const res = await deleteCard(formData);
                          setMessage(res.ok ? "已删除" : (res as { error?: string }).error ?? "删除失败");
                        }}
                      >
                        <input type="hidden" name="id" value={card.id} />
                        <button type="submit" className="text-muted-foreground hover:text-red-400">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
