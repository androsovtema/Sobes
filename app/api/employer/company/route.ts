import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const companySchema = z.object({
  name: z.string().min(1).max(100),
  website: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(50).optional(),
  size: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email! },
    create: { id: user.id, email: user.email!, role: "EMPLOYER" },
  });

  const data = parsed.data;
  const company = await prisma.company.upsert({
    where: { userId: user.id },
    update: {
      name: data.name,
      website: data.website || null,
      description: data.description || null,
      industry: data.industry || null,
      size: data.size || null,
    },
    create: {
      userId: user.id,
      name: data.name,
      website: data.website || null,
      description: data.description || null,
      industry: data.industry || null,
      size: data.size || null,
    },
  });

  return NextResponse.json({ success: true, companyId: company.id });
}
