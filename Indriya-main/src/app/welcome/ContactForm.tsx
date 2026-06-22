"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ContactForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = mobile.replace(/\D/g, "");
  const valid =
    digits.length >= 6 &&
    digits.length <= 14 &&
    code.trim().length > 0 &&
    country.trim().length > 0 &&
    state.trim().length > 0;

  async function save() {
    if (!valid) {
      setError("Please fill in your mobile number, country and state.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name.trim() || undefined,
        dial_code: code.trim(),
        phone: `${code.trim()} ${digits}`,
        country: country.trim(),
        state: state.trim(),
        contact_done: true,
      },
    });
    if (error) {
      setError("Could not save. Please try again.");
      setSaving(false);
      return;
    }
    router.push("/studio");
    router.refresh();
  }

  const field =
    "lg-field w-full rounded-xl px-3 py-2.5 text-sm text-charcoal outline-none placeholder:text-muted";
  const lbl =
    "block text-[11px] uppercase tracking-[0.2em] text-muted";

  return (
    <div className="mt-7 text-left">
      <label className={lbl}>Full name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className={`${field} mt-1.5`}
      />

      <label className={`${lbl} mt-4`}>Mobile number</label>
      <div className="mt-1.5 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="tel"
          placeholder="+91"
          className={`${field} w-20 shrink-0 text-center`}
          aria-label="Country code"
        />
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="tel"
          placeholder="98765 43210"
          className={field}
          aria-label="Mobile number"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="India"
            className={`${field} mt-1.5`}
          />
        </div>
        <div>
          <label className={lbl}>State</label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Maharashtra"
            className={`${field} mt-1.5`}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        onClick={save}
        disabled={saving || !valid}
        className="lg-btn lg-btn-primary mt-5 w-full px-5 py-2.5 text-sm"
      >
        {saving ? "Saving…" : "Continue to the atelier"}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">
        Used only by the customization team. Private to your account.
      </p>
    </div>
  );
}
