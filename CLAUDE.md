# Paus'Etudes Connect

## Description
Plateforme educative pour le soutien scolaire. Creee par Nadia (nad341@live.fr) via Lovable.
Gestion des devoirs, cours, quiz, RDV de tutorat, messagerie et suivi de paiement.

## Utilisateurs
- **Admin unique** : nad341@live.fr (hardcode dans constants.ts, auto-approve)
- **Eleves** : s'inscrivent, attendent approbation admin
- **Parents** : suivent les enfants via parent_child_cards

## Stack technique
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (auth, BDD PostgreSQL, storage, real-time)
- TanStack React Query
- React Hook Form + Zod
- Date-fns (formatage dates FR)

## Architecture
```
src/
  pages/         -> Auth, Index (home eleve), Dashboard (admin), Messages, Settings, SwitchAccount
  components/
    auth/        -> LoginForm, RegisterForm, ProtectedRoute
    home/        -> WelcomeBanner, CahierDeTexte, SubjectsGrid, SubjectCard,
                    SubjectContentDialog, ChapterManager, QuizManager, QuizPlayer,
                    AppointmentsCard, SubjectComments, ParentHome
    layout/      -> AppHeader
    NotificationPoller.tsx  -> polling Edge Function toutes les 2 min
    ui/          -> shadcn (ne pas modifier manuellement)
  hooks/         -> useAuth, useAdminView, useNotifications, use-mobile, use-toast
  integrations/  -> supabase client + types auto-generes
  lib/           -> constants.ts (admin email, niveaux, matieres, tarifs), utils.ts
```

## Base de donnees (Supabase)
Tables principales : profiles, subject_content, subject_documents, subject_chapters,
chapter_documents, subject_comments, homework, homework_completions, homework_reminders,
appointments, quizzes, quiz_questions, quiz_responses, messages, notifications,
tutoring_hours, parent_child_cards, payment_tracking, family_accounts,
push_subscriptions, scheduled_notifications

Storage bucket : `subject-files` (public)

## Supabase
- URL : https://xgyggsgcgqbekowiuvgk.supabase.co
- Vars d'env dans .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- RLS active sur toutes les tables
- Real-time sur messages, reminders, quiz_responses, parent_child_cards
- Edge Function : send-notifications (envoi push via VAPID)

## Notifications Push (PWA)
- Service Worker : public/sw.js
- Hook : src/hooks/useNotifications.tsx
- Poller : src/components/NotificationPoller.tsx (toutes les 2 min)
- Edge Function : supabase/functions/send-notifications/index.ts
- Cles VAPID en dur (pas en env vars — Lovable les ecrase)
- PUBLIC : BNcZOsiXX15afLFeaV4ZS27i2cBzL5fY2XGfIR_T0QKdi3f4u9E085iD7C1OxEt0HJbbSjz8Dtpm4te6F2X6BYs
- PRIVATE : I0jkPQD9oCJ2Geq46M-VCf8Ew_CqgnKosdk18O8A9NA
- Triggers auto : messages, RDV, devoirs, rappels -> scheduled_notifications
- iOS PWA : jamais new Notification(), tout via scheduled_notifications + Edge Function
- Activation par l'utilisateur dans Settings > Notifications push

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
- Tarifs : 10EUR primaire, 13EUR college, 16EUR lycee
- Niveaux scolaires : Maternelle -> Terminale
- Les migrations Supabase sont dans supabase/migrations/
- Projet Lovable : attention a la compatibilite avec l'editeur Lovable
- iOS PWA : jamais new Notification(), tout via Edge Function
- Cles VAPID en dur dans le code (Lovable ecrase les env vars)

## Routes
- `/auth` - Connexion / Inscription
- `/` - Accueil eleve (devoirs, RDV, matieres)
- `/dashboard` - Panel admin
- `/messages` - Messagerie
- `/settings` - Parametres profil
- `/switch-account` - Gestion comptes famille

## Collaboration Lovable
- Nadia edite via Lovable, Mustapha assiste via Claude Code + GitHub
- Synchro GitHub → Lovable : icone </> (editeur code) ou prompt "Pull from GitHub"
- Le pull GitHub coute des credits sur Lovable, l'editeur de code est gratuit
- SQL dans Lovable/Supabase : gratuit
- Pour les petites modifs : Nadia modifie directement dans l'editeur de code Lovable

## Contexte
- Projet cree fin mars 2026, en developpement actif
- Nadia gere le projet cote Lovable, Mustapha assiste cote technique
- Notifications push : installees et testees OK (son + banniere) le 31 mars 2026
- Collaborateur GitHub : badmust75-coder a acces en ecriture au repo
