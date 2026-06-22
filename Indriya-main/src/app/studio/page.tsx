import { createClient } from "@/lib/supabase/server";
import { StudioShell } from "@/components/studio/StudioShell";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data: chats } = await supabase
    .from("chats")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return <StudioShell initialChats={chats ?? []} />;
}
