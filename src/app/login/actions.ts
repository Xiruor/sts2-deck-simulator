"use server";

/**
 * 用户登录 Server Action（useActionState 兼容签名）
 * - 通过 next-auth Credentials 校验邮箱 + 密码
 * - 成功后重定向到 /decks（或 callbackUrl 指定页）
 * - 区分"用户不存在 / 密码错误 / 邮箱密码错误"提示
 */
import { signIn } from "@/lib/auth";
import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  if (!email || !password) {
    return { error: "请输入邮箱和密码" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      if (e.code === "user_not_found") return { error: "该邮箱未注册，请先注册" };
      if (e.code === "invalid_password") return { error: "密码错误" };
      return { error: "邮箱或密码错误" };
    }
    return { error: "登录失败，请稍后重试" };
  }

  // 仅允许站内相对路径，防止开放重定向
  const safe = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/decks";
  redirect(safe);
}
