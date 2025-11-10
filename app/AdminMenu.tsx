import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import AdminMenuClient from "./AdminMenuClient";

export default async function AdminMenu() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "admin") return null;
  return <div className="flex items-center"><AdminMenuClient /></div>;
}
