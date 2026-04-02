import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL, SUBJECTS_GENERAL, SUBJECTS_LYCEE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, MoreVertical, Plus, Trash2, Eye, EyeOff, Pin, Edit2, CalendarOff, XCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Appointment {
  id: string;
  student_id: string;
  student_name: string;
  appointment_date: string;
  start_time: string;
  subjects: string[];
  estimated_duration: string;
  items_to_bring: string;
  seen_by_student: boolean;
  is_visible: boolean;
  status: string;
  status_note: string;
}

interface Profile {
  user_id: string;
  first_name: string;
  status: string;
}

const ALL_SUBJECTS = [...SUBJECTS_GENERAL, ...SUBJECTS_LYCEE];
const DURATIONS = ["30min", "1h", "1h30", "2h", "2h30", "3h", "3h30", "4h"];

interface AppointmentsCardProps {
  forParentStudentId?: string;
}

const AppointmentsCard = ({ forParentStudentId }: AppointmentsCardProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [startTime, setStartTime] = useState("14:00");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [duration, setDuration] = useState("1h");
  const [itemsToBring, setItemsToBring] = useState("");

  // Edit state
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editTime, setEditTime] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editDuration, setEditDuration] = useState("");
  const [editItems, setEditItems] = useState("");

  // Status change state
  const [statusAction, setStatusAction] = useState<{ appt: Appointment; action: "postponed" | "cancelled" } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [postponeDate, setPostponeDate] = useState<Date>();
  const [postponeTime, setPostponeTime] = useState("14:00");

  // Parent selection state (for creation)
  const [parentProfiles, setParentProfiles] = useState<{ user_id: string; first_name: string; email: string }[]>([]);
  const [selectedParent, setSelectedParentId] = useState("");

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true });
    if (data) setAppointments(data as Appointment[]);
  };

  const fetchStudents = async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name, status")
      .eq("is_approved", true)
      .eq("status", "élève");
    if (data) setStudents(data);
  };

  // Fetch parents linked to selected student
  const fetchParentsForStudent = async (studentUserId: string) => {
    // Get the profile.id for this student
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", studentUserId)
      .single();
    if (!profileData) { setParentProfiles([]); return; }

    // Find parent_child_cards linked to this profile
    const { data: cards } = await supabase
      .from("parent_child_cards")
      .select("parent_user_id")
      .eq("child_profile_id", profileData.id);
    if (!cards || cards.length === 0) { setParentProfiles([]); return; }

    const parentIds = cards.map((c: any) => c.parent_user_id);
    const { data: parents } = await supabase
      .from("profiles")
      .select("user_id, first_name, email")
      .in("user_id", parentIds);
    if (parents) setParentProfiles(parents);
    else setParentProfiles([]);
  };

  useEffect(() => {
    fetchAppointments();
    if (isAdmin) fetchStudents();
  }, [user]);

  // When selected student changes, fetch linked parents
  useEffect(() => {
    if (selectedStudent) {
      fetchParentsForStudent(selectedStudent);
    } else {
      setParentProfiles([]);
    }
    setSelectedParentId("");
  }, [selectedStudent]);

  const handleCreate = async () => {
    if (!selectedStudent || !appointmentDate) {
      toast.error("Sélectionnez un élève et une date");
      return;
    }
    const student = students.find(s => s.user_id === selectedStudent);
    const { error } = await supabase.from("appointments").insert({
      student_id: selectedStudent,
      student_name: student?.first_name || "",
      appointment_date: format(appointmentDate, "yyyy-MM-dd"),
      start_time: startTime,
      subjects: selectedSubjects,
      estimated_duration: duration,
      items_to_bring: itemsToBring,
      is_visible: isVisible,
      created_by: user?.id,
    });
    if (error) { toast.error("Erreur lors de la création"); return; }
    toast.success("RDV créé !");
    setShowForm(false);
    resetForm();
    fetchAppointments();
  };

  const resetForm = () => {
    setSelectedStudent("");
    setAppointmentDate(undefined);
    setStartTime("14:00");
    setSelectedSubjects([]);
    setDuration("1h");
    setItemsToBring("");
    setSelectedParentId("");
    setParentProfiles([]);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
    toast.success("RDV supprimé");
    fetchAppointments();
  };

  const toggleGlobalVisibility = async () => {
    const newVal = !isVisible;
    setIsVisible(newVal);
    await supabase.from("appointments").update({ is_visible: newVal }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success(newVal ? "Carte visible pour les élèves" : "Carte masquée pour les élèves");
  };

  const handleSeenToggle = async (id: string, current: boolean) => {
    await supabase.from("appointments").update({ seen_by_student: !current }).eq("id", id);
    fetchAppointments();
  };

  const toggleSubject = (subjectId: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(subjectId) ? list.filter(s => s !== subjectId) : [...list, subjectId]);
  };

  // Edit appointment
  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setEditDate(new Date(appt.appointment_date));
    setEditTime(appt.start_time?.slice(0, 5) || "14:00");
    setEditSubjects([...appt.subjects]);
    setEditDuration(appt.estimated_duration);
    setEditItems(appt.items_to_bring || "");
  };

  const handleSaveEdit = async () => {
    if (!editingAppt || !editDate) return;
    const { error } = await supabase.from("appointments").update({
      appointment_date: format(editDate, "yyyy-MM-dd"),
      start_time: editTime,
      subjects: editSubjects,
      estimated_duration: editDuration,
      items_to_bring: editItems,
    }).eq("id", editingAppt.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("RDV modifié !");
    setEditingAppt(null);
    fetchAppointments();
  };

  // Status change (postpone / cancel)
  const handleStatusChange = async () => {
    if (!statusAction) return;
    if (statusAction.action === "postponed" && !postponeDate) {
      toast.error("Veuillez choisir une nouvelle date pour le report");
      return;
    }
    const updateData: any = {
      status: statusAction.action,
      status_note: statusNote,
    };
    // If postponed, update the appointment date and time
    if (statusAction.action === "postponed" && postponeDate) {
      updateData.appointment_date = format(postponeDate, "yyyy-MM-dd");
      updateData.start_time = postponeTime;
    }
    const { error } = await supabase.from("appointments").update(updateData).eq("id", statusAction.appt.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(statusAction.action === "postponed" ? "RDV reporté à la nouvelle date" : "RDV annulé");
    setStatusAction(null);
    setStatusNote("");
    setPostponeDate(undefined);
    setPostponeTime("14:00");
    fetchAppointments();
  };

  // Filter based on context
  const visibleAppointments = (() => {
    if (forParentStudentId) {
      return appointments.filter(a => a.student_id === forParentStudentId);
    }
    if (isAdmin) return appointments;
    return appointments.filter(a => a.student_id === user?.id);
  })();

  if (!isAdmin && !forParentStudentId && visibleAppointments.length === 0) return null;
  if (forParentStudentId && visibleAppointments.length === 0) return null;

  const getStatusBadge = (status: string) => {
    if (status === "postponed") return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">📅 Reporté</span>;
    if (status === "cancelled") return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">❌ Annulé</span>;
    return null;
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon size={18} className="text-primary" />
          📅 RDV à venir
        </CardTitle>
        {isAdmin && !forParentStudentId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowForm(true)}>
                <Plus size={14} className="mr-2" /> Ajouter un RDV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleGlobalVisibility}>
                {isVisible ? <EyeOff size={14} className="mr-2" /> : <Eye size={14} className="mr-2" />}
                {isVisible ? "Masquer aux élèves" : "Afficher aux élèves"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Aucun RDV prévu</p>
        ) : (
          visibleAppointments.map(appt => (
            <div key={appt.id} className={cn(
              "border border-border rounded-lg p-3 space-y-1 text-sm",
              appt.status === "cancelled" && "opacity-60",
              appt.status === "postponed" && "border-orange-300 dark:border-orange-700"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {isAdmin ? appt.student_name : (forParentStudentId ? appt.student_name : "Mon prochain cours")}
                  </span>
                  {getStatusBadge(appt.status)}
                </div>
                <div className="flex items-center gap-1">
                  {appt.seen_by_student && (
                    <span className="text-xs text-green-600 dark:text-green-400">✅ Vu</span>
                  )}
                  {isAdmin && !forParentStudentId && appt.status === "active" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pin size={14} className="text-primary" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(appt)}>
                          <Edit2 size={14} className="mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStatusAction({ appt, action: "postponed" }); setStatusNote(""); }}>
                          <CalendarOff size={14} className="mr-2" /> Reporter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStatusAction({ appt, action: "cancelled" }); setStatusNote(""); }}>
                          <XCircle size={14} className="mr-2" /> Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {isAdmin && !forParentStudentId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer ce RDV ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(appt.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              {appt.status_note && appt.status !== "active" && (
                <p className="text-xs text-muted-foreground italic">💬 {appt.status_note}</p>
              )}
              <p className="text-muted-foreground">
                📅 {format(new Date(appt.appointment_date), "EEEE d MMMM yyyy", { locale: fr })}
                {" · "}🕐 {appt.start_time?.slice(0, 5)}
              </p>
              <p className="text-muted-foreground">
                📚 {appt.subjects.map(s => ALL_SUBJECTS.find(sub => sub.id === s)?.label || s).join(", ")}
                {" · "}⏱️ {appt.estimated_duration}
              </p>
              {appt.items_to_bring && (
                <div className="bg-secondary/50 rounded p-2 text-xs">
                  <p className="font-medium mb-1">🎒 Affaires à prendre :</p>
                  <p className="whitespace-pre-line">{appt.items_to_bring}</p>
                </div>
              )}
              {!isAdmin && !forParentStudentId && (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={appt.seen_by_student}
                    onCheckedChange={() => handleSeenToggle(appt.id, appt.seen_by_student)}
                  />
                  <span className="text-xs text-muted-foreground">J'ai vu le RDV</span>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      {/* Admin creation dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau RDV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Élève</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.first_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {parentProfiles.length > 0 && (
              <div>
                <label className="text-sm font-medium">Parent associé (optionnel)</label>
                <Select value={selectedParent} onValueChange={setSelectedParentId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un parent" /></SelectTrigger>
                  <SelectContent>
                    {parentProfiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} ({p.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Le parent recevra aussi les notifications du RDV</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Date du cours</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !appointmentDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {appointmentDate ? format(appointmentDate, "PPP", { locale: fr }) : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">Heure de début</label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Matière(s)</label>
              <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto border border-input rounded-md p-2">
                {ALL_SUBJECTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSubject(s.id, selectedSubjects, setSelectedSubjects)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border transition-all",
                      selectedSubjects.includes(s.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Temps estimé</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Affaires à prendre</label>
              <Textarea
                value={itemsToBring}
                onChange={e => setItemsToBring(e.target.value)}
                placeholder={"- 1 livre d'histoire\n- Cahier de cours\n- Calculatrice"}
                rows={4}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Créer le RDV</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingAppt} onOpenChange={open => { if (!open) setEditingAppt(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le RDV — {editingAppt?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date du cours</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !editDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP", { locale: fr }) : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDate} onSelect={setEditDate} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">Heure de début</label>
              <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Matière(s)</label>
              <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto border border-input rounded-md p-2">
                {ALL_SUBJECTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSubject(s.id, editSubjects, setEditSubjects)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border transition-all",
                      editSubjects.includes(s.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Temps estimé</label>
              <Select value={editDuration} onValueChange={setEditDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Affaires à prendre</label>
              <Textarea value={editItems} onChange={e => setEditItems(e.target.value)} rows={4} />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status change dialog (postpone/cancel) */}
      <Dialog open={!!statusAction} onOpenChange={open => { if (!open) { setStatusAction(null); setPostponeDate(undefined); setPostponeTime("14:00"); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {statusAction?.action === "postponed" ? "📅 Reporter le RDV" : "❌ Annuler le RDV"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {statusAction?.action === "postponed"
                ? "Choisissez la nouvelle date et heure. L'élève et le parent seront notifiés."
                : "Ce RDV sera marqué comme annulé. L'élève et le parent seront notifiés."}
            </p>
            {statusAction?.action === "postponed" && (
              <>
                <div>
                  <label className="text-sm font-medium">Nouvelle date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !postponeDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {postponeDate ? format(postponeDate, "PPP", { locale: fr }) : "Choisir une nouvelle date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={postponeDate} onSelect={setPostponeDate} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Nouvelle heure</label>
                  <Input type="time" value={postponeTime} onChange={e => setPostponeTime(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium">Note (optionnelle)</label>
              <Textarea
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="Raison du report ou de l'annulation..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStatusAction(null); setPostponeDate(undefined); setPostponeTime("14:00"); }} className="flex-1">Annuler</Button>
              <Button onClick={handleStatusChange} className="flex-1" variant={statusAction?.action === "cancelled" ? "destructive" : "default"}>
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AppointmentsCard;
