import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");

  const tenant = await prisma.tenant.findUnique({ where: { email } });
  if (!tenant || !verifyPassword(password, tenant.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }
  createSession(tenant.id);
  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
