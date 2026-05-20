import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSkillSuggestions } from "@/lib/matching/suggestions";
import { checkRateLimit } from "@/lib/ratelimit";

const querySchema = z.object({
  headline: z.string().max(100).optional(),
  grade: z.enum(["INTERN", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"]).optional(),
  currentSkills: z.array(z.string()).max(50).optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

/**
 * POST вместо GET — чтобы передавать массив текущих навыков в теле,
 * без громоздких query-параметров.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getSkillSuggestions({
    headline: parsed.data.headline,
    grade: parsed.data.grade,
    currentSkillNames: parsed.data.currentSkills ?? [],
    limit: parsed.data.limit,
  });

  return NextResponse.json(result);
}
