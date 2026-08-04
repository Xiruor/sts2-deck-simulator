"use server";

/**
 * 管理后台登录 Server Action
 * - 通过 next-auth Credentials 校验邮箱 + 密码
 * - 校验通过后建立 JWT 会话并跳转 /admin
 * - TODO: lib/auth.ts 的 authorize 中实现数据库密码校验后即可使用
 */
import { signIn } from "@/lib/auth";

export interface LoginResult {
  ok?: boolean;
  error?: string;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "请输入邮箱和密码" };
  }

  try {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      return { error: "邮箱或密码错误" };
    }
    return { ok: true };
  } catch {
    return { error: "登录失败，请稍后重试" };
  }
}
