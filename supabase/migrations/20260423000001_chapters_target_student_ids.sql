-- Ciblage multi-élèves au niveau du chapitre
-- NULL = visible par tous les élèves (comportement par défaut)
-- Tableau d'UUIDs = restreint aux élèves listés
ALTER TABLE subject_chapters ADD COLUMN IF NOT EXISTS target_student_ids UUID[];
