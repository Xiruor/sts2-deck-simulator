// 数据导入种子脚本：先插入角色，再插入卡牌
// 运行方式：pnpm prisma db seed （或 pnpm exec tsx prisma/seed.ts）
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import type { CardRarity, CardType } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import ironcladCards from "../src/data/cards/ironclad.json";
import silentCards from "../src/data/cards/silent.json";
import defectCards from "../src/data/cards/defect.json";
import regentCards from "../src/data/cards/regent.json";
import necrobinderCards from "../src/data/cards/necrobinder.json";

// JSON 卡牌条目类型（与 src/data/cards/*.json 结构一致）
interface CardSeedItem {
  id: number;
  name: string;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  damage?: number;
  block?: number;
  description: string;
  exhaust?: boolean;
}

// 角色基础数据（id 与卡牌文件一一对应）
const characters = [
  { id: 1, name: "铁甲战士", hp: 80, color: "#e5484d", coverImage: "/images/characters/ironclad.png" },
  { id: 2, name: "静默猎人", hp: 70, color: "#22c55e", coverImage: "/images/characters/silent.png" },
  { id: 3, name: "故障机器人", hp: 75, color: "#3b82f6", coverImage: "/images/characters/defect.png" },
  { id: 4, name: "储君", hp: 75, color: "#d4a017", coverImage: "/images/characters/regent.png" },
  { id: 5, name: "亡灵契约师", hp: 66, color: "#8b5cf6", coverImage: "/images/characters/necrobinder.png" },
];

const cardSets: { characterId: number; cards: CardSeedItem[] }[] = [
  { characterId: 1, cards: ironcladCards as CardSeedItem[] },
  { characterId: 2, cards: silentCards as CardSeedItem[] },
  { characterId: 3, cards: defectCards as CardSeedItem[] },
  { characterId: 4, cards: regentCards as CardSeedItem[] },
  { characterId: 5, cards: necrobinderCards as CardSeedItem[] },
];

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  // 按依赖顺序清空旧数据（DeckCard → Deck → Card → Character）
  console.log("[seed] 清空旧数据...");
  await prisma.deckCard.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.card.deleteMany();
  await prisma.character.deleteMany();

  // 1. 插入角色
  console.log(`[seed] 插入角色：${characters.length} 个`);
  await prisma.character.createMany({ data: characters });

  // 2. 批量插入卡牌
  let total = 0;
  for (const { characterId, cards } of cardSets) {
    const data = cards.map((c) => ({
      id: c.id,
      slug: `card-${c.id}`,
      nameEn: c.name,
      name: c.name,
      cost: c.cost,
      type: c.type,
      rarity: c.rarity,
      damage: c.damage ?? null,
      block: c.block ?? null,
      description: c.description,
      exhaust: c.exhaust ?? false,
      poolId: characterId,
    }));
    const result = await prisma.card.createMany({ data });
    total += result.count;
    console.log(`[seed] 角色 ${characterId}：插入 ${result.count} 张卡牌`);
  }

  console.log(`[seed] 完成，共插入 ${total} 张卡牌`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[seed] 执行失败：", error);
  process.exit(1);
});
