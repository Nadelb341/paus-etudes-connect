"""Charge contenu/<niveau>/<matiere>.json dans la base (idempotent, n'écrase jamais le travail de Nadia).
Usage : python3 charger_contenu.py fichier.json sortie.sql   puis   supabase db query --linked -f sortie.sql"""
import json, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
payload = json.dumps(d, ensure_ascii=False)
sql = f"""DO $do$
DECLARE x jsonb; q jsonb; e jsonb; f jsonb; cid uuid; qid uuid; eid uuid; admin uuid; i int; n_ok int := 0; n_absent int := 0;
BEGIN
  SELECT id INTO admin FROM auth.users WHERE email='nad341@live.fr';
  FOR x IN SELECT * FROM jsonb_array_elements($J${payload}$J$::jsonb) LOOP
    SELECT c.id INTO cid FROM subject_chapters c JOIN subject_themes t ON t.id=c.theme_id
      WHERE t.subject_id=(x->>'subject')||'|'||(x->>'level') AND t.title=x->>'theme' AND c.title=x->>'chapter' LIMIT 1;
    IF cid IS NULL THEN n_absent := n_absent+1; RAISE NOTICE 'ABSENT: % | %', x->>'theme', x->>'chapter'; CONTINUE; END IF;
    n_ok := n_ok+1;
    UPDATE subject_chapters SET description=x->>'cours', updated_at=now() WHERE id=cid AND coalesce(description,'')='';
    UPDATE subject_chapters SET revision=x->>'revision', updated_at=now() WHERE id=cid AND coalesce(revision,'')='';
    IF NOT EXISTS (SELECT 1 FROM chapter_flashcards WHERE chapter_id=cid) THEN
      i := 0;
      FOR f IN SELECT * FROM jsonb_array_elements(coalesce(x->'flashcards','[]')) LOOP
        INSERT INTO chapter_flashcards(chapter_id,front,back,order_index,created_by) VALUES (cid,f->>'front',f->>'back',i,admin); i := i+1;
      END LOOP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM chapter_exercises WHERE chapter_id=cid) THEN
      i := 0;
      FOR e IN SELECT * FROM jsonb_array_elements(coalesce(x->'exercises','[]')) LOOP
        -- le corrigé va dans la table secrète (lisible par l'admin seule), jamais dans chapter_exercises
        INSERT INTO chapter_exercises(chapter_id,title,statement,difficulty,order_index,created_by)
          VALUES (cid,e->>'title',e->>'statement',greatest(1,least(3,coalesce((e->>'difficulty')::int,1))),i,admin) RETURNING id INTO eid;
        IF coalesce(e->>'solution','')<>'' THEN
          INSERT INTO chapter_exercise_secrets(exercise_id,solution) VALUES (eid,e->>'solution') ON CONFLICT (exercise_id) DO NOTHING;
        END IF;
        i := i+1;
      END LOOP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM quizzes WHERE subject_id=cid::text) AND jsonb_array_length(coalesce(x->'quiz','[]'))>0 THEN
      INSERT INTO quizzes(subject_id,title,created_by) VALUES (cid::text,'Quiz : '||(x->>'chapter'),admin) RETURNING id INTO qid;
      i := 0;
      FOR q IN SELECT * FROM jsonb_array_elements(x->'quiz') LOOP
        INSERT INTO quiz_questions(quiz_id,question,options,correct_option,explanation,order_index)
          VALUES (qid,q->>'question',ARRAY(SELECT jsonb_array_elements_text(q->'options')),coalesce((q->>'correct')::int,0),coalesce(q->>'explanation',''),i); i := i+1;
      END LOOP;
    END IF;
  END LOOP;
  RAISE NOTICE 'CHARGES=% ABSENTS=%', n_ok, n_absent;
END $do$;"""
open(out, "w").write(sql)
print(len(d), "chapitres dans le fichier")
