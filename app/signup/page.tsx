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
    } catch {
      setMessage("Verzenden van e-mail mislukt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_#d4d4d8_0,_#fafafa_42%,_#fafafa_100%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,_#27272a_0,_#09090b_42%,_#09090b_100%)] sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-2xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white sm:p-8">
          <Link href="/" className="mb-10 inline-flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-bold text-zinc-950">MB</span><span className="font-semibold">Major Builder</span></Link>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Aan de slag</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account aanmaken</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">Vul je e-mailadres in. Je account wordt aangemaakt zodra je de veilige link opent.</p>
        </div>
        <div className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="grid gap-4">
        <label htmlFor="email" className="text-sm font-medium">E-mailadres</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@voorbeeld.nl"
          className="min-h-12 rounded-xl border border-zinc-300 bg-transparent px-4 py-3 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-700 dark:focus:ring-zinc-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-950"
        >
          {loading ? "Verzenden..." : "Registratielink versturen"}
        </button>
      </form>
      <div className="mt-5 text-center text-sm text-zinc-500">
        <span>Heb je al een account? </span>
        <Link className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-white" href="/login">Inloggen</Link>
      </div>
      {message && (
        <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{message}</p>
      )}
        </div>
      </div>
    </main>
  );
}
