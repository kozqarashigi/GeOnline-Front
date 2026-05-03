import nodemailer from "nodemailer";

export function isMailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let cachedTransport = null;

function getTransport() {
  if (!isMailConfigured()) return null;
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return cachedTransport;
}

/**
 * @param {{ to: string; code: string; phone: string; confirmUrl: string }} opts
 */
export async function sendRegistrationCode(opts) {
  const t = getTransport();
  if (!t) throw new Error("SMTP not configured");

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = process.env.REG_MAIL_SUBJECT || "GeoOnline: код подтверждения";
  const { to, code, phone, confirmUrl } = opts;
  const text = `Ваш код подтверждения GeoOnline: ${code}\nТелефон: ${phone}\n\nОткрыть страницу регистрации с подставленным кодом:\n${confirmUrl}\n\nЕсли вы не регистрировались, проигнорируйте письмо.`;

  await t.sendMail({
    from,
    to,
    subject,
    text,
  });
}
