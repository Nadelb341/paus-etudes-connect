import { supabase } from "@/integrations/supabase/client";
import { compressDocument } from "@/lib/compressImage";

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  revision: string | null;
  youtube_links: string[];
  order_index: number;
  theme_id?: string | null;
  target_student_id: string | null;
  target_student_ids: string[] | null;
}

export interface StudentProfile {
  user_id: string;
  first_name: string;
  school_level: string;
}

export interface ChapterDoc {
  id: string;
  chapter_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
  category: string;
  created_at?: string;
}

export interface AttachedFile {
  name: string;
  url: string;
  type: string;
}

export interface DoneEntry {
  student_id: string;
  student_name: string;
  date: string;
  note: string;
}

export interface Exercise {
  id: string;
  chapter_id: string;
  title: string;
  statement: string;
  solution?: string;
  difficulty: number;
  files: AttachedFile[];
  order_index: number;
  target_student_ids: string[] | null;
  solution_visible_to_students: boolean;
  done_log?: DoneEntry[];
  created_at?: string;
}

export interface Flashcard {
  id: string;
  chapter_id: string;
  front: string;
  back: string;
  order_index: number;
  created_by?: string | null;
  created_at?: string;
}

/** Envoie un fichier dans le stockage (photo compressée d'abord, lisibilité prioritaire). */
export async function uploadChapterFile(chapterId: string, original: File, sub = ""): Promise<AttachedFile> {
  const file = await compressDocument(original);
  const safeName = file.name.replace(/[^\w.\-À-ÿ ]+/g, "_");
  const filePath = `chapters/${chapterId}/${sub ? sub + "/" : ""}${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from("subject-files").upload(filePath, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("subject-files").getPublicUrl(filePath);
  return { name: file.name, url: publicUrl, type: file.type || "" };
}

export const getFileIcon = (type: string, name = "") => {
  const t = (type || "").toLowerCase();
  const n = name.toLowerCase();
  if (t.includes("pdf") || n.endsWith(".pdf")) return "📄";
  if (t.includes("image")) return "🖼️";
  if (t.includes("sheet") || t.includes("excel") || n.endsWith(".xls") || n.endsWith(".xlsx")) return "📊";
  if (t.includes("word") || t.includes("document") || n.endsWith(".doc") || n.endsWith(".docx")) return "📝";
  return "📎";
};

export const isImage = (type: string, name = "") =>
  (type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(name);

/** Saisie : Entrée valide le champ simple (perd le focus). */
export const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
};

export const ALL_LEVELS = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "Seconde", "Première", "Terminale"];
