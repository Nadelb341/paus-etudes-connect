import json,sys
src,out=sys.argv[1],sys.argv[2]
d=json.load(open(src))
payload=json.dumps(d,ensure_ascii=False).replace("$JSON$","")
sql=f"""DO $do$
DECLARE e jsonb; t jsonb; c text; sid text; tid uuid; tord int; cord int; admin uuid;
BEGIN
  SELECT id INTO admin FROM auth.users WHERE email='nad341@live.fr';
  FOR e IN SELECT * FROM jsonb_array_elements($JSON${payload}$JSON$::jsonb) LOOP
    sid := (e->>'subject')||'|'||(e->>'level');
    SELECT coalesce(max(order_index),-1) INTO tord FROM public.subject_themes WHERE subject_id=sid;
    FOR t IN SELECT * FROM jsonb_array_elements(e->'themes') LOOP
      SELECT id INTO tid FROM public.subject_themes WHERE subject_id=sid AND title=t->>'title' LIMIT 1;
      IF tid IS NULL THEN
        tord := tord+1;
        INSERT INTO public.subject_themes(subject_id,title,order_index,created_by) VALUES (sid,t->>'title',tord,admin) RETURNING id INTO tid;
      END IF;
      SELECT coalesce(max(order_index),-1) INTO cord FROM public.subject_chapters WHERE theme_id=tid;
      FOR c IN SELECT * FROM jsonb_array_elements_text(t->'chapters') LOOP
        IF NOT EXISTS (SELECT 1 FROM public.subject_chapters WHERE theme_id=tid AND title=c) THEN
          cord := cord+1;
          INSERT INTO public.subject_chapters(subject_id,title,theme_id,order_index,created_by) VALUES (sid,c,tid,cord,admin);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $do$;
"""
open(out,'w').write(sql)
print(len(d),"entrées")
