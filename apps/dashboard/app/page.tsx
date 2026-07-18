import { redirect } from "next/navigation";
import { getSessionTenant } from "@/lib/auth";

export default async function Home() {
  const tenant = await getSessionTenant();
  redirect(tenant ? "/dashboard" : "/login");
}
