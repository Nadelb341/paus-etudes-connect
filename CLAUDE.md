# Paus'étude (ex My Study Way, ex Paus'Etudes Connect)

## Description
Plateforme educative pour le soutien scolaire. Creee par Nadia (nad341@live.fr).
Gestion des devoirs, cours, quiz, RDV de tutorat, messagerie enrichie et suivi de paiement.

## Utilisateurs
- **Admin unique** : nad341@live.fr (hardcode dans constants.ts, auto-approve)
- **Eleves** : s'inscrivent, attendent approbation admin
- **Parents** : suivent les enfants via parent_child_cards, voient RDV, heures de cours, recoivent notifications

## Stack technique
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (auth, BDD PostgreSQL, storage, real-time)
- TanStack React Query
- React Hook Form + Zod
- Date-fns (formatage dates FR)

## Deploiement
- **Vercel** : projet "my-study-way" (nadelb341s-projects)
- **GitHub** : https://github.com/Nadelb341/paus-etudes-connect
- Auto-deploy : chaque push sur `main` declenche un redeploy Vercel automatiquement
- Variables d'environnement Supabase configurees dans Vercel

## Architecture
```
src/
  pages/         -> Auth, Index (home eleve), Dashboard (admin), Messages, Settings, SwitchAccount
  components/
    auth/        -> LoginForm, RegisterForm, ProtectedRoute
    home/        -> WelcomeBanner, CahierDeTexte, SubjectsGrid, SubjectCard,
                    SubjectContentDialog, ChapterManager, QuizManager, QuizPlayer,
                    AppointmentsCard, SubjectComments, ParentHome
    layout/      -> AppHeader (icones couleur, toggle Parents/Eleves avec emojis)
    NotificationPoller.tsx  -> polling Edge Function toutes les 2 min
    ui/          -> shadcn (ne pas modifier manuellement)
  hooks/         -> useAuth, useAdminView, useNotifications, use-mobile, use-toast
  integrations/  -> supabase client + types auto-generes
  lib/           -> constants.ts (admin email, niveaux, matieres, tarifs), utils.ts
```

## Base de donnees (Supabase)
Tables principales : profiles, subject_content, subject_documents, subject_chapters,
chapter_documents, subject_comments, homework, homework_completions, homework_reminders,
appointments (status, status_note), quizzes, quiz_questions, quiz_responses,
messages (reactions jsonb, attachments jsonb), notifications,
tutoring_hours, parent_child_cards, payment_tracking, family_accounts,
push_subscriptions, scheduled_notifications,
appointment_views (suivi accusés réception RDV),
hourly_rate_settings (barème tarifs horaires par niveau)

Colonne ajoutee : profiles.custom_hourly_rate (tarif personnalise par eleve, NULL = barème par niveau)

Storage bucket : `subject-files` (public) — aussi utilise pour les pieces jointes messages

## Header (AppHeader)
- Icones colorees : Parametres (gris), Comptes (bleu), Messages (vert), Accueil (ambre), Tableau de bord (violet)
- **Tableau de bord** : visible uniquement pour l'admin (caché pour élèves et parents)
- Toggle Parents/Eleves : vue eleve = icone 🗞️, vue parent = icone 🧸 (admin uniquement)
- Badges de notification sur chaque icone (count > 0 uniquement)

## Systeme de badges (pastilles)
- Calcul dans Index.tsx, mise a jour temps reel via Supabase channels
- **RDV** : nombre de RDV actifs non vus (seen_by_student = false)
- **Cahier de texte** : devoirs incomplets a venir
- **Messages** : messages recus depuis derniere visite (localStorage)
- **Logo** : pastille animee avec total de toutes les actions en attente
- Badges disparaissent quand l'utilisateur valide l'action ou ouvre la carte

## RDV a venir (AppointmentsCard)
- Tri par date de creation decroissante (derniers crees en haut)
- Creation : selection eleve + parent (optionnel)
- Si parent selectionne : lien parent_child_cards cree automatiquement
- Report : calendrier + heure pour choisir la nouvelle date
- Annulation : avec note optionnelle
- Notifications auto (triggers SQL) : eleve + parents lies
- **Flash message** : a la premiere connexion apres creation d'un nouveau RDV, un dialog
  s'affiche (non dismissable par clic exterieur, bouton OK uniquement). Tracking via
  table `appointment_views` (persistant multi-appareils).

## Messagerie (Messages.tsx)
- **Conversations 1-a-1** : admin <-> eleve, admin <-> parent
- **Conversations de groupe** : admin + eleve + parent (via copie parent)
- Conversations identifiees par ensemble trie des participants
- Copie parent dans 1-a-1 cree une conversation de groupe persistante
- Tous les participants voient et repondent dans le meme fil
- **Reactions emoji** :
  - Bouton icone Smile (monochrome, grise) sous les messages des AUTRES uniquement
  - Clic ouvre un panneau de 30 emojis
  - L'emoji choisi s'affiche en badge rond en haut a droite du message
  - Mise a jour optimiste (affichage immediat) + sauvegarde DB en arriere-plan
  - Clic sur le badge supprime la reaction (toggle)
  - RLS UPDATE autorise pour expediteur, destinataires et admin
- **Pieces jointes** : upload PDF, images, prise de photo (Supabase storage)
- **Liens YouTube** : detection auto + miniature avec bouton play
- **Historique** : toutes les conversations sont conservees
- Parents ont les memes fonctionnalites que les eleves

## Dashboard admin
Sections (cartes accordeon) :
1. Inscriptions en attente (accepter/refuser)
2. Monitoring (stats)
3. Eleves (liste, recherche, edition complete du profil)
4. **Parents** (liste, recherche, edition, liaison parent-enfant)
5. **Registre des heures** :
   - Bouton "Bareme" pour modifier les tarifs horaires par niveau (primaire/college/lycee)
   - Tarifs stockes en base dans `hourly_rate_settings` (modifiables par admin)
   - Tarif personnalise par eleve possible (custom_hourly_rate sur profiles)
   - Calcul montant : formatEur() — arrondi 2 decimales, sans .00 inutile (ex: 19.50€ et non 20€)
6. Suivi des notes en attente
7. Notifications
8. Cahier de texte (creation devoirs, suivi completion)

Edition eleve : prenom, genre, niveau, date naissance, remarques, tarif horaire personnalise
Edition parent : prenom, enfant declare, liaison eleve inscrit, remarques

## Navigation par niveaux (admin) — màj session 2026-04-22

Architecture inversée : l'admin ne voit plus les matières en page d'accueil
mais les niveaux scolaires regroupés en 4 cartes empilées.

**Composants** :
- `AdminLevelView.tsx` : affiche les 4 groupes (Maternelle/Primaire/Collège/Lycée)
  avec sous-niveaux comme boutons cliquables
- `LevelSubjectsDialog.tsx` : dialog des cartes matières pour un sous-niveau
- `SubjectsGrid.tsx` : routeur admin/élève — admin → AdminLevelView, élève → grille matières

**Groupes et sous-niveaux** :
- Maternelle : PS, MS, GS
- Primaire : CP, CE1, CE2, CM1, CM2
- Collège : 6ème, 5ème, 4ème, 3ème
- Lycée : Seconde, Première, Terminale

**Matières par niveau** (défini dans `getSubjectsForLevel` — constants.ts) :
- Tous les niveaux (sauf exceptions) : 13 matières (Français → Option 2)
- 3ème uniquement : + Grand Oral
- Seconde : + SNT, SES, Enseignements scientifiques
- Première / Terminale : + Enseignements scientifiques + 9 Spé (Spé Math → Spé Lit.)

**SubjectId composite** : `${subjectId}|${niveau}` ex: `mathematique|6ème`
— chaque niveau a son espace de contenu indépendant dans Supabase.

**Côté élève** : aucun changement visuel, le subjectId composite est calculé
automatiquement à partir de leur `school_level`.

## Vue Parent (ParentHome.tsx) — màj session 2026-04-14
- Carte résumé : parents voient uniquement **"Reste dû"** (Total heures + Montant total cachés)
- Admin voit les 3 cartes (Total heures, Montant total, Reste dû)
- Tableau des heures : visible par tous, toutes colonnes affichées
- **Historique filtré côté parent** : seulement les 2 derniers mois, SAUF si reste dû > 0 (la ligne reste visible jusqu'au solde complet). L'admin voit tout depuis le premier cours.
- Affiche les RDV de l'enfant lie
- Affiche les heures de cours et montants dus
- Calcul monetaire correct via formatEur() (ex: 1.5h x 13€ = 19.50€)
- Ordre des sections : selecteur admin PUIS rendez-vous (pas l'inverse)

## Notifications Push (PWA)
- Service Worker : public/sw.js
- Hook : src/hooks/useNotifications.tsx
- Poller : src/components/NotificationPoller.tsx (toutes les 2 min)
- Edge Function : supabase/functions/send-notifications/index.ts
- Cles VAPID en dur (pas en env vars — Lovable les ecrase)
- PUBLIC : BNcZOsiXX15afLFeaV4ZS27i2cBzL5fY2XGfIR_T0QKdi3f4u9E085iD7C1OxEt0HJbbSjz8Dtpm4te6F2X6BYs
- PRIVATE : I0jkPQD9oCJ2Geq46M-VCf8Ew_CqgnKosdk18O8A9NA
- Triggers auto : messages, RDV (creation + report/annulation), devoirs, rappels
- Notifications RDV envoyees aux eleves ET parents lies
- iOS PWA : jamais new Notification(), tout via scheduled_notifications + Edge Function

## RLS (Row Level Security)
- Admin : acces total sur toutes les tables
- Eleves : lecture propres RDV (is_visible=true), mise a jour propres RDV
- Parents :
  - Lecture RDV de leurs enfants lies (via parent_child_cards)
  - Lecture profils des eleves lies
  - Lecture heures de cours des eleves lies (tutoring_hours)
  - Lecture et creation dans appointment_views (accusés réception)
- Messages : tout participant (expediteur ou destinataire) peut UPDATE les reactions

## Commandes
```bash
npm run dev          # Dev server
npm run build        # Build prod
npm run test         # Tests unitaires (Vitest)
npm run test:watch   # Tests en watch mode
```

## Regles de dev
- Tout le contenu UI est en francais
- Ne jamais modifier les composants shadcn/ui directement
- Admin email hardcode : nad341@live.fr (src/lib/constants.ts)
- Tarifs par defaut : 10EUR primaire, 13EUR college, 16EUR lycee (modifiables en base)
- Niveaux scolaires : Maternelle -> Terminale
- Les migrations Supabase sont dans supabase/migrations/
- iOS PWA : jamais new Notification(), tout via Edge Function
- Cles VAPID en dur dans le code (Vercel/Lovable ecrasent les env vars)
- Logo : livre + toque + texte "My Study Way" (src/assets/logo.png + public/logo.png)
- formatEur(n) : utilitaire pour afficher les montants (pas de .toFixed(0) qui arrondit mal)

## Routes
- `/auth` - Connexion / Inscription
- `/` - Accueil eleve (devoirs, RDV, matieres) ou accueil parent (RDV enfant, suivi)
- `/dashboard` - Panel admin (eleves, parents, heures, devoirs, notifications)
- `/messages` - Messagerie (1-a-1, groupe, emojis, pieces jointes, YouTube)
- `/settings` - Parametres profil
- `/switch-account` - Gestion comptes famille

## Collaboration
- Nadia edite et teste l'application
- Synchro : push GitHub -> Vercel redeploy automatique
- SQL Supabase : via Lovable SQL Editor ou dashboard Supabase directement
- Pour les petites modifs UI : possibilite d'editer dans l'editeur de code Lovable puis pull GitHub

## Migrations SQL (supabase/migrations/)
- 20260327-20260330 : schema initial, tables, RLS
- 20260331000001 : push notifications (triggers messages, RDV, devoirs)
- 20260402165949 : status/status_note sur appointments + trigger notification report/annulation
- 20260402200000 : RLS parents sur appointments + trigger notify parents sur creation RDV
- 20260403000001 : reactions (jsonb) et attachments (jsonb) sur messages
- 20260406000001 : RLS parents — lecture profil eleves lies
- 20260407000001 : table appointment_views (flash message accusé reception RDV)
- 20260407000002 : table hourly_rate_settings + colonne custom_hourly_rate sur profiles
- 20260407000003 : RLS parents — lecture tutoring_hours des eleves lies
- 20260407000004 : RLS messages UPDATE reactions pour tous les participants
- 20260407000005 : colonne planned_work sur appointments (travail prevu)
- 20260407000006 : colonnes amount_paid + payment_note sur payment_tracking
- 20260407000007 : colonne payment_entries (JSONB) sur payment_tracking (versements partiels)
- 20260412000001 : colonne known_password sur profiles (mot de passe visible par admin)
- 20260412000002 : fonction SQL admin_delete_user (SECURITY DEFINER, supprime auth.users)

## RDV a venir (AppointmentsCard) — champ travail prevu
- Champ planned_work (TEXT) ajoute sur appointments
- Affiche un bloc "📖 Travail prevu" juste avant "🎒 Affaires a prendre"
- Visible dans la carte RDV et dans le flash message de notification
- Champ present dans les formulaires creation et modification

## Suivi paiement (ParentHome) — refonte complete
- Colonne "Somme payee" : supprimee du tableau (evite scroll horizontal)
- Colonne "Historique" : supprimee du tableau
- Tableau compact 5 colonnes : Date · Duree · Total · Regle · Reste du
- Bouton "+" en bout de ligne ouvre un dialog de versements
- payment_entries (JSONB) sur payment_tracking : tableau de versements {date, amount, note}
- amount_paid = somme automatique de tous les versements
- Paiements partiels : plusieurs versements par session possibles
- Chaque versement peut etre supprime individuellement
- Reste du s'affiche en orange si > 0, vert si solde

## Gestion des mots de passe eleves (Dashboard admin)
- Colonne profiles.known_password (TEXT, nullable) : stocke le mot de passe en clair pour l'admin
- Champ "Mot de passe" dans la carte "Modifier l'eleve" avec bouton oeil (montrer/cacher)
- Sauvegarde dans profiles.known_password ET mise a jour du vrai compte auth via Edge Function
- Edge Function deployee sur Supabase (via Lovable) : admin-update-password
- Verification que l'appelant est bien l'admin (nad341@live.fr) dans l'Edge Function

## Suppression d'un eleve (Dashboard admin)
- Bouton "Supprimer cet eleve" (rouge) dans la carte "Modifier l'eleve"
- AlertDialog de confirmation avant suppression
- Suppression via RPC SQL : supabase.rpc("admin_delete_user", { target_user_id })
- Fonction SQL admin_delete_user (SECURITY DEFINER) : supprime directement dans auth.users
- Apres suppression, l'eleve peut se reinscrire avec la meme adresse email
- Pas besoin d'Edge Function ni de cle service pour la suppression

## Fonctions Edge (Supabase — deployees via Lovable chat)
- admin-update-password : change le mot de passe auth d'un eleve (clé service)
- Pour deployer une nouvelle Edge Function : coller le code dans le chat Lovable avec
  "Crée et déploie une Edge Function appelée X avec ce code : ..."

## Inscription et authentification
- Confirmation email obligatoire avant connexion (activee via Lovable)
- Sujet email confirmation : sujet Supabase par defaut (personnalisation necessite domaine custom)
- Mot de passe : 6 caractères minimum (limite Supabase non modifiable via API), aucune restriction de format
- Verification HIBP desactivee (pas de blocage "mot de passe compromis")
- Flow : inscription → email confirmation → attente validation admin → accès appli
- LoginForm : détecte "Email not confirmed" avec bouton "Renvoyer l'email de confirmation"
- Projet Supabase sous organisation Lovable — accès dashboard limité via compte perso Nadia

## Emails automatiques — màj session 2026-04-13
- Destination : `nadiaelb341@hotmail.com` (contrainte Resend plan gratuit)
- Service : **Resend** (clé `re_231PpcSh_...` dans la fonction SQL `process_email_queue`)
- Table `email_queue` : `id, to_email, subject, html_body, sent, created_at`
- Traitement immédiat via trigger `trg_auto_process_email` (pg_cron non disponible dans ce projet)
- **Triggers** :
  - `trg_email_tutoring_hour` → INSERT sur `tutoring_hours` → "Paus Etude : Nouvelle seance - [élève] (DD/MM)"
  - `trg_email_payment` → UPDATE sur `payment_tracking` quand `is_paid` passe à true OU quand `payment_entries` change (nouveau versement) → tableau complet via `get_student_email_html()`
  - Sujet selon cas : "Paus Etude : Versement recu - [élève] (DD/MM)" ou "Paus Etude : Paiement complet - [élève]"
  - Corps du mail : tableau complet toutes séances (get_student_email_html) — pas juste la séance individuelle
- Règle Outlook : sujet contient "Paus Etude" → transférer vers `pausetude@hotmail.com`
- ⚠️ pg_cron non activé dans ce projet Supabase — traitement synchrone via trigger sur email_queue
- ⚠️ RLS désactivée sur email_queue (table interne — si RLS activée, les triggers SECURITY DEFINER sont bloqués et font échouer toute la transaction)
- ⚠️ `trg_auto_process_email` supprimé (pg_net absent → annulait les INSERTs dans email_queue)
- Traitement final : send-notifications Edge Function lit email_queue.sent=false toutes les 2 min via NotificationPoller

## Contexte
- Projet cree fin mars 2026, en developpement actif
- Renomme "My Study Way" (ex Paus'Etudes) le 2 avril 2026
- Renomme "Paus'étude" le 7 avril 2026 (retour au nom d'origine)
- Deploye sur Vercel le 7 avril 2026 (remplace Lovable comme plateforme de deploy)
- Notifications push : installees et testees OK (son + banniere) le 31 mars 2026
- Collaborateur GitHub : badmust75-coder a acces en ecriture au repo
- Projet Supabase gere par Lovable (pas accessible directement via compte Supabase perso)
- Pour deployer des Edge Functions : passer par le chat Lovable (pas le CLI Supabase)

## Regle UX - Confirmation avant suppression

TOUJOURS afficher une modale de confirmation avant toute suppression definitive.
- Utiliser un AlertDialog ou composant equivalent (useDeleteConfirm si disponible)
- S applique a TOUS les boutons/icones poubelle, menus "Supprimer", et toute action irréversible
- Messages adaptes au contexte : "Supprimer cet eleve ?", "Supprimer ce devoir ?", etc.
- Ne jamais supprimer directement sans confirmation, meme pour de petits elements
