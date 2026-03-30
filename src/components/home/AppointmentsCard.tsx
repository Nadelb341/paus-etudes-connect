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
import { CalendarIcon, MoreVertical, Plus, Trash2, Eye, EyeOff, Clock } from "lucide-react";
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
}

interface Profile {
  user_id: string;
  first_name: string;
  status: string;
}

const ALL_SUBJECTS = [...SUBJECTS_GENERAL, ...SUBJECTS_LYCEE];

const DURATIONS = ["30min", "1h", "1h30", "2h", "2h30", "3h", "3h30", "4h"];

const AppointmentsCard = () => {
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

  useEffect(() => {
    fetchAppointments();
    if (isAdmin) fetchStudents();
  }, [user]);

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
  };

  const handleDelete = async (id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
    toast.success("RDV supprimé");
    fetchAppointments();
  };

  const toggleGlobalVisibility = async () => {
    const newVal = !isVisible;
    setIsVisible(newVal);
    // Update all appointments visibility
    await supabase.from("appointments").update({ is_visible: newVal }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success(newVal ? "Carte visible pour les élèves" : "Carte masquée pour les élèves");
  };

  const handleSeenToggle = async (id: string, current: boolean) => {
    await supabase.from("appointments").update({ seen_by_student: !current }).eq("id", id);
    fetchAppointments();
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(s => s !== subjectId) : [...prev, subjectId]
    );
  };

  // Filter: students see only their own, admin sees all
  const visibleAppointments = isAdmin
    ? appointments
    : appointments.filter(a => a.student_id === user?.id);

  if (!isAdmin && visibleAppointments.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon size={18} className="text-primary" />
          📅 RDV à venir
        </CardTitle>
        {isAdmin && (
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
            <div key={appt.id} className="border border-border rounded-lg p-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {isAdmin ? appt.student_name : "Mon prochain cours"}
                </span>
                <div className="flex items-center gap-1">
                  {appt.seen_by_student && (
                    <span className="text-xs text-green-600 dark:text-green-400">✅ Vu</span>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(appt.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
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
              {!isAdmin && (
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
            {/* Student */}
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

            {/* Date */}
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

            {/* Time */}
            <div>
              <label className="text-sm font-medium">Heure de début</label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>

            {/* Subjects multi-select */}
            <div>
              <label className="text-sm font-medium">Matière(s)</label>
              <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto border border-input rounded-md p-2">
                {ALL_SUBJECTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSubject(s.id)}
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

            {/* Duration */}
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

            {/* Items to bring */}
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
    </Card>
  );
};

export default AppointmentsCard;
