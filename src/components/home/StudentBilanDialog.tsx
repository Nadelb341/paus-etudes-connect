import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Printer, Save, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

interface StudentProfile {
  id: string;
  user_id: string;
  first_name: string;
  email: string;
  gender: string;
  school_level: string;
  birth_date: string | null;
  bilan_data?: any;
}

interface MatiereBilan {
  nom: string;
  prof: string;
  moy1: string;
  moy1_note: string;
  moy2: string;
  moy2_note: string;
  pref: string;
}

interface Caracteristique { label: string; value: string; }

interface BilanData {
  date_bilan: string;
  lieu: string;
  nom_prenom: string;
  age: string;
  niveau_etude: string;
  spe1: string;
  spe2: string;
  spe3: string;
  situation_particuliere: string;
  matieres: MatiereBilan[];
  sujet_oral: string;
  caracteristiques: Caracteristique[];
  objectif_devoirs: boolean;
  objectif_remise_niveau: boolean;
  objectif_les2: boolean;
  objectif_autres: string[];
  freq_type: string;
  freq_1fois_jour: string;
  freq_2fois_j1: string;
  freq_2fois_j2: string;
  freq_plus2_j1: string;
  freq_plus2_j2: string;
  freq_plus2_j3: string;
  freq_plus2_j4: string;
  freq_occasionnel_detail: string;
  tarif_primaire: boolean;
  tarif_college: boolean;
  tarif_lycee: boolean;
  observations: string;
}

const MATIERES_DEFAULT: string[] = [
  "Français", "Math", "Histoire / Géo", "Physique",
  "SVT", "Techno", "Anglais", "Espagnol", "Option 1", "",
];

const emptyMatiere = (nom: string): MatiereBilan => ({ nom, prof: "", moy1: "", moy1_note: "", moy2: "", moy2_note: "", pref: "" });

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const defaultBilan = (student: StudentProfile): BilanData => ({
  date_bilan: new Date().toLocaleDateString("fr-FR"),
  lieu: "",
  nom_prenom: student.first_name,
  age: student.birth_date
    ? String(new Date().getFullYear() - new Date(student.birth_date).getFullYear())
    : "",
  niveau_etude: student.school_level,
  spe1: "", spe2: "", spe3: "",
  situation_particuliere: "",
  matieres: MATIERES_DEFAULT.map(emptyMatiere),
  sujet_oral: "",
  caracteristiques: [{ label: "Est-il autonome ?", value: "" }],
  objectif_devoirs: false, objectif_remise_niveau: false,
  objectif_les2: false, objectif_autres: [],
  freq_type: "",
  freq_1fois_jour: "",
  freq_2fois_j1: "", freq_2fois_j2: "",
  freq_plus2_j1: "", freq_plus2_j2: "", freq_plus2_j3: "", freq_plus2_j4: "",
  freq_occasionnel_detail: "",
  tarif_primaire: false, tarif_college: false, tarif_lycee: false,
  observations: "",
});

interface StudentBilanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentProfile;
}

const MOY_OPTIONS = ["", "Vert", "Jaune", "Rouge"];
const MOY_COLORS: Record<string, string> = { "Vert": "text-green-600", "Jaune": "text-yellow-600", "Rouge": "text-red-600" };

const StudentBilanDialog = ({ open, onOpenChange, student }: StudentBilanDialogProps) => {
  const { scrollRef, showScrollTop, handleScroll, scrollToTop } = useScrollToTop();
  const [bilan, setBilan] = useState<BilanData>(() => defaultBilan(student));
  const [saving, setSaving] = useState(false);
  const [newObjectifAutre, setNewObjectifAutre] = useState("");
  const [editingObjectifIdx, setEditingObjectifIdx] = useState<number | null>(null);
  const [editingObjectifText, setEditingObjectifText] = useState("");

  useEffect(() => {
    if (open) loadBilan();
  }, [open]);

  const loadBilan = async () => {
    const { data } = await supabase.from("profiles").select("bilan_data").eq("user_id", student.user_id).single();
    if (data?.bilan_data) {
      const loaded = data.bilan_data as unknown as BilanData;
      // S'assurer que la liste matières a bien 10 entrées
      if (!loaded.matieres || loaded.matieres.length < 10) {
        loaded.matieres = MATIERES_DEFAULT.map((nom, i) => loaded.matieres?.[i] ?? emptyMatiere(nom));
      }
      // Compat : champs note si absents
      loaded.matieres = loaded.matieres.map(m => ({ moy1_note: "", moy2_note: "", ...m }));
      // Compat : caracteristiques depuis ancien est_autonome
      if (!loaded.caracteristiques) {
        const old = (loaded as any).est_autonome || "";
        loaded.caracteristiques = [{ label: "Est-il autonome ?", value: old }];
      }
      // Compat : freq_type depuis anciens booléens
      if (!loaded.freq_type) {
        const l = loaded as any;
        if (l.freq_occasionnel) loaded.freq_type = "occasionnel";
        else if (l.freq_plus2) loaded.freq_type = "plus2";
        else if (l.freq_2fois) loaded.freq_type = "2fois";
        else if (l.freq_1fois) loaded.freq_type = "1fois";
        else loaded.freq_type = "";
      }
      // Compat : objectif_autre_checked + objectif_autre → objectif_autres[]
      if (!loaded.objectif_autres) {
        const old = (loaded as any);
        loaded.objectif_autres = (old.objectif_autre_checked && old.objectif_autre)
          ? [old.objectif_autre]
          : [];
      }
      setBilan(loaded);
    } else {
      setBilan(defaultBilan(student));
    }
  };

  const set = <K extends keyof BilanData>(key: K, value: BilanData[K]) =>
    setBilan(prev => ({ ...prev, [key]: value }));

  const setMatiere = (idx: number, field: keyof MatiereBilan, value: string) =>
    setBilan(prev => ({
      ...prev,
      matieres: prev.matieres.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));

  const setCarac = (idx: number, field: keyof Caracteristique, value: string) =>
    setBilan(prev => ({
      ...prev,
      caracteristiques: prev.caracteristiques.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }));

  const addCarac = () =>
    setBilan(prev => ({ ...prev, caracteristiques: [...prev.caracteristiques, { label: "", value: "" }] }));

  const removeCarac = (idx: number) =>
    setBilan(prev => ({ ...prev, caracteristiques: prev.caracteristiques.filter((_, i) => i !== idx) }));

  const addObjectifAutre = () => {
    if (!newObjectifAutre.trim()) return;
    setBilan(prev => ({ ...prev, objectif_autres: [...prev.objectif_autres, newObjectifAutre.trim()] }));
    setNewObjectifAutre("");
  };

  const removeObjectifAutre = (idx: number) =>
    setBilan(prev => ({ ...prev, objectif_autres: prev.objectif_autres.filter((_, i) => i !== idx) }));

  const saveObjectifAutre = (idx: number) => {
    if (!editingObjectifText.trim()) return;
    setBilan(prev => ({
      ...prev,
      objectif_autres: prev.objectif_autres.map((item, i) => i === idx ? editingObjectifText.trim() : item),
    }));
    setEditingObjectifIdx(null);
  };

  const enterNext = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
  };

  const saveBilan = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ bilan_data: bilan as any }).eq("user_id", student.user_id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Bilan sauvegardé !");
    setSaving(false);
  };

  const handlePrint = () => {
    const checked = (v: boolean) => v ? "☑" : "☐";
    const line = "......................................................";

    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>Fiche Bilan — ${bilan.nom_prenom}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
  h1 { text-align: center; color: #cc0000; text-decoration: underline; font-size: 22px; margin-bottom: 20px; }
  .red { color: #cc0000; font-weight: bold; text-decoration: underline; }
  .line { border-bottom: 1px solid #000; display: inline-block; min-width: 120px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
  th { background: #f0f0f0; color: #cc0000; font-weight: bold; text-align: center; }
  td:first-child { color: #cc0000; font-weight: bold; }
  .section { margin: 10px 0 4px 0; }
  .indent { margin-left: 20px; margin-top: 4px; }
  .diamond { color: #cc0000; }
  p { margin: 6px 0; }
</style></head><body>
<h1>Fiche bilan</h1>

<p><span class="red">Date du bilan</span> : ${bilan.date_bilan} &nbsp;&nbsp;&nbsp;
<span class="red">Et lieu</span> : ${bilan.lieu}</p>

<p><span class="red">Nom, Prénom</span> : ${bilan.nom_prenom} &nbsp;&nbsp;&nbsp;&nbsp;
<span class="red">Age</span> : ${bilan.age}</p>

<p><span class="red">Niveau étude</span> : ${bilan.niveau_etude} &nbsp;
Spé 1 : ${bilan.spe1}, &nbsp;Spé 2 : ${bilan.spe2}, &nbsp;Spé 3 : ${bilan.spe3}</p>

<p><span class="red">Situation particulière</span> (dys...) : ${bilan.situation_particuliere}</p>

<table>
<thead><tr>
  <th>Matières</th><th>Profs</th>
  <th>Moy. 1er trim<br><small>OU : Vert, Jaune, Rouge</small></th>
  <th>Moy. 2ème trim<br><small>OU : Vert, Jaune, Rouge</small></th>
  <th>Matières préf<br><small>(de 1 : top à 10 : bof)</small></th>
</tr></thead>
<tbody>
${bilan.matieres.map(m => `<tr>
  <td>${m.nom}</td><td>${m.prof}</td>
  <td style="text-align:center">${[m.moy1 && m.moy1 !== "—" ? m.moy1 : "", m.moy1_note ? m.moy1_note + "/20" : ""].filter(Boolean).join(" — ") || "—"}</td>
  <td style="text-align:center">${[m.moy2 && m.moy2 !== "—" ? m.moy2 : "", m.moy2_note ? m.moy2_note + "/20" : ""].filter(Boolean).join(" — ") || "—"}</td>
  <td style="text-align:center">${m.pref}</td>
</tr>`).join("")}
</tbody></table>

<p><span class="red">Pour les 3ème : sujet de l'oral</span> : ${bilan.sujet_oral}</p>

<p class="section"><span class="red">Caractéristique de l'élève</span> :</p>
${bilan.caracteristiques.map(c => `<p class="indent">${checked(c.value === "oui")} ${c.label} : Oui${checked(c.value === "oui")} &nbsp; Non${checked(c.value === "non")}</p>`).join("")}

<p><span class="red">Objectif de l'élève et/ou du parent</span> :
Faire les devoirs en cours${checked(bilan.objectif_devoirs)} -
Remise à niveau${checked(bilan.objectif_remise_niveau)} -
Les 2${checked(bilan.objectif_les2)}${bilan.objectif_autres.length > 0 ? " - " + bilan.objectif_autres.join(" - ") : ""}</p>

<p class="section"><span class="red">Quelles fréquences souhaitent le parent</span> :</p>
<p class="indent">${checked(bilan.freq_type === "1fois")} <strong>1 fois par semaine</strong> : Jour : ${bilan.freq_1fois_jour}</p>
<p class="indent">${checked(bilan.freq_type === "2fois")} <strong>2 fois par semaine</strong> : Jours : ${bilan.freq_2fois_j1} / ${bilan.freq_2fois_j2}</p>
<p class="indent">${checked(bilan.freq_type === "plus2")} <strong>Plus de 2 jours</strong> : Jours : ${bilan.freq_plus2_j1} / ${bilan.freq_plus2_j2} / ${bilan.freq_plus2_j3} / ${bilan.freq_plus2_j4}</p>
<p class="indent">${checked(bilan.freq_type === "occasionnel")} <strong>Occasionnellement</strong> : ${bilan.freq_occasionnel_detail}</p>
<p class="indent diamond">❖ <strong style="color:#cc0000">Possibilité cours à distance (Zoom)</strong> : En fonction des disponibilités des 2 parties ET du cours prévu.</p>

<p><span class="red">Tarifs de l'heure</span> :
&nbsp;<strong>Primaire</strong> : 10€${checked(bilan.tarif_primaire)}
&nbsp;&nbsp;<strong>Collège</strong> : 13€${checked(bilan.tarif_college)}
&nbsp;&nbsp;<strong>Lycée</strong> : 15€${checked(bilan.tarif_lycee)}</p>

<p class="section"><span class="red">Observations générales</span> (personnels) :</p>
<p style="white-space:pre-wrap;border-bottom:1px solid #999;min-height:60px">${bilan.observations}</p>

</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Le navigateur a bloqué l'ouverture. Autorise les popups."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const Section = ({ label }: { label: string }) => (
    <p className="text-sm font-bold text-destructive underline mt-4 mb-1">{label}</p>
  );

  const CBRow = ({ checked, onChecked, label, children }: { checked: boolean; onChecked: (v: boolean) => void; label: string; children?: React.ReactNode }) => (
    <div className="flex items-start gap-2 mt-2">
      <Checkbox checked={checked} onCheckedChange={v => onChecked(!!v)} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium text-orange-600">{label}</span>
        {children}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div ref={scrollRef} onScroll={handleScroll} className="max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-destructive text-xl font-bold underline">Fiche bilan</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimer">
                  <Printer size={16} />
                </Button>
                <Button size="sm" onClick={saveBilan} disabled={saving} className="bg-gradient-primary gap-1">
                  <Save size={14} />{saving ? "..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* ── Ligne 1 : Date + Lieu ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-destructive font-bold">Date du bilan</Label>
              <Input value={bilan.date_bilan} onChange={e => set("date_bilan", e.target.value)} placeholder="jj/mm/aaaa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-destructive font-bold">Et lieu</Label>
              <Input value={bilan.lieu} onChange={e => set("lieu", e.target.value)} placeholder="Lieu du bilan..." className="mt-1" />
            </div>
          </div>

          {/* ── Ligne 2 : Nom + Age ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-destructive font-bold">Nom, Prénom</Label>
              <Input value={bilan.nom_prenom} onChange={e => set("nom_prenom", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-destructive font-bold">Age</Label>
              <Input value={bilan.age} onChange={e => set("age", e.target.value)} placeholder="ans" className="mt-1" />
            </div>
          </div>

          {/* ── Niveau d'étude + Spés ── */}
          <div>
            <Label className="text-xs text-destructive font-bold">Niveau d'étude</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              <Input value={bilan.niveau_etude} onChange={e => set("niveau_etude", e.target.value)} placeholder="Niveau..." />
              <Input value={bilan.spe1} onChange={e => set("spe1", e.target.value)} placeholder="Spé 1" />
              <Input value={bilan.spe2} onChange={e => set("spe2", e.target.value)} placeholder="Spé 2" />
              <Input value={bilan.spe3} onChange={e => set("spe3", e.target.value)} placeholder="Spé 3" />
            </div>
          </div>

          {/* ── Situation particulière ── */}
          <div>
            <Label className="text-xs text-destructive font-bold">Situation particulière (dys...)</Label>
            <Input value={bilan.situation_particuliere} onChange={e => set("situation_particuliere", e.target.value)} placeholder="Dyslexie, TDAH..." className="mt-1" />
          </div>

          {/* ── Tableau des matières ── */}
          <Section label="Matières" />
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="text-left p-2 text-destructive border-r border-border w-28">Matières</th>
                  <th className="p-2 text-destructive border-r border-border w-24">Profs</th>
                  <th className="p-2 text-destructive border-r border-border w-32">
                    Moy. 1er trim<br /><span className="font-normal text-muted-foreground">Couleur ou /20</span>
                  </th>
                  <th className="p-2 text-destructive border-r border-border w-32">
                    Moy. 2ème trim<br /><span className="font-normal text-muted-foreground">Couleur ou /20</span>
                  </th>
                  <th className="p-2 text-destructive w-20">
                    Préférence<br /><span className="font-normal text-muted-foreground">1=top 10=bof</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bilan.matieres.map((m, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-1 border-r border-border">
                      <Input
                        value={m.nom}
                        onChange={e => setMatiere(i, "nom", e.target.value)}
                        className="h-7 text-xs text-destructive font-medium border-0 p-1 bg-transparent"
                        placeholder="Matière..."
                      />
                    </td>
                    <td className="p-1 border-r border-border">
                      <Input value={m.prof} onChange={e => setMatiere(i, "prof", e.target.value)} className="h-7 text-xs border-0 p-1 bg-transparent" placeholder="Nom..." />
                    </td>
                    <td className="p-1 border-r border-border">
                      <Select value={m.moy1} onValueChange={v => setMatiere(i, "moy1", v)}>
                        <SelectTrigger className={`h-7 text-xs border-0 bg-transparent ${MOY_COLORS[m.moy1] || ""}`}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt || "—"} className={MOY_COLORS[opt] || ""}>{opt || "—"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={m.moy1_note}
                        onChange={e => setMatiere(i, "moy1_note", e.target.value)}
                        className="h-6 text-xs border-0 p-1 bg-transparent text-center mt-0.5"
                        placeholder="/20"
                      />
                    </td>
                    <td className="p-1 border-r border-border">
                      <Select value={m.moy2} onValueChange={v => setMatiere(i, "moy2", v)}>
                        <SelectTrigger className={`h-7 text-xs border-0 bg-transparent ${MOY_COLORS[m.moy2] || ""}`}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt || "—"} className={MOY_COLORS[opt] || ""}>{opt || "—"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={m.moy2_note}
                        onChange={e => setMatiere(i, "moy2_note", e.target.value)}
                        className="h-6 text-xs border-0 p-1 bg-transparent text-center mt-0.5"
                        placeholder="/20"
                      />
                    </td>
                    <td className="p-1">
                      <Input value={m.pref} onChange={e => setMatiere(i, "pref", e.target.value)} className="h-7 text-xs border-0 p-1 bg-transparent text-center" placeholder="1-10" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pour les 3ème ── */}
          <div>
            <Label className="text-xs text-destructive font-bold">Pour les 3ème : sujet de l'oral</Label>
            <Input value={bilan.sujet_oral} onChange={e => set("sujet_oral", e.target.value)} placeholder="Sujet du Grand Oral..." className="mt-1" />
          </div>

          {/* ── Caractéristique de l'élève ── */}
          <Section label="Caractéristique de l'élève" />
          <div className="space-y-2 ml-2">
            {bilan.caracteristiques.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={c.label}
                  onChange={e => setCarac(i, "label", e.target.value)}
                  onKeyDown={enterNext}
                  className="h-7 text-sm flex-1"
                  placeholder="Caractéristique..."
                />
                <label className="flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap">
                  <Checkbox checked={c.value === "oui"} onCheckedChange={v => setCarac(i, "value", v ? "oui" : "")} />
                  Oui
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap">
                  <Checkbox checked={c.value === "non"} onCheckedChange={v => setCarac(i, "value", v ? "non" : "")} />
                  Non
                </label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                      <Trash2 size={13} className="text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Supprimer cette caractéristique ?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeCarac(i)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addCarac} className="gap-1 text-xs mt-1">
              <Plus size={13} />Ajouter une caractéristique
            </Button>
          </div>

          {/* ── Objectif ── */}
          <Section label="Objectif de l'élève et/ou du parent" />
          <div className="flex flex-wrap items-center gap-3 ml-2 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={bilan.objectif_devoirs} onCheckedChange={v => set("objectif_devoirs", !!v)} />
              <span className="text-orange-600 font-medium">Faire les devoirs en cours</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={bilan.objectif_remise_niveau} onCheckedChange={v => set("objectif_remise_niveau", !!v)} />
              <span className="text-orange-600 font-medium">Remise à niveau</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={bilan.objectif_les2} onCheckedChange={v => set("objectif_les2", !!v)} />
              <span className="text-orange-600 font-medium">Les 2</span>
            </label>
            {bilan.objectif_autres.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {editingObjectifIdx === idx ? (
                  <>
                    <Input
                      value={editingObjectifText}
                      onChange={e => setEditingObjectifText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.preventDefault(); saveObjectifAutre(idx); }
                        if (e.key === "Escape") setEditingObjectifIdx(null);
                      }}
                      className="h-7 text-sm w-36"
                      autoFocus
                    />
                    <button onClick={() => saveObjectifAutre(idx)} className="p-1 text-green-600 hover:text-green-700">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditingObjectifIdx(null)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-orange-600 font-medium">{item}</span>
                    <button onClick={() => { setEditingObjectifIdx(idx); setEditingObjectifText(item); }} className="p-1 text-muted-foreground hover:text-foreground">
                      <Pencil size={11} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 text-destructive hover:text-destructive/80"><Trash2 size={11} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeObjectifAutre(idx)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2 mt-1">
            <Input
              value={newObjectifAutre}
              onChange={e => setNewObjectifAutre(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addObjectifAutre(); } }}
              className="h-7 text-sm w-48"
              placeholder="+ Autre (Entrée pour ajouter)..."
            />
          </div>

          {/* ── Fréquences ── */}
          <Section label="Quelles fréquences souhaitent le parent" />
          <div className="space-y-3 ml-2">
            {/* 1 fois par semaine */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="freq" value="1fois" checked={bilan.freq_type === "1fois"} onChange={() => set("freq_type", "1fois")} className="accent-orange-500" />
                <span className="text-sm font-medium text-orange-600">1 fois par semaine</span>
              </label>
              {bilan.freq_type === "1fois" && (
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-muted-foreground">Jour :</span>
                  <Select value={bilan.freq_1fois_jour} onValueChange={v => set("freq_1fois_jour", v)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{JOURS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 2 fois par semaine */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="freq" value="2fois" checked={bilan.freq_type === "2fois"} onChange={() => set("freq_type", "2fois")} className="accent-orange-500" />
                <span className="text-sm font-medium text-orange-600">2 fois par semaine</span>
              </label>
              {bilan.freq_type === "2fois" && (
                <div className="flex items-center gap-2 mt-1 ml-6 flex-wrap">
                  <span className="text-xs text-muted-foreground">Jours :</span>
                  <Select value={bilan.freq_2fois_j1} onValueChange={v => set("freq_2fois_j1", v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Jour 1" /></SelectTrigger>
                    <SelectContent>{JOURS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-xs">/</span>
                  <Select value={bilan.freq_2fois_j2} onValueChange={v => set("freq_2fois_j2", v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Jour 2" /></SelectTrigger>
                    <SelectContent>{JOURS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Plus de 2 jours */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="freq" value="plus2" checked={bilan.freq_type === "plus2"} onChange={() => set("freq_type", "plus2")} className="accent-orange-500" />
                <span className="text-sm font-medium text-orange-600">Plus de 2 jours</span>
              </label>
              {bilan.freq_type === "plus2" && (
                <div className="flex items-center gap-2 mt-1 ml-6 flex-wrap">
                  <span className="text-xs text-muted-foreground">Jours :</span>
                  {(["freq_plus2_j1", "freq_plus2_j2", "freq_plus2_j3", "freq_plus2_j4"] as const).map((k, i) => (
                    <span key={k} className="flex items-center gap-1">
                      {i > 0 && <span className="text-xs">/</span>}
                      <Select value={bilan[k]} onValueChange={v => set(k, v)}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder={`Jour ${i + 1}`} /></SelectTrigger>
                        <SelectContent>{JOURS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                      </Select>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Occasionnellement */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="freq" value="occasionnel" checked={bilan.freq_type === "occasionnel"} onChange={() => set("freq_type", "occasionnel")} className="accent-orange-500" />
                <span className="text-sm font-medium text-orange-600">Occasionnellement</span>
              </label>
              {bilan.freq_type === "occasionnel" && (
                <Input
                  value={bilan.freq_occasionnel_detail}
                  onChange={e => set("freq_occasionnel_detail", e.target.value)}
                  onKeyDown={enterNext}
                  className="h-7 text-xs mt-1 ml-6 w-full"
                  placeholder="Préciser..."
                />
              )}
            </div>

            <div className="flex items-start gap-2 mt-1 ml-4 text-xs text-orange-600">
              <span className="text-orange-500 font-bold">❖</span>
              <span><strong>Possibilité cours à distance (Zoom)</strong> : En fonction des disponibilités des 2 parties ET du cours prévu.</span>
            </div>
          </div>

          {/* ── Tarifs ── */}
          <Section label="Tarifs de l'heure" />
          <div className="flex flex-wrap gap-4 ml-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={bilan.tarif_primaire} onCheckedChange={v => set("tarif_primaire", !!v)} />
              <span className="text-sm font-medium">Primaire : 10€</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={bilan.tarif_college} onCheckedChange={v => set("tarif_college", !!v)} />
              <span className="text-sm font-medium">Collège : 13€</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={bilan.tarif_lycee} onCheckedChange={v => set("tarif_lycee", !!v)} />
              <span className="text-sm font-medium">Lycée : 15€</span>
            </label>
          </div>

          {/* ── Observations générales ── */}
          <Section label="Observations générales (personnels)" />
          <Textarea
            value={bilan.observations}
            onChange={e => set("observations", e.target.value)}
            rows={5}
            placeholder="Notes personnelles, observations..."
          />

          <Button onClick={saveBilan} disabled={saving} className="w-full bg-gradient-primary gap-2 mt-2">
            <Save size={14} />{saving ? "Sauvegarde..." : "Sauvegarder le bilan"}
          </Button>
        </div>
        <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
      </DialogContent>
    </Dialog>
  );
};

export default StudentBilanDialog;
