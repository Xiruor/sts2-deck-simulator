import { PrismaClient } from "../src/generated/prisma/index.js";

const p = new PrismaClient();
try {
  const total = await p.card.count();
  const withUpDesc = await p.card.count({ where: { upgradedDescription: { not: null } } });
  const withImg = await p.card.count({ where: { imageUpgraded: { not: null } } });
  const types = await p.card.groupBy({ by: ["type", "rarity"], _count: { _all: true } });
  console.log("total:", total);
  console.log("upgradedDescription 非空:", withUpDesc);
  console.log("imageUpgraded 非空:", withImg);
  console.log("type/rarity 分布:");
  for (const g of types) console.log(" ", g.type, g.rarity, g._count._all);
  // 有升级描述但无升级图、无升级描述但有升级图的卡
  const noImgButDesc = await p.card.findMany({ where: { upgradedDescription: { not: null }, imageUpgraded: null }, select: { id: true, slug: true, name: true } });
  const imgButNoDesc = await p.card.findMany({ where: { upgradedDescription: null, imageUpgraded: { not: null } }, select: { id: true, slug: true, name: true } });
  console.log("有升级描述但无升级图:", noImgButDesc.length);
  console.log("有升级图但无升级描述:", imgButNoDesc.length, imgButNoDesc.slice(0, 10).map((c) => c.name).join(","));
} finally {
  await p.$disconnect();
}
