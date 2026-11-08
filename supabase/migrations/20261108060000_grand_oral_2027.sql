-- 2026-11-08 — Grand oral, bac 2027 (note de service du 10/09/2026, BO spécial n°4 du 17/09/2026, d'après sources secondaires concordantes)
DO $do$
DECLARE hid uuid; admin uuid;
BEGIN
  SELECT id INTO admin FROM auth.users WHERE email='nad341@live.fr';
  UPDATE subject_chapters c SET title='Construire son exposé (nouveau format du bac 2027)', updated_at=now() FROM subject_themes t
   WHERE c.theme_id=t.id AND t.subject_id='grand-oral|Terminale' AND c.title='Construire un plan d''exposé en cinq minutes';
  UPDATE subject_chapters c SET description = coalesce(nullif(c.description,'')||E'\n\n','') ||
   E'⚠️ Ce qui change au bac 2027 (note de service du 10 septembre 2026, BO spécial n°4 du 17 septembre 2026) :\n'||
   E'• coefficient 8 en voie générale (au lieu de 10) et 12 en voie technologique (au lieu de 14) ;\n'||
   E'• l''épreuve se déroule en deux temps de 10 minutes ;\n'||
   E'• il n''y a plus de temps consacré au projet d''orientation.\n'||
   E'À vérifier sur le texte officiel (eduscol.education.gouv.fr, rubrique Grand oral) : infos tirées de sources secondaires concordantes.', updated_at=now()
   FROM subject_themes t WHERE c.theme_id=t.id AND t.subject_id='grand-oral|Terminale' AND c.title='Le déroulement du Grand oral';
  SELECT id INTO hid FROM subject_themes WHERE subject_id='grand-oral|Terminale' AND title='Hors programme cette année (ancien programme)';
  IF hid IS NULL THEN
    INSERT INTO subject_themes(subject_id,title,order_index,created_by) VALUES ('grand-oral|Terminale','Hors programme cette année (ancien programme)',2000,admin) RETURNING id INTO hid;
  END IF;
  UPDATE subject_chapters c SET theme_id=hid, description='Retiré au bac 2027 : le projet d''orientation n''est plus évalué au Grand oral.', updated_at=now()
   FROM subject_themes t WHERE c.theme_id=t.id AND t.subject_id='grand-oral|Terminale' AND c.title='Présenter son projet d''orientation';
END $do$;
