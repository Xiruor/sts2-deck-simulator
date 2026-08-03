"use client";

/**
 * 卡牌网格 —— 响应式布局，遍历 cards 渲染 GameCard。
 */
import GameCard, { type GameCardRarity, type GameCardType } from "./GameCard";

export interface CardGridItem {
  slug: string;
  name: string;
  cost: number | null;
  type: GameCardType;
  rarity: GameCardRarity;
  character: string;
  description: string;
  upgradedDescription?: string;
  exhaust?: boolean;
  imageNormal?: string;
  imageUpgraded?: string;
}

export interface CardGridProps {
  cards: CardGridItem[];
  size?: "sm" | "md" | "lg";
  selectedSlugs?: Set<string>;
  onCardClick?: (slug: string) => void;
}

export default function CardGrid({
  cards,
  size = "sm",
  selectedSlugs,
  onCardClick,
}: CardGridProps) {
  return (
    <div className="grid max-h-[500px] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 overflow-y-auto p-1">
      {cards.map((card) => (
        <GameCard
          key={card.slug}
          {...card}
          size={size}
          isSelected={selectedSlugs?.has(card.slug) ?? false}
          onClick={onCardClick ? () => onCardClick(card.slug) : undefined}
        />
      ))}
    </div>
  );
}
