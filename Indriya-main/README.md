# Indriya Atelier — Design Your Own (Internal MVP)

A simple, "even a child can use it" internal tool for Indriya HQ teams to co-design
custom jewellery with customers. Users sketch from scratch, doodle over a reference,
or describe a piece in plain words; a guided concierge returns **three design
directions** — each with a full **bill of materials** (metal, gold colour, stones,
finish — *no pricing*) — and routes a selected design as an **inquiry** to the
customization team.

**Flow:** Landing → Google sign-in → Studio (chat + sketch + 3 designs + inquiry), with a "New design" button.

## Tech
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- Supabase: Google auth, Postgres (with RLS), Storage (uploads + sketches)
- **Google Gemini** for AI: vision-aware concierge chat + photorealistic 3D renders
  (`gemini-2.5-flash` + `gemini-2.5-flash-image`), behind a clean `AIProvider`
  interface. Falls back to bundled placeholder renders until a key is set.

---

## 1. Configure Supabase

You already have the project. In the Supabase dashboard:

1. **Get your keys** — Project Settings → API → copy the **Project URL** and the
   **anon public** key.
2. **Run the schema** — SQL Editor → New query → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run. This creates the tables,
   RLS policies, and the public `designs` storage bucket.
3. **Enable Google** — Authentication → Providers → Google → enable, and add your
   Google OAuth client ID/secret (from Google Cloud Console).
4. **Redirect URLs** — Authentication → URL Configuration → add:
   - `http://localhost:3000/auth/callback`
   - (In Google Cloud Console, also add `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     as an authorized redirect URI for the OAuth client.)

## 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR-GEMINI-KEY   # from https://aistudio.google.com -> Get API key
```

> Without `GEMINI_API_KEY`, the app still runs and uses placeholder renders.
> Add the key (and restart `npm run dev`) to get real photorealistic renders.

> The Supabase **database password** is only needed if you connect directly to
> Postgres; the app itself uses the anon key above.

## 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## Using it
1. **Design your own** on the landing page → sign in with Google (any account
   during the trial).
2. **New design** → type a request, 🖼 upload a reference, or ✏️ open the sketch
   pad to draw / doodle (a reference image becomes a faint backdrop to trace).
3. The concierge asks a few guiding questions (occasion, metal, stones). When the
   brief is complete it shows **✨ Generate 3 designs**.
4. Each option card shows a render + bill of materials. **Choose & inquire** →
   add notes → **Submit inquiry**. The inquiry lands in the `inquiries` table
   (status `pending`).

## Inquiry emails
When a designer submits an inquiry, it is saved to the `inquiries` table **and**
an easy-to-read summary email (render image, full bill of materials, the
customer's notes, the brief, and reference/sketch images) is sent to the team.

Set up (optional — submitting still works without it, email is just skipped):
1. Create a free account at **https://resend.com** (sign up with the address you
   want to receive at, e.g. `deyanik2007@gmail.com`, so the shared test sender
   `onboarding@resend.dev` can deliver to it).
2. Copy an API key into `.env`:
   ```
   INQUIRY_NOTIFY_EMAIL=deyanik2007@gmail.com
   RESEND_API_KEY=re_...
   ```
3. Restart `npm run dev`. To send from your own domain later, verify it in Resend
   and set `RESEND_FROM="Indriya Atelier <atelier@yourdomain.com>"`.

## Data protection
- Every table has **Row Level Security**: a user can only read/write their own
  chats, messages, designs and inquiries.
- The **customization team** can read all inquiries — grant it by setting a
  profile's role: `update public.profiles set role = 'customization_team' where email = 'teammate@…';`
- Sign-in is open to any Google account for the trial. To restrict to internal
  domains later, set `INTERNAL_EMAIL_DOMAINS=indriya.com` (comma-separated) — the
  gate lives in [`src/lib/auth/access.ts`](src/lib/auth/access.ts).

## AI providers
Everything talks to the `AIProvider` interface in
[`src/lib/ai/types.ts`](src/lib/ai/types.ts).
- **Gemini** (default, live): [`src/lib/ai/geminiProvider.ts`](src/lib/ai/geminiProvider.ts)
  — `chat()` uses `gemini-2.5-flash` (sees uploaded references/sketches);
  `generateDesigns()` produces 3 structured specs + bills of materials, then
  renders each photorealistically with `gemini-2.5-flash-image`, conditioned on
  the user's images. Renders are saved to Supabase Storage.
- **Mock** (fallback): [`src/lib/ai/mockProvider.ts`](src/lib/ai/mockProvider.ts).

Model ids are overridable via `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` if
Google changes them. Adding OpenAI later is just a new provider file +
a `case` in [`src/lib/ai/index.ts`](src/lib/ai/index.ts) — no UI changes.

## Not in the trial scope
Real image generation, SKU-catalog lookup, cost estimation, a customization-team
dashboard UI (inquiries are stored and queryable now), and production hosting.
