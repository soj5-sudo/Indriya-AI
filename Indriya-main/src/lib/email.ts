import { Resend } from "resend";
import type { BillOfMaterials } from "@/lib/ai/types";

export type InquiryEmailData = {
  inquiryId: string;
  createdAt: string;
  submittedBy: string; // email
  submitterName?: string | null;
  design?: {
    title: string;
    imageUrl: string;
    billOfMaterials: BillOfMaterials;
  } | null;
  customerNotes?: string | null;
  brief: string;
  referenceImages: { type: string; url: string }[];
};

const C = {
  cream: "#fbf8f3",
  ivory: "#ffffff",
  emerald: "#0b4d3b",
  gold: "#b08d57",
  charcoal: "#2c2a26",
  muted: "#7a756c",
  line: "#e7dfd2",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bomRows(b: BillOfMaterials): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px;color:${C.muted};font-size:13px;border-bottom:1px solid ${C.line};white-space:nowrap;">${esc(label)}</td>
      <td style="padding:6px 12px;color:${C.charcoal};font-size:13px;border-bottom:1px solid ${C.line};">${esc(value)}</td>
    </tr>`;

  const stones = b.stones
    .map(
      (s) =>
        `${s.count}× ${esc(s.type)} · ${esc(s.shape)} · ${s.carat} ct${
          s.setting ? ` · ${esc(s.setting)}` : ""
        }`
    )
    .join("<br/>");

  return `
    ${row("Metal", b.metal)}
    ${row("Gold colour", b.goldColor)}
    ${row("Purity", b.goldPurity)}
    ${b.estimatedWeightG != null ? row("Est. metal weight", `${b.estimatedWeightG} g`) : ""}
    ${b.finish ? row("Finish", b.finish) : ""}
    <tr>
      <td style="padding:6px 12px;color:${C.muted};font-size:13px;border-bottom:1px solid ${C.line};vertical-align:top;">Stones</td>
      <td style="padding:6px 12px;color:${C.charcoal};font-size:13px;border-bottom:1px solid ${C.line};">${stones || "—"}</td>
    </tr>
    ${b.notes ? row("Design notes", b.notes) : ""}`;
}

export function renderInquiryEmail(d: InquiryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const title = d.design?.title ?? "Custom design";
  const subject = `New custom design inquiry — ${title}`;
  const when = new Date(d.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const refsHtml = d.referenceImages.length
    ? `<tr><td style="padding:18px 28px 0;">
         <p style="margin:0 0 8px;color:${C.muted};font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Reference & sketches used</p>
         ${d.referenceImages
           .map(
             (r) =>
               `<a href="${esc(r.url)}"><img src="${esc(r.url)}" alt="${esc(r.type)}" width="84" height="84" style="border:1px solid ${C.line};border-radius:8px;object-fit:cover;margin:0 8px 8px 0;"/></a>`
           )
           .join("")}
       </td></tr>`
    : "";

  const html = `
<div style="background:${C.cream};padding:24px 0;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.ivory};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">

        <tr><td style="padding:26px 28px 14px;border-bottom:1px solid ${C.line};">
          <p style="margin:0;color:${C.gold};font-size:12px;letter-spacing:.32em;text-transform:uppercase;">Indriya Atelier</p>
          <h1 style="margin:8px 0 0;color:${C.emerald};font-size:24px;font-weight:600;">New custom design inquiry</h1>
          <p style="margin:8px 0 0;color:${C.muted};font-size:13px;">
            From <strong style="color:${C.charcoal};">${esc(d.submitterName || d.submittedBy)}</strong>
            &lt;${esc(d.submittedBy)}&gt; · ${esc(when)}
          </p>
        </td></tr>

        ${
          d.design
            ? `<tr><td style="padding:22px 28px 0;">
                 <img src="${esc(d.design.imageUrl)}" alt="${esc(title)}" width="544" style="width:100%;max-width:544px;border:1px solid ${C.line};border-radius:10px;"/>
                 <h2 style="margin:16px 0 6px;color:${C.emerald};font-size:19px;font-weight:600;">${esc(title)}</h2>
               </td></tr>
               <tr><td style="padding:6px 28px 0;">
                 <p style="margin:0 0 6px;color:${C.muted};font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Bill of materials</p>
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;overflow:hidden;">
                   ${bomRows(d.design.billOfMaterials)}
                 </table>
                 <p style="margin:8px 0 0;color:${C.muted};font-size:11px;font-style:italic;">No pricing is generated — for the customization team to assess feasibility.</p>
               </td></tr>`
            : `<tr><td style="padding:22px 28px 0;"><p style="color:${C.muted};font-size:14px;">No specific design option was selected.</p></td></tr>`
        }

        ${
          d.customerNotes
            ? `<tr><td style="padding:18px 28px 0;">
                 <p style="margin:0 0 6px;color:${C.muted};font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Notes for the team</p>
                 <div style="background:${C.cream};border:1px solid ${C.line};border-radius:8px;padding:12px 14px;color:${C.charcoal};font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(d.customerNotes)}</div>
               </td></tr>`
            : ""
        }

        ${
          d.brief
            ? `<tr><td style="padding:18px 28px 0;">
                 <p style="margin:0 0 6px;color:${C.muted};font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Design brief (customer's words)</p>
                 <div style="color:${C.charcoal};font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(d.brief)}</div>
               </td></tr>`
            : ""
        }

        ${refsHtml}

        <tr><td style="padding:22px 28px 26px;">
          <p style="margin:18px 0 0;color:${C.muted};font-size:11px;border-top:1px solid ${C.line};padding-top:14px;">
            Inquiry ID: ${esc(d.inquiryId)} · Status: pending · Indriya internal design tool
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>`;

  // Plain-text fallback
  const b = d.design?.billOfMaterials;
  const text = [
    `NEW CUSTOM DESIGN INQUIRY`,
    `From: ${d.submitterName || ""} <${d.submittedBy}>`,
    `When: ${when}`,
    ``,
    d.design ? `Design: ${title}` : `Design: (none selected)`,
    b
      ? `Bill of materials:
  Metal: ${b.metal}
  Gold colour: ${b.goldColor}
  Purity: ${b.goldPurity}${b.estimatedWeightG != null ? `\n  Est. weight: ${b.estimatedWeightG} g` : ""}${b.finish ? `\n  Finish: ${b.finish}` : ""}
  Stones: ${b.stones.map((s) => `${s.count}x ${s.type} ${s.shape} ${s.carat}ct${s.setting ? ` ${s.setting}` : ""}`).join("; ")}${b.notes ? `\n  Notes: ${b.notes}` : ""}`
      : "",
    ``,
    d.customerNotes ? `Notes for team:\n${d.customerNotes}` : "",
    ``,
    d.brief ? `Brief:\n${d.brief}` : "",
    ``,
    d.referenceImages.length
      ? `Reference images:\n${d.referenceImages.map((r) => `- ${r.url}`).join("\n")}`
      : "",
    ``,
    `Inquiry ID: ${d.inquiryId} · Status: pending`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { subject, html, text };
}

/**
 * Sends the inquiry notification email via Resend. If RESEND_API_KEY is not
 * configured, it logs and no-ops so submitting an inquiry never fails.
 */
export async function sendInquiryEmail(data: InquiryEmailData): Promise<{
  sent: boolean;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const team = process.env.INQUIRY_NOTIFY_EMAIL ?? "deyanik2007@gmail.com";
  const from = process.env.RESEND_FROM ?? "Indriya Atelier <onboarding@resend.dev>";
  // Every inquiry goes to the team inbox and to soj5@cornell.edu (override the
  // extra recipient with INQUIRY_CC_EMAIL). De-duped so we never email twice.
  const extra = process.env.INQUIRY_CC_EMAIL ?? "soj5@cornell.edu";
  const to = Array.from(new Set([team, extra]));

  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY not set — inquiry saved but email not sent. Would notify:",
      to
    );
    return { sent: false, error: "email_not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = renderInquiryEmail(data);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) {
      console.error("Resend error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error("Failed to send inquiry email:", (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}
