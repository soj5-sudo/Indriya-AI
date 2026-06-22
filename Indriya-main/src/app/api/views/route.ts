import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { persistRender } from "@/lib/supabase/persistRender";
import type { BillOfMaterials, DesignView } from "@/lib/ai/types";

// Generating five viewpoints can take a while.
export const maxDuration = 60;

/**
 * Returns the extra viewpoints (top/bottom/left/right/inside) for a design.
 * Generated lazily on the first inquire and cached on the design row, so
 * subsequent opens read straight from the database — no recompute.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { designId?: string };
  if (!body.designId) {
    return NextResponse.json({ error: "missing designId" }, { status: 400 });
  }

  // RLS ensures the user can only read their own designs.
  const { data: design, error } = await supabase
    .from("designs")
    .select("id, title, image_url, bill_of_materials, views")
    .eq("id", body.designId)
    .single();

  if (error || !design) {
    return NextResponse.json({ error: "design not found" }, { status: 404 });
  }

  // Cache hit — return stored views.
  const existing = (design.views as DesignView[] | null) ?? [];
  if (existing.length > 0) {
    return NextResponse.json({ views: existing, cached: true });
  }

  if (!design.image_url) {
    return NextResponse.json({ views: [], cached: false });
  }

  // Generate, persist each render to storage, then cache on the design row.
  const ai = getAIProvider();
  let views: DesignView[];
  try {
    const generated = await ai.generateViews({
      baseImageUrl: design.image_url,
      brief: design.title ?? "",
      billOfMaterials: design.bill_of_materials as BillOfMaterials,
    });
    views = await Promise.all(
      generated.map(async (v) => ({
        view: v.view,
        imageUrl: await persistRender(supabase, user.id, v.imageUrl),
      }))
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, views: [] },
      { status: 500 }
    );
  }

  await supabase.from("designs").update({ views }).eq("id", design.id);

  return NextResponse.json({ views, cached: false });
}
