import Link from "next/link";

const modules = [
  {
    href: "/cards",
    title: "卡池总览",
    desc: "8个卡池、567+张卡牌的筛选与编辑（P0）",
    badge: "P0",
  },
  {
    href: "/deck",
    title: "牌组工作台",
    desc: "拖拽组牌、类型速览、初始牌组重置（P0）",
    badge: "P0",
  },
  {
    href: "/stats",
    title: "统计分析",
    desc: "费用曲线、类型/稀有度分布、费伤比（P0）",
    badge: "P0",
  },
  {
    href: "/battle",
    title: "战斗模拟器",
    desc: "单局战斗模拟、牌堆循环、怪物编辑（P1）",
    badge: "P1",
  },
  {
    href: "/relics",
    title: "遗物搭配",
    desc: "175个遗物的挂载与效果联动（P1）",
    badge: "P1",
  },
  {
    href: "/admin",
    title: "管理后台",
    desc: "卡牌CRUD与数据管理（P2 · 需登录）",
    badge: "P2",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full border border-accent/30 bg-accent-soft px-4 py-1 text-xs font-bold tracking-widest text-accent uppercase">
          STS2 Deck Simulator
        </span>
        <h1 className="text-4xl font-bold">杀戮尖塔2 牌组模拟器</h1>
        <p className="max-w-xl text-muted">
          面向全栈作品集的卡牌构筑工具：覆盖前端拖拽交互、图表可视化、后端
          API、数据库建模、权限鉴权与部署运维。
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-background-secondary p-5 transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold group-hover:text-accent">
                {m.title}
              </h2>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                {m.badge}
              </span>
            </div>
            <p className="text-sm text-muted">{m.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
