import type { NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Resend } from "resend";

import db from "../db";
import { users, accounts, sessions, verificationTokens } from "../db/schema";
import { eq } from "drizzle-orm";

type UserWithRole = { id?: string; role?: string };
type TokenWithRole = { sub?: string; role?: string };
type AuthProvider = NextAuthOptions["providers"][number];
type VerificationRequest = {
  identifier: string;
  url: string;
  provider: { from?: unknown };
};

function resendEmailProvider(): AuthProvider {
  const from = process.env.EMAIL_FROM ?? "";
  const maxAge = 24 * 60 * 60;
  const sendVerificationRequest = async ({ identifier, url, provider }: VerificationRequest) => {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set. Add it to your .env and restart the server.");
    }
    const sender = (provider.from as string) || process.env.EMAIL_FROM;
    if (!sender) {
      throw new Error("EMAIL_FROM is not set. Configure a verified sender in Resend and set EMAIL_FROM.");
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { host } = new URL(url);
    const escapedHost = host.replace(/\./g, "&#8203;.");
    const html = `
      <body style="background:#f9f9f9;margin:0;padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #eaeaea;border-radius:6px;">
          <tr><td style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111;">
            <h2 style="margin:0 0 12px 0;font-size:20px;">Sign in to ${escapedHost}</h2>
            <p style="margin:0 0 16px 0;line-height:1.5;color:#444;">Click the button below to sign in.</p>
            <p style="margin:0 0 16px 0;"><a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600">Sign in</a></p>
            <p style="margin:16px 0 0 0;color:#666;">If the button doesn’t work, copy and paste this URL:</p>
            <p style="word-break:break-all;margin:8px 0 0 0;"><a href="${url}">${url}</a></p>
          </td></tr>
        </table>
      </body>`;
    const { error } = await resend.emails.send({
      from: sender,
      to: identifier,
      subject: `Sign in to ${host}`,
      html,
      text: `Sign in to ${host}\n${url}\n`,
    });
    if (error) throw new Error(error.message ?? "Failed to send verification email");
  };

  const options = { from, maxAge, sendVerificationRequest };
  return {
    id: "email",
    type: "email",
    name: "Email",
    server: {},
    ...options,
    options,
  } as unknown as AuthProvider;
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "database",
  },
  debug: true,
  providers: [
    resendEmailProvider(),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const roleToken = token as typeof token & TokenWithRole;
      // On initial sign-in, copy user role
      if (user) {
        roleToken.role = (user as UserWithRole).role ?? "builder";
      }
      // If no role in token, fetch from DB
      if (!roleToken.role && roleToken.sub) {
        try {
          const row = await db.select().from(users).where(eq(users.id, roleToken.sub)).limit(1);
          roleToken.role = row[0]?.role ?? "builder";
        } catch {}
      }
      return token;
    },
    async session({ session, token, user }) {
      // Determine role from token (JWT), user (DB strategy), or DB by email
      const roleToken = token as (typeof token & TokenWithRole) | undefined;
      const databaseUser = user as UserWithRole | undefined;
      let role: string | undefined = roleToken?.role;
      if (!role && databaseUser) role = databaseUser.role;
      const userId = roleToken?.sub ?? databaseUser?.id;
      if (!role && session?.user?.email) {
        try {
          const row = await db.select().from(users).where(eq(users.email, session.user.email as string)).limit(1);
          role = row[0]?.role;
        } catch {}
      }
      if (session?.user) {
        const sessionUser = session.user as typeof session.user & UserWithRole;
        sessionUser.role = role ?? "builder";
        sessionUser.id = userId;
      }
      return session;
    },
  },
};
