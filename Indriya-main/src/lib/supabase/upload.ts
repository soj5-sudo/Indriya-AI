import { createClient } from "./client";

/**
 * Uploads a File/Blob to the public `designs` bucket and returns its public URL.
 */
export async function uploadToDesigns(
  file: Blob,
  ext: string
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("designs")
    .upload(path, file, { upsert: false });
  if (error) return null;

  const { data } = supabase.storage.from("designs").getPublicUrl(path);
  return data.publicUrl;
}
