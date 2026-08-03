import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Auth.js v5 配置（Credentials 提供者，后续可扩展 GitHub/Google OAuth）
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(_credentials) {
        // TODO: 校验用户输入，并与 Prisma 的 User 表比对密码哈希
        // 校验通过后返回 { id, name, email, role }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
});
