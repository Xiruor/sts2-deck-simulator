"use client";

/**
 * 用户注册页 —— 用户名 + 邮箱 + 密码表单
 * - 使用 useActionState 管理提交状态，Server Action 处理注册
 * - 注册成功后自动登录并跳转 /decks
 */
import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const fe = state.fieldErrors ?? {};

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">注册账号</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          免费注册，云端保存你的牌组方案
        </p>
      </div>

      <form
        action={formAction}
        className="w-full space-y-3 rounded-xl border border-border bg-background-secondary p-6"
      >
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-muted-foreground">
            用户名
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="nickname"
            placeholder="如何称呼你"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          {fe.name && <p className="mt-1 text-xs text-red-400">{fe.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-muted-foreground">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          {fe.email && <p className="mt-1 text-xs text-red-400">{fe.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-muted-foreground">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="至少 6 位"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          {fe.password && <p className="mt-1 text-xs text-red-400">{fe.password}</p>}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-xs text-muted-foreground">
            确认密码
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="再次输入密码"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          {fe.confirmPassword && (
            <p className="mt-1 text-xs text-red-400">{fe.confirmPassword}</p>
          )}
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-9 w-full rounded-md bg-accent text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "注册中..." : "注册并登录"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          已有账号？
          <Link href="/login" className="ml-1 text-accent hover:underline">
            去登录
          </Link>
        </p>
      </form>

      <Link href="/" className="text-xs text-muted-foreground hover:text-accent">
        ← 返回首页
      </Link>
    </main>
  );
}
