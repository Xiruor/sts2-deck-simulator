"use client";

/**
 * 牌组工作台 · 模块四：存档与分享（页面底部）
 * - 已保存方案列表（方案名 / 角色 / 卡牌数 / 保存时间 / 加载 / 删除）
 * - 保存操作区（方案名输入框 + 保存按钮），未登录用户存 localStorage
 * - 分享链接生成：牌组数据压缩为 Base64 → /d/{code}，支持复制
 * - TODO: 登录用户同步到数据库（Deck 表）
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeckStore } from "@/store/deckStore";
import { characters } from "@/data/characters";
import type { DeckCardEntry } from "@/types/card";

interface SavedDeck {
  id: string;
  name: string;
  characterSlug: string;
  cards: DeckCardEntry[];
  createdAt: number;
}

const STORAGE_KEY = "deck-saves";

/** Base64URL 编码牌组数据（cardId/count/upgraded 均为 ASCII，btoa 安全） */
function encodeShare(characterSlug: string, cards: DeckCardEntry[]): string {
  const payload = {
    c: characterSlug,
    cards: cards.map((c) => [c.cardId, c.count, c.upgraded ? 1 : 0]),
  };
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function readSaves(): SavedDeck[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function DeckSave() {
  const router = useRouter();
  const cards = useDeckStore((s) => s.cards);
  const selectedCharacter = useDeckStore((s) => s.selectedCharacter);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const setCharacter = useDeckStore((s) => s.setCharacter);

  const [saves, setSaves] = useState<SavedDeck[]>([]);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  // 读取本地存档
  useEffect(() => {
    setSaves(readSaves());
  }, []);

  const charName = useMemo(
    () => characters.find((c) => c.id === selectedCharacter)?.name ?? selectedCharacter,
    [selectedCharacter]
  );

  // 分享链接
  const shareCode = useMemo(
    () => (cards.length > 0 ? encodeShare(selectedCharacter, cards) : ""),
    [cards, selectedCharacter]
  );
  const shareLink = shareCode ? `${window.location.origin}/d/${shareCode}` : "";

  const persist = (next: SavedDeck[]) => {
    setSaves(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = () => {
    if (cards.length === 0) return;
    const entry: SavedDeck = {
      id: `${Date.now()}`,
      name: name.trim() || `${charName}牌组 ${new Date().toLocaleDateString()}`,
      characterSlug: selectedCharacter,
      cards,
      createdAt: Date.now(),
    };
    persist([entry, ...saves]);
    setName("");
  };

  const handleLoad = (deck: SavedDeck) => {
    setCharacter(deck.characterSlug);
    loadDeck(deck.cards);
    router.push(`/deck?character=${deck.characterSlug}`);
  };

  const handleDelete = (id: string) => {
    persist(saves.filter((s) => s.id !== id));
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时降级为选中文本
    }
  };

  return (
    <section className="rounded-lg border border-border bg-background-secondary p-4">
      <h2 className="mb-3 text-base font-bold">存档与分享</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 保存操作区 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`方案名（默认：${charName}牌组）`}
              className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={cards.length === 0}
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-[#8f73ff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              保存方案
            </button>
          </div>

          {/* 分享链接 */}
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              分享链接（Base64 编码，无需登录即可还原）
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareLink || "请先向牌组中添加卡牌"}
                className="h-8 flex-1 truncate rounded-md border border-border bg-background-secondary px-2 text-[11px] text-muted outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={!shareLink}
                className="h-8 shrink-0 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              未登录用户保存在本地浏览器；登录后支持跨设备同步到数据库（开发中）。
            </p>
          </div>
        </div>

        {/* 已保存方案列表 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            已保存方案（{saves.length}）
          </h3>
          {saves.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              暂无已保存方案，组好牌后点击「保存方案」
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {saves.map((deck) => (
                <li
                  key={deck.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{deck.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {characters.find((c) => c.id === deck.characterSlug)?.name ?? deck.characterSlug}
                      {" · "}
                      {deck.cards.reduce((s, c) => s + c.count, 0)} 张
                      {" · "}
                      {new Date(deck.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoad(deck)}
                    className="shrink-0 rounded-md border border-accent/50 px-2 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent-soft"
                  >
                    加载
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(deck.id)}
                    className="shrink-0 text-[11px] text-muted-foreground hover:text-red-400"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
