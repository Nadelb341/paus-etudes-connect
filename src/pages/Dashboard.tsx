import { useState, useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL, SUBJECTS_GENERAL, SUBJECTS_LYCEE, SCHOOL_LEVELS, HOURLY_RATES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Users, Clock, Bell, BookOpen, Activity, Plus, ChevronDown, ChevronUp, Trash2, Edit2, Check, X, Search, UserCheck, UserX, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string; user_id: string; first_name: string; email: string; gender: string;
  birth_date: string | null; school_level: string; remarks: string; is_approved: boolean; created_at: string;
}
interface TutoringHour {
  id: string; student_id: string; session_date: string; duration_hours: number;
  hourly_rate: number; subject: string; notes: string;
}

const ALL_SUBJECTS = [...SUBJECTS_GENERAL, ...SUBJECTS_LYCEE];

const getHourlyRate = (level: string): number => {
  const primary = ["Maternelle", "CP", "CE1", "CE2", "CM1", "CM2"];
  const college = ["6ème", "5ème", "4ème", "3ème"];
  if (primary.includes(level)) return HOURLY_RATES.maternelle_primaire;
  if (college.includes(level)) return HOURLY_RATES.college;
  return HOURLY_RATES.lycee;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([]);
  const [tutoringHours, setTutoringHours] = useState<TutoringHour[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingRemarks, setEditingRemarks] = useState("");

  // Homework form
  const [hwSubject, setHwSubject] = useState("");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");

  // Tutoring hour form
  const [thStudentId, setThStudentId] = useState("");
  const [thDate, setThDate] = useState("");
  const [thDuration, setThDuration] = useState("1");
  const [thSubject, setThSubject] = useState("");
  const [thNotes, setThNotes] = useState("");

  // Notification form
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifRecipientType, setNotifRecipientType] = useState("all");
  const [notifRecipientId, setNotifRecipientId] = useState("");

  // Edit tutoring hour
  const [editingHour, setEditingHour] = useState<TutoringHour | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
      fetchTutoringHours();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) {
      setProfiles(data.filter(p => p.is_approved));
      setPendingProfiles(data.filter(p => !p.is_approved));
    }
  };

  const fetchTutoringHours = async () => {
    const { data } = await supabase.from("tutoring_hours").select("*").order("session_date", { ascending: false });
    if (data) setTutoringHours(data);
  };

  const approveStudent = async (profile: Profile) => {
    await supabase.from("profiles").update({ is_approved: true }).eq("id", profile.id);
    toast.success(`${profile.first_name} approuvé(e) !`);
    fetchProfiles();
  };

  const rejectStudent = async (profile: Profile) => {
    await supabase.from("profiles").update({ is_approved: false }).eq("id", profile.id);
    toast.success("Inscription refusée");
    fetchProfiles();
  };

  const saveRemarks = async () => {
    if (!selectedProfile) return;
    await supabase.from("profiles").update({ remarks: editingRemarks }).eq("id", selectedProfile.id);
    toast.success("Remarques sauvegardées");
    setSelectedProfile(null);
    fetchProfiles();
  };

  const createHomework = async () => {
    if (!hwSubject || !hwTitle || !hwDueDate) { toast.error("Remplissez tous les champs obligatoires"); return; }
    await supabase.from("homework").insert({
      subject_id: hwSubject, title: hwTitle, description: hwDesc, due_date: hwDueDate, created_by: user?.id,
    });
    toast.success("Devoir créé !");
    setHwSubject(""); setHwTitle(""); setHwDesc(""); setHwDueDate("");
  };

  const addTutoringHour = async () => {
    if (!thStudentId || !thDate || !thDuration) { toast.error("Remplissez tous les champs"); return; }
    const student = profiles.find(p => p.user_id === thStudentId);
    const rate = student ? getHourlyRate(student.school_level) : HOURLY_RATES.lycee;
    await supabase.from("tutoring_hours").insert({
      student_id: thStudentId, session_date: thDate, duration_hours: parseFloat(thDuration),
      hourly_rate: rate, subject: thSubject, notes: thNotes, created_by: user?.id,
    });
    toast.success("Heure ajoutée !");
    setThStudentId(""); setThDate(""); setThDuration("1"); setThSubject(""); setThNotes("");
    fetchTutoringHours();
  };

  const updateTutoringHour = async () => {
    if (!editingHour) return;
    await supabase.from("tutoring_hours").update({
      session_date: editingHour.session_date, duration_hours: editingHour.duration_hours,
      hourly_rate: editingHour.hourly_rate, subject: editingHour.subject, notes: editingHour.notes,
    }).eq("id", editingHour.id);
    toast.success("Heure modifiée");
    setEditingHour(null);
    fetchTutoringHours();
  };

  const deleteTutoringHour = async (id: string) => {
    await supabase.from("tutoring_hours").delete().eq("id", id);
    toast.success("Heure supprimée");
    fetchTutoringHours();
  };

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage) { toast.error("Remplissez titre et message"); return; }
    const insert: any = {
      title: notifTitle, message: notifMessage, sender_id: user?.id,
      recipient_type: notifRecipientType,
    };
    if (notifRecipientType === "individual" && notifRecipientId) {
      insert.recipient_ids = [notifRecipientId];
    }
    await supabase.from("notifications").insert(insert);
    toast.success("Notification envoyée !");
    setNotifTitle(""); setNotifMessage(""); setNotifRecipientType("all"); setNotifRecipientId("");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground">Accès restreint</h1>
          <p className="text-muted-foreground text-sm mt-2">Seul l'administrateur peut accéder au tableau de bord.</p>
        </main>
      </div>
    );
  }

  const sections = [
    { key: "pending", icon: UserCheck, title: `Inscriptions en attente (${pendingProfiles.length})`, color: "hsl(350, 65%, 50%)", badge: pendingProfiles.length },
    { key: "monitoring", icon: Activity, title: "Monitoring", color: "hsl(217, 91%, 60%)" },
    { key: "students", icon: Users, title: "Élèves", color: "hsl(142, 71%, 45%)" },
    { key: "hours", icon: Clock, title: "Registre des heures", color: "hsl(32, 80%, 50%)" },
    { key: "notifications", icon: Bell, title: "Notifications", color: "hsl(350, 65%, 50%)" },
    { key: "homework", icon: BookOpen, title: "Cahier de texte", color: "hsl(260, 50%, 55%)" },
  ];

  const filteredProfiles = profiles.filter(p =>
    p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentName = (userId: string) => profiles.find(p => p.user_id === userId)?.first_name || "—";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-primary" />
          <h1 className="text-xl font-heading font-bold text-foreground">Tableau de bord</h1>
        </div>

        <div className="space-y-3">
          {sections.map(({ key, icon: Icon, title, color, badge }) => (
            <div key={key} className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <button
                onClick={() => setActiveSection(activeSection === key ? null : key)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <span className="font-heading font-semibold text-sm">{title}</span>
                  {badge ? <Badge variant="destructive" className="text-xs">{badge}</Badge> : null}
                </div>
                {activeSection === key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {activeSection === key && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border p-4">
                  {/* PENDING REGISTRATIONS */}
                  {key === "pending" && (
                    <div className="space-y-3">
                      {pendingProfiles.length === 0 ? <p className="text-sm text-muted-foreground">Aucune inscription en attente</p> : (
                        pendingProfiles.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{p.first_name}</p>
                              <p className="text-xs text-muted-foreground">{p.email} · {p.school_level} · {p.gender}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveStudent(p)} className="bg-green-600 hover:bg-green-700 text-white"><UserCheck size={14} className="mr-1" />Accepter</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive"><UserX size={14} className="mr-1" />Refuser</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Refuser cette inscription ?</AlertDialogTitle></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => rejectStudent(p)}>Refuser</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* MONITORING */}
                  {key === "monitoring" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-secondary/30 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{profiles.length}</p>
                        <p className="text-xs text-muted-foreground">Élèves inscrits</p>
                      </div>
                      <div className="p-4 bg-secondary/30 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{pendingProfiles.length}</p>
                        <p className="text-xs text-muted-foreground">En attente</p>
                      </div>
                      <div className="p-4 bg-secondary/30 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{tutoringHours.length}</p>
                        <p className="text-xs text-muted-foreground">Sessions totales</p>
                      </div>
                      <div className="p-4 bg-secondary/30 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{tutoringHours.reduce((sum, h) => sum + h.duration_hours * h.hourly_rate, 0).toFixed(0)}€</p>
                        <p className="text-xs text-muted-foreground">Revenus totaux</p>
                      </div>
                    </div>
                  )}

                  {/* STUDENTS */}
                  {key === "students" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Rechercher un élève..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      </div>
                      {filteredProfiles.map(p => (
                        <div key={p.id} className="p-3 bg-secondary/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{p.first_name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedProfile(p); setEditingRemarks(p.remarks || ""); }}>
                              <Eye size={14} className="mr-1" />Détails
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HOURS */}
                  {key === "hours" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select value={thStudentId} onValueChange={setThStudentId}>
                          <SelectTrigger><SelectValue placeholder="Élève" /></SelectTrigger>
                          <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} ({p.school_level})</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="date" value={thDate} onChange={e => setThDate(e.target.value)} />
                        <Input type="number" step="0.5" value={thDuration} onChange={e => setThDuration(e.target.value)} placeholder="Durée (h)" />
                        <Select value={thSubject} onValueChange={setThSubject}>
                          <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
                          <SelectContent>{ALL_SUBJECTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input value={thNotes} onChange={e => setThNotes(e.target.value)} placeholder="Notes..." />
                      <Button onClick={addTutoringHour} className="bg-gradient-primary"><Plus size={14} className="mr-1" />Ajouter</Button>

                      <div className="space-y-2 mt-4">
                        {tutoringHours.map(h => (
                          <div key={h.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg text-sm">
                            <div>
                              <p className="font-medium">{getStudentName(h.student_id)} — {ALL_SUBJECTS.find(s => s.id === h.subject)?.label || h.subject}</p>
                              <p className="text-xs text-muted-foreground">{new Date(h.session_date).toLocaleDateString("fr-FR")} · {h.duration_hours}h · {h.hourly_rate}€/h = {(h.duration_hours * h.hourly_rate).toFixed(0)}€</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setEditingHour(h)}><Edit2 size={14} /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 size={14} className="text-destructive" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Supprimer cette heure ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteTutoringHour(h.id)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NOTIFICATIONS */}
                  {key === "notifications" && (
                    <div className="space-y-4">
                      <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Titre de la notification" />
                      <Textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="Message..." rows={3} />
                      <Select value={notifRecipientType} onValueChange={setNotifRecipientType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les élèves</SelectItem>
                          <SelectItem value="individual">Un élève</SelectItem>
                        </SelectContent>
                      </Select>
                      {notifRecipientType === "individual" && (
                        <Select value={notifRecipientId} onValueChange={setNotifRecipientId}>
                          <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                          <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.first_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      <Button onClick={sendNotification} className="bg-gradient-primary"><Bell size={14} className="mr-1" />Envoyer</Button>
                    </div>
                  )}

                  {/* HOMEWORK */}
                  {key === "homework" && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Nouveau devoir</h4>
                      <Select value={hwSubject} onValueChange={setHwSubject}>
                        <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
                        <SelectContent>{ALL_SUBJECTS.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="Titre du devoir" />
                      <Textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} placeholder="Description..." rows={3} />
                      <div>
                        <Label className="text-xs text-muted-foreground">Date à rendre</Label>
                        <Input type="date" value={hwDueDate} onChange={e => setHwDueDate(e.target.value)} />
                      </div>
                      <Button onClick={createHomework} className="bg-gradient-primary"><Plus size={14} className="mr-1" />Créer le devoir</Button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Student detail dialog */}
        <Dialog open={!!selectedProfile} onOpenChange={(open) => { if (!open) setSelectedProfile(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{selectedProfile?.first_name}</DialogTitle></DialogHeader>
            {selectedProfile && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{selectedProfile.email}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Genre</Label><p>{selectedProfile.gender}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Niveau</Label><p>{selectedProfile.school_level}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Date de naissance</Label><p>{selectedProfile.birth_date || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Inscription</Label><p>{new Date(selectedProfile.created_at).toLocaleDateString("fr-FR")}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Tarif</Label><p>{getHourlyRate(selectedProfile.school_level)}€/h</p></div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remarques</Label>
                  <Textarea value={editingRemarks} onChange={e => setEditingRemarks(e.target.value)} rows={3} placeholder="Remarques sur l'élève..." />
                </div>
                <Button onClick={saveRemarks} className="bg-gradient-primary">Sauvegarder</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit tutoring hour dialog */}
        <Dialog open={!!editingHour} onOpenChange={(open) => { if (!open) setEditingHour(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier l'heure</DialogTitle></DialogHeader>
            {editingHour && (
              <div className="space-y-3">
                <Input type="date" value={editingHour.session_date} onChange={e => setEditingHour({ ...editingHour, session_date: e.target.value })} />
                <Input type="number" step="0.5" value={editingHour.duration_hours} onChange={e => setEditingHour({ ...editingHour, duration_hours: parseFloat(e.target.value) })} />
                <Input type="number" value={editingHour.hourly_rate} onChange={e => setEditingHour({ ...editingHour, hourly_rate: parseFloat(e.target.value) })} />
                <Input value={editingHour.notes} onChange={e => setEditingHour({ ...editingHour, notes: e.target.value })} placeholder="Notes..." />
                <Button onClick={updateTutoringHour} className="bg-gradient-primary">Sauvegarder</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DashboardPage;
