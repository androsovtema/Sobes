import { Resend } from "resend";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

// EMAIL_FROM: "Имя <адрес@домен>" — домен должен быть верифицирован в Resend.
// Для разработки: "Собес <onboarding@resend.dev>" (Resend тестовый адрес).
const FROM = process.env.EMAIL_FROM ?? "Собес <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, react });
  if (error) {
    console.error("[email] send error:", error);
    throw new Error(typeof error === "object" && "message" in error ? String(error.message) : "Email send failed");
  }
}
