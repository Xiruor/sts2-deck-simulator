"use client";

/**
 * 分享还原的客户端加载器：
 * 挂载后把解码出的牌组数据写入 Zustand store，并自动跳转到 /deck 工作台。
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDeckStore } from "@/store/deckStore";
import type { DeckCardEntry } from "@/types/card";

export interface SharedDeckData {
  characterSlug: string;
  cards: DeckCardEntry[];
}

export default function LoadSharedDeck({ data }: { data: SharedDeckData }) {
  const router = useRouter();
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const setCharacter = useDeckStore((s) => s.setCharacter);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setCharacter(data.characterSlug);
    loadDeck(data.cards);
    // 保留 hash 无意义，直接替换到工作台
    router.replace(`/deck?character=${data.characterSlug}`);
  }, [data, loadDeck, setCharacter, router]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="text-sm text-muted-foreground">正在还原牌组数据并跳转到工作台...</p>
    </main>
  );
}
