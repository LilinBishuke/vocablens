import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { GroupDetail, type GroupCard } from "../../group-detail";

export default async function SourceGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let title: string;
  try {
    title = decodeURIComponent(slug);
  } catch {
    notFound();
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("flashcards")
    .select("id, word, translation, level, learned, sm2_next_review")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  query =
    title === "その他"
      ? query.is("source_title", null)
      : query.eq("source_title", title);

  const { data: cards } = await query;

  return (
    <GroupDetail
      title={title}
      cards={(cards ?? []) as GroupCard[]}
      reviewHref={`/review?source=${encodeURIComponent(title)}`}
    />
  );
}
