"use client";

/**
 * 管理后台登录页 —— 邮箱 + 密码表单，Server Action 处理登录。
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await loginAction(new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      router.push("/admin");
    } else {
      setError(res?.error ?? "登录失败");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">登录后管理卡牌数据</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-3 rounded-xl border border-border bg-background-secondary p-6"
      >
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
            placeholder="admin@example.com"
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

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-9 w-full rounded-md bg-accent text-sm font-semibold text-white transition-colors hover:bg-[#8f73ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "登录中..." : "登录"}
        </button>
      </form>

      <Link href="/" className="text-xs text-muted-foreground hover:text-accent">
        ← 返回首页
      </Link>
    </main>
  );
}
