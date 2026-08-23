import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { GroupDetail, type GroupCard } from "../group-detail";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [folderRes, cardsRes] = await Promise.all([
    supabase.from("folders").select("id, name").eq("id", id).single(),
    supabase
      .from("flashcards")
      .select(
        "id, word, translation, level, learned, sm2_next_review, flashcard_folders!inner(folder_id)"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("flashcard_folders.folder_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!folderRes.data) notFound();

  return (
    <GroupDetail
      title={folderRes.data.name}
      cards={(cardsRes.data ?? []) as unknown as GroupCard[]}
      reviewHref={`/review?folder=${encodeURIComponent(id)}`}
    />
  );
}
