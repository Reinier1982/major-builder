import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminMenu from "../AdminMenu";
import { authOptions } from "../../lib/auth";
import { listEventItems } from "../../lib/event-items";
import MapOverviewClient from "./MapOverviewClient";
import type { EventItem } from "../event-items/eventItemTypes";

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const rows = await listEventItems();
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
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <AdminMenu />
          <MapOverviewClient eventItems={serialized} />
        </div>
      </main>
    </div>
  );
}
