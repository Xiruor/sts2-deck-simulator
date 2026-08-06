import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * 用户不存在（可区分错误提示）
 */
export class UserNotFoundError extends CredentialsSignin {
  code = "user_not_found";
}

/**
 * 密码错误（可区分错误提示）
 */
export class InvalidPasswordError extends CredentialsSignin {
  code = "invalid_password";
}

// Auth.js v5 配置
// - PrismaAdapter：数据库用户存储（Credentials 流程不触发 adapter 写库，安全）
// - Credentials Provider：邮箱 + 密码登录，bcrypt 校验
// - JWT 会话策略：不使用数据库会话
// - session callback 注入 role 字段
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as never),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) {
          throw new CredentialsSignin();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new UserNotFoundError();
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new InvalidPasswordError();
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时把数据库中的 role 写入 token
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      // 会话读取时把 token 中的 role 注入 session.user
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
