# My Study Way (ex Paus'Etudes Connect)

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
- Toggle Parents/Eleves : vue eleve = icone 🗞️, vue parent = icone 🧸
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

## Vue Parent (ParentHome.tsx)
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

## Contexte
- Projet cree fin mars 2026, en developpement actif
- Renomme "My Study Way" (ex Paus'Etudes) le 2 avril 2026
- Deploye sur Vercel le 7 avril 2026 (remplace Lovable comme plateforme de deploy)
- Notifications push : installees et testees OK (son + banniere) le 31 mars 2026
- Collaborateur GitHub : badmust75-coder a acces en ecriture au repo
