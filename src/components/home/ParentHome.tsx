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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

interface PaymentEntry {
  date: string;
  amount: number;
  note: string;
}

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
  payment_entries: PaymentEntry[];
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

  // Paiement
  const [paymentRow, setPaymentRow] = useState<HourRow | null>(null);
  const [newEntryAmount, setNewEntryAmount] = useState("");
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(new Date());
  const [newEntryNote, setNewEntryNote] = useState("");

  useEffect(() => {
    if (isAdmin && viewMode === "parent") {
      fetchParents();
      fetchStudentProfiles();
    }
  }, [isAdmin, viewMode]);

  useEffect(() => {
    if (!isAdmin && user) {
      fetchChildCards(user.id);
    }
  }, [isAdmin, user]);

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

    const insertData: any = { parent_user_id: parentId, child_name: newChildName.trim() };
    if (selectedStudentId) {
      const { data: profileData } = await supabase
        .from("profiles").select("id").eq("user_id", selectedStudentId).single();
      if (profileData) insertData.child_profile_id = profileData.id;
    }

    const { error } = await supabase.from("parent_child_cards").insert(insertData);
    if (error) { toast.error("Erreur lors de la création"); return; }
    toast.success("Carte enfant créée !");
    setNewChildName("");
    setSelectedStudentId("");
    setShowAddCard(false);
    fetchChildCards(parentId);
  };

  const deleteChildCard = async (cardId: string) => {
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
    let studentUserId: string | null = null;
    if (card.child_profile_id) {
      const { data: profile } = await supabase
        .from("profiles").select("user_id").eq("id", card.child_profile_id).single();
      if (profile) studentUserId = profile.user_id;
    }
    if (!studentUserId) { setHourRows([]); return; }

    const { data: hours } = await supabase
      .from("tutoring_hours").select("*")
      .eq("student_id", studentUserId)
      .order("session_date", { ascending: false });

    const { data: payments } = await supabase
      .from("payment_tracking").select("*").eq("parent_card_id", card.id);

    const paymentMap: Record<string, { amount_paid: number; payment_entries: PaymentEntry[]; id: string }> = {};
    payments?.forEach((p: any) => {
      paymentMap[p.tutoring_hour_id] = {
        amount_paid: p.amount_paid || 0,
        payment_entries: p.payment_entries || [],
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
      payment_entries: paymentMap[h.id]?.payment_entries || [],
      payment_id: paymentMap[h.id]?.id || null,
    }));

    setHourRows(rows);
  };

  const saveNote = async () => {
    if (!selectedCard) return;
    await supabase.from("parent_child_cards")
      .update({ general_note: noteText, updated_at: new Date().toISOString() })
      .eq("id", selectedCard.id);
    toast.success("Note sauvegardée");
    setEditingNote(false);
    setSelectedCard(prev => prev ? { ...prev, general_note: noteText } : null);
  };

  const openPaymentDialog = (row: HourRow) => {
    setPaymentRow(row);
    setNewEntryAmount("");
    setNewEntryDate(new Date());
    setNewEntryNote("");
  };

  const addPaymentEntry = async () => {
    if (!isAdmin || !selectedCard || !paymentRow) return;
    const amount = parseFloat(newEntryAmount) || 0;
    if (amount <= 0) { toast.error("Montant invalide"); return; }

    const newEntry: PaymentEntry = {
      date: newEntryDate ? format(newEntryDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      amount,
      note: newEntryNote,
    };

    const updatedEntries = [...paymentRow.payment_entries, newEntry];
    const newTotal = updatedEntries.reduce((s, e) => s + e.amount, 0);

    if (paymentRow.payment_id) {
      await (supabase as any).from("payment_tracking").update({
        payment_entries: updatedEntries as any,
        amount_paid: newTotal,
        updated_at: new Date().toISOString(),
      }).eq("id", paymentRow.payment_id);
    } else {
      await (supabase as any).from("payment_tracking").insert({
        tutoring_hour_id: paymentRow.id,
        parent_card_id: selectedCard.id,
        is_paid: false,
        amount_paid: newTotal,
        payment_entries: updatedEntries as any,
      });
    }

    toast.success("Règlement enregistré !");
    setPaymentRow(null);
    await fetchHourRows(selectedCard);
  };

  const deletePaymentEntry = async (entryIndex: number) => {
    if (!isAdmin || !selectedCard || !paymentRow) return;
    const updatedEntries = paymentRow.payment_entries.filter((_, i) => i !== entryIndex);
    const newTotal = updatedEntries.reduce((s, e) => s + e.amount, 0);

    if (paymentRow.payment_id) {
      await (supabase as any).from("payment_tracking").update({
        payment_entries: updatedEntries as any,
        amount_paid: newTotal,
        updated_at: new Date().toISOString(),
      }).eq("id", paymentRow.payment_id);
    }

    // Mettre à jour le paymentRow local pour que le dialog se rafraîchisse
    setPaymentRow(prev => prev ? { ...prev, payment_entries: updatedEntries, amount_paid: newTotal } : null);
    await fetchHourRows(selectedCard);
    toast.success("Entrée supprimée");
  };

  // Totaux admin : toutes les sessions (historique complet)
  const totalHours = hourRows.reduce((s, r) => s + r.duration_hours, 0);
  const totalAmount = hourRows.reduce((s, r) => s + r.duration_hours * r.hourly_rate, 0);
  const totalPaid = hourRows.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const totalDue = totalAmount - totalPaid;

  // Totaux parent : uniquement les sessions avec un reste dû > 0
  const unpaidRows = hourRows.filter(r => (r.duration_hours * r.hourly_rate - (r.amount_paid || 0)) > 0);
  const parentTotalHours = unpaidRows.reduce((s, r) => s + r.duration_hours, 0);
  const parentTotalAmount = unpaidRows.reduce((s, r) => s + r.duration_hours * r.hourly_rate, 0);
  const parentTotalDue = unpaidRows.reduce((s, r) => s + (r.duration_hours * r.hourly_rate - (r.amount_paid || 0)), 0);

  // Lignes affichées dans le tableau selon le rôle :
  // - Admin : tout l'historique
  // - Parent : seulement les 2 derniers mois, SAUF si la session a encore un reste dû
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const displayedRows = isAdmin
    ? hourRows
    : hourRows.filter(row => {
        const sessionDate = new Date(row.session_date);
        const reste = row.duration_hours * row.hourly_rate - (row.amount_paid || 0);
        return sessionDate >= twoMonthsAgo || reste > 0;
      });

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

      {/* Dialog paiement partiel */}
      <Dialog open={!!paymentRow} onOpenChange={open => { if (!open) setPaymentRow(null); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💰 Règlements</DialogTitle>
          </DialogHeader>
          {paymentRow && (
            <div className="space-y-4">
              {/* Résumé du cours */}
              <div className="bg-secondary/30 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">
                  Cours du {new Date(paymentRow.session_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-muted-foreground">
                  {paymentRow.duration_hours}h · {formatEur(paymentRow.duration_hours * paymentRow.hourly_rate)}
                </p>
                <div className="flex gap-4 pt-1">
                  <span className="text-green-600 font-medium text-xs">Réglé : {formatEur(paymentRow.amount_paid)}</span>
                  <span className={cn("font-medium text-xs", (paymentRow.duration_hours * paymentRow.hourly_rate - paymentRow.amount_paid) > 0 ? "text-orange-600" : "text-green-600")}>
                    Reste : {formatEur(paymentRow.duration_hours * paymentRow.hourly_rate - paymentRow.amount_paid)}
                  </span>
                </div>
              </div>

              {/* Historique des versements */}
              {paymentRow.payment_entries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Versements enregistrés</p>
                  {paymentRow.payment_entries.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded p-2 text-xs">
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-400">{formatEur(entry.amount)}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(entry.date).toLocaleDateString("fr-FR")}
                        </span>
                        {entry.note && <p className="text-muted-foreground italic mt-0.5">{entry.note}</p>}
                      </div>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Trash2 size={12} className="text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce versement ?</AlertDialogTitle>
                              <AlertDialogDescription>Le versement de {formatEur(entry.amount)} sera retiré définitivement.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePaymentEntry(i)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire nouveau versement */}
              {isAdmin && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ajouter un versement</p>
                  <div>
                    <Label className="text-sm">Montant (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newEntryAmount}
                      onChange={e => setNewEntryAmount(e.target.value)}
                      placeholder="Ex : 13"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Date du règlement</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left mt-1", !newEntryDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newEntryDate ? format(newEntryDate, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={newEntryDate} onSelect={setNewEntryDate} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm">Note (optionnelle)</Label>
                    <Input
                      value={newEntryNote}
                      onChange={e => setNewEntryNote(e.target.value)}
                      placeholder="Ex : espèces, virement..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={addPaymentEntry} className="w-full">
                    <Plus size={14} className="mr-2" /> Enregistrer ce versement
                  </Button>
                </div>
              )}
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
        <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">👧</span> {selectedCard?.child_name}
              {isAdmin && selectedCard && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette carte enfant ?</AlertDialogTitle>
                      <AlertDialogDescription>La carte de {selectedCard.child_name} sera définitivement supprimée.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteChildCard(selectedCard.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-5">
              {/* Note générale */}
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

              {/* Résumé */}
              <div className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-1"} gap-2 text-center`}>
                {isAdmin && (
                  <div className="p-2 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total heures</p>
                    <p className="font-bold text-sm">{totalHours}h</p>
                  </div>
                )}
                {isAdmin && (
                  <div className="p-2 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Montant total</p>
                    <p className="font-bold text-sm">{formatEur(totalAmount)}</p>
                  </div>
                )}
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Reste dû</p>
                  <p className={`font-bold text-sm ${(isAdmin ? totalDue : parentTotalDue) > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {formatEur(isAdmin ? totalDue : parentTotalDue)}
                  </p>
                </div>
              </div>

              {/* Tableau des heures — compact, sans scroll horizontal */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-2">Date</TableHead>
                    <TableHead className="text-xs p-2">Durée</TableHead>
                    <TableHead className="text-xs p-2">Total</TableHead>
                    <TableHead className="text-xs p-2">Réglé</TableHead>
                    <TableHead className="text-xs p-2">Reste dû</TableHead>
                    {isAdmin && <TableHead className="p-2 w-8"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-sm text-muted-foreground italic">
                        Aucune heure enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map(row => {
                      const total = row.duration_hours * row.hourly_rate;
                      const reste = total - (row.amount_paid || 0);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs p-2 whitespace-nowrap">
                            {new Date(row.session_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-xs p-2">{row.duration_hours}h</TableCell>
                          <TableCell className="text-xs font-medium p-2">{formatEur(total)}</TableCell>
                          <TableCell className="text-xs p-2">
                            <span className="text-green-600 font-medium">
                              {row.amount_paid > 0 ? formatEur(row.amount_paid) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs p-2">
                            <span className={reste > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                              {formatEur(reste)}
                            </span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="p-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openPaymentDialog(row)}
                              >
                                <Plus size={13} className="text-primary" />
                              </Button>
                            </TableCell>
                          )}
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
