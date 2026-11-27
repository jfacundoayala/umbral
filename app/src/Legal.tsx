// Términos y privacidad: el texto original está en docs/; antes de compilar se copia a src/legal/.
import type { ReactNode } from "react";
import privacidad from "./legal/privacidad.md?raw";
import terminos from "./legal/terminos.md?raw";

/** Negritas y enlaces dentro de una línea. */
function enLinea(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let desde = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > desde) partes.push(texto.slice(desde, m.index));
    if (m[1]) partes.push(<b key={m.index}>{m[1]}</b>);
    else
      partes.push(
        /^https?:\/\//.test(m[3]) ? (
          <a key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>
        ) : (
          <span key={m.index}>{m[2]}</span>
        ),
      );
    desde = re.lastIndex;
  }
  if (desde < texto.length) partes.push(texto.slice(desde));
  return partes;
}

/** Markdown simple: títulos, párrafos, listas y tablas. Alcanza para estos dos documentos. */
function Markdown({ texto }: { texto: string }) {
  const bloques: ReactNode[] = [];
  const lineas = texto.replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const titulo = l.match(/^(#{1,3})\s+(.*)/);
    if (titulo) {
      const n = titulo[1].length;
      bloques.push(n === 1 ? <h2 key={i}>{enLinea(titulo[2])}</h2> : <h3 key={i}>{enLinea(titulo[2])}</h3>);
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordenada = /^\s*\d+\./.test(l);
      const items: string[] = [];
      while (i < lineas.length && /^\s*([-*]|\d+\.)\s/.test(lineas[i])) items.push(lineas[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const lis = items.map((t, k) => <li key={k}>{enLinea(t)}</li>);
      bloques.push(ordenada ? <ol key={i}>{lis}</ol> : <ul key={i}>{lis}</ul>);
      continue;
    }
    if (l.trim().startsWith("|")) {
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith("|")) {
        const celdas = lineas[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!celdas.every((c) => /^:?-+:?$/.test(c))) filas.push(celdas);
      }
      const [cabeza, ...cuerpo] = filas;
      bloques.push(
        <p className="tabla-pista" key={`p${i}`} aria-hidden="true">Deslizá la tabla hacia el costado para ver todo →</p>,
        // Se puede enfocar para moverla con las flechas del teclado.
        <div className="tabla" key={i} tabIndex={0} role="region" aria-label="Tabla (se desliza hacia el costado)">
          <table>
            <thead><tr>{cabeza.map((c, k) => <th key={k}>{enLinea(c)}</th>)}</tr></thead>
            <tbody>{cuerpo.map((f, k) => <tr key={k}>{f.map((c, j) => <td key={j}>{enLinea(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i].trim() && !/^(#|\s*([-*]|\d+\.)\s|\s*\|)/.test(lineas[i])) parrafo.push(lineas[i++].trim());
    bloques.push(<p key={i}>{enLinea(parrafo.join(" "))}</p>);
  }
  return <>{bloques}</>;
}

export function Legal({ cual }: { cual: "terminos" | "privacidad" }) {
  return (
    <section className="hoja angosta legal">
      <p className="rotulo">{cual === "terminos" ? "Términos" : "Privacidad"}</p>
      <Markdown texto={cual === "terminos" ? terminos : privacidad} />
    </section>
  );
}
