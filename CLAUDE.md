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
    ui/          -> shadcn (ne pas modifier manuellement)
  hooks/         -> useAuth, useAdminView, use-mobile, use-toast
  integrations/  -> supabase client + types auto-generes
  lib/           -> constants.ts (admin email, niveaux, matieres, tarifs), utils.ts
```

## Base de donnees (Supabase)
Tables principales : profiles, subject_content, subject_documents, subject_chapters,
chapter_documents, subject_comments, homework, homework_completions, homework_reminders,
appointments, quizzes, quiz_questions, quiz_responses, messages, notifications,
tutoring_hours, parent_child_cards, payment_tracking, family_accounts

Storage bucket : `subject-files` (public)

## Supabase
- URL : https://xgyggsgcgqbekowiuvgk.supabase.co
- Vars d'env dans .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- RLS active sur toutes les tables
- Real-time sur messages, reminders, quiz_responses, parent_child_cards

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

## Routes
- `/auth` - Connexion / Inscription
- `/` - Accueil eleve (devoirs, RDV, matieres)
- `/dashboard` - Panel admin
- `/messages` - Messagerie
- `/settings` - Parametres profil
- `/switch-account` - Gestion comptes famille

## Contexte
- Projet cree fin mars 2026, en developpement actif
- Nadia gere le projet cote Lovable, Ahmed/Mustapha assistent cote technique
