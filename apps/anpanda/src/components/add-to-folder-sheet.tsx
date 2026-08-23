"use client";

import { useEffect, useState, useCallback } from "react";
import { Folder, Check, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FolderItem {
  id: string;
  name: string;
  checked: boolean;
}

/** カード詳細の「フォルダに追加」行 + チェックリストシート */
export function AddToFolderSheet({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderItem[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [foldersRes, linksRes] = await Promise.all([
      supabase.from("folders").select("id, name").order("created_at"),
      supabase
        .from("flashcard_folders")
        .select("folder_id")
        .eq("flashcard_id", cardId),
    ]);
    if (foldersRes.error) {
      setUnavailable(true);
      return;
    }
    const memberIds = new Set((linksRes.data ?? []).map((l) => l.folder_id));
    setFolders(
      (foldersRes.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        checked: memberIds.has(f.id),
      }))
    );
    setMemberCount(memberIds.size);
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(folder: FolderItem) {
    const supabase = createClient();
    // 楽観更新
    setFolders(
      (prev) =>
        prev?.map((f) =>
          f.id === folder.id ? { ...f, checked: !f.checked } : f
        ) ?? null
    );
    if (folder.checked) {
      await supabase
        .from("flashcard_folders")
        .delete()
        .eq("flashcard_id", cardId)
        .eq("folder_id", folder.id);
    } else {
      await supabase
        .from("flashcard_folders")
        .insert({ flashcard_id: cardId, folder_id: folder.id });
    }
    load();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name })
      .select("id")
      .single();
    if (data) {
      await supabase
        .from("flashcard_folders")
        .insert({ flashcard_id: cardId, folder_id: data.id });
    }
    setCreating(false);
    setNewName("");
    load();
  }

  if (unavailable) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card flex w-full items-center gap-3 rounded-button px-4 py-3.5 transition-all active:scale-[0.98] cursor-pointer"
      >
        <Folder size={18} className="shrink-0 text-primary" />
        <span className="flex-1 text-left text-sm font-medium text-text-primary">
          フォルダに追加
        </span>
        {memberCount != null && memberCount > 0 && (
          <span className="text-xs text-text-secondary">{memberCount}件</span>
        )}
        <span className="text-text-muted" aria-hidden>›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0F1A14]/45"
          />
          <div className="animate-sheet-in glass-card relative rounded-t-[24px] px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-text-muted/40" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-text-primary">
                フォルダに追加
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-text-muted cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {(folders ?? []).map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggle(f)}
                  className={`flex w-full items-center gap-3 rounded-button px-3.5 py-3 transition-all active:scale-[0.98] cursor-pointer ${
                    f.checked
                      ? "border-[1.5px] border-primary bg-primary/10"
                      : "glass-card"
                  }`}
                >
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] ${
                      f.checked
                        ? "bg-primary text-on-primary"
                        : "border-[1.5px] border-text-muted/50"
                    }`}
                  >
                    {f.checked && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-left text-sm font-medium text-text-primary">
                    {f.name}
                  </span>
                </button>
              ))}

              {creating ? (
                <div className="glass-card flex items-center gap-2 rounded-button p-2.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="フォルダ名"
                    className="h-10 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="h-10 shrink-0 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-on-primary disabled:opacity-40 cursor-pointer"
                  >
                    作成
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-button border-[1.5px] border-dashed border-surface-border py-3 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
                >
                  <Plus size={15} />
                  新しいフォルダを作成
                </button>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97] cursor-pointer"
            >
              完了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
