import Link from "next/link";

/**
 * 更多网站页面（Server Component）
 * - 相关网站 / 开源项目 / 联系作者
 */

// 相关网站
const WEBSITES = [
  {
    name: "《杀戮尖塔2》官网",
    desc: "Mega Crit 官方游戏主页，查看游戏介绍、新闻与抢先体验信息。",
    href: "https://www.megacrit.com/",
  },
  {
    name: "《杀戮尖塔2》中文维基",
    desc: "中文攻略与 Wiki，收录全部卡牌、遗物、药水、事件与敌人资料。",
    href: "https://slaythespire2.net/zh-CN",
  },
  {
    name: "专业维基数据库",
    desc: "深度数据向的卡牌、遗物与强度排行数据库。",
    href: "https://slaythespire2.gg/",
  },
  {
    name: "网页游戏“Slay the Web”",
    desc: "浏览器端的卡牌构筑 Roguelike 网页游戏，点击即可开玩。",
    href: "https://slaytheweb.cards/",
  },
];

// 开源项目
const PROJECTS = [
  {
    name: "STS2 牌组模拟器（开源）",
    desc: "本项目已开源，欢迎 Star、Fork 与贡献代码。",
    href: "https://github.com/Xiruor/sts2_deck_simulator",
  },
];

// 联系作者
const EMAILS = [
  { label: "作者邮箱", address: "huangcong2752@gmail.com" },
  { label: "备用邮箱", address: "chdcv241@gmail.com" },
];

function LinkCard({ name, desc, href }: { name: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-xl border border-border bg-background-secondary p-5 transition-colors hover:border-accent/50"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-accent">{name}</h3>
        <span className="text-xs text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          打开 ↗
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted">{desc}</p>
      <span className="truncate text-xs break-all text-muted/70">{href}</span>
    </a>
  );
}

export default function LinksPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1500px] flex-col gap-12 px-4 py-14">
      {/* 相关网站 */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-xl font-bold">相关网站</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WEBSITES.map((w) => (
            <LinkCard key={w.href} {...w} />
          ))}
        </div>
      </section>

      {/* 开源项目 + 联系作者 */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-xl font-bold">开源与联系</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p) => (
            <LinkCard key={p.href} {...p} />
          ))}
          {EMAILS.map((e) => (
            <Link
              key={e.address}
              href={`mailto:${e.address}`}
              className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-background-secondary p-5 transition-colors hover:border-accent/50"
            >
              <h3 className="text-base font-semibold text-accent">{e.label}</h3>
              <p className="text-sm leading-relaxed break-all text-muted">{e.address}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
