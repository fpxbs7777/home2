import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, MessageCircle, X, ArrowRight } from "lucide-react";
import { requestOpenChat } from "@/lib/chat-open";

type EstadoSugerencias = "inactivo" | "cargando" | "lista" | "error";

/** Cache en memoria: no repetimos llamadas al agente por sección en la misma visita. */
const CACHE = new Map<string, { preguntas: string[]; hash: string }>();

function hashRapido(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

const ANCHO_CARD = 256;

export function SugerenciasSeccion({
  id,
  label,
  contenido,
  fallbackPregunta,
  children,
  className = "",
}: {
  id: string;
  label: string;
  contenido: string;
  fallbackPregunta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const dentroRef = useRef(false);
  const posRef = useRef<{ x: number; y: number }>({ x: 16, y: 96 });
  const timerEnter = useRef<number | null>(null);
  const timerLeave = useRef<number | null>(null);
  const iconoRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [iconoVisible, setIconoVisible] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoSugerencias>("inactivo");
  const [preguntas, setPreguntas] = useState<string[]>([]);

  async function posicionarIcono() {
    if (iconoRef.current) {
      const x = Math.max(8, Math.min(posRef.current.x + 14, window.innerWidth - 56));
      const y = Math.max(76, posRef.current.y - 16);
      iconoRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  async function posicionarCard() {
    if (cardRef.current) {
      const x = Math.max(8, Math.min(posRef.current.x + 14, window.innerWidth - ANCHO_CARD - 12));
      const y = Math.min(posRef.current.y + 48, window.innerHeight - 260);
      cardRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function entrar() {
    dentroRef.current = true;
    if (timerLeave.current) window.clearTimeout(timerLeave.current);
    if (timerEnter.current) window.clearTimeout(timerEnter.current);
    timerEnter.current = window.setTimeout(() => {
      if (dentroRef.current) {
        setIconoVisible(true);
        requestAnimationFrame(() => posicionarIcono());
      }
    }, 200);
  }

  const salir = () => {
    dentroRef.current = false;
    if (timerEnter.current) window.clearTimeout(timerEnter.current);
    if (timerLeave.current) window.clearTimeout(timerLeave.current);
    timerLeave.current = window.setTimeout(() => {
      if (!dentroRef.current) {
        setIconoVisible(false);
        setAbierto(false);
        setEstado("inactivo");
        setPreguntas([]);
      }
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (timerEnter.current) window.clearTimeout(timerEnter.current);
      if (timerLeave.current) window.clearTimeout(timerLeave.current);
    };
  }, []);

  useEffect(() => {
    if (!abierto || estado !== "inactivo") return;
    const h = hashRapido(contenido);
    const cacheado = CACHE.get(id);
    if (cacheado && cacheado.hash === h) {
      setPreguntas(cacheado.preguntas);
      setEstado("lista");
      return;
    }
    setEstado("cargando");
    const controller = new AbortController();
    let cancelado = false;
    void (async () => {
      try {
        const res = await fetch("/api/sugerencias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seccion: label, contenido }),
          signal: controller.signal,
        });
        const data = (await res.json()) as { preguntas?: string[] };
        if (cancelado) return;
        const lista = Array.isArray(data.preguntas) ? data.preguntas.slice(0, 3) : [];
        if (lista.length) CACHE.set(id, { preguntas: lista, hash: h });
        setPreguntas(lista);
        setEstado(lista.length ? "lista" : "error");
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();
    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [abierto, estado, id, label, contenido]);

  function alternar() {
    setAbierto((v) => {
      const nuevo = !v;
      if (nuevo) {
        setEstado((prev) => (prev === "inactivo" ? "cargando" : prev));
        requestAnimationFrame(() => posicionarCard());
      }
      return nuevo;
    });
  }

  function preguntar(p: string) {
    requestOpenChat(p);
    setAbierto(false);
    setEstado("inactivo");
    setPreguntas([]);
  }

  const mostrarIcono = iconoVisible && !abierto;

  return (
    <div
      className={className}
      onMouseEnter={entrar}
      onMouseLeave={salir}
      onMouseMove={(e) => {
        posRef.current = { x: e.clientX, y: e.clientY };
      }}
    >
      {children}

      {mostrarIcono && (
        <button
          ref={iconoRef}
          type="button"
          onClick={alternar}
          aria-label={`IA sugiere preguntas sobre ${label}`}
          title={`IA sugiere preguntas sobre ${label}`}
          style={{ position: "fixed", left: 0, top: 0, transform: "translate(16px, 96px)" }}
          className="z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-[#0c1222f2] text-gold shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_0_1px_rgba(201,162,39,0.25)] backdrop-blur-xl transition-[transform] hover:scale-110"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}

      {abierto && (
        <div
          ref={cardRef}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: "translate(16px, 144px)",
            width: ANCHO_CARD,
          }}
          className="z-[70] overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-[#0c1222f8] to-[#070b16fa] shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gold/20 bg-gold/[0.07] px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gold">
              <Sparkles className="h-3 w-3" />
              Preguntas sugeridas
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar sugerencias"
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {estado === "cargando" && (
              <div className="flex items-center gap-2 px-2 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <p className="text-[11.5px] leading-snug text-muted-foreground">
                  IA razonando sobre esta sección…
                </p>
              </div>
            )}

            {estado === "error" && (
              <div className="px-2 py-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  No pude generar sugerencias ahora. Probá preguntar directo:
                </p>
                {fallbackPregunta && (
                  <button
                    type="button"
                    onClick={() => preguntar(fallbackPregunta)}
                    className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-2 text-left text-[12px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <MessageCircle className="h-3.5 w-3.5 flex-none text-gold" />
                    <span className="min-w-0 flex-1">Hablar con IA</span>
                    <ArrowRight className="h-3 w-3 flex-none text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {estado === "lista" && (
              <ul className="space-y-0.5">
                {preguntas.map((p, i) => (
                  <li key={`${p}-${i}`}>
                    <button
                      type="button"
                      onClick={() => preguntar(p)}
                      className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-primary/[0.08]"
                    >
                      <MessageCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-gold transition-colors group-hover:text-primary" />
                      <span className="min-w-0 flex-1 text-[12px] leading-snug text-foreground/95">
                        {p}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}