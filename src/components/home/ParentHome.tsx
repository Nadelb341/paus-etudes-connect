import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminView } from "@/hooks/useAdminView";
import { ADMIN_EMAIL } from "@/lib/constants";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, CalendarIcon, User, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChildCard {
  id: string;
  parent_user_id: string;
  child_name: string;
  child_profile_id: string | null;
  general_note: string;
}

interface HourRow {
  id: string;
  session_date: string;
  duration_hours: number;
  hourly_rate: number;
  subject: string;
  notes: string;
  is_paid: boolean;
  payment_date: string | null;
  payment_id: string | null;
}

interface ParentProfile {
  user_id: string;
  first_name: string;
  email: string;
  child_name: string;
}

const ParentHome = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const { viewMode } = useAdminView();

  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [childCards, setChildCards] = useState<ChildCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<ChildCard | null>(null);
  const [hourRows, setHourRows] = useState<HourRow[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [studentProfiles, setStudentProfiles] = useState<{ user_id: string; first_name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // For admin: load parent profiles
  useEffect(() => {
    if (isAdmin && viewMode === "parent") {
      fetchParents();
      fetchStudentProfiles();
    }
  }, [isAdmin, viewMode]);

  // For parent (non-admin): load their own cards
  useEffect(() => {
    if (!isAdmin && user) {
      fetchChildCards(user.id);
    }
  }, [isAdmin, user]);

  // When admin selects a parent, load cards
  useEffect(() => {
    if (selectedParent) {
      fetchChildCards(selectedParent);
    }
  }, [selectedParent]);

  const fetchParents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name, email, child_name")
      .eq("status", "parent")
      .eq("is_approved", true);
    if (data) setParents(data);
  };

  const fetchStudentProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name")
      .eq("status", "élève")
      .eq("is_approved", true);
    if (data) setStudentProfiles(data);
  };

  const fetchChildCards = async (parentUserId: string) => {
    const { data } = await supabase
      .from("parent_child_cards")
      .select("*")
      .eq("parent_user_id", parentUserId)
      .order("created_at");
    if (data) setChildCards(data as ChildCard[]);
  };

  const createChildCard = async () => {
    if (!newChildName.trim()) return;
    const parentId = isAdmin ? selectedParent : user?.id;
    if (!parentId) return;

    const insertData: any = {
      parent_user_id: parentId,
      child_name: newChildName.trim(),
    };
    if (selectedStudentId) {
      insertData.child_profile_id = selectedStudentId;
      // Find matching profile id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", selectedStudentId)
        .single();
      if (profileData) insertData.child_profile_id = profileData.id;
    }

    const { error } = await supabase.from("parent_child_cards").insert(insertData);
    if (error) {
      toast.error("Erreur lors de la création");
      return;
    }
    toast.success("Carte enfant créée !");
    setNewChildName("");
    setSelectedStudentId("");
    setShowAddCard(false);
    fetchChildCards(parentId);
  };

  const deleteChildCard = async (cardId: string) => {
    if (!confirm("Supprimer cette carte enfant ?")) return;
    await supabase.from("parent_child_cards").delete().eq("id", cardId);
    toast.success("Carte supprimée");
    setSelectedCard(null);
    const parentId = isAdmin ? selectedParent : user?.id;
    if (parentId) fetchChildCards(parentId);
  };

  const openCard = async (card: ChildCard) => {
    setSelectedCard(card);
    setNoteText(card.general_note || "");
    setEditingNote(false);
    await fetchHourRows(card);
  };

  const fetchHourRows = async (card: ChildCard) => {
    // Get student user_id from child_profile_id
    let studentUserId: string | null = null;
    if (card.child_profile_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", card.child_profile_id)
        .single();
      if (profile) studentUserId = profile.user_id;
    }

    if (!studentUserId) {
      setHourRows([]);
      return;
    }

    const { data: hours } = await supabase
      .from("tutoring_hours")
      .select("*")
      .eq("student_id", studentUserId)
      .order("session_date", { ascending: false });

    // Get payment tracking
    const { data: payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("parent_card_id", card.id);

    const paymentMap: Record<string, { is_paid: boolean; payment_date: string | null; id: string }> = {};
    payments?.forEach((p: any) => {
      paymentMap[p.tutoring_hour_id] = { is_paid: p.is_paid, payment_date: p.payment_date, id: p.id };
    });

    const rows: HourRow[] = (hours || []).map((h: any) => ({
      id: h.id,
      session_date: h.session_date,
      duration_hours: h.duration_hours,
      hourly_rate: h.hourly_rate,
      subject: h.subject || "",
      notes: h.notes || "",
      is_paid: paymentMap[h.id]?.is_paid || false,
      payment_date: paymentMap[h.id]?.payment_date || null,
      payment_id: paymentMap[h.id]?.id || null,
    }));

    setHourRows(rows);
  };

  const saveNote = async () => {
    if (!selectedCard) return;
    await supabase
      .from("parent_child_cards")
      .update({ general_note: noteText, updated_at: new Date().toISOString() })
      .eq("id", selectedCard.id);
    toast.success("Note sauvegardée");
    setEditingNote(false);
    setSelectedCard(prev => prev ? { ...prev, general_note: noteText } : null);
  };

  const togglePayment = async (row: HourRow, paid: boolean) => {
    if (!isAdmin || !selectedCard) return;
    if (row.payment_id) {
      await supabase
        .from("payment_tracking")
        .update({ is_paid: paid, updated_at: new Date().toISOString() })
        .eq("id", row.payment_id);
    } else {
      await supabase.from("payment_tracking").insert({
        tutoring_hour_id: row.id,
        parent_card_id: selectedCard.id,
        is_paid: paid,
      });
    }
    await fetchHourRows(selectedCard);
  };

  const setPaymentDate = async (row: HourRow, date: Date | undefined) => {
    if (!isAdmin || !selectedCard || !date) return;
    if (row.payment_id) {
      await supabase
        .from("payment_tracking")
        .update({ payment_date: format(date, "yyyy-MM-dd"), updated_at: new Date().toISOString() })
        .eq("id", row.payment_id);
    } else {
      await supabase.from("payment_tracking").insert({
        tutoring_hour_id: row.id,
        parent_card_id: selectedCard.id,
        is_paid: true,
        payment_date: format(date, "yyyy-MM-dd"),
      });
    }
    await fetchHourRows(selectedCard);
  };

  const totalHours = hourRows.reduce((s, r) => s + r.duration_hours, 0);
  const totalAmount = hourRows.reduce((s, r) => s + r.duration_hours * r.hourly_rate, 0);
  const totalPaid = hourRows.filter(r => r.is_paid).reduce((s, r) => s + r.duration_hours * r.hourly_rate, 0);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-heading font-bold text-primary">
          Bienvenue, {user?.user_metadata?.first_name || "Parent"} !
        </h2>
        <p className="text-sm text-muted-foreground font-medium">Suivi familial</p>
      </div>

      {/* Admin: select parent */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={18} /> Sélectionner un parent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedParent} onValueChange={setSelectedParent}>
              <SelectTrigger><SelectValue placeholder="Choisir un parent..." /></SelectTrigger>
              <SelectContent>
                {parents.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.first_name} ({p.email}) - Enfant: {p.child_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Child cards section */}
      {(isAdmin ? selectedParent : true) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-foreground">Suivi de l'enfant</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowAddCard(true)} className="gap-1">
                <Plus size={14} /> Ajouter
              </Button>
            )}
          </div>

          {childCards.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              {isAdmin ? "Aucune carte enfant. Cliquez sur 'Ajouter' pour en créer." : "Aucun suivi disponible pour le moment."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {childCards.map(card => (
                <Card
                  key={card.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-primary/20"
                  onClick={() => openCard(card)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">👧</div>
                    <p className="font-semibold text-sm">{card.child_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add child card dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une carte enfant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de l'enfant</Label>
              <Input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="Prénom de l'enfant..." />
            </div>
            <div>
              <Label>Lier à un profil élève (optionnel)</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève..." /></SelectTrigger>
                <SelectContent>
                  {studentProfiles.map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.first_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createChildCard} className="w-full">Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Child detail dialog */}
      <Dialog open={!!selectedCard} onOpenChange={open => { if (!open) setSelectedCard(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">👧</span> {selectedCard?.child_name}
              {isAdmin && selectedCard && (
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => deleteChildCard(selectedCard.id)}>
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-5">
              {/* General note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <StickyNote size={16} /> Note générale
                  </h4>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingNote(!editingNote)}>
                      <Edit2 size={14} />
                    </Button>
                  )}
                </div>
                {editingNote && isAdmin ? (
                  <div className="space-y-2">
                    <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} />
                    <Button size="sm" onClick={saveNote}>Sauvegarder</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedCard.general_note || "Aucune note"}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total heures</p>
                  <p className="font-bold text-sm">{totalHours}h</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Montant total</p>
                  <p className="font-bold text-sm">{totalAmount}€</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Payé</p>
                  <p className="font-bold text-sm text-green-600">{totalPaid}€</p>
                </div>
              </div>

              {/* Hours table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Heures</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="text-xs">Payé</TableHead>
                      <TableHead className="text-xs">Date paiement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hourRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground italic">
                          Aucune heure enregistrée
                        </TableCell>
                      </TableRow>
                    ) : (
                      hourRows.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {new Date(row.session_date).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-xs">{row.duration_hours}h</TableCell>
                          <TableCell className="text-xs font-medium">
                            {(row.duration_hours * row.hourly_rate).toFixed(0)}€
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Checkbox
                                checked={row.is_paid}
                                onCheckedChange={(checked) => togglePayment(row, !!checked)}
                              />
                            ) : (
                              <span className={`text-xs ${row.is_paid ? "text-green-600" : "text-destructive"}`}>
                                {row.is_paid ? "✓" : "✗"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    <CalendarIcon size={12} className="mr-1" />
                                    {row.payment_date
                                      ? new Date(row.payment_date).toLocaleDateString("fr-FR")
                                      : "—"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={row.payment_date ? new Date(row.payment_date) : undefined}
                                    onSelect={(date) => setPaymentDate(row, date)}
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-xs">
                                {row.payment_date
                                  ? new Date(row.payment_date).toLocaleDateString("fr-FR")
                                  : "—"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentHome;
