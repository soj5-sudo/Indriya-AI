/**
 * Internal-access gate.
 *
 * For the trial there is no restriction — any Google account may sign in.
 * When Indriya has internal domains, set INTERNAL_EMAIL_DOMAINS (comma
 * separated, e.g. "indriya.com,adityabirla.com") and sign-in will be limited
 * to those domains. RLS still isolates each user's data regardless.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const raw = process.env.INTERNAL_EMAIL_DOMAINS?.trim();
  if (!raw) return true; // open during trial
  if (!email) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .includes(domain);
}
