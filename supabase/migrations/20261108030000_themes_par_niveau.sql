-- 2026-11-08 — Bibliothèque : les grands thèmes deviennent propres à chaque niveau (subject_id composite « matiere|niveau »).
-- Les 8 thèmes de maths (communs à tous les niveaux) sont recopiés pour les niveaux qui ont des chapitres (5ème, 3ème),
-- puis chaque chapitre est rattaché à la copie de son niveau (même titre). Les anciens thèmes communs restent (inutilisés).
INSERT INTO public.subject_themes (subject_id, title, order_index, created_by)
SELECT lv.sid, t.title, t.order_index, t.created_by
FROM public.subject_themes t
CROSS JOIN (SELECT DISTINCT subject_id AS sid FROM public.subject_chapters WHERE subject_id LIKE 'mathematique|%') lv
WHERE t.subject_id = 'mathematique'
  AND NOT EXISTS (SELECT 1 FROM public.subject_themes x WHERE x.subject_id = lv.sid AND x.title = t.title);

UPDATE public.subject_chapters c
SET theme_id = nt.id
FROM public.subject_themes old, public.subject_themes nt
WHERE c.theme_id = old.id AND old.subject_id = 'mathematique'
  AND nt.subject_id = c.subject_id AND nt.title = old.title;
