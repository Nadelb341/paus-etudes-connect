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
import { Printer, Save } from "lucide-react";
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
  moy2: string;
  pref: string;
}

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
  est_autonome: string;
  objectif_devoirs: boolean;
  objectif_remise_niveau: boolean;
  objectif_les2: boolean;
  objectif_autre: string;
  freq_1fois: boolean;
  freq_1fois_jour: string;
  freq_2fois: boolean;
  freq_2fois_j1: string;
  freq_2fois_j2: string;
  freq_plus2: boolean;
  freq_plus2_j1: string;
  freq_plus2_j2: string;
  freq_plus2_j3: string;
  freq_plus2_j4: string;
  freq_occasionnel: boolean;
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

const emptyMatiere = (nom: string): MatiereBilan => ({ nom, prof: "", moy1: "", moy2: "", pref: "" });

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
  est_autonome: "",
  objectif_devoirs: false, objectif_remise_niveau: false,
  objectif_les2: false, objectif_autre: "",
  freq_1fois: false, freq_1fois_jour: "",
  freq_2fois: false, freq_2fois_j1: "", freq_2fois_j2: "",
  freq_plus2: false, freq_plus2_j1: "", freq_plus2_j2: "", freq_plus2_j3: "", freq_plus2_j4: "",
  freq_occasionnel: false, freq_occasionnel_detail: "",
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

  useEffect(() => {
    if (open) loadBilan();
  }, [open]);

  const loadBilan = async () => {
    const { data } = await supabase.from("profiles").select("bilan_data").eq("user_id", student.user_id).single();
    if (data?.bilan_data) {
      const loaded = data.bilan_data as BilanData;
      // S'assurer que la liste matières a bien 10 entrées
      if (!loaded.matieres || loaded.matieres.length < 10) {
        loaded.matieres = MATIERES_DEFAULT.map((nom, i) => loaded.matieres?.[i] ?? emptyMatiere(nom));
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

  const saveBilan = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ bilan_data: bilan } as any).eq("user_id", student.user_id);
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
  <td>${m.nom}</td><td>${m.prof}</td><td style="text-align:center">${m.moy1}</td>
  <td style="text-align:center">${m.moy2}</td><td style="text-align:center">${m.pref}</td>
</tr>`).join("")}
</tbody></table>

<p><span class="red">Pour les 3ème : sujet de l'oral</span> : ${bilan.sujet_oral}</p>

<p class="section"><span class="red">Caractéristique de l'élève</span> :</p>
<p class="indent">${checked(bilan.est_autonome === "oui")} Est-il autonome : Oui${checked(bilan.est_autonome === "oui")} &nbsp; Non${checked(bilan.est_autonome === "non")}</p>

<p><span class="red">Objectif de l'élève et/ou du parent</span> :
Faire les devoirs en cours${checked(bilan.objectif_devoirs)} -
Remise à niveau${checked(bilan.objectif_remise_niveau)} -
Les 2${checked(bilan.objectif_les2)} -
Autre : ${bilan.objectif_autre}</p>

<p class="section"><span class="red">Quelles fréquences souhaitent le parent</span> :</p>
<p class="indent">${checked(bilan.freq_1fois)} <strong>1 fois par semaine</strong> : Jour : ${bilan.freq_1fois_jour}</p>
<p class="indent">${checked(bilan.freq_2fois)} <strong>2 fois par semaine</strong> : Jours : ${bilan.freq_2fois_j1} / ${bilan.freq_2fois_j2}</p>
<p class="indent">${checked(bilan.freq_plus2)} <strong>Plus de 2 jours</strong> : Jours : ${bilan.freq_plus2_j1} / ${bilan.freq_plus2_j2} / ${bilan.freq_plus2_j3} / ${bilan.freq_plus2_j4}</p>
<p class="indent">${checked(bilan.freq_occasionnel)} <strong>Occasionnellement</strong> : ${bilan.freq_occasionnel_detail}</p>
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
                  <th className="p-2 text-destructive border-r border-border w-24">
                    Moy. 1er trim<br /><span className="font-normal text-muted-foreground">Vert/Jaune/Rouge</span>
                  </th>
                  <th className="p-2 text-destructive border-r border-border w-24">
                    Moy. 2ème trim<br /><span className="font-normal text-muted-foreground">Vert/Jaune/Rouge</span>
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
          <div className="flex items-center gap-4 ml-2">
            <span className="text-sm">Est-il autonome :</span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox checked={bilan.est_autonome === "oui"} onCheckedChange={v => set("est_autonome", v ? "oui" : "")} />
              Oui
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox checked={bilan.est_autonome === "non"} onCheckedChange={v => set("est_autonome", v ? "non" : "")} />
              Non
            </label>
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
            <div className="flex items-center gap-1.5">
              <span className="text-orange-600 font-medium">Autre :</span>
              <Input value={bilan.objectif_autre} onChange={e => set("objectif_autre", e.target.value)} className="h-7 text-sm w-36" placeholder="..." />
            </div>
          </div>

          {/* ── Fréquences ── */}
          <Section label="Quelles fréquences souhaitent le parent" />
          <div className="space-y-2 ml-2">
            <CBRow checked={bilan.freq_1fois} onChecked={v => set("freq_1fois", v)} label="1 fois par semaine">
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">Jour :</span>
                <Input value={bilan.freq_1fois_jour} onChange={e => set("freq_1fois_jour", e.target.value)} className="h-6 text-xs flex-1" placeholder="Lundi..." />
              </div>
            </CBRow>
            <CBRow checked={bilan.freq_2fois} onChecked={v => set("freq_2fois", v)} label="2 fois par semaine">
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">Jours :</span>
                <Input value={bilan.freq_2fois_j1} onChange={e => set("freq_2fois_j1", e.target.value)} className="h-6 text-xs w-20" placeholder="Lundi" />
                <span className="text-xs">/</span>
                <Input value={bilan.freq_2fois_j2} onChange={e => set("freq_2fois_j2", e.target.value)} className="h-6 text-xs w-20" placeholder="Mercredi" />
              </div>
            </CBRow>
            <CBRow checked={bilan.freq_plus2} onChecked={v => set("freq_plus2", v)} label="Plus de 2 jours">
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Jours :</span>
                {(["freq_plus2_j1", "freq_plus2_j2", "freq_plus2_j3", "freq_plus2_j4"] as const).map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs">/</span>}
                    <Input value={bilan[k]} onChange={e => set(k, e.target.value)} className="h-6 text-xs w-16" placeholder="Jour" />
                  </span>
                ))}
              </div>
            </CBRow>
            <CBRow checked={bilan.freq_occasionnel} onChecked={v => set("freq_occasionnel", v)} label="Occasionnellement">
              <Input value={bilan.freq_occasionnel_detail} onChange={e => set("freq_occasionnel_detail", e.target.value)} className="h-6 text-xs mt-1 w-full" placeholder="Préciser..." />
            </CBRow>
            <div className="flex items-start gap-2 mt-2 ml-4 text-xs text-orange-600">
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
