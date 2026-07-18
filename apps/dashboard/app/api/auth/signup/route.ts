import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const nomCabinet = String(form.get("nomCabinet") ?? "Mon cabinet");
  const metier = String(form.get("metier") ?? "medecin");

  if (!email || password.length < 6) {
    return NextResponse.redirect(new URL("/signup?error=invalid", req.url), 303);
  }
  const existing = await prisma.tenant.findUnique({ where: { email } });
  if (existing) return NextResponse.redirect(new URL("/signup?error=exists", req.url), 303);

  const tenant = await prisma.tenant.create({
    data: {
      nom: nomCabinet,
      email,
      passwordHash: hashPassword(password),
      agent: {
        create: {
          nomCabinet,
          metier,
          nomProfessionnel: nomCabinet,
          phraseAccueil: `${nomCabinet}, bonjour ! Je suis l'assistant virtuel. Comment puis-je vous aider ?`,
        },
      },
    },
  });

  createSession(tenant.id);
  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
