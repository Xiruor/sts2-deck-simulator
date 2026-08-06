import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * 路由保护中间件
 * - 保护 /admin/* 路由，未登录跳转 /admin/login；非 ADMIN 角色访问返回 403
 * - /login、/register 公开；已登录用户访问时直接进入 /decks
 *
 * 注：使用 Node.js runtime（Next 15.5 稳定支持），以便 auth 安全加载 Prisma。
 * 重定向 URL 基于请求 Host 头构造，避免 AUTH_URL 与实际端口不一致时跳错端口。
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isLoggedIn = !!user;
  const isAdminLoginPage = pathname === "/admin/login";

  // 基于当前请求的 Host 构造绝对 URL（AUTH_URL 可能与 dev 端口不同）
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const origin = `${proto}://${host}`;

  if (pathname.startsWith("/admin")) {
    // 未登录（登录页除外）→ 跳转登录
    if (!isLoggedIn && !isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", origin));
    }
    // 已登录访问登录页 → 直接进入后台
    if (isLoggedIn && isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin/cards", origin));
    }
    // 非 ADMIN 角色 → 403
    if (isLoggedIn && user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问管理后台" }, { status: 403 });
    }
  }

  // 已登录用户访问登录/注册页 → 直接进入我的牌组
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/decks", origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/login", "/register"],
  runtime: "nodejs",
};
