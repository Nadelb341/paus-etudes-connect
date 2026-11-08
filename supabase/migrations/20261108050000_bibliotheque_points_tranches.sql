-- 2026-11-08 — Points tranchés avec Nadia (rien n'est supprimé : on range en « Hors programme »)
DO $do$
DECLARE hid uuid; admin uuid; o int;
BEGIN
  SELECT id INTO admin FROM auth.users WHERE email='nad341@live.fr';
  -- 1. Français 5ème : 3 anciens thèmes (programme 2020) qui ne sont plus au programme 2026
  UPDATE subject_themes SET title='Hors programme cette année : '||title, order_index=order_index+1000, updated_at=now()
   WHERE subject_id='francais|5ème' AND title IN ('Le voyage et l''aventure : pourquoi aller vers l''inconnu ?','Imaginer des univers nouveaux','L''être humain est-il maître de la nature ?');
  -- 2 chapitres mal placés dans le thème théâtre
  SELECT id INTO hid FROM subject_themes WHERE subject_id='francais|5ème' AND title='Hors programme cette année (ancien programme)';
  IF hid IS NULL THEN
    INSERT INTO subject_themes(subject_id,title,order_index,created_by) VALUES ('francais|5ème','Hors programme cette année (ancien programme)',2000,admin) RETURNING id INTO hid;
  END IF;
  UPDATE subject_chapters c SET theme_id=hid, updated_at=now() FROM subject_themes t
   WHERE c.theme_id=t.id AND t.subject_id='francais|5ème' AND t.title LIKE 'Expérimenter et jouer au théâtre%'
     AND c.title IN ('L''amitié dans les récits','Les réseaux sociaux : communiquer avec les autres') AND c.target_student_ids IS NULL;
  -- 2. EMC : la défense relève de la 4ème (programme 2024) ; le thème de 3ème est rangé, le parcours de citoyenneté est recopié en 4ème
  UPDATE subject_themes SET title='Hors programme en 3ème (vu en 4ème) : '||title, order_index=order_index+1000, updated_at=now()
   WHERE subject_id='emc|3ème' AND title='La défense et la paix';
  SELECT id INTO hid FROM subject_themes WHERE subject_id='emc|4ème' AND title='La sécurité et la défense des personnes';
  IF hid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM subject_chapters WHERE theme_id=hid AND title ILIKE '%recensement%') THEN
    SELECT coalesce(max(order_index),-1)+1 INTO o FROM subject_chapters WHERE theme_id=hid;
    INSERT INTO subject_chapters(subject_id,title,theme_id,order_index,created_by)
      VALUES ('emc|4ème','Le parcours de citoyenneté : recensement et Journée défense et citoyenneté',hid,o,admin);
  END IF;
END $do$;
