"use server";

/**
 * 退出登录 Server Action（供 Navbar 表单调用）
 * - signOut({ redirect: false }) 只清会话，避免用 AUTH_URL 构造跳转地址
 * - 由 Next 的 redirect 基于当前请求 Host 跳回首页，端口/域名始终正确
 */
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
