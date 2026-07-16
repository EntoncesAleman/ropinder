// Sends via Resend if RESEND_API_KEY is set. Otherwise logs the code
// server-side and lets the caller return it in the response (dev/test mode)
// so the signup flow is testable end-to-end before a real provider is wired up.

export async function sendVerificationEmail(email: string, code: string): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[mailer] DEV MODE — no RESEND_API_KEY set. Code for ${email}: ${code}`);
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Ropinder <onboarding@resend.dev>",
      to: email,
      subject: "Tu código de verificación de Ropinder",
      html: `<p>Tu código de verificación es:</p><h2 style="letter-spacing:4px">${code}</h2><p>Vence en 10 minutos.</p>`,
    }),
  });

  if (!res.ok) {
    console.error("[mailer] Resend error", await res.text().catch(() => ""));
    return { sent: false };
  }
  return { sent: true };
}
