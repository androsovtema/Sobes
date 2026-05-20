import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const patchSchema = z.object({
  // Пустая строка → очистить. Telemost-ссылки имеют вид https://telemost.yandex.ru/j/<id>
  meetLink: z.string().trim().max(500),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, match: { position: { companyId: company.id } } },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const link = parsed.data.meetLink || null;
  if (link && !/^https?:\/\//i.test(link)) {
    return NextResponse.json({ error: "Ссылка должна начинаться с http(s)://" }, { status: 400 });
  }

  await prisma.interview.update({
    where: { id },
    data: { meetLink: link },
  });

  return NextResponse.json({ success: true });
}
