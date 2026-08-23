"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Folder, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CardItem } from "./cards-content";
import { useT } from "@/lib/contexts/settings-context";

export interface FolderRow {
  id: string;
  name: string;
  count: number;
}

/** グループビュー: マイフォルダ + 出典から（自動） */
export function GroupsView({ cards }: { cards: CardItem[] }) {
  const t = useT();
  const [folders, setFolders] = useState<FolderRow[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFolders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("folders")
      .select("id, name, flashcard_folders(count)")
      .order("created_at", { ascending: true });
    if (error) {
      setUnavailable(true);
      setFolders([]);
      return;
    }
    setFolders(
      (data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        count: (f.flashcard_folders as unknown as { count: number }[])?.[0]?.count ?? 0,
      }))
    );
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("folders").insert({ user_id: user.id, name });
      await loadFolders();
    }
    setSaving(false);
    setCreating(false);
    setNewName("");
  }

  // 出典グループ（自動）
  const sources = useMemo(() => {
    const map = new Map<string, { count: number; type: string | null }>();
    for (const c of cards) {
      const title = c.source_title || "その他";
      const cur = map.get(title) ?? { count: 0, type: c.source_type ?? null };
      cur.count++;
      map.set(title, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [cards]);

  return (
    <div className="space-y-5 pb-4">
      {/* マイフォルダ */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-semibold text-text-secondary">
          {t("cards.myFolders")}
        </h2>
        {unavailable && (
          <p className="glass-card rounded-card px-4 py-3 text-xs text-text-secondary">
            フォルダ機能の準備中です（データベース更新待ち）
          </p>
        )}
        {folders === null && !unavailable && (
          <div className="glass-card h-14 animate-pulse rounded-card opacity-70" />
        )}
        {(folders ?? []).map((f) => (
          <Link
            key={f.id}
            href={`/groups/${f.id}`}
            className="glass-card flex items-center gap-3 rounded-card px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-primary/10">
              <Folder size={17} className="text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-text-primary">
                {f.name}
              </span>
              <span className="text-xs text-text-secondary">{f.count}{t("common.cardsUnit")}</span>
            </span>
            <span className="text-text-muted" aria-hidden>›</span>
          </Link>
        ))}
        {!unavailable &&
          (creating ? (
            <div className="glass-card flex items-center gap-2 rounded-card p-2.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={t("cards.folderName")}
                className="h-10 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="h-10 shrink-0 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-on-primary disabled:opacity-40 cursor-pointer"
              >
                {t("cards.create")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed border-surface-border py-3 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
            >
              <Plus size={15} />
              {t("cards.newFolder")}
            </button>
          ))}
      </div>

      {/* 出典から（自動） */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-semibold text-text-secondary">
          {t("cards.fromSources")}
        </h2>
        {sources.map(([title, info]) => (
          <Link
            key={title}
            href={`/groups/source/${encodeURIComponent(title)}`}
            className="glass-card flex items-center gap-3 rounded-card px-4 py-3 transition-all duration-150 active:scale-[0.98]"
          >
            <span className="h-9 w-[52px] shrink-0 rounded-[8px] bg-primary/10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-text-primary">
                {title}
              </span>
              <span className="text-[11px] text-text-muted">
                {info.count}枚
                {info.type === "video"
                  ? " · YouTube"
                  : info.type === "webpage"
                    ? " · Webページ"
                    : ""}
              </span>
            </span>
            <span className="text-text-muted" aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
