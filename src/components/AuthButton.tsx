"use client";

/**
 * 导航栏用户区 —— 显示登录/注册入口或当前用户 + 退出
 * - mount 后读取 /api/auth/session 判断登录态
 * - 未登录：登录 / 注册链接
 * - 已登录：用户名 + 退出表单
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/logout/actions";

interface SessionUser {
  name?: string | null;
  email?: string | null;
}

export default function AuthButton() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (!cancelled) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载中不渲染，避免闪烁
  if (user === undefined) return null;

  if (!user) {
    return (
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff]"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="ml-auto flex shrink-0 items-center gap-3">
      <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
        {user.name ?? user.email}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
        >
          退出
        </button>
      </form>
    </div>
  );
}
