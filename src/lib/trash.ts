import { supabase } from "@/integrations/supabase/client";

export type TrashItemType =
  | "quick_note" | "quiz" | "subject_comment" | "subject_theme"
  | "appointment" | "parent_child_card" | "subject_chapter" | "chapter_document" | "tutoring_hour";

export interface TrashItem {
  id: string;
  user_id: string;
  item_type: string;
  item_data: any;
  original_id: string;
  label: string;
  deleted_at: string;
}

const TABLE_BY_TYPE: Record<TrashItemType, string> = {
  quick_note: "admin_quick_notes",
  quiz: "quizzes",
  subject_comment: "subject_comments",
  subject_theme: "subject_themes",
  appointment: "appointments",
  parent_child_card: "parent_child_cards",
  subject_chapter: "subject_chapters",
  chapter_document: "chapter_documents",
  tutoring_hour: "tutoring_hours",
};

export async function moveToTrash(userId: string, type: TrashItemType, originalId: string, label: string, data: any) {
  const { error } = await supabase
    .from("trash_items" as any)
    .insert({ user_id: userId, item_type: type, original_id: originalId, label, item_data: data } as any);
  return !error;
}

export async function fetchTrash(userId: string): Promise<TrashItem[]> {
  const { data } = await supabase
    .from("trash_items" as any)
    .select("*")
    .eq("user_id", userId)
    .order("deleted_at", { ascending: false });
  return (data as unknown as TrashItem[]) || [];
}

export async function restoreTrashItem(item: TrashItem): Promise<boolean> {
  const table = TABLE_BY_TYPE[item.item_type as TrashItemType];
  if (!table) return false;
  const { id, ...rest } = item.item_data;
  const { error } = await supabase.from(table as any).insert({ ...rest, id: item.original_id } as any);
  if (error) return false;
  await supabase.from("trash_items" as any).delete().eq("id", item.id);
  return true;
}

export async function permanentlyDeleteTrashItem(id: string) {
  await supabase.from("trash_items" as any).delete().eq("id", id);
}

export async function emptyTrash(userId: string) {
  await supabase.from("trash_items" as any).delete().eq("user_id", userId);
}
