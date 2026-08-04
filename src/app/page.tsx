import Link from "next/link";

/**
 * 首页（Server Component）
 * - Hero：项目介绍 + 两个 CTA
 * - 角色选择：5 个角色卡片，点击跳转到 /deck?character={slug}
 * - 功能介绍：拖拽组牌 / 统计分析 / 战斗模拟
 */

// 角色展示配置（与 prisma/seed.ts 的主题色一致）
const CHARACTER_DISPLAY: { slug: string; name: string; hp: number; color: string }[] = [
  { slug: "ironclad", name: "铁甲战士", hp: 80, color: "#e5484d" },
  { slug: "silent", name: "静默猎手", hp: 70, color: "#22c55e" },
  { slug: "defect", name: "故障机器人", hp: 75, color: "#3b82f6" },
  { slug: "regent", name: "储君", hp: 75, color: "#d4a017" },
  { slug: "necrobinder", name: "亡灵契约师", hp: 66, color: "#8b5cf6" },
];

// 三大核心功能
const FEATURES = [
  {
    title: "拖拽组牌",
    desc: "从卡池拖拽卡牌构筑牌组，同名卡可多张，实时类型速览与超上限提示。",
    href: "/deck",
  },
  {
    title: "统计分析",
    desc: "费用曲线、类型/稀有度分布、费伤比/费防比，随牌组变动即时重绘。",
    href: "/deck",
  },
  {
    title: "战斗模拟",
    desc: "回合制战斗引擎：抽牌、出牌、遗物触发与 Buff/Debuff 结算。",
    href: "/battle",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1500px] flex-col gap-16 px-4 py-14">
      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-4 py-1 text-xs font-bold tracking-widest text-accent uppercase">
          STS2 Deck Simulator
        </span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          杀戮尖塔2 <span className="text-accent">牌组模拟器</span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          面向全栈作品集的卡牌构筑工具：覆盖 5 个角色 567+ 张卡牌的筛选、拖拽组牌、
          统计分析与单局战斗模拟，从构组到验算一站式完成。
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/deck"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-[#8f73ff]"
          >
            开始组牌
          </Link>
          <Link
            href="/cards"
            className="rounded-lg border border-border bg-background-secondary px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/50"
          >
            浏览卡牌
          </Link>
        </div>
      </section>

      {/* 角色选择 */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-xl font-bold">选择角色开始组牌</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHARACTER_DISPLAY.map((c) => (
            <Link
              key={c.slug}
              href={`/deck?character=${c.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-background-secondary p-5 transition-all hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
                style={{ backgroundColor: c.color, boxShadow: `0 0 16px ${c.color}66` }}
              >
                {c.name.slice(0, 1)}
              </span>
              <span className="text-sm font-semibold group-hover:text-accent">{c.name}</span>
              <span className="text-xs text-muted">生命值 {c.hp}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 功能介绍 */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-xl font-bold">核心功能</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background-secondary p-5 transition-colors hover:border-accent/50"
            >
              <h3 className="text-base font-semibold text-accent">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
