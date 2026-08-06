"use client";

/**
 * 顶部导航栏 —— 4 个主导航项 + 移动端汉堡菜单折叠。
 * Logo 点击回到首页，当前路由高亮。
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AuthButton from "./AuthButton";

const NAV_ITEMS = [
  { href: "/cards", label: "卡牌总览" },
  { href: "/deck", label: "组牌工作台" },
  { href: "/battle", label: "战斗模拟" },
  { href: "/decks", label: "我的牌组" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 精确匹配当前导航项（/deck 不会误匹配 /decks）
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-[1500px] items-center gap-6 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#7c5cff] to-[#4a2fd0] text-sm font-black text-white">
            牌
          </span>
          <span className="hidden text-sm font-bold tracking-wide sm:inline">
            STS2 牌组模拟器
          </span>
        </Link>

        {/* 桌面端导航 */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-muted hover:bg-background-secondary hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* 用户区：登录/注册 或 当前用户 + 退出 */}
        <AuthButton />

        {/* 汉堡按钮（移动端） */}
        <button
          type="button"
          aria-label="切换菜单"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-md border border-border md:hidden"
        >
          <span
            className={cn(
              "h-0.5 w-4 rounded bg-foreground transition-transform",
              open && "translate-y-1.5 rotate-45"
            )}
          />
          <span className={cn("h-0.5 w-4 rounded bg-foreground transition-opacity", open && "opacity-0")} />
          <span
            className={cn(
              "h-0.5 w-4 rounded bg-foreground transition-transform",
              open && "-translate-y-1.5 -rotate-45"
            )}
          />
        </button>
      </nav>

      {/* 移动端下拉菜单 */}
      {open && (
        <ul className="space-y-1 border-t border-border px-4 py-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  isActive(item.href)
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-muted hover:bg-background-secondary hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
