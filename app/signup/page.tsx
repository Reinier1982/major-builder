"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.ok) {
        setMessage("Check your email to finish signing up.");
      } else {
        setMessage(result?.error ?? "Something went wrong.");
      }
    } catch (err) {
      setMessage("Failed to send email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Sign up</h1>
      <p style={{ marginBottom: 12, color: "#555" }}>
        Enter your email and we’ll send you a magic link. Your account will be
        created on first sign-in.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 6 }}
        >
          {loading ? "Sending..." : "Send sign-up link"}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        <span style={{ marginRight: 8 }}>Already have an account?</span>
        <Link href="/login">Sign in</Link>
      </div>
      {message && (
        <p style={{ marginTop: 12, color: "#444" }}>{message}</p>
      )}
    </main>
  );
}
