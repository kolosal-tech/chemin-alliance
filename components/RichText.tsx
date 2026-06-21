import React from "react";

/**
 * Rendu markdown léger et sûr - sans dépendance externe ni dangerouslySetInnerHTML.
 * Gère ce que produit le Coach IA : titres (#, ##, ###), gras **texte**,
 * listes à puces (* ou -), et paragraphes. Tout le reste est rendu en texte.
 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Découpe sur les segments **gras**.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyBase}-t${i}`}>{p}</React.Fragment>;
  });
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      const items = list;
      const k = key++;
      blocks.push(
        <ul key={`ul${k}`} className="my-1.5 ml-4 list-disc space-y-1">
          {items.map((it, i) => (
            <li key={i}>{renderInline(it, `li${k}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      const k = key++;
      blocks.push(
        <div key={`h${k}`} className="mb-1 mt-2.5 font-semibold first:mt-0">
          {renderInline(heading[2], `h${k}`)}
        </div>,
      );
      continue;
    }
    const bullet = line.match(/^[*-]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    const k = key++;
    blocks.push(
      <p key={`p${k}`} className="my-1 first:mt-0 last:mb-0">
        {renderInline(line, `p${k}`)}
      </p>,
    );
  }
  flushList();

  return <div className={className}>{blocks}</div>;
}
