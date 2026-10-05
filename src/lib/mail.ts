import 'server-only';
import { Resend } from 'resend';
import { env } from './env';

type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] };

export async function sendMail(mail: Mail) {
  if (!env.mailEnabled) {
    console.log(`[mail] (not configured) To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
    return;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    replyTo: mail.replyTo,
    attachments: mail.attachments,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
