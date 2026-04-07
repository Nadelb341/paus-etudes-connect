import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminView } from "@/hooks/useAdminView";
import { ADMIN_EMAIL } from "@/lib/constants";
import AppointmentsCard from "@/components/home/AppointmentsCard";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, CalendarIcon, User, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formatEur = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}€` : `${rounded.toFixed(2)}€`;
};

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
  amount_paid: number;
  payment_note: string;
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
  const [linkedStudentUserIds, setLinkedStudentUserIds] = useState<string[]>([]);
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [histRow, setHistRow] = useState<HourRow | null>(null);
  const [histDate, setHistDate] = useState<Date | undefined>();
  const [histNote, setHistNote] = useState("");

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
    if (data) {
      setChildCards(data as ChildCard[]);
      // Resolve linked student user IDs for appointments
      const profileIds = data.filter((c: any) => c.child_profile_id).map((c: any) => c.child_profile_id);
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id").in("id", profileIds);
        if (profiles) setLinkedStudentUserIds(profiles.map((p: any) => p.user_id));
      } else {
        setLinkedStudentUserIds([]);
      }
    }
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

    const paymentMap: Record<string, { amount_paid: number; payment_date: string | null; payment_note: string; id: string }> = {};
    payments?.forEach((p: any) => {
      paymentMap[p.tutoring_hour_id] = {
        amount_paid: p.amount_paid || 0,
        payment_date: p.payment_date,
        payment_note: p.payment_note || "",
        id: p.id,
      };
    });

    const rows: HourRow[] = (hours || []).map((h: any) => ({
      id: h.id,
      session_date: h.session_date,
      duration_hours: h.duration_hours,
      hourly_rate: h.hourly_rate,
      subject: h.subject || "",
      notes: h.notes || "",
      amount_paid: paymentMap[h.id]?.amount_paid || 0,
      payment_note: paymentMap[h.id]?.payment_note || "",
      payment_date: paymentMap[h.id]?.payment_date || null,
      payment_id: paymentMap[h.id]?.id || null,
    }));

    setHourRows(rows);
    const drafts: Record<string, string> = {};
    rows.forEach(r => { drafts[r.id] = r.amount_paid > 0 ? String(r.amount_paid) : ""; });
    setDraftAmounts(drafts);
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

  const saveAmountPaid = async (row: HourRow, amountStr: string) => {
    if (!isAdmin || !selectedCard) return;
    const amount = parseFloat(amountStr) || 0;
    if (row.payment_id) {
      await supabase.from("payment_tracking")
        .update({ amount_paid: amount, updated_at: new Date().toISOString() })
        .eq("id", row.payment_id);
    } else {
      await supabase.from("payment_tracking").insert({
        tutoring_hour_id: row.id,
        parent_card_id: selectedCard.id,
        is_paid: amount > 0,
        amount_paid: amount,
      });
    }
    await fetchHourRows(selectedCard);
  };

  const openHistorique = (row: HourRow) => {
    setHistRow(row);
    setHistDate(row.payment_date ? new Date(row.payment_date) : undefined);
    setHistNote(row.payment_note || "");
  };

  const saveHistorique = async () => {
    if (!isAdmin || !selectedCard || !histRow) return;
    const updateData: any = {
      payment_date: histDate ? format(histDate, "yyyy-MM-dd") : null,
      payment_note: histNote,
      updated_at: new Date().toISOString(),
    };
    if (histRow.payment_id) {
      await supabase.from("payment_tracking").update(updateData).eq("id", histRow.payment_id);
    } else {
      await supabase.from("payment_tracking").insert({
        tutoring_hour_id: histRow.id,
        parent_card_id: selectedCard.id,
        is_paid: false,
        amount_paid: histRow.amount_paid,
        ...updateData,
      });
    }
    setHistRow(null);
    setHistDate(undefined);
    setHistNote("");
    await fetchHourRows(selectedCard);
  };

  const totalHours = hourRows.reduce((s, r) => s + r.duration_hours, 0);
  const totalAmount = hourRows.reduce((s, r) => s + r.duration_hours * r.hourly_rate, 0);
  const totalPaid = hourRows.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const totalDue = totalAmount - totalPaid;

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

      {/* Appointments for linked children */}
      {linkedStudentUserIds.map(studentId => (
        <AppointmentsCard key={studentId} forParentStudentId={studentId} />
      ))}

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

      {/* Historique dialog */}
      <Dialog open={!!histRow} onOpenChange={open => { if (!open) { setHistRow(null); setHistDate(undefined); setHistNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>📋 Historique du règlement</DialogTitle>
          </DialogHeader>
          {histRow && (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded p-2 text-xs">
                <p>Cours du {new Date(histRow.session_date).toLocaleDateString("fr-FR")} — {formatEur(histRow.duration_hours * histRow.hourly_rate)}</p>
                {histRow.amount_paid > 0 && <p className="text-primary font-medium">Somme payée : {formatEur(histRow.amount_paid)}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium">Date du règlement</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left mt-1", !histDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {histDate ? format(histDate, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={histDate} onSelect={setHistDate} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium">Note (optionnelle)</Label>
                <Input
                  value={histNote}
                  onChange={e => setHistNote(e.target.value)}
                  placeholder="Ex : espèces, virement..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setHistRow(null); setHistDate(undefined); setHistNote(""); }} className="flex-1">Annuler</Button>
                <Button onClick={saveHistorique} className="flex-1">Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  <p className="font-bold text-sm">{formatEur(totalAmount)}</p>
                </div>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Reste dû</p>
                  <p className="font-bold text-sm text-orange-600">{formatEur(totalDue)}</p>
                </div>
              </div>

              {/* Hours table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs px-2">Date</TableHead>
                    <TableHead className="text-xs px-2">Heures</TableHead>
                    <TableHead className="text-xs px-2">Total</TableHead>
                    <TableHead className="text-xs px-2">Somme payée</TableHead>
                    <TableHead className="text-xs px-2">Reste dû</TableHead>
                    <TableHead className="text-xs px-2">Historique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hourRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground italic">
                        Aucune heure enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    hourRows.map(row => {
                      const total = row.duration_hours * row.hourly_rate;
                      const reste = total - (row.amount_paid || 0);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs px-2">
                            {new Date(row.session_date).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-xs px-2">{row.duration_hours}h</TableCell>
                          <TableCell className="text-xs font-medium px-2">
                            {formatEur(total)}
                          </TableCell>
                          <TableCell className="px-2">
                            {isAdmin ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={draftAmounts[row.id] ?? ""}
                                onChange={e => setDraftAmounts(prev => ({ ...prev, [row.id]: e.target.value }))}
                                onBlur={() => saveAmountPaid(row, draftAmounts[row.id] ?? "")}
                                className="h-7 w-20 text-xs px-2"
                                placeholder="0"
                              />
                            ) : (
                              <span className="text-xs">{row.amount_paid > 0 ? formatEur(row.amount_paid) : "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs px-2">
                            <span className={reste > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                              {formatEur(reste)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2">
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openHistorique(row)}
                              >
                                <CalendarIcon size={13} className={row.payment_date ? "text-primary" : "text-muted-foreground"} />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {row.payment_date ? new Date(row.payment_date).toLocaleDateString("fr-FR") : "—"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentHome;
