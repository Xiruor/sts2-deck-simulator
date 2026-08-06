"use client";

/**
 * 用户登录页 —— 邮箱 + 密码表单
 * - 使用 useActionState 管理提交状态，Server Action 处理登录
 * - 登录成功后跳转 /decks 或 ?callbackUrl= 指定页
 */
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/decks";

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-xl border border-border bg-background-secondary p-6"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
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
        {pending ? "登录中..." : "登录"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        还没有账号？
        <Link href="/register" className="ml-1 text-accent hover:underline">
          立即注册
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">登录</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          登录后可将牌组保存到云端，跨设备同步
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      <Link href="/" className="text-xs text-muted-foreground hover:text-accent">
        ← 返回首页
      </Link>
    </main>
  );
}
