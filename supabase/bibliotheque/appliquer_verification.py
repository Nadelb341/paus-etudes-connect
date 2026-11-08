import json,sys
src,out=sys.argv[1],sys.argv[2]
v=json.load(open(src))
payload=json.dumps(v,ensure_ascii=False)
sql=f"""DO $do$
DECLARE v jsonb := $J${payload}$J$::jsonb; x jsonb; c text; sid text; tid uuid; hid uuid; o int; admin uuid; cid uuid; urls text[]; descr text;
BEGIN
  SELECT id INTO admin FROM auth.users WHERE email='nad341@live.fr';
  -- ajouts
  FOR x IN SELECT * FROM jsonb_array_elements(coalesce(v->'add','[]')) LOOP
    sid := (x->>'subject')||'|'||(x->>'level');
    SELECT id INTO tid FROM subject_themes WHERE subject_id=sid AND title=x->>'theme' LIMIT 1;
    IF tid IS NULL THEN
      SELECT coalesce(max(order_index),-1)+1 INTO o FROM subject_themes WHERE subject_id=sid;
      INSERT INTO subject_themes(subject_id,title,order_index,created_by) VALUES (sid,x->>'theme',o,admin) RETURNING id INTO tid;
    END IF;
    FOR c IN SELECT * FROM jsonb_array_elements_text(x->'chapters') LOOP
      IF NOT EXISTS (SELECT 1 FROM subject_chapters WHERE theme_id=tid AND title=c) THEN
        SELECT coalesce(max(order_index),-1)+1 INTO o FROM subject_chapters WHERE theme_id=tid;
        INSERT INTO subject_chapters(subject_id,title,theme_id,order_index,created_by) VALUES (sid,c,tid,o,admin);
      END IF;
    END LOOP;
  END LOOP;
  -- corrections de titre
  FOR x IN SELECT * FROM jsonb_array_elements(coalesce(v->'rename','[]')) LOOP
    sid := (x->>'subject')||'|'||(x->>'level');
    UPDATE subject_chapters ch SET title=x->>'new', updated_at=now()
      FROM subject_themes t WHERE ch.theme_id=t.id AND t.subject_id=sid AND t.title=x->>'theme' AND ch.title=x->>'old';
  END LOOP;
  -- hors programme : rien n'est supprimé, le chapitre est rangé dans un thème « Hors programme cette année »
  FOR x IN SELECT * FROM jsonb_array_elements(coalesce(v->'remove','[]')) LOOP
    sid := (x->>'subject')||'|'||(x->>'level');
    SELECT id INTO hid FROM subject_themes WHERE subject_id=sid AND title='Hors programme cette année (ancien programme)' LIMIT 1;
    IF hid IS NULL THEN
      SELECT coalesce(max(order_index),-1)+1 INTO o FROM subject_themes WHERE subject_id=sid;
      INSERT INTO subject_themes(subject_id,title,order_index,created_by) VALUES (sid,'Hors programme cette année (ancien programme)',o+1000,admin) RETURNING id INTO hid;
    END IF;
    UPDATE subject_chapters ch SET theme_id=hid, description=coalesce(nullif(ch.description,''),'Retiré du programme officiel pour ce niveau : '||coalesce(x->>'raison','')), updated_at=now()
      FROM subject_themes t WHERE ch.theme_id=t.id AND t.subject_id=sid AND t.title=x->>'theme' AND ch.title=x->>'chapter'
      AND (ch.target_student_ids IS NULL);
  END LOOP;
  -- ressources officielles : un chapitre « Ressources officielles » par thème, liens dans « Liens & Vidéos »
  FOR x IN SELECT * FROM jsonb_array_elements(coalesce(v->'links','[]')) LOOP
    sid := (x->>'subject')||'|'||(x->>'level');
    SELECT id INTO tid FROM subject_themes WHERE subject_id=sid AND title=x->>'theme' LIMIT 1;
    CONTINUE WHEN tid IS NULL;
    SELECT id INTO cid FROM subject_chapters WHERE theme_id=tid AND title='📎 Ressources officielles' LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO subject_chapters(subject_id,title,theme_id,order_index,created_by,description,youtube_links)
        VALUES (sid,'📎 Ressources officielles',tid,-1,admin,'',ARRAY[]::text[]) RETURNING id INTO cid;
    END IF;
    UPDATE subject_chapters SET
      youtube_links = CASE WHEN x->>'url' = ANY(coalesce(youtube_links,'{{}}')) THEN youtube_links ELSE array_append(coalesce(youtube_links,'{{}}'), x->>'url') END,
      description = CASE WHEN position(x->>'url' in coalesce(description,''))>0 THEN description ELSE trim(both E'\\n' from coalesce(description,'')||E'\\n• '||(x->>'label')||' : '||(x->>'url')) END
      WHERE id=cid;
  END LOOP;
END $do$;
"""
open(out,'w').write(sql)
print({k:len(v.get(k,[])) for k in ['add','rename','remove','links']})
