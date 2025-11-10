import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Resend } from "resend";

import db from "../db";
import { users, accounts, sessions, verificationTokens } from "../db/schema";
import { eq } from "drizzle-orm";

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
    EmailProvider({
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (!process.env.RESEND_API_KEY) {
          throw new Error(
            "RESEND_API_KEY is not set. Add it to your .env and restart the server."
          );
        }
        const from = (provider.from as string) || process.env.EMAIL_FROM;
        if (!from) {
          throw new Error(
            "EMAIL_FROM is not set. Configure a verified sender in Resend and set EMAIL_FROM."
          );
        }
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { host } = new URL(url);

        const escapedHost = host.replace(/\./g, "&#8203;.");
        const html = `
          <body style="background:#f9f9f9;margin:0;padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #eaeaea;border-radius:6px;">
              <tr>
                <td style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111;">
                  <h2 style="margin:0 0 12px 0;font-size:20px;">Sign in to ${escapedHost}</h2>
                  <p style="margin:0 0 16px 0;line-height:1.5;color:#444;">Click the button below to sign in.</p>
                  <p style="margin:0 0 16px 0;">
                    <a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600">Sign in</a>
                  </p>
                  <p style="margin:16px 0 0 0;color:#666;">If the button doesn’t work, copy and paste this URL:</p>
                  <p style="word-break:break-all;margin:8px 0 0 0;"><a href="${url}">${url}</a></p>
                </td>
              </tr>
            </table>
          </body>`;

        const text = `Sign in to ${host}\n${url}\n`;

        const { error } = await resend.emails.send({
          from,
          to: identifier,
          subject: `Sign in to ${host}`,
          html,
          text,
        });

        if (error) {
          console.error("Resend error sending verification email:", error);
          throw new Error(error.message ?? "Failed to send verification email");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, copy user role
      if (user) {
        (token as any).role = (user as any).role ?? "builder";
      }
      // If no role in token, fetch from DB
      if (token && !(token as any).role && token.sub) {
        try {
          const row = await db.select().from(users).where(eq(users.id, token.sub as string)).limit(1);
          (token as any).role = row[0]?.role ?? "builder";
        } catch {}
      }
      return token;
    },
    async session({ session, token, user }) {
      // Determine role from token (JWT), user (DB strategy), or DB by email
      let role: string | undefined = token ? (token as any).role : undefined;
      if (!role && user) role = (user as any).role;
      if (!role && session?.user?.email) {
        try {
          const row = await db.select().from(users).where(eq(users.email, session.user.email as string)).limit(1);
          role = row[0]?.role;
        } catch {}
      }
      if (session?.user) {
        (session.user as any).role = role ?? "builder";
      }
      return session;
    },
  },
};
