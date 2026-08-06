import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import Providers from "../providers";
import AdminMenu from "../AdminMenu";
import UsersClient from "./UsersClient";

type SessionUser = { role?: string };

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") redirect("/");
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4e4e7_0,_#fafafa_38%,_#fafafa_100%)] font-sans dark:bg-[radial-gradient(circle_at_top_left,_#27272a_0,_#09090b_38%,_#09090b_100%)]">
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:gap-7">
          <AdminMenu />
          <Providers>
            <UsersClient />
          </Providers>
        </div>
      </main>
    </div>
  );
}
