import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminMenu from "../AdminMenu";
import { authOptions } from "../../lib/auth";
import { listEventItems } from "../../lib/event-items";
import MapOverviewClient from "./MapOverviewClient";
import type { EventItem } from "../event-items/eventItemTypes";

type SessionUser = { id?: string; role?: string };

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const rows = await listEventItems(undefined, (session.user as SessionUser | undefined) ?? {});
  const serialized: EventItem[] = rows.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    type: {
      ...item.type,
      createdAt: item.type.createdAt.toISOString(),
      updatedAt: item.type.updatedAt.toISOString(),
    },
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4e4e7_0,_#fafafa_38%,_#fafafa_100%)] font-sans dark:bg-[radial-gradient(circle_at_top_left,_#27272a_0,_#09090b_38%,_#09090b_100%)]">
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:gap-7">
          <AdminMenu />
          <MapOverviewClient eventItems={serialized} />
        </div>
      </main>
    </div>
  );
}
