"use server";

/**
 * 用户注册 Server Action（useActionState 兼容签名）
 * - 校验必填字段 / 邮箱格式 / 密码长度 / 两次密码一致 / 邮箱唯一
 * - bcrypt 加密存储，默认角色 VIEWER（只读，无法进入管理后台）
 * - 注册成功后自动登录并跳转 /decks
 */
import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface RegisterState {
  error?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: RegisterState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "请输入用户名";
  if (!email || !EMAIL_RE.test(email)) fieldErrors.email = "请输入有效的邮箱地址";
  if (password.length < 6) fieldErrors.password = "密码至少 6 位";
  if (password !== confirmPassword) fieldErrors.confirmPassword = "两次输入的密码不一致";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "请检查表单填写", fieldErrors };
  }

  // 邮箱唯一性检查
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "该邮箱已被注册", fieldErrors: { email: "该邮箱已被注册" } };
  }

  // bcrypt 加密存储
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed, role: "VIEWER" },
  });

  // 注册成功自动登录
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "注册成功，但自动登录失败，请手动登录" };
    }
    return { error: "注册成功，但自动登录失败，请手动登录" };
  }

  redirect("/decks");
}
