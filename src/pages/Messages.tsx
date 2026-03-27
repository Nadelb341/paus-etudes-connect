import { useState, useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquarePlus, Search, Trash2, Edit2, Send, Users, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ADMIN_EMAIL } from "@/lib/constants";

interface Message {
  id: string; sender_id: string; sender_name: string; recipient_type: string;
  recipient_ids: string[]; subject: string; content: string; created_at: string; updated_at: string;
}
interface Profile { user_id: string; first_name: string; email: string; }

const MessagesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Compose form
  const [recipientType, setRecipientType] = useState("all");
  const [recipientId, setRecipientId] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");

  useEffect(() => {
    fetchMessages();
    fetchProfiles();
    // Realtime subscription
    const channel = supabase.channel("messages-realtime").on(
      "postgres_changes", { event: "*", schema: "public", table: "messages" },
      () => fetchMessages()
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
    if (data) setMessages(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, first_name, email").eq("is_approved", true);
    if (data) setProfiles(data);
  };

  const sendMessage = async () => {
    if (!msgSubject || !msgContent) { toast.error("Remplissez sujet et contenu"); return; }
    const insert: any = {
      sender_id: user?.id, sender_name: user?.user_metadata?.first_name || "Utilisateur",
      recipient_type: recipientType, subject: msgSubject, content: msgContent,
    };
    if (recipientType === "individual" && recipientId) {
      insert.recipient_ids = [recipientId];
    }
    await supabase.from("messages").insert(insert);
    toast.success("Message envoyé !");
    setShowCompose(false); setMsgSubject(""); setMsgContent(""); setRecipientType("all"); setRecipientId("");
  };

  const updateMessage = async () => {
    if (!editingMessage) return;
    await supabase.from("messages").update({
      subject: editingMessage.subject, content: editingMessage.content, updated_at: new Date().toISOString(),
    }).eq("id", editingMessage.id);
    toast.success("Message modifié !");
    setEditingMessage(null);
    fetchMessages();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("messages").delete().eq("id", id);
    toast.success("Message supprimé");
    fetchMessages();
  };

  const filtered = messages.filter(m =>
    m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecipientLabel = (msg: Message) => {
    if (msg.recipient_type === "all") return "Tous les élèves";
    if (msg.recipient_type === "individual" && msg.recipient_ids?.length) {
      const p = profiles.find(p => p.user_id === msg.recipient_ids[0]);
      return p?.first_name || "Un élève";
    }
    return msg.recipient_type;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">Messages</h1>
          <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={() => setShowCompose(true)}>
            <MessageSquarePlus size={16} className="mr-2" />Nouveau message
          </Button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un message..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-lg border border-border shadow-card p-8 text-center">
              <p className="text-muted-foreground text-sm">Aucun message</p>
            </div>
          ) : (
            filtered.map(msg => (
              <div key={msg.id} className="bg-card rounded-lg border border-border shadow-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{msg.subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      De {msg.sender_name} · À {getRecipientLabel(msg)} · {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {msg.sender_id === user?.id && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingMessage({ ...msg })}>
                        <Edit2 size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 size={14} className="text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteMessage(msg.id)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Compose dialog */}
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau message</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><div className="flex items-center gap-2"><Users size={14} />Tous les élèves</div></SelectItem>
                  <SelectItem value="individual"><div className="flex items-center gap-2"><User size={14} />Un élève</div></SelectItem>
                </SelectContent>
              </Select>
              {recipientType === "individual" && (
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} ({p.email})</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Sujet" />
              <Textarea value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder="Message..." rows={5} />
              <Button onClick={sendMessage} className="w-full bg-gradient-primary"><Send size={14} className="mr-2" />Envoyer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editingMessage} onOpenChange={(open) => { if (!open) setEditingMessage(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier le message</DialogTitle></DialogHeader>
            {editingMessage && (
              <div className="space-y-4">
                <Input value={editingMessage.subject} onChange={e => setEditingMessage({ ...editingMessage, subject: e.target.value })} placeholder="Sujet" />
                <Textarea value={editingMessage.content} onChange={e => setEditingMessage({ ...editingMessage, content: e.target.value })} rows={5} />
                <Button onClick={updateMessage} className="w-full bg-gradient-primary">Sauvegarder</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MessagesPage;
