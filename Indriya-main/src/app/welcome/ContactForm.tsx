"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ContactForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [code, setCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile must be exactly 10 digits.
  const valid =
    mobile.length === 10 &&
    code.trim().length > 1 &&
    state.trim().length > 0 &&
    country.trim().length > 0;

  async function save() {
    if (!valid) {
      setError("Enter a 10-digit mobile number, your state and country.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // Merges into user_metadata — Google name/email stay untouched.
    const { error } = await supabase.auth.updateUser({
      data: {
        dial_code: code.trim(),
        phone: `${code.trim()} ${mobile}`,
        state: state.trim(),
        country: country.trim(),
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
    "lg-field rounded-xl px-3 py-2.5 text-sm text-charcoal outline-none placeholder:text-muted";
  const lbl = "block text-[11px] uppercase tracking-[0.2em] text-muted";

  return (
    <div className="mt-7 text-left">
      {defaultName && (
        <p className="mb-5 text-center text-sm text-muted">
          Signed in as{" "}
          <span className="font-medium text-charcoal">{defaultName}</span>
        </p>
      )}

      <label className={lbl}>Mobile number</label>
      <div className="mt-1.5 flex gap-2">
        <input
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/[^\d+]/g, "").slice(0, 5))
          }
          inputMode="tel"
          placeholder="+91"
          className={`${field} w-[4.75rem] shrink-0 px-2 text-center`}
          aria-label="Country code"
        />
        <input
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          onKeyDown={(e) => e.key === "Enter" && save()}
          inputMode="numeric"
          placeholder="10-digit number"
          className={`${field} min-w-0 flex-1`}
          aria-label="Mobile number"
        />
      </div>
      {mobile.length > 0 && mobile.length < 10 && (
        <p className="mt-1 text-[11px] text-muted">{mobile.length}/10 digits</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>State</label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Maharashtra"
            className={`${field} mt-1.5 w-full`}
          />
        </div>
        <div>
          <label className={lbl}>Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. India"
            className={`${field} mt-1.5 w-full`}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        onClick={save}
        disabled={saving || !valid}
        className="lg-btn lg-btn-primary mt-6 w-full px-5 py-2.5 text-sm"
      >
        {saving ? "Saving…" : "Continue to the atelier"}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">
        Shared only with the customization team. Private to your account.
      </p>
    </div>
  );
}
