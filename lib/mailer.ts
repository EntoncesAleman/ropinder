import nodemailer from "nodemailer";

// Provider priority: Resend (RESEND_API_KEY) > Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) > dev mode
// (logs to console and lets the caller show the value on screen instead of emailing it).

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL ?? "Ropinder <onboarding@resend.dev>", to, subject, html }),
  });
  if (!res.ok) {
    console.error("[mailer] Resend error", await res.text().catch(() => ""));
    return false;
  }
  return true;
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return false;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
    await transporter.sendMail({ from: `Ropinder <${user}>`, to, subject, html });
    return true;
  } catch (e) {
    console.error("[mailer] Gmail SMTP error", e);
    return false;
  }
}

async function sendMail(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  if (await sendViaResend(to, subject, html)) return { sent: true };
  if (await sendViaGmail(to, subject, html)) return { sent: true };
  console.log(`[mailer] DEV MODE — no provider configured. To: ${to} | Subject: ${subject}\n${html}`);
  return { sent: false };
}

export async function sendVerificationEmail(email: string, code: string): Promise<{ sent: boolean }> {
  return sendMail(
    email,
    "Tu código de verificación de Ropinder",
    `<p>Tu código de verificación es:</p><h2 style="letter-spacing:4px">${code}</h2><p>Vence en 10 minutos.</p>`
  );
}

export async function sendSupportEmail(fromUserEmail: string, fromUserName: string, message: string): Promise<{ sent: boolean }> {
  const to = process.env.SUPPORT_EMAIL ?? "Soporte.Ropinder@gmail.com";
  return sendMail(
    to,
    `Consulta de soporte — ${fromUserName}`,
    `<p><strong>De:</strong> ${fromUserName} (${fromUserEmail})</p><p>${message.replace(/\n/g, "<br/>")}</p>`
  );
}
