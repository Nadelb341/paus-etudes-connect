export const ADMIN_EMAIL = "nad341@live.fr";

export const SCHOOL_LEVELS = [
  "Maternelle", "CP", "CE1", "CE2", "CM1", "CM2",
  "6ème", "5ème", "4ème", "3ème",
  "Seconde", "Première", "Terminale",
] as const;

export const MATERNELLE_LEVELS = ["PS", "MS", "GS"] as const;
export const PRIMARY_LEVELS = ["CP", "CE1", "CE2", "CM1", "CM2"] as const;
export const COLLEGE_LEVELS = ["6ème", "5ème", "4ème", "3ème"] as const;
export const LYCEE_MAIN_LEVELS = ["Seconde", "Première", "Terminale"] as const;

export const levelSubjectId = (subjectId: string, level: string): string =>
  `${subjectId}|${level}`;

// Retourne les matières disponibles pour un niveau donné
export const getSubjectsForLevel = (level: string) => {
  // 13 matières communes : Français → Option 2 (sans Grand Oral)
  const base = SUBJECTS_GENERAL.slice(0, 13);

  if (level === "3ème") return [...base, SUBJECTS_GENERAL[13]]; // + Grand Oral

  if (level === "Seconde")
    return [...base, SUBJECTS_LYCEE[0], SUBJECTS_LYCEE[1], SUBJECTS_LYCEE[2]]; // + SNT, SES, Ens. sci.

  if (level === "Première" || level === "Terminale")
    return [...base, ...SUBJECTS_LYCEE.slice(2)]; // + Ens. sci. + toutes Spé (sans SNT/SES)

  return base;
};

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

// Extrait le subject_id de base depuis un ID composite (ex: "mathematique|3ème" → "mathematique")
export const getBaseSubjectId = (compositeId: string): string => compositeId.split('|')[0];

// Grands thèmes par défaut pour chaque matière (basés sur les programmes officiels)
export const DEFAULT_THEMES: Record<string, string[]> = {
  "francais": ["Méthodologie", "Grammaire", "Conjugaison", "Orthographe", "Vocabulaire", "Lecture et écriture", "Outils d'analyse"],
  "mathematique": ["Méthodologie", "Nombres et calculs", "Fonctions", "Organisation et gestion des données", "Espace et Géométrie", "Grandeurs et Mesures", "Algorithmique et programmation"],
  "histoire": ["Méthodologie", "Préhistoire et Antiquité", "Moyen Âge", "Temps modernes", "XIXe siècle", "XXe siècle", "Monde contemporain"],
  "geographie": ["Méthodologie", "Habiter le monde", "Ressources et développement durable", "Population et migrations", "Europe et mondialisation", "La France"],
  "physique-chimie": ["Méthodologie", "Mécanique", "Électricité", "Optique", "Chimie", "Thermodynamique", "Ondes et signaux"],
  "svt": ["Méthodologie", "Le vivant", "Corps humain et santé", "Géologie et environnement", "Génétique et évolution", "Écosystèmes et biodiversité"],
  "technologie": ["Méthodologie", "Systèmes techniques", "Matériaux et procédés", "Énergie", "Information et programmation", "Design et innovation"],
  "anglais": ["Méthodologie", "Grammaire", "Vocabulaire", "Compréhension de l'oral", "Expression orale", "Compréhension de l'écrit", "Expression écrite"],
  "espagnol": ["Méthodologie", "Grammaire", "Vocabulaire", "Compréhension de l'oral", "Expression orale", "Compréhension de l'écrit", "Expression écrite"],
  "dessin": ["Méthodologie", "Pratique artistique", "Couleur et composition", "Histoire de l'art", "Techniques et supports", "Analyse d'œuvres"],
  "musique": ["Méthodologie", "Pratique vocale", "Écoute et analyse musicale", "Histoire de la musique", "Rythme et notation", "Cultures musicales"],
  "grand-oral": ["Méthodologie", "Choix et préparation du sujet", "Techniques orales", "Gestion du stress et présentation", "Entraînement"],
  "snt": ["Méthodologie", "Internet et Web", "Réseaux sociaux", "Données structurées", "Localisation et cartographie", "Informatique embarquée", "Sécurité numérique"],
  "ses": ["Méthodologie", "Science économique", "Sociologie", "Sciences politiques", "Regards croisés"],
  "ens-scientifiques": ["Méthodologie", "Mathématiques pour les sciences", "Physique-chimie", "SVT", "Science et société"],
  "spe-math": ["Méthodologie", "Algèbre et analyse", "Géométrie", "Probabilités et statistiques", "Algorithmique et programmation"],
  "spe-physique": ["Méthodologie", "Mécanique", "Électricité et électromagnétisme", "Optique et ondes", "Chimie organique et inorganique"],
  "spe-svt": ["Méthodologie", "Génétique et évolution", "Corps humain et immunologie", "Neurosciences", "Écologie et environnement"],
  "spe-hggsp": ["Méthodologie", "Histoire et mémoires", "Gouverner un État", "Dynamiques territoriales", "Sociétés et environnement", "S'informer et analyser"],
  "spe-hlp": ["Méthodologie", "La recherche de soi", "L'existence humaine", "Parole et langage", "La morale et le politique"],
  "spe-nsi": ["Méthodologie", "Structures de données", "Algorithmique", "Architectures et réseaux", "Bases de données", "Langages et programmation"],
  "spe-si": ["Méthodologie", "Analyse des systèmes", "Mécanique", "Électronique et automatique", "Informatique industrielle"],
  "spe-ses": ["Méthodologie", "Microéconomie", "Macroéconomie", "Sociologie", "Science politique"],
  "spe-lit-langues": ["Méthodologie", "Littérature française", "Littérature étrangère", "Traduction littéraire", "Stylistique et rhétorique"],
};

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

export const DAILY_MOTIVATIONS = [
  "Chaque jour est une nouvelle chance d'apprendre quelque chose d'incroyable ! 🌟",
  "Le savoir est la seule richesse qu'on peut donner sans s'appauvrir 📚",
  "Tu es capable de grandes choses, crois en toi ! 💪",
  "L'effort d'aujourd'hui, c'est la réussite de demain ✨",
  "Apprendre, c'est grandir un peu plus chaque jour 🌱",
  "La curiosité est le moteur de l'intelligence 🔍",
  "Chaque erreur est un pas vers la réussite 🎯",
  "Ton potentiel est illimité, continue d'avancer ! 🚀",
  "La persévérance est la clé du succès 🔑",
  "Aujourd'hui, tu es plus fort(e) qu'hier 💫",
  "Rien n'est impossible quand on s'en donne les moyens 🏆",
  "Chaque leçon apprise te rapproche de tes rêves 🌈",
  "Le courage, c'est de ne jamais abandonner 🦁",
  "Ton travail finira toujours par payer, patience ! ⏳",
  "Sois fier(e) de chaque progrès, même petit 🎉",
  "L'éducation est l'arme la plus puissante pour changer le monde 🌍",
  "Crois en tes capacités, elles sont immenses ! 🌠",
  "Un pas à la fois, tu atteindras le sommet 🏔️",
  "Ton sourire quand tu comprends, ça n'a pas de prix 😊",
  "Le plaisir d'apprendre, c'est le secret des meilleurs élèves 📖",
  "Tu as tout ce qu'il faut pour réussir, fonce ! 🎯",
  "La connaissance est un trésor qui t'accompagnera toute ta vie 💎",
  "Chaque question posée est un signe d'intelligence 🧠",
  "Aujourd'hui est le jour parfait pour progresser 📈",
  "Tu inspires les autres par ta détermination 🌟",
  "Le meilleur investissement, c'est celui dans ton savoir 💡",
  "Bravo pour ta régularité, c'est admirable ! 👏",
  "L'apprentissage est une aventure passionnante 🗺️",
  "Ta réussite commence ici et maintenant ⭐",
  "Ensemble, on va plus loin ! 🤝",
  "Chaque effort compte, ne sous-estime jamais les tiens 💪",
];
