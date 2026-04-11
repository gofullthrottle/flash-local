import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend | null {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cached = new Resend(apiKey);
  return cached;
}

export const FROM_EMAIL =
  process.env.FROM_EMAIL ?? "Flash Local <hello@flashlocal.com>";
