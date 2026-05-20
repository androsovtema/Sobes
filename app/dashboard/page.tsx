import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = user.user_metadata?.role as string | undefined;

  if (role === "CANDIDATE") redirect("/candidate/dashboard");
  if (role === "EMPLOYER") redirect("/employer/dashboard");

  // Fallback если роль не установлена
  redirect("/auth/register");
}
