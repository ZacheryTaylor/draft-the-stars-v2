import { env } from "./env";

export interface EmailMessage { to: string; subject: string; text: string }

/** Resend placeholder. TODO(resend): npm i resend; new Resend(env.resend.apiKey).emails.send({...}). Also set Resend as Supabase Auth SMTP. */
export async function sendEmail(msg: EmailMessage): Promise<{ sent: false; reason: string }> {
  if (process.env.NODE_ENV !== "test") console.info(`[email stub] to=${msg.to} subject="${msg.subject}"`);
  return { sent: false, reason: env.resend.apiKey ? "Resend adapter not implemented yet" : "RESEND_API_KEY not set" };
}
