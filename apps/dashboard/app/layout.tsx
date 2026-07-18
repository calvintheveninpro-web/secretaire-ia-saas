import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Secrétaire IA — Console",
  description: "Plateforme de secrétaire IA vocale pour cabinets et entreprises.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
