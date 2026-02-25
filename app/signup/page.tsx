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
        setMessage("Controleer je e-mail om je registratie af te ronden.");
      } else {
        setMessage(result?.error ?? "Er is iets misgegaan.");
      }
    } catch (err) {
      setMessage("Verzenden van e-mail mislukt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Registreren</h1>
      <p style={{ marginBottom: 12, color: "#555" }}>
        Vul je e-mailadres in en we sturen je een inloglink. Je account wordt
        aangemaakt bij je eerste keer inloggen.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="email">E-mailadres</label>
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
          {loading ? "Verzenden..." : "Registratielink versturen"}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        <span style={{ marginRight: 8 }}>Heb je al een account?</span>
        <Link href="/login">Inloggen</Link>
      </div>
      {message && (
        <p style={{ marginTop: 12, color: "#444" }}>{message}</p>
      )}
    </main>
  );
}
