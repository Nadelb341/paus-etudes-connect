import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Trash2, MessageCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  subject_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const SubjectComments = ({ subjectId }: { subjectId: string }) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchComments();
  }, [subjectId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("subject_comments")
      .select("*")
      .eq("subject_id", subjectId)
      .is("chapter_id", null)
      .order("created_at", { ascending: true });
    if (data) setComments(data as Comment[]);
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    await supabase.from("subject_comments").insert({
      subject_id: subjectId,
      user_id: user.id,
      user_name: user.user_metadata?.first_name || "Utilisateur",
      content: newComment.trim(),
    });
    setNewComment("");
    toast.success("Commentaire ajouté");
    fetchComments();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("subject_comments").delete().eq("id", id);
    toast.success("Commentaire supprimé");
    fetchComments();
  };

  const canDelete = (comment: Comment) => isAdmin || comment.user_id === user?.id;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <MessageCircle size={16} />Commentaires
      </h4>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-2 p-2 bg-secondary/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{c.user_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
            {canDelete(c) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Supprimer ce commentaire ?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteComment(c.id)}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun commentaire</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Écrire un commentaire..."
          rows={2}
          className="flex-1"
        />
        <Button onClick={addComment} size="icon" className="shrink-0 self-end">
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
};

export default SubjectComments;
