import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * 全局中间件（Task 8）
 * - 拦截 /admin/* 路由，未登录跳转 /admin/login
 * - 非 ADMIN 角色访问返回 403（会话补充 role 字段后生效）
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as { role?: string } | null | undefined;
  const isLoggedIn = !!user;
  const isLoginPage = pathname === "/admin/login";

  if (pathname.startsWith("/admin")) {
    // 未登录（登录页除外）→ 跳转登录
    if (!isLoggedIn && !isLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
    // 已登录访问登录页 → 直接进入后台
    if (isLoggedIn && isLoginPage) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    // 非 ADMIN 角色 → 403（需在 lib/auth.ts 的 session callback 中注入 role）
    if (isLoggedIn && user.role && user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问管理后台" }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
