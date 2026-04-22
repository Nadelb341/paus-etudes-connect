import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL, DEFAULT_THEMES, getBaseSubjectId } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ChapterManager from "./ChapterManager";

interface Theme {
  id: string;
  subject_id: string;
  title: string;
  order_index: number;
}

interface ThemeManagerProps {
  subjectId: string;
  targetStudentId?: string;
  manageMode?: boolean;
}

const ThemeManager = ({ subjectId, targetStudentId, manageMode }: ThemeManagerProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const baseSubjectId = getBaseSubjectId(subjectId);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [showUnthemed, setShowUnthemed] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hasThemesTable, setHasThemesTable] = useState(true);

  useEffect(() => {
    fetchThemes();
  }, [subjectId]);

  const fetchThemes = async () => {
    const { data, error } = await supabase
      .from("subject_themes")
      .select("*")
      .eq("subject_id", baseSubjectId)
      .order("order_index");

    if (error) {
      setHasThemesTable(false);
      return;
    }
    setThemes((data as Theme[]) || []);
  };

  const createTheme = async () => {
    if (!newThemeTitle.trim()) return;
    const { error } = await supabase.from("subject_themes").insert({
      subject_id: baseSubjectId,
      title: newThemeTitle.trim(),
      order_index: themes.length,
    });
    if (error) { toast.error("Erreur lors de la création"); return; }
    setNewThemeTitle("");
    toast.success("Grand thème créé !");
    fetchThemes();
  };

  const deleteTheme = async (id: string) => {
    await supabase.from("subject_themes").delete().eq("id", id);
    toast.success("Grand thème supprimé");
    if (expandedTheme === id) setExpandedTheme(null);
    fetchThemes();
  };

  const startEdit = (theme: Theme) => {
    setEditingThemeId(theme.id);
    setEditingTitle(theme.title);
  };

  const saveEdit = async (id: string) => {
    if (!editingTitle.trim()) return;
    await supabase.from("subject_themes").update({ title: editingTitle.trim() }).eq("id", id);
    setEditingThemeId(null);
    toast.success("Thème renommé !");
    fetchThemes();
  };

  const cancelEdit = () => {
    setEditingThemeId(null);
    setEditingTitle("");
  };

  const initDefaultThemes = async () => {
    const defaults = DEFAULT_THEMES[baseSubjectId];
    if (!defaults || defaults.length === 0) {
      toast.error("Aucun thème par défaut pour cette matière.");
      return;
    }
    const inserts = defaults.map((title, i) => ({
      subject_id: baseSubjectId,
      title,
      order_index: i,
    }));
    const { error } = await supabase.from("subject_themes").insert(inserts);
    if (error) { toast.error("Erreur lors de l'initialisation"); return; }
    toast.success(`${inserts.length} thèmes créés !`);
    fetchThemes();
  };

  // Fallback si la table n'existe pas encore
  if (!hasThemesTable) {
    return (
      <ChapterManager
        subjectId={subjectId}
        targetStudentId={targetStudentId}
        manageMode={manageMode}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">🗂️ Grands thèmes</h4>
        {(isAdmin && manageMode) && themes.length === 0 && DEFAULT_THEMES[baseSubjectId] && (
          <Button
            variant="outline"
            size="sm"
            onClick={initDefaultThemes}
            className="text-xs gap-1"
          >
            <Sparkles size={12} />
            Initialiser par défaut
          </Button>
        )}
      </div>

      {/* Créer un nouveau thème (admin) */}
      {(isAdmin && manageMode) && (
        <div className="flex gap-2">
          <Input
            value={newThemeTitle}
            onChange={e => setNewThemeTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createTheme()}
            placeholder="Nouveau grand thème..."
            className="flex-1"
          />
          <Button onClick={createTheme} size="sm"><Plus size={14} className="mr-1" />Créer</Button>
        </div>
      )}

      {/* Grille des thèmes — 2 par ligne */}
      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => (
          <div
            key={theme.id}
            className={cn(
              "bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all",
              expandedTheme === theme.id && "col-span-2"
            )}
          >
            {/* Header thème */}
            <button
              onClick={() => setExpandedTheme(expandedTheme === theme.id ? null : theme.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => editingThemeId === theme.id && e.stopPropagation()}>
                {editingThemeId === theme.id ? (
                  <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                    <Input
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveEdit(theme.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(theme.id)} className="p-1 text-green-600 hover:text-green-700">
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-sm truncate">{theme.title}</span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {(isAdmin && manageMode) && editingThemeId !== theme.id && (
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={e => { e.stopPropagation(); startEdit(theme); }}
                  >
                    <Pencil size={11} className="text-muted-foreground" />
                  </Button>
                )}
                {(isAdmin && manageMode) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                        <Trash2 size={11} className="text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce grand thème ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Les chapitres liés à ce thème ne seront pas supprimés, ils passeront dans "Chapitres sans thème".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTheme(theme.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {expandedTheme === theme.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {/* Chapitres du thème (pleine largeur quand ouvert) */}
            {expandedTheme === theme.id && (
              <div className="border-t border-border p-4 bg-secondary/10">
                <ChapterManager
                  subjectId={subjectId}
                  targetStudentId={targetStudentId}
                  manageMode={manageMode}
                  themeId={theme.id}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {themes.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {(isAdmin && manageMode)
            ? "Aucun grand thème — créez-en un ci-dessus ou initialisez les thèmes par défaut."
            : "Aucun contenu disponible."}
        </p>
      )}

      {/* Chapitres sans thème (admin uniquement ou si des chapitres sans thème existent) */}
      {(isAdmin && manageMode) && themes.length > 0 && (
        <div className="border border-dashed border-border rounded-lg overflow-hidden opacity-70">
          <button
            onClick={() => setShowUnthemed(!showUnthemed)}
            className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors text-left"
          >
            <span className="text-xs text-muted-foreground">📁 Chapitres sans thème</span>
            {showUnthemed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showUnthemed && (
            <div className="border-t border-border p-3">
              <ChapterManager
                subjectId={subjectId}
                targetStudentId={targetStudentId}
                manageMode={manageMode}
                filterUnthemed
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeManager;
