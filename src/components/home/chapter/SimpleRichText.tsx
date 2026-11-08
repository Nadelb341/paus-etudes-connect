import { Fragment, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Heading, List, Quote } from "lucide-react";

/**
 * Texte enrichi simple, sans HTML (aucun risque d'injection) :
 *   « # Titre » / « ## Sous-titre », « - liste », « 1. liste numérotée », « **gras** »,
 *   « > encadré » (Définition, Propriété, Méthode… : lignes consécutives regroupées).
 */
const renderInline = (line: string) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <Fragment key={i}>{p}</Fragment>
  );
};

export const RichTextView = ({ text, color }: { text: string; color?: string }) => {
  const lines = text.split("\n");
  const blocks: JSX.Element[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let box: string[] | null = null;
  const flushBox = (key: string) => {
    if (!box) return;
    blocks.push(
      <div key={key} className="rounded-lg border-l-4 px-3 py-2 my-1 space-y-0.5 bg-secondary/40" style={{ borderColor: color || "hsl(var(--primary))" }}>
        {box.map((l, i) => <p key={i}>{renderInline(l)}</p>)}
      </div>
    );
    box = null;
  };
  const flush = (key: string) => {
    if (!list) return;
    const items = list.items.map((l, i) => <li key={i}>{renderInline(l)}</li>);
    blocks.push(list.ordered
      ? <ol key={key} className="list-decimal pl-5 space-y-0.5">{items}</ol>
      : <ul key={key} className="list-disc pl-5 space-y-0.5">{items}</ul>);
    list = null;
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flush(`l${idx}`);
      if (!box) box = [];
      if (quote[1].trim() !== "") box.push(quote[1]);
      return;
    }
    flushBox(`b${idx}`);
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered && !bullet;
      if (list && list.ordered !== ordered) flush(`l${idx}`);
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      return;
    }
    flush(`l${idx}`);
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? "font-bold text-base mt-3" : level === 2 ? "font-semibold text-[15px] mt-3" : "font-semibold text-sm mt-2";
      blocks.push(<p key={idx} className={cls} style={{ color }}>{renderInline(h[2])}</p>);
    } else if (line.trim() === "") {
      blocks.push(<div key={idx} className="h-2" />);
    } else {
      blocks.push(<p key={idx}>{renderInline(line)}</p>);
    }
  });
  flush("end");
  flushBox("bend");
  return <div className="text-sm text-foreground space-y-1 [overflow-wrap:anywhere]">{blocks}</div>;
};

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export const RichTextEditor = ({ value, onChange, placeholder, rows = 8 }: EditorProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after = "") => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = value.slice(start, end) || "texte";
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); });
  };

  const btn = "flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-secondary/50";
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => wrap("**", "**")}><Bold size={12} />Gras</button>
        <button type="button" className={btn} onClick={() => prefixLine("# ")}><Heading size={12} />Titre</button>
        <button type="button" className={btn} onClick={() => prefixLine("- ")}><List size={12} />Liste</button>
        <button type="button" className={btn} onClick={() => prefixLine("> ")}><Quote size={12} />Encadré</button>
      </div>
      <Textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
    </div>
  );
};
