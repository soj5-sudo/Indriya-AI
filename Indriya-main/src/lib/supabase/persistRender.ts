import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * If the render is a raster data-URI (e.g. a PNG from Gemini), upload it to the
 * public `designs` bucket and return its public URL — keeping large base64
 * blobs out of the database. Small SVG data-URIs and plain URLs pass through.
 */
export async function persistRender(
  supabase: SupabaseClient,
  userId: string,
  imageUrl: string
): Promise<string> {
  const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(imageUrl);
  if (!match) return imageUrl;

  const [, mimeType, ext, b64] = match;
  const bytes = Buffer.from(b64, "base64");
  const path = `${userId}/renders/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("designs")
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) return imageUrl; // fall back to inline if upload fails

  const { data } = supabase.storage.from("designs").getPublicUrl(path);
  return data.publicUrl;
}
