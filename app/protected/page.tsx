import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import Providers from "../providers";
import ClientArea from "./ClientArea";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Protected</h1>
      {/* Wrap with SessionProvider for client hooks */}
      <Providers>
        <ClientArea />
      </Providers>
    </main>
  );
}
