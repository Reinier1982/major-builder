import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import Providers from "../providers";
import AdminMenu from "../AdminMenu";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") redirect("/");
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <AdminMenu />
      <Providers>
        <UsersClient />
      </Providers>
    </main>
  );
}
