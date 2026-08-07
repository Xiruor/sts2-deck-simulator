import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "杀戮尖塔2 牌组模拟器",
  description:
    "面向全栈作品集的卡牌构筑与战斗模拟工具：5个角色、567+张卡牌的筛选、编辑、拖拽组牌、统计分析与单局战斗模拟。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>

        {/* 页脚：管理后台入口（不放主导航）+ GitHub 链接 + 版权声明 */}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-[1500px] flex-col items-center gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:justify-between">
            <p className="text-center sm:text-left">
              本项目为非官方粉丝工具，卡牌图片版权归Mega Crit, LLC所有。图片来源于公开Wiki，仅用于信息参考。如有侵权请联系移除。
            </p>
            <div className="flex shrink-0 items-center gap-4">
              <a
                href="/admin"
                className="text-muted transition-colors hover:text-accent"
              >
                管理后台
              </a>
              {/* GitHub 链接：作者主页 */}
              <a
                href="https://github.com/Xiruor"
                target="_blank"
                rel="noreferrer"
                className="text-muted transition-colors hover:text-accent"
              >
                GitHub
              </a>
              <span className="text-muted/60">© {new Date().getFullYear()} STS2 Deck Simulator</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
