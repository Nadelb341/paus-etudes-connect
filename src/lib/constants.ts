export const ADMIN_EMAIL = "nad341@live.fr";

export const SCHOOL_LEVELS = [
  "Maternelle", "CP", "CE1", "CE2", "CM1", "CM2",
  "6ème", "5ème", "4ème", "3ème",
  "Seconde", "Première", "Terminale",
] as const;

export const SUBJECTS_GENERAL = [
  { id: "francais", label: "Français", icon: "📖", color: "hsl(32, 80%, 50%)" },
  { id: "mathematique", label: "Mathématique", icon: "🔢", color: "hsl(217, 91%, 60%)" },
  { id: "histoire", label: "Histoire", icon: "🏛️", color: "hsl(25, 70%, 45%)" },
  { id: "geographie", label: "Géographie", icon: "🌍", color: "hsl(142, 71%, 45%)" },
  { id: "physique-chimie", label: "Physique/Chimie", icon: "⚗️", color: "hsl(280, 60%, 50%)" },
  { id: "svt", label: "SVT", icon: "🌿", color: "hsl(120, 50%, 40%)" },
  { id: "technologie", label: "Technologie", icon: "⚙️", color: "hsl(200, 60%, 45%)" },
  { id: "anglais", label: "Anglais", icon: "🇬🇧", color: "hsl(0, 60%, 50%)" },
  { id: "espagnol", label: "Espagnol", icon: "🇪🇸", color: "hsl(45, 90%, 50%)" },
  { id: "dessin", label: "Dessin", icon: "🎨", color: "hsl(330, 60%, 55%)" },
  { id: "musique", label: "Musique", icon: "🎵", color: "hsl(260, 50%, 55%)" },
  { id: "option1", label: "Option 1", icon: "📌", color: "hsl(180, 50%, 45%)" },
  { id: "option2", label: "Option 2", icon: "📎", color: "hsl(160, 50%, 40%)" },
  { id: "grand-oral", label: "Grand Oral", icon: "🎤", color: "hsl(350, 65%, 50%)" },
];

export const SUBJECTS_LYCEE = [
  { id: "snt", label: "SNT", icon: "💻", color: "hsl(210, 60%, 50%)" },
  { id: "ses", label: "SES", icon: "📊", color: "hsl(38, 70%, 50%)" },
  { id: "ens-scientifiques", label: "Enseignements scientifiques", icon: "🔬", color: "hsl(190, 60%, 45%)" },
  { id: "spe-math", label: "Spé Math", icon: "📐", color: "hsl(217, 80%, 55%)" },
  { id: "spe-physique", label: "Spé Physique", icon: "⚡", color: "hsl(48, 90%, 50%)" },
  { id: "spe-svt", label: "Spé SVT", icon: "🧬", color: "hsl(130, 55%, 40%)" },
  { id: "spe-hggsp", label: "Spé HGGSP", icon: "🗺️", color: "hsl(20, 65%, 45%)" },
  { id: "spe-hlp", label: "Spé HLP", icon: "📜", color: "hsl(300, 40%, 50%)" },
  { id: "spe-nsi", label: "Spé NSI", icon: "🖥️", color: "hsl(200, 70%, 50%)" },
  { id: "spe-si", label: "Spé SI", icon: "🔧", color: "hsl(170, 50%, 45%)" },
  { id: "spe-ses", label: "Spé SES", icon: "💹", color: "hsl(40, 80%, 50%)" },
  { id: "spe-lit-langues", label: "Spé Littérature et langues", icon: "📚", color: "hsl(340, 50%, 50%)" },
];

export const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

export const HOURLY_RATES = {
  maternelle_primaire: 10,
  college: 13,
  lycee: 16,
} as const;

export const ENCOURAGEMENT_MESSAGES = [
  "Presque ! Essaie encore 💪",
  "Tu y es presque, courage ! 🌟",
  "Ne lâche rien, tu peux y arriver ! 🎯",
  "Continue, la bonne réponse est proche ! ✨",
  "Allez, une autre chance ! 🚀",
  "C'est en se trompant qu'on apprend ! 📚",
  "Persévère, tu vas trouver ! 🔥",
];
