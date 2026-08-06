import { authOptions } from "../lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import EventItemsClient from "./event-items/EventItemsClient";
import AdminMenu from "./AdminMenu";

type AdminFilter = "all" | "planned" | "in_progress" | "problem" | "done";
type HomeProps = {
  searchParams?: Promise<{ status?: string; type?: string; assigned?: string }>;
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4e4e7_0,_#fafafa_38%,_#fafafa_100%)] font-sans dark:bg-[radial-gradient(circle_at_top_left,_#27272a_0,_#09090b_38%,_#09090b_100%)]">
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:gap-7">
          <AdminMenu />
          <EventItemsClient
            key={`${initialAdminFilter}:${params?.type?.trim() || "all"}:${params?.assigned === "me"}`}
            initialAdminFilter={initialAdminFilter}
            initialTypeFilter={params?.type?.trim() || "all"}
            initialAssignedToMe={params?.assigned === "me"}
          />
        </div>
      </main>
    </div>
  );
}
