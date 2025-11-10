"use client";

import { useSession, signOut } from "next-auth/react";

export default function ClientArea() {
  const { data: session } = useSession();
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <p>Welcome, {session?.user?.email}</p>
      <button onClick={() => signOut()} style={{ padding: 8, borderRadius: 6 }}>
        Sign out
      </button>
    </section>
  );
}

