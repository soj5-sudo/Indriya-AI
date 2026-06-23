import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInquiryEmail, type InquiryEmailData } from "@/lib/email";
import type { Attachment, BillOfMaterials } from "@/lib/ai/types";

/**
 * Creates a customization inquiry from a selected design. The row lands in the
 * `inquiries` table (status 'pending', readable by the customization team via
 * RLS) and an easy-to-read summary email is sent to the team inbox.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    chatId: string;
    designId?: string;
    customerNotes?: string;
  };
  if (!body.chatId) {
    return NextResponse.json({ error: "missing chatId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      chat_id: body.chatId,
      user_id: user.id,
      design_id: body.designId ?? null,
      customer_notes: body.customerNotes ?? null,
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Gather everything needed for a readable notification email.
  const [{ data: design }, { data: msgs }] = await Promise.all([
    body.designId
      ? supabase
          .from("designs")
          .select("title, image_url, bill_of_materials")
          .eq("id", body.designId)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("messages")
      .select("role, content, attachments")
      .eq("chat_id", body.chatId)
      .order("created_at", { ascending: true }),
  ]);

  const brief = (msgs ?? [])
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .filter(Boolean)
    .join("\n");

  const referenceImages = (msgs ?? [])
    .flatMap((m) => (m.attachments as Attachment[] | null) ?? [])
    .filter((a) => a?.url && a.ok !== false)
    .map((a) => ({ type: a.type, url: a.url }));

  const emailData: InquiryEmailData = {
    inquiryId: data.id,
    createdAt: data.created_at,
    submittedBy: user.email ?? "unknown",
    submitterName:
      (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      null,
    customerPhone: (user.user_metadata?.phone as string) ?? null,
    customerState: (user.user_metadata?.state as string) ?? null,
    customerCountry: (user.user_metadata?.country as string) ?? null,
    design: design
      ? {
          title: design.title ?? "Custom design",
          imageUrl: design.image_url,
          billOfMaterials: design.bill_of_materials as BillOfMaterials,
        }
      : null,
    customerNotes: body.customerNotes ?? null,
    brief,
    referenceImages,
  };

  // Don't fail the request if email delivery has an issue — the row is saved.
  const emailResult = await sendInquiryEmail(emailData);

  return NextResponse.json({ inquiry: data, emailSent: emailResult.sent });
}
