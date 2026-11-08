# Consigne de rédaction — contenu des chapitres (Paus'Étude)
Réponds en français. Tu NE modifies aucun projet ni base : tu produis des fichiers JSON de CONTENU pédagogique ORIGINAL.

Liste des chapitres à rédiger : fichier todo/<NIVEAU>.json (tableau de {subject, theme, chapter}) dans
/private/tmp/claude-501/-Users-nadiaelb/e008b095-bf3d-4314-9428-ebd5c4b21774/scratchpad/biblio/
Le fichier contenu_3eme_maths.json de ce dossier donne le FORMAT JSON et le ton, MAIS ses cours sont trop courts : applique la nouvelle consigne « cours » ci-dessous.

Pour CHAQUE chapitre : contenu original (jamais recopié d'un site commercial ; appuie-toi sur le programme officiel et Eduscol, recherches web permises), exact, adapté à l'âge du niveau, français simple et sans faute :
- "cours" : VRAI COURS COMPLET ET STRUCTURÉ (l'enseignante a jugé le format court « beaucoup trop léger »). Markdown, plan numéroté obligatoire :
  ## Objectifs du chapitre (3 à 5 puces « Je dois savoir… »)
  ## 1. … / ## 2. … / ## 3. … (parties du cours avec sous-parties ### a), b)…)
     - définitions en **gras** dans un bloc « > **Définition** : … »
     - propriétés / règles / théorèmes dans « > **Propriété** : … » (ou « > **Règle** », « > **À savoir** »)
     - méthodes pas à pas « **Méthode** : 1. … 2. … 3. … »
     - au moins 3 exemples résolus détaillés (« **Exemple** : … **Solution** : … »), dont un type examen au collège/lycée
     - en histoire-géo : repères (dates, lieux, acteurs), notions, études de cas ; en sciences : expériences/observations et schémas décrits ; en langues : grammaire + vocabulaire + phrases d'exemple traduites ; en philosophie : notions, distinctions conceptuelles, repères d'auteurs (paraphrasés), problématiques.
  ## Erreurs fréquentes (3 à 5)
  ## L'essentiel à retenir (résumé en 5 à 8 lignes)
  Longueur : lycée 900 à 1500 mots ; collège 700 à 1200 ; CM1–CM2 400 à 700 ; CP–CE2 200 à 400 (phrases très courtes, mêmes rubriques simplifiées).
- "revision" : 5 à 10 points essentiels (liste Markdown).
- "flashcards" : 6 à 10 {"front","back"}.
- "quiz" : 5 {"question","options":[4],"correct":0-3,"explanation"} (bonne réponse à des places variées).
- "exercises" : 3 {"title","statement","solution","difficulty":1|2|3} (un de chaque), corrigés détaillés.
- "defis" : 2 défis {"title","statement","solution","difficulty":3} : problèmes plus ambitieux (problème ouvert, question de réflexion, mini-enquête, défi de logique), corrigés détaillés. CP–CE2 : défis ludiques et courts.
Chapitres « Préparer le brevet / le bac » : méthode d'épreuve + exercices type examen ORIGINAUX. Philosophie : notions, repères, méthodes (dissertation/explication), pas de citations longues. Œuvres au programme : présentation et pistes d'analyse originales, citations très courtes seulement.
Pas de tableaux Markdown complexes (préférer des listes). Pas d'images.

Organisation : traite matière par matière ; tu peux répartir le travail entre des sous-agents (max 5 en même temps). Écris UN fichier par matière :
contenu/<NIVEAU>/<subject>.json = [{"level":"<NIVEAU>","subject","theme","chapter","cours","revision","flashcards","quiz","exercises","defis"}, …]
avec theme/chapter EXACTEMENT comme dans todo/<NIVEAU>.json. Valide chaque fichier avec python3 (json.load) et vérifie qu'aucun chapitre de la liste ne manque (relance ceux qui manquent). Relis les calculs et les faits.
Rapport final court : nombre de chapitres rédigés / attendus par matière, doutes.
