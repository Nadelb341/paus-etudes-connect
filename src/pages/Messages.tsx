import { useState, useEffect, useRef } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, ArrowLeft, Search, Users, MessageSquarePlus, UserPlus, Smile, Paperclip, Camera, FileText, Image as ImageIcon, X, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_EMAIL } from "@/lib/constants";

interface Attachment { name: string; url: string; type: string; }

interface Message {
  id: string; sender_id: string; sender_name: string; recipient_type: string;
  recipient_ids: string[]; subject: string; content: string; created_at: string;
  reactions?: Record<string, string[]>;
  attachments?: Attachment[];
}
interface Profile { user_id: string; first_name: string; email: string; }

interface Conversation {
  key: string;              // sorted participant IDs
  participants: string[];   // all participant IDs
  displayName: string;      // names to display
  lastMessage: string;
  lastDate: string;
  isGroup: boolean;
}

const EMOJI_PANEL = [
  "😀", "😂", "🥰", "😍", "😊", "😎", "🤔", "😮", "😢", "😡",
  "👍", "👎", "❤️", "🔥", "⭐", "🎉", "💪", "🙏", "👏", "✅",
  "❌", "📚", "✏️", "💡", "🎓", "📖", "🏆", "💯", "🌟", "👋",
];

const getYouTubeId = (text: string): { id: string; url: string } | null => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;
  const match = text.match(regex);
  if (match) return { id: match[1], url: match[0] };
  return null;
};

// Compute conversation key from a message (sorted set of all participants)
const getConversationKey = (msg: Message): string => {
  const participants = new Set<string>();
  participants.add(msg.sender_id);
  (msg.recipient_ids || []).forEach(id => participants.add(id));
  return Array.from(participants).sort().join(",");
};

const MessagesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [ccParent, setCcParent] = useState(false);
  const [linkedParentId, setLinkedParentId] = useState<string | null>(null);
  const [linkedParentName, setLinkedParentName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rich features state
  const [showEmojis, setShowEmojis] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) localStorage.setItem(`msw_messages_last_read_${user.id}`, new Date().toISOString());
    fetchMessages();
    fetchProfiles();
    const channel = supabase.channel("messages-realtime").on(
      "postgres_changes", { event: "*", schema: "public", table: "messages" },
      () => fetchMessages()
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConvo]);

  // Fetch linked parent for admin (1-to-1 student conversations)
  useEffect(() => {
    if (!isAdmin || !selectedConvo || selectedConvo.isGroup) {
      setLinkedParentId(null); setLinkedParentName(""); setCcParent(false);
      return;
    }
    const studentId = selectedConvo.participants.find(id => id !== user?.id);
    if (!studentId) return;
    const fetchLinkedParent = async () => {
      const { data: sp } = await supabase.from("profiles").select("id").eq("user_id", studentId).single();
      if (!sp) { setLinkedParentId(null); setLinkedParentName(""); return; }
      const { data: link } = await supabase.from("parent_child_cards").select("parent_user_id").eq("child_profile_id", sp.id).maybeSingle();
      if (!link) { setLinkedParentId(null); setLinkedParentName(""); return; }
      const { data: pp } = await supabase.from("profiles").select("first_name").eq("user_id", link.parent_user_id).single();
      setLinkedParentId(link.parent_user_id);
      setLinkedParentName(pp?.first_name || "Parent");
    };
    fetchLinkedParent();
  }, [isAdmin, selectedConvo]);

  const fetchMessages = async () => {
    const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
    if (data) setMessages(data as unknown as Message[]);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, first_name, email").eq("is_approved", true);
    if (data) setProfiles(data);
  };

  const adminProfile = profiles.find(p => p.email === ADMIN_EMAIL);
  const adminId = adminProfile?.user_id;
  const getProfileName = (uid: string) => profiles.find(p => p.user_id === uid)?.first_name || "Utilisateur";

  // --- Build conversations from messages ---
  const getConversations = (): Conversation[] => {
    if (!user) return [];
    const convoMap = new Map<string, Message[]>();

    messages.forEach(msg => {
      if (msg.recipient_type === "all") return;
      // Check if current user is a participant
      const isParticipant = msg.sender_id === user.id || (msg.recipient_ids || []).includes(user.id);
      if (!isParticipant) return;
      const key = getConversationKey(msg);
      if (!convoMap.has(key)) convoMap.set(key, []);
      convoMap.get(key)!.push(msg);
    });

    return Array.from(convoMap.entries()).map(([key, msgs]) => {
      const participants = key.split(",");
      const otherNames = participants.filter(id => id !== user.id).map(id => getProfileName(id));
      const last = msgs[msgs.length - 1];
      const isGroup = participants.length > 2;
      return {
        key,
        participants,
        displayName: isGroup ? `👥 ${otherNames.join(", ")}` : otherNames[0] || "Conversation",
        lastMessage: last.content.substring(0, 60),
        lastDate: last.created_at,
        isGroup,
      };
    }).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  };

  const getThreadMessages = (): Message[] => {
    if (!selectedConvo || !user) return [];
    return messages.filter(msg => {
      if (msg.recipient_type === "all") return false;
      return getConversationKey(msg) === selectedConvo.key;
    });
  };

  // --- File upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `messages/${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("subject-files").upload(path, file);
      if (error) { toast.error(`Erreur upload : ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("subject-files").getPublicUrl(path);
      setPendingAttachments(prev => [...prev, { name: file.name, url: urlData.publicUrl, type: file.type }]);
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // --- Send message ---
  const sendReply = async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !selectedConvo || !user) return;

    // Determine recipients: all participants except me
    let recipients = selectedConvo.participants.filter(id => id !== user.id);

    // If CC parent checked in a 1-to-1 conversation, upgrade to group
    if (ccParent && linkedParentId && !selectedConvo.isGroup) {
      recipients = [...recipients, linkedParentId];
    }

    let content = newMessage.trim();
    if (youtubeLink.trim()) {
      content = content ? `${content}\n${youtubeLink.trim()}` : youtubeLink.trim();
    }

    await supabase.from("messages").insert({
      sender_id: user.id,
      sender_name: user.user_metadata?.first_name || getProfileName(user.id),
      recipient_type: "individual",
      recipient_ids: recipients,
      subject: "",
      content,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    } as any);

    setNewMessage("");
    setPendingAttachments([]);
    setYoutubeLink("");
    setShowYoutubeInput(false);
    setShowEmojis(false);

    // If we upgraded to group conversation, update the selected convo
    if (ccParent && linkedParentId && !selectedConvo.isGroup) {
      const newParticipants = [...selectedConvo.participants, linkedParentId].sort();
      const newKey = newParticipants.join(",");
      const otherNames = newParticipants.filter(id => id !== user.id).map(id => getProfileName(id));
      setSelectedConvo({
        key: newKey,
        participants: newParticipants,
        displayName: `👥 ${otherNames.join(", ")}`,
        lastMessage: content,
        lastDate: new Date().toISOString(),
        isGroup: true,
      });
      setCcParent(false);
      toast.success(`Conversation de groupe créée avec ${linkedParentName}`);
    }
  };

  // --- Reactions ---
  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(user.id)) {
      reactions[emoji] = users.filter((id: string) => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.id];
    }
    await supabase.from("messages").update({ reactions } as any).eq("id", msgId);
    setShowReactionPicker(null);
    fetchMessages();
  };

  const sendBroadcast = async () => {
    if (!broadcastContent.trim() || !user) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      sender_name: user.user_metadata?.first_name || "Admin",
      recipient_type: "all",
      subject: broadcastSubject,
      content: broadcastContent.trim(),
    });
    toast.success("Message diffusé !");
    setShowBroadcast(false);
    setBroadcastContent("");
    setBroadcastSubject("");
  };

  // --- Auto-select for non-admin with single conversation ---
  const conversations = getConversations();
  const threadMessages = getThreadMessages();
  const broadcastMessages = messages.filter(m => m.recipient_type === "all").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const filteredConversations = conversations.filter(c => c.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

  // For non-admin: if only 1 conversation, auto-select it
  useEffect(() => {
    if (!isAdmin && conversations.length === 1 && !selectedConvo) {
      setSelectedConvo(conversations[0]);
    } else if (!isAdmin && conversations.length === 0 && adminId && !selectedConvo) {
      // No messages yet: create a virtual conversation with admin
      setSelectedConvo({
        key: [user!.id, adminId].sort().join(","),
        participants: [user!.id, adminId].sort(),
        displayName: adminProfile?.first_name || "Admin",
        lastMessage: "",
        lastDate: "",
        isGroup: false,
      });
    }
  }, [isAdmin, conversations.length, adminId, selectedConvo]);

  // Users who don't have a conversation yet (admin only)
  const existingPartnerIds = new Set<string>();
  conversations.forEach(c => c.participants.forEach(id => existingPartnerIds.add(id)));
  const usersWithoutConvo = isAdmin ? profiles.filter(p => p.email !== ADMIN_EMAIL && !existingPartnerIds.has(p.user_id)) : [];

  // --- Render helpers ---
  const renderContent = (content: string) => {
    const yt = getYouTubeId(content);
    if (yt) {
      const textWithoutUrl = content.replace(yt.url, "").trim();
      return (
        <>
          {textWithoutUrl && <p className="text-sm whitespace-pre-wrap mb-2">{textWithoutUrl}</p>}
          <a href={`https://www.youtube.com/watch?v=${yt.id}`} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden">
            <div className="relative">
              <img src={`https://img.youtube.com/vi/${yt.id}/mqdefault.jpg`} alt="YouTube" className="w-full rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-600 rounded-full p-2.5 shadow-lg"><Play size={18} className="text-white fill-white ml-0.5" /></div>
              </div>
            </div>
          </a>
        </>
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  };

  const renderAttachments = (attachments: Attachment[] | undefined) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="space-y-1.5 mt-2">
        {attachments.map((att, i) => {
          if (att.type?.startsWith("image/")) {
            return <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="max-w-[200px] rounded-lg border border-border/30" /></a>;
          }
          return (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors">
              <FileText size={16} className="shrink-0" /><span className="text-xs truncate">{att.name}</span>
            </a>
          );
        })}
      </div>
    );
  };


  const hiddenInputs = (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple className="hidden" onChange={handleFileUpload} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
    </>
  );

  // ===================== THREAD VIEW =====================
  if (selectedConvo) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        {hiddenInputs}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
          {(isAdmin || conversations.length > 1) && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedConvo(null)}>
              <ArrowLeft size={18} />
            </Button>
          )}
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm">{selectedConvo.displayName}</p>
            {selectedConvo.isGroup && (
              <p className="text-xs text-muted-foreground">
                {selectedConvo.participants.map(id => getProfileName(id)).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
          {threadMessages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun message. Envoyez le premier !</p>
          )}
          {threadMessages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const reactions = msg.reactions || {};
            const reactionEntries = Object.entries(reactions).filter(([, users]) => (users as string[]).length > 0);
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] space-y-1">
                  {/* Show sender name in group conversations */}
                  {selectedConvo.isGroup && !isMe && (
                    <p className="text-[10px] font-semibold text-primary ml-1">{msg.sender_name}</p>
                  )}
                  {/* Message bubble — relative pour positionner la réaction en haut à droite */}
                  <div className="relative">
                    <div className={`rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                      {renderContent(msg.content)}
                      {renderAttachments(msg.attachments)}
                      <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {/* Emojis de réaction — badge en haut à droite du message */}
                    {reactionEntries.length > 0 && (
                      <div className="absolute -top-2 -right-2 flex gap-0.5">
                        {reactionEntries.map(([emoji, users]) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                            title={`${(users as string[]).length} réaction(s)`}
                            className="w-7 h-7 flex items-center justify-center text-base bg-card border border-border rounded-full shadow-sm hover:bg-secondary transition-all">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Bouton ☺️ grisé — uniquement sur les messages des autres */}
                  {!isMe && (
                    <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                      className="text-muted-foreground/50 text-xs px-1.5 py-0.5 rounded-full border border-border/30 hover:text-muted-foreground hover:border-border transition-all">
                      ☺️
                    </button>
                  )}
                  {showReactionPicker === msg.id && (
                    <div className="flex flex-wrap gap-1 p-2 bg-card border border-border rounded-xl shadow-lg max-w-[280px]">
                      {EMOJI_PANEL.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-lg p-1 hover:bg-secondary rounded transition-colors">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-card p-3 max-w-2xl mx-auto w-full space-y-2">
          {/* CC parent (admin, 1-to-1 only) */}
          {isAdmin && linkedParentId && !selectedConvo.isGroup && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox id="cc-parent" checked={ccParent} onCheckedChange={(v) => setCcParent(!!v)} />
              <label htmlFor="cc-parent" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                <UserPlus size={12} /> Copie à {linkedParentName} (crée une conversation de groupe)
              </label>
            </div>
          )}

          {/* Pending attachments */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {pendingAttachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1 bg-secondary/50 rounded-lg px-2 py-1 text-xs">
                  {att.type?.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-destructive hover:text-destructive/80"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* YouTube link input */}
          {showYoutubeInput && (
            <div className="flex items-center gap-2 px-1">
              <Input value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1 h-8 text-xs" />
              <button onClick={() => { setShowYoutubeInput(false); setYoutubeLink(""); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
          )}

          {/* Emoji panel */}
          {showEmojis && (
            <div className="flex flex-wrap gap-1 p-2 bg-secondary/30 rounded-xl">
              {EMOJI_PANEL.map(emoji => (
                <button key={emoji} onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojis(false); }} className="text-xl p-1 hover:bg-secondary rounded transition-colors">{emoji}</button>
              ))}
            </div>
          )}

          {/* Toolbar + input */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setShowEmojis(!showEmojis); setShowReactionPicker(null); }}
              className={`p-2 rounded-lg transition-colors ${showEmojis ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`} title="Emojis">
              <Smile size={20} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Joindre un fichier" disabled={uploading}>
              <Paperclip size={20} />
            </button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Prendre une photo" disabled={uploading}>
              <Camera size={20} />
            </button>
            <button onClick={() => setShowYoutubeInput(!showYoutubeInput)}
              className={`p-2 rounded-lg transition-colors ${showYoutubeInput ? "bg-red-500/10 text-red-500" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`} title="Lien YouTube">
              <Play size={20} />
            </button>
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écrire un message..." className="flex-1"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }} />
            <Button onClick={sendReply} size="icon" className="bg-gradient-primary shrink-0" disabled={uploading}><Send size={16} /></Button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== CONVERSATION LIST =====================
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">Messages</h1>
          {isAdmin && (
            <Button size="sm" className="bg-gradient-primary" onClick={() => setShowBroadcast(true)}>
              <Users size={16} className="mr-2" />Diffusion
            </Button>
          )}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {/* Broadcast messages */}
        {broadcastMessages.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annonces</h3>
            {broadcastMessages.slice(0, 3).map(msg => (
              <div key={msg.id} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    {msg.subject && <p className="font-semibold text-xs text-primary">{msg.subject}</p>}
                    <p className="text-sm text-foreground">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversations */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversations</h3>
          {filteredConversations.map(c => (
            <button key={c.key} onClick={() => setSelectedConvo(c)}
              className="w-full text-left bg-card rounded-lg border border-border shadow-card p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{c.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.lastMessage}</p>
                </div>
                {c.lastDate && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.lastDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune conversation</p>
          )}
        </div>

        {/* Start new conversation (admin) */}
        {isAdmin && usersWithoutConvo.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nouvelle conversation</h3>
            {usersWithoutConvo.map(p => (
              <button key={p.user_id} onClick={() => {
                const participants = [user!.id, p.user_id].sort();
                setSelectedConvo({
                  key: participants.join(","),
                  participants,
                  displayName: p.first_name,
                  lastMessage: "",
                  lastDate: "",
                  isGroup: false,
                });
              }}
                className="w-full text-left bg-card rounded-lg border border-border shadow-card p-3 hover:bg-secondary/30 transition-colors flex items-center gap-3">
                <MessageSquarePlus size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{p.first_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Broadcast dialog */}
        <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
          <DialogContent>
            <DialogHeader><DialogTitle>Diffuser un message</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} placeholder="Sujet (optionnel)" />
              <Textarea value={broadcastContent} onChange={e => setBroadcastContent(e.target.value)} placeholder="Message pour tous les élèves..." rows={5} />
              <Button onClick={sendBroadcast} className="w-full bg-gradient-primary"><Send size={14} className="mr-2" />Envoyer à tous</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MessagesPage;
