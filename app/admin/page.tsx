import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminMenu from "../AdminMenu";
import { authOptions } from "../../lib/auth";
import AdminDashboardClient from "./AdminDashboardClient";

type SessionUserWithRole = {
  role?: string;
};

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  const role = (session.user as SessionUserWithRole | undefined)?.role;
  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <AdminMenu />
          <AdminDashboardClient />
        </div>
      </main>
    </div>
  );
}
