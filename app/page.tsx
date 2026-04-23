import { authOptions } from "../lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ObstaclesClient from "./obstacles/ObstaclesClient";
import AdminMenu from "./AdminMenu";

type AdminFilter = "all" | "planned" | "in_progress" | "problem" | "done";
type HomeProps = {
  searchParams?: Promise<{ status?: string }>;
};

function isAdminFilter(
  value: string | undefined,
): value is Exclude<AdminFilter, "all"> {
  return (
    value === "planned" ||
    value === "in_progress" ||
    value === "problem" ||
    value === "done"
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedStatus = params?.status;
  const initialAdminFilter: AdminFilter = isAdminFilter(requestedStatus)
    ? requestedStatus
    : "all";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <AdminMenu />
          <ObstaclesClient initialAdminFilter={initialAdminFilter} />
        </div>
      </main>
    </div>
  );
}
