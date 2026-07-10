import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import AdminMenuClient from "./AdminMenuClient";

type SessionUserWithRole = {
  role?: string;
};

export default async function AdminMenu() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUserWithRole | undefined)?.role;
  if (!session) return null;
  return <div className="flex items-center"><AdminMenuClient isAdmin={role === "admin"} /></div>;
}
