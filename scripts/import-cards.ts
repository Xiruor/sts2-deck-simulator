// ============================================================
// Wiki 卡牌导入脚本
// 数据来源：https://slaythespire2.net/zh-CN/card
//
// 说明：该 Wiki 是 Next.js App Router 站点，普通 HTML 请求只能拿到
// 部分渲染的卡牌（默认约 60 张）。加上 `RSC: 1` 请求头后可拿到完整的
// 序列化流（text/x-component），其中内嵌 `"cards":[...]` 结构化 JSON
// 数组，包含全部 569 张卡牌的名称/类型/稀有度/费用/描述/图片等字段。
//
// 运行方式：npx tsx scripts/import-cards.ts
// ============================================================
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import type { CardRarity, CardType } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const WIKI_URL = "https://slaythespire2.net/zh-CN/card";
const IMG_BASE = "https://slaythespire2.net";
// 礼貌爬取：每次写入数据库之间间隔 200ms
const REQUEST_DELAY_MS = 200;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// 卡池 → 中文名
const POOL_NAMES: Record<string, string> = {
  Ironclad: "铁甲战士",
  Silent: "静默猎手",
  Defect: "故障机器人",
  Necrobinder: "亡灵契约师",
  Regent: "储君",
  Colorless: "无色",
  Curse: "诅咒",
  Status: "状态",
  Event: "事件",
  Quest: "任务",
};

// 类型映射：Attack→攻击, Skill→技能, Power→能力, Curse→诅咒, Status→状态, Quest→任务
const TYPE_MAP: Record<string, CardType> = {
  Attack: "ATTACK",
  Skill: "SKILL",
  Power: "POWER",
  Curse: "CURSE",
  Status: "STATUS",
  Quest: "QUEST",
};

// 稀有度映射：Basic→基础, Common→普通, Uncommon→罕见, Rare→稀有,
//             Ancient→先古之民, Special→特殊, Event→事件, Curse→诅咒, Quest→任务
const RARITY_MAP: Record<string, CardRarity> = {
  Basic: "BASIC",
  Common: "COMMON",
  Uncommon: "UNCOMMON",
  Rare: "RARE",
  Ancient: "ANCIENT",
  Special: "SPECIAL",
  Event: "EVENT",
  Curse: "CURSE",
  Quest: "QUEST",
};

// 卡池角色的展示配置（非角色卡池使用占位默认值）
const POOL_HP: Record<string, number> = {
  Ironclad: 80,
  Silent: 70,
  Defect: 75,
  Necrobinder: 66,
  Regent: 75,
};
const POOL_COLORS: Record<string, string> = {
  Ironclad: "#e5484d",
  Silent: "#22c55e",
  Defect: "#3b82f6",
  Necrobinder: "#8b5cf6",
  Regent: "#d4a017",
  Colorless: "#9b96b0",
  Curse: "#8b5cf6",
  Status: "#6b6680",
  Event: "#f59e0b",
  Quest: "#10b981",
};

interface WikiCard {
  className: string;
  id: string;
  energy?: number;
  type: string;
  rarity: string;
  pool: string;
  name: string;
  descriptionClean?: string;
  descUpgraded?: string;
  image: string;
  imagePath: string;
  vars?: Record<string, number>;
  keywords?: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 去除描述中的 <g>/<e>/<s> 等 Wiki 标记 */
function cleanDesc(s?: string): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").trim();
}

/** 从 RSC 序列化流中提取 "cards":[...] 数组（括号配对） */
function extractCards(raw: string): WikiCard[] {
  const key = '"cards":[';
  const start = raw.indexOf(key);
  if (start === -1) throw new Error("未在响应中找到卡牌数据（cards 数组）");
  const begin = start + key.length - 1; // '[' 的位置
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = begin; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("未能找到卡牌数组结尾");
  return JSON.parse(raw.slice(begin, end));
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  // 1. 抓取 Wiki 数据
  console.log(`[import] 拉取 ${WIKI_URL} ...`);
  const res = await fetch(WIKI_URL, {
    headers: { RSC: "1", "User-Agent": UA, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`请求失败：HTTP ${res.status}`);
  const raw = await res.text();
  const cards = extractCards(raw);
  console.log(`[import] 获取到 ${cards.length} 张卡牌`);

  // 2. 校验 slug（image）唯一性
  const slugs = cards.map((c) => c.image);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("Wiki 数据中存在重复的 image slug");
  }

  // 3. 确保各卡池角色存在（兼容旧种子数据"静默猎人"命名）
  const existingChars = await prisma.character.findMany({
    select: { id: true, name: true },
  });
  const poolIds: Record<string, number> = {};
  for (const [pool, name] of Object.entries(POOL_NAMES)) {
    const match =
      existingChars.find((c) => c.name === name) ??
      existingChars.find((c) => name === "静默猎手" && c.name.includes("静默"));
    if (match) {
      if (match.name !== name) {
        await prisma.character.update({
          where: { id: match.id },
          data: { name },
        });
      }
      poolIds[pool] = match.id;
    } else {
      const created = await prisma.character.create({
        data: {
          name,
          hp: POOL_HP[pool] ?? 0,
          color: POOL_COLORS[pool] ?? "#6b6680",
          coverImage: `/images/pool/${pool.toLowerCase()}.webp`,
        },
      });
      poolIds[pool] = created.id;
      console.log(`[import] 新建卡池角色：${name} (id=${created.id})`);
    }
  }

  // 4. 清理旧的占位种子卡牌（slug 以 legacy- 开头）
  await prisma.deckCard.deleteMany({
    where: { card: { slug: { startsWith: "legacy-" } } },
  });
  const cleaned = await prisma.card.deleteMany({
    where: { slug: { startsWith: "legacy-" } },
  });
  if (cleaned.count > 0) {
    console.log(`[import] 清理旧种子卡牌 ${cleaned.count} 张`);
  }

  // 5. 预取现有 slug，用于区分新增/更新
  const existing = new Set(
    (await prisma.card.findMany({ select: { slug: true } })).map((c) => c.slug)
  );

  // 6. 逐张 upsert，每次间隔 200ms
  let created = 0;
  let updated = 0;
  for (const c of cards) {
    const type = TYPE_MAP[c.type];
    const rarity = RARITY_MAP[c.rarity];
    if (!type || !rarity) {
      throw new Error(`未知类型/稀有度：${c.id} -> ${c.type}/${c.rarity}`);
    }
    const data = {
      slug: c.image,
      name: c.name,
      nameEn: c.id,
      cost: c.energy ?? null, // 不可打出牌（诅咒/任务）无费用
      type,
      rarity,
      damage: c.vars?.damage ?? null,
      block: c.vars?.block ?? null,
      description: cleanDesc(c.descriptionClean),
      upgradedDescription: c.descUpgraded ? cleanDesc(c.descUpgraded) : null,
      exhaust: c.keywords?.includes("Exhaust") ?? false,
      imageNormal: IMG_BASE + c.imagePath,
      imageUpgraded: null,
      poolId: poolIds[c.pool],
    };
    await prisma.card.upsert({
      where: { slug: c.image },
      create: data,
      update: data,
    });
    if (existing.has(c.image)) updated++;
    else created++;
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(
    `[import] 完成：新增 ${created} 张，更新 ${updated} 张，共 ${cards.length} 张卡牌`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[import] 执行失败：", error);
  process.exit(1);
});
