// Dibujo de una obra y sus huellas en 3D: la obra en el centro y cada generación en una cáscara esférica
// más grande. Cada rama ocupa un ángulo según cuántas hojas tiene (como la maqueta, web/app.html) y además
// sube o baja un poco, siempre igual para el mismo id. Se gira arrastrando, con las flechas o solo, despacio.
// Sin librerías: las posiciones se rotan y se proyectan en perspectiva dentro del mismo SVG.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { urlFoto, type Huella } from "./base";
import "./Constelacion.css";

type Punto = { id: string; x: number; y: number; z: number; padre: string | null; nivel: number; desc: number };
type Giro = { yaw: number; pitch: number };
type Vec = { x: number; y: number; z: number };

/** Radio de cada generación: la obra en el centro y cada continuación en la cáscara siguiente. */
const ORBITAS = [112, 204, 296, 388, 480, 572];
const radioDe = (nivel: number) => (nivel ? ORBITAS[nivel - 1] ?? ORBITAS[ORBITAS.length - 1] + (nivel - ORBITAS.length) * 92 : 0);

/** Inclinación con la que se mira al principio: los anillos se ven como elipses. */
const INCLINACION = 0.42;
/** Vuelta automática, en radianes por segundo. */
const VELOCIDAD_SOLA = 0.085;
/** Cuánto espera quieta después de que alguien la tocó antes de volver a girar sola. */
const ESPERA_MS = 7000;
/** Cuánto gira por cada píxel arrastrado. */
const POR_PIXEL = 0.0085;

/** Número fijo entre 0 y 1 para cada id: el dibujo es siempre el mismo, pero no queda en línea recta. */
function azarDe(id: string) {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 1_000_003;
  return s / 1_000_003;
}

function ubicar(obra: Huella, huellas: Huella[]): Punto[] {
  const hijos = new Map<string, Huella[]>();
  for (const h of huellas) if (h.padre) hijos.set(h.padre, [...(hijos.get(h.padre) ?? []), h]);
  const hojas = (id: string): number => {
    const hs = hijos.get(id) ?? [];
    return hs.length ? hs.reduce((n, h) => n + hojas(h.id), 0) : 1;
  };
  const descendientes = (id: string): number => (hijos.get(id) ?? []).reduce((n, h) => n + 1 + descendientes(h.id), 0);
  const salida: Punto[] = [];
  // Cada rama ocupa un sector según cuántas hojas tiene. Dentro de su sector, cada huella se corre un poco
  // (siempre igual para el mismo id): así una cadena de continuaciones dibuja una figura y no una línea.
  // La altura (elevación) sigue a la del padre con un desvío propio: las ramas suben o bajan juntas.
  const paso = (id: string, desde: number, hasta: number, nivel: number, padre: string | null, elevPadre: number) => {
    const ancho = hasta - desde;
    const corrimiento = nivel ? (azarDe(id) - 0.5) * Math.min(ancho * 0.7, 1.1) : 0;
    const ang = (desde + hasta) / 2 + corrimiento;
    const elev = nivel ? Math.max(-1.05, Math.min(1.05, elevPadre * 0.65 + (azarDe(`${id}·alto`) - 0.5) * 1.3)) : 0;
    const radio = radioDe(nivel);
    salida.push({
      id,
      x: Math.cos(elev) * Math.cos(ang) * radio,
      y: Math.sin(elev) * radio,
      z: Math.cos(elev) * Math.sin(ang) * radio,
      padre,
      nivel,
      desc: descendientes(id),
    });
    // Los hijos se reparten alrededor de donde quedó el padre, no del centro del sector.
    const mitad = nivel ? Math.min(ancho, Math.PI * 0.9) / 2 : Math.PI;
    let a = ang - mitad;
    const total = hojas(id);
    for (const h of hijos.get(id) ?? []) {
      const parte = (2 * mitad * hojas(h.id)) / total;
      paso(h.id, a, a + parte, nivel + 1, id, elev);
      a += parte;
    }
  };
  // La primera rama arranca en un ángulo distinto para cada obra.
  const inicio = -Math.PI / 2 + (azarDe(obra.id) - 0.5) * Math.PI;
  paso(obra.id, inicio, inicio + Math.PI * 2, 0, null, 0);
  return salida;
}

/** Gira un punto (primero alrededor del eje vertical, después se inclina) y lo proyecta en perspectiva.
 *  `z` positivo: más cerca de quien mira. `f`: cuánto se agranda por estar cerca. */
function proyectar(p: Vec, g: Giro, distancia: number) {
  const cy = Math.cos(g.yaw), sy = Math.sin(g.yaw), cp = Math.cos(g.pitch), sp = Math.sin(g.pitch);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const f = distancia / (distancia - z2);
  return { sx: x1 * f, sy: -y2 * f, z: z2, f };
}

/** Número pseudoazaroso fijo para cada obra: el fondo no cambia entre visitas. */
function semilla(texto: string) {
  let s = 7;
  for (const c of texto) s = (s * 31 + c.charCodeAt(0)) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Ondas de líneas finas de la identidad, quietas abajo del dibujo. Solo decoran. */
function useOndas(alcance: number) {
  return useMemo(() => {
    const k = alcance / 300;
    return Array.from({ length: 22 }, (_, i) => {
      let d = "";
      for (let x = -alcance * 1.6; x <= alcance * 1.6; x += alcance / 40) {
        const y = alcance * 0.7 - i * 5.5 * k + Math.sin(x / (95 * k) + i * 0.12) * 30 * k + Math.sin(x / (36 * k)) * 4 * k - x * 0.14;
        d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      return d;
    });
  }, [alcance]);
}

/** Puntitos sueltos en una esfera grande: giran con todo y dan la sensación de profundidad. */
function useAstros(radio: number, id: string) {
  return useMemo(() => {
    const az = semilla(id);
    return Array.from({ length: 64 }, () => {
      const u = az() * 2 - 1;
      const t = az() * Math.PI * 2;
      const r = radio * (0.55 + az() * 0.45);
      const s = Math.sqrt(1 - u * u);
      return { x: r * s * Math.cos(t), y: r * u, z: r * s * Math.sin(t), r: az() < 0.15 ? 2.2 : 1, o: 0.25 + az() * 0.45 };
    });
  }, [radio, id]);
}

/** Anillo de radio `r` (en el plano horizontal, o vertical si `meridiano`) ya girado y proyectado. */
function anillo(r: number, g: Giro, distancia: number, meridiano = false) {
  let d = "";
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const p = meridiano ? { x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 } : { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r };
    const q = proyectar(p, g, distancia);
    d += `${i ? "L" : "M"}${q.sx.toFixed(1)} ${q.sy.toFixed(1)} `;
  }
  return d;
}

/** Ícono de la obra según lo que tiene: audio, foto o solo texto. */
function Icono({ h }: { h: Huella }): ReactNode {
  if (h.audio_ruta)
    return (
      <g className="icono">
        {[5, 10, 15, 9, 4].map((alto, i) => <line key={i} className={i === 2 ? "acento" : ""} x1={-8 + i * 4} x2={-8 + i * 4} y1={-alto / 2} y2={alto / 2} />)}
      </g>
    );
  if (h.foto_ruta)
    return (
      <g className="icono">
        <rect x={-11} y={-8} width={22} height={16} />
        <path d="M-9 6 L-3 -1 L2 4 L5 1 L9 6" />
        <circle className="acento lleno" cx={4} cy={-3.5} r={1.6} />
      </g>
    );
  return (
    <g className="icono">
      <path d="M0 -6 C-4 -9 -9 -9 -11 -7 V8 C-9 6 -4 6 0 9 C4 6 9 6 11 8 V-7 C9 -9 4 -9 0 -6 Z M0 -6 V9" />
    </g>
  );
}

/** Escucha una consulta de medios (pantalla angosta, menos movimiento). */
function useConsulta(consulta: string) {
  const [si, setSi] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const cambio = () => setSi(m.matches);
    m.addEventListener("change", cambio);
    return () => m.removeEventListener("change", cambio);
  }, [consulta]);
  return si;
}

/** Corta un texto en unas `max` letras sin partir palabras. */
function recortar(texto: string, max: number) {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, "")}…`;
}

/** Parte un texto en renglones de hasta `ancho` letras. */
function renglones(texto: string, ancho: number) {
  const salida: string[] = [];
  let linea = "";
  for (const palabra of texto.split(" ")) {
    if (linea && (linea + " " + palabra).length > ancho) {
      salida.push(linea);
      linea = palabra;
    } else linea = linea ? `${linea} ${palabra}` : palabra;
  }
  if (linea) salida.push(linea);
  return salida;
}

/** `invitada`: la obra la pagó el fondo de una sala (sello de presencia): el círculo lleva un aro de puntos alrededor. */
export default function Constelacion({ obra, huellas, elegida, elegir, invitada = false }: { obra: Huella; huellas: Huella[]; elegida: string; elegir: (id: string) => void; invitada?: boolean }) {
  const puntos = useMemo(() => ubicar(obra, huellas), [obra, huellas]);
  const porId = useMemo(() => new Map([obra, ...huellas].map((h) => [h.id, h])), [obra, huellas]);
  const angosta = useConsulta("(max-width: 560px)");
  const reducida = useConsulta("(prefers-reduced-motion: reduce)");
  const base = angosta ? 190 : 300;
  const rMax = Math.max(0, ...puntos.map((p) => radioDe(p.nivel)));
  const distancia = Math.max(rMax, base) * 3.4;
  const alcance = Math.max(base * 0.9, rMax * 0.98 + 46);
  // Si la constelación crece, el dibujo se achica: los puntos y los nombres crecen (hasta el doble) para que se lean y se puedan tocar.
  const k = Math.min(2, alcance / base);
  const ondas = useOndas(alcance);
  const astros = useAstros(alcance * 0.95, obra.id);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const [giro, setGiro] = useState<Giro>({ yaw: 0, pitch: INCLINACION });
  const [mirando, setMirando] = useState<string | null>(null);
  const [agarrada, setAgarrada] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const giroRef = useRef(giro);
  const vel = useRef({ yaw: 0, pitch: 0 });
  const arrastre = useRef<{ id: number; x0: number; y0: number; x: number; y: number; t: number; movido: boolean } | null>(null);
  /** Hubo arrastre desde el último pointerdown: el click que viene no elige. */
  const arrastro = useRef(false);
  const ultimoToque = useRef(-Infinity);
  const visible = useRef(true);
  const quieta = useRef(reducida);
  const cuadro = useRef<number | null>(null);
  const espera = useRef<number | null>(null);
  const arrancar = useRef<() => void>(() => {});

  const mover = (g: Giro) => {
    const nuevo = { yaw: g.yaw, pitch: Math.max(-1.25, Math.min(1.25, g.pitch)) };
    giroRef.current = nuevo;
    setGiro(nuevo);
  };

  // El bucle de animación: solo corre mientras hay algo girando (inercia o vuelta sola) y el dibujo se ve.
  useEffect(() => {
    quieta.current = reducida;
    let antes = 0;
    const sola = () => !quieta.current && !arrastre.current && performance.now() - ultimoToque.current > ESPERA_MS;
    const paso = (t: number) => {
      const dt = antes ? Math.min(0.05, (t - antes) / 1000) : 1 / 60;
      antes = t;
      const g = { ...giroRef.current };
      const v = vel.current;
      let sigue = false;
      if (!arrastre.current && Math.abs(v.yaw) + Math.abs(v.pitch) > 0.01) {
        g.yaw += v.yaw * dt;
        g.pitch += v.pitch * dt;
        const freno = Math.exp(-dt * 3.4);
        v.yaw *= freno;
        v.pitch *= freno;
        sigue = true;
      } else {
        v.yaw = v.pitch = 0;
      }
      if (sola()) {
        g.yaw += VELOCIDAD_SOLA * dt;
        g.pitch += (INCLINACION - g.pitch) * Math.min(1, dt * 0.4);
        sigue = true;
      }
      if (sigue) mover(g);
      cuadro.current = sigue && visible.current ? requestAnimationFrame(paso) : null;
      if (!cuadro.current) antes = 0;
    };
    arrancar.current = () => {
      if (cuadro.current === null && visible.current) {
        antes = 0;
        cuadro.current = requestAnimationFrame(paso);
      }
    };
    const frenar = () => {
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
      cuadro.current = null;
    };
    const ver = (enPantalla: boolean) => {
      visible.current = enPantalla && !document.hidden;
      if (visible.current) arrancar.current();
      else frenar();
    };
    let enPantalla = true;
    const obs = typeof IntersectionObserver !== "undefined" && svg.current
      ? new IntersectionObserver(([e]) => { enPantalla = e.isIntersecting; ver(enPantalla); })
      : null;
    if (obs && svg.current) obs.observe(svg.current);
    const pestaña = () => ver(enPantalla);
    document.addEventListener("visibilitychange", pestaña);
    arrancar.current();
    return () => {
      frenar();
      obs?.disconnect();
      document.removeEventListener("visibilitychange", pestaña);
      if (espera.current !== null) clearTimeout(espera.current);
    };
  }, [reducida]);

  /** Alguien tocó: se frena la vuelta sola y vuelve cuando pasa un rato sin que nadie toque. */
  const tocaron = () => {
    ultimoToque.current = performance.now();
    if (espera.current !== null) clearTimeout(espera.current);
    if (!quieta.current) espera.current = window.setTimeout(() => arrancar.current(), ESPERA_MS + 50);
  };

  const alApretar = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    arrastre.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp, movido: false };
    arrastro.current = false;
    vel.current = { yaw: 0, pitch: 0 };
    tocaron();
  };
  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    if (!a.movido) {
      if (Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 6) return;
      a.movido = true;
      arrastro.current = true;
      setAgarrada(true);
      try {
        svg.current?.setPointerCapture(e.pointerId);
      } catch {
        // Algunos navegadores no dejan capturar ciertos punteros: el giro sigue igual mientras esté adentro.
      }
    }
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    const dt = Math.max(1, e.timeStamp - a.t) / 1000;
    a.x = e.clientX;
    a.y = e.clientY;
    a.t = e.timeStamp;
    const g = giroRef.current;
    mover({ yaw: g.yaw + dx * POR_PIXEL, pitch: g.pitch + dy * POR_PIXEL });
    // Velocidad suavizada, para la inercia al soltar.
    const v = vel.current;
    v.yaw = v.yaw * 0.6 + ((dx * POR_PIXEL) / dt) * 0.4;
    v.pitch = v.pitch * 0.6 + ((dy * POR_PIXEL) / dt) * 0.4;
  };
  const alSoltar = (e: PointerEvent<SVGSVGElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    arrastre.current = null;
    setAgarrada(false);
    if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
    // Si se quedó quieto antes de soltar, no hay inercia.
    if (!a.movido || quieta.current || e.timeStamp - a.t > 90) vel.current = { yaw: 0, pitch: 0 };
    else {
      const v = vel.current;
      v.yaw = Math.max(-4, Math.min(4, v.yaw));
      v.pitch = Math.max(-3, Math.min(3, v.pitch));
    }
    tocaron();
    arrancar.current();
  };
  const alTeclear = (e: KeyboardEvent<SVGSVGElement>) => {
    const paso = 0.17;
    const g = giroRef.current;
    const cambio: Record<string, Giro> = {
      ArrowLeft: { yaw: g.yaw - paso, pitch: g.pitch },
      ArrowRight: { yaw: g.yaw + paso, pitch: g.pitch },
      ArrowUp: { yaw: g.yaw, pitch: g.pitch - paso },
      ArrowDown: { yaw: g.yaw, pitch: g.pitch + paso },
    };
    if (!cambio[e.key]) return;
    e.preventDefault();
    vel.current = { yaw: 0, pitch: 0 };
    tocaron();
    mover(cambio[e.key]);
  };

  // Todo proyectado con el giro actual. Lo de atrás se dibuja primero; la obra siempre va al frente.
  const vista = puntos.map((p) => ({ p, ...proyectar(p, giro, distancia) }));
  const enVista = new Map(vista.map((v) => [v.p.id, v]));
  const hondo = Math.max(rMax, 1);
  const cercania = (z: number) => Math.max(0, Math.min(1, (z + hondo) / (2 * hondo)));
  const centro = vista.find((v) => !v.p.nivel)!;
  const resto = vista.filter((v) => v.p.nivel).sort((a, b) => a.z - b.z);
  const anillos = ORBITAS.filter((r) => r <= rMax + 1);
  const astrosVista = astros.map((a) => ({ a, ...proyectar(a, giro, distancia) })).sort((a, b) => a.z - b.z);

  const marcada = mirando ?? (elegida !== obra.id ? elegida : null);

  const dibujarPunto = ({ p, sx, sy, z, f }: (typeof vista)[number]) => {
    const h = porId.get(p.id)!;
    const retirada = h.estado === "retirada";
    const nombre = retirada ? "Retirada" : (h.nombre ?? "").split(" ")[0];
    const sel = p.id === elegida;
    const clase = ["punto", p.nivel ? "" : "raiz", retirada ? "retirada" : "", sel ? "sel" : ""].join(" ");
    // Más cerca: más grande y más nítida. La obra queda siempre igual.
    const esc = p.nivel ? f : 1;
    const opacidad = p.nivel ? (sel || p.id === mirando ? 1 : 0.32 + 0.68 * cercania(z)) : 1;
    const rNucleo = p.nivel ? 11 + Math.min(8, p.desc * 2.5) : 31;
    return (
      <g
        key={p.id}
        className={clase}
        transform={`translate(${sx.toFixed(2)} ${sy.toFixed(2)}) scale(${(esc * k).toFixed(3)})`}
        opacity={opacidad}
        tabIndex={0}
        role="button"
        aria-label={p.nivel ? `Huella de ${nombre}` : invitada ? "La obra, invitada por una sala" : "La obra"}
        aria-pressed={sel}
        onClick={() => {
          if (arrastro.current) return;
          elegir(p.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            elegir(p.id);
          }
        }}
        onPointerEnter={() => setMirando(p.id)}
        onPointerLeave={() => setMirando((m) => (m === p.id ? null : m))}
        onFocus={() => setMirando(p.id)}
        onBlur={() => setMirando((m) => (m === p.id ? null : m))}
      >
        {!p.nivel && invitada && <circle className="sello-aro" r={42} />}
        <circle className="toque" r={p.nivel ? 26 : 44} />
        {p.nivel ? (
          <>
            {/* Más grande y con centro azul cuanto más la continuaron. */}
            <circle className="nucleo" r={rNucleo} />
            {p.desc > 0 && <circle className="semilla" r={3 + Math.min(4, p.desc)} />}
          </>
        ) : (
          <>
            <circle className="nucleo" r={31} />
            {h.foto_ruta && !retirada ? (
              <>
                <clipPath id={`${uid}-recorte`}>
                  <circle r={29} />
                </clipPath>
                <image
                  className="foto-obra"
                  href={urlFoto(h.foto_ruta)}
                  x={-29}
                  y={-29}
                  width={58}
                  height={58}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${uid}-recorte)`}
                />
              </>
            ) : (
              !retirada && <Icono h={h} />
            )}
          </>
        )}
        <text y={p.nivel ? 28 + Math.min(8, p.desc * 2.5) : invitada ? 62 : 50} style={{ fontSize: 10 }}>{p.nivel ? nombre : "Obra"}</text>
      </g>
    );
  };

  /** Rótulo con el nombre y el comienzo del texto de la huella que se mira (o de la elegida). */
  const rotulo = (() => {
    if (!marcada) return null;
    const v = enVista.get(marcada);
    const h = porId.get(marcada);
    if (!v || !h || agarrada) return null;
    const esObra = !v.p.nivel;
    const retirada = h.estado === "retirada";
    const titulo = retirada ? (esObra ? "Obra retirada" : "Huella retirada") : esObra ? h.titulo || "La obra" : h.nombre || "Sin nombre";
    const cuerpo = retirada ? "" : recortar(h.texto || (esObra ? h.descripcion ?? "" : ""), 60);
    const fs = 10.5 * k;
    const lineas = cuerpo ? renglones(cuerpo, 30) : [];
    const anchoLetra = fs * 0.54;
    const ancho = Math.max(titulo.length * fs * 0.62, ...lineas.map((l) => l.length * anchoLetra)) + 22 * k;
    const alto = 14 * k + fs * 1.35 + lineas.length * fs * 1.35 + (lineas.length ? 4 * k : 0);
    const radio = (esObra ? 44 : 20 + Math.min(8, v.p.desc * 2.5)) * k * (esObra ? 1 : v.f);
    let x = v.sx - ancho / 2;
    let y = v.sy - radio - 10 * k - alto;
    if (y < -alcance + 4) y = v.sy + radio + 22 * k;
    x = Math.max(-alcance + 4, Math.min(alcance - 4 - ancho, x));
    y = Math.max(-alcance + 4, Math.min(alcance - 4 - alto, y));
    return (
      <g className="rotulo-huella" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} aria-hidden="true">
        <rect width={ancho} height={alto} rx={2 * k} />
        <line className="filete" x1={11 * k} x2={11 * k + 18 * k} y1={0} y2={0} />
        <text className="titulo" x={11 * k} y={7 * k + fs * 1.05} style={{ fontSize: fs * 1.12 }}>{titulo}</text>
        {lineas.map((l, i) => (
          <text key={i} className="frase" x={11 * k} y={7 * k + fs * 1.05 + 4 * k + (i + 1) * fs * 1.35} style={{ fontSize: fs }}>{l}</text>
        ))}
      </g>
    );
  })();

  return (
    <svg
      ref={svg}
      className={`mapa mapa-3d${agarrada ? " agarrada" : ""}`}
      viewBox={`${-alcance} ${-alcance} ${alcance * 2} ${alcance * 2}`}
      role="group"
      aria-label="Constelación de huellas de la obra. Arrastrala o usá las flechas para girarla."
      tabIndex={0}
      onPointerDown={alApretar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onKeyDown={alTeclear}
    >
      <defs>
        <radialGradient id={`${uid}-brillo`}>
          <stop offset="0" stopColor="#2445C7" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#A1ACCB" stopOpacity="0.16" />
          <stop offset="1" stopColor="#A1ACCB" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="fondo" aria-hidden="true">
        {ondas.map((d, i) => <path key={i} className="onda" d={d} />)}
        {astrosVista.map(({ a, sx, sy, z, f }, i) => (
          <circle key={i} className="astro" cx={sx} cy={sy} r={a.r * f} opacity={a.o * (0.35 + 0.65 * cercania(z * (hondo / (alcance * 0.95))))} />
        ))}
        {rMax > 0 && <path className="meridiano" d={anillo(rMax, giro, distancia, true)} />}
        {anillos.map((r, i) => <path key={r} className="orbita" d={anillo(r, giro, distancia)} opacity={0.6 - i * 0.08} />)}
      </g>
      {vista.map(({ p, sx, sy, z }) => {
        const pa = p.padre ? enVista.get(p.padre) : null;
        if (!pa) return null;
        return <line key={`l${p.id}`} className="linea" x1={pa.sx} y1={pa.sy} x2={sx} y2={sy} opacity={0.3 + 0.6 * cercania((z + pa.z) / 2)} />;
      })}
      {resto.filter((v) => v.z < 0).map(dibujarPunto)}
      <circle className="brillo" r={92 * k} fill={`url(#${uid}-brillo)`} aria-hidden="true" />
      {resto.filter((v) => v.z >= 0).map(dibujarPunto)}
      {dibujarPunto(centro)}
      {rotulo}
      <text className="pista" x={0} y={alcance - 10 * k} style={{ fontSize: 9.5 * k }} aria-hidden="true">
        Arrastrá para girar
      </text>
    </svg>
  );
}
