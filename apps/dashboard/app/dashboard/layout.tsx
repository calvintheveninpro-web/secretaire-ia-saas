import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionTenant } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const tenant = await getSessionTenant();
  if (!tenant) redirect("/login");

  return (
    <div>
      <nav className="nav">
        <span className="brand">Secrétaire IA</span>
        <a href="/dashboard">Vue d'ensemble</a>
        <a href="/dashboard/agent">Mon agent</a>
        <a href="/dashboard/calls">Appels</a>
        <a href="/dashboard/appointments">Rendez-vous</a>
        <a href="/dashboard/prospects">Prospects</a>
        <a href="/dashboard/clients">Clients</a>
        <a href="/dashboard/messages">Messages</a>
        <a href="/dashboard/connectors">Connecteurs</a>
        <a href="/dashboard/billing">Abonnement</a>
        <span className="spacer" />
        <span className="muted">{tenant.nom}</span>
        <form method="post" action="/api/auth/logout">
          <button className="btn secondary small" type="submit">Déconnexion</button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
