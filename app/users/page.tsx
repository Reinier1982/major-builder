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
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
        <AdminMenu />
        <Providers>
          <UsersClient />
        </Providers>
      </main>
    </div>
  );
}
