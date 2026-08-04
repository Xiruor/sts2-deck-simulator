"use client";

/**
 * 牌组工作台（核心复合页面，Task 4）
 * - URL 参数 ?character={slug} 指定当前角色，?load={deckId} 从数据库加载方案
 * - 内嵌三个模块：拖拽组牌区（DeckWorkbench）+ 统计面板（DeckStats）+ 存档与分享（DeckSave）
 * - 角色、牌组数据通过 Zustand store 管理并持久化，与 /battle 共享
 */
import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeckStore } from "@/store/deckStore";
import { useCardCatalog } from "@/hooks/useCardCatalog";
import { getDeckById } from "./actions";
import DeckWorkbench from "@/components/deck/DeckWorkbench";
import DeckStats from "@/components/deck/DeckStats";
import DeckSave from "@/components/deck/DeckSave";

function DeckPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const character = searchParams.get("character") ?? "ironclad";
  const loadId = searchParams.get("load");

  const selectedCharacter = useDeckStore((s) => s.selectedCharacter);
  const setCharacter = useDeckStore((s) => s.setCharacter);
  const loadDeck = useDeckStore((s) => s.loadDeck);
  const loadedRef = useRef<string | null>(null);

  const { catalog, loading } = useCardCatalog(character);

  // URL 中的角色是唯一数据源，同步进 store
  useEffect(() => {
    if (selectedCharacter !== character) setCharacter(character);
  }, [character, selectedCharacter, setCharacter]);

  // 处理 ?load={deckId}：拉取数据库方案并填充牌组
  useEffect(() => {
    if (!loadId || loadId === loadedRef.current) return;
    loadedRef.current = loadId;
    getDeckById(Number(loadId)).then((deck) => {
      if (!deck) return;
      setCharacter(deck.characterSlug);
      loadDeck(deck.cards);
      router.replace(`/deck?character=${deck.characterSlug}`, { scroll: false });
    });
  }, [loadId, setCharacter, loadDeck, router]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">牌组工作台</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            拖拽组牌 → 实时统计 → 存档分享，一站完成
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          当前角色：{character}
        </span>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* 模块二 + 模块三：左侧组牌区，右侧统计面板（中段） */}
        <DeckWorkbench catalog={catalog} loading={loading} />
        <DeckStats catalog={catalog} />
      </div>

      {/* 模块四：存档与分享（页面底部） */}
      <div id="deck-save" className="mt-6">
        <DeckSave />
      </div>
    </main>
  );
}

export default function DeckPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-muted-foreground">加载中...</p>
      }
    >
      <DeckPageInner />
    </Suspense>
  );
}
