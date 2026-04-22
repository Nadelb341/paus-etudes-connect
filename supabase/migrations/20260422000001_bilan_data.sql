-- Ajout de la colonne bilan_data sur profiles
-- Stocke la fiche bilan complète d'un élève (JSONB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bilan_data JSONB;
