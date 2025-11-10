import Image from "next/image";
import ObstaclesClient from "./obstacles/ObstaclesClient";
import AdminMenu from "./AdminMenu";
import { authOptions } from "../lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 py-12 px-6 bg-white dark:bg-black">
        <AdminMenu />
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Obstacle Builder</h1>
        <ObstaclesClient />
      </main>
    </div>
  );
}
