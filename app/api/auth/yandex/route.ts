import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/yandex — статус подключения для текущего пользователя.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acc = await prisma.yandexAccount.findUnique({
    where: { userId: user.id },
    select: { login: true, email: true, displayName: true, scope: true, expiresAt: true },
  });

  if (!acc) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, ...acc });
}

// DELETE /api/auth/yandex — отключить Яндекс-аккаунт.
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.yandexAccount.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ success: true });
}
