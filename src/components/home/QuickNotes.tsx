import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StickyNote, Plus, Check, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface QuickNote {
  id: string;
  student_id: string;
  content: string;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  first_name: string;
}

const QuickNotes = () => {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [content, setContent] = useState("");
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);

  const fetchNotes = async () => {
    const { data } = await (supabase as any)
      .from("admin_quick_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotes(data as QuickNote[]);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name")
      .eq("is_approved", true)
      .eq("status", "élève");
    if (data) setStudents(data as unknown as Profile[]);
  };

  useEffect(() => {
    fetchNotes();
    fetchStudents();
  }, []);

  const getStudentName = (studentId: string) => {
    return students.find(s => s.user_id === studentId)?.first_name || "Élève";
  };

  const handleSave = async () => {
    if (!selectedStudent || !content.trim()) {
      toast.error("Sélectionnez un élève et ajoutez du contenu");
      return;
    }
    if (editingNote) {
      await (supabase as any).from("admin_quick_notes").update({
        content: content.trim(),
        student_id: selectedStudent,
        updated_at: new Date().toISOString(),
      }).eq("id", editingNote.id);
      toast.success("Note modifiée !");
    } else {
      await (supabase as any).from("admin_quick_notes").insert({
        student_id: selectedStudent,
        content: content.trim(),
        is_validated: false,
      });
      toast.success("Note ajoutée !");
    }
    resetForm();
    fetchNotes();
  };

  const handleValidate = async (note: QuickNote) => {
    await (supabase as any).from("admin_quick_notes").update({
      is_validated: !note.is_validated,
      updated_at: new Date().toISOString(),
    }).eq("id", note.id);
    toast.success(note.is_validated ? "Note retirée de l'aperçu" : "Note validée !");
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    await (supabase as any).from("admin_quick_notes").delete().eq("id", noteId);
    toast.success("Note supprimée");
    fetchNotes();
  };

  const handleEdit = (note: QuickNote) => {
    setEditingNote(note);
    setSelectedStudent(note.student_id);
    setContent(note.content);
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setSelectedStudent("");
    setContent("");
    setIsOpen(false);
  };

  const validatedNotes = notes.filter(n => n.is_validated);
  const groupedByStudent = validatedNotes.reduce((acc, note) => {
    const name = getStudentName(note.student_id);
    if (!acc[name]) acc[name] = [];
    acc[name].push(note);
    return acc;
  }, {} as Record<string, QuickNote[]>);

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-600" />
          Notes rapides
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => { resetForm(); setIsOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Aperçu des notes validées */}
        {Object.keys(groupedByStudent).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(groupedByStudent).map(([studentName, studentNotes]) => (
              <div key={studentName} className="bg-background rounded-md p-2.5 border">
                <p className="font-semibold text-sm text-primary mb-1">📌 {studentName}</p>
                <ul className="list-decimal list-inside space-y-0.5">
                  {studentNotes.map(note => (
                    <li key={note.id} className="text-sm text-muted-foreground">
                      {note.content}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucune note validée pour le moment.</p>
        )}

        {/* Bouton voir toutes les notes */}
        {notes.length > 0 && (
          <NotesListDialog
            notes={notes}
            students={students}
            getStudentName={getStudentName}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onValidate={handleValidate}
          />
        )}
      </CardContent>

      {/* Dialog ajout / édition */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? "Modifier la note" : "Nouvelle note rapide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un élève" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.user_id} value={s.user_id}>{s.first_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Information à noter..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button onClick={handleSave}>
                {editingNote ? "Modifier" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Sub-component: list of all notes in a collapsible dialog
const NotesListDialog = ({
  notes, students, getStudentName, onEdit, onDelete, onValidate,
}: {
  notes: QuickNote[];
  students: Profile[];
  getStudentName: (id: string) => string;
  onEdit: (n: QuickNote) => void;
  onDelete: (id: string) => void;
  onValidate: (n: QuickNote) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={() => setOpen(true)}>
        Gérer les notes ({notes.length})
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toutes les notes rapides</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className={`rounded-md border p-3 ${note.is_validated ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-muted/30"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">{getStudentName(note.student_id)}</p>
                    <p className="text-sm mt-0.5">{note.content}</p>
                    {note.is_validated && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Validée</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onValidate(note)} title={note.is_validated ? "Retirer" : "Valider"}>
                      <Check className={`h-4 w-4 ${note.is_validated ? "text-green-600" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setOpen(false); onEdit(note); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(note.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickNotes;
