import { authOptions } from "../lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ObstaclesClient from "./obstacles/ObstaclesClient";
import AdminMenu from "./AdminMenu";

type HomeProps = {
  searchParams?: Promise<{ status?: string }>;
};

const allowedStatuses = new Set(["planned", "in_progress", "problem", "done"]);

export default async function Home({ searchParams }: HomeProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedStatus = params?.status;
  const initialAdminFilter =
    requestedStatus && allowedStatuses.has(requestedStatus) ? requestedStatus : "all";

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
