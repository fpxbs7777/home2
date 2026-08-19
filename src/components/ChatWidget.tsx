import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  Search,
  Minus,
  ChevronUp,
  TrendingUp,
  Newspaper,
  Calculator,
  GripVertical,
  BookOpen,
} from "lucide-react";
import { CHAT_OPEN_EVENT_NAME } from "@/lib/chat-open";
import {
  CATEGORIA_RAPIDEZ_LABEL,
  CATEGORIA_RAZONAMIENTO_LABEL,
  MODELO_POR_DEFECTO,
  obtenerModelo,
  obtenerModelosPorCategoria,
  type AgentModel,
} from "@/lib/model-registry";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WHATSAPP = "https://wa.me/541162355944";

const MODELOS_RAPIDEZ = obtenerModelosPorCategoria("rapidez");
const MODELOS_RAZONAMIENTO = obtenerModelosPorCategoria("razonamiento");

type Fuente = { dominio: string; url: string; title?: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Fuente[] };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Soy **NORTE**, asistente del mercado de capitales argentino. Respondo sobre instrumentos, riesgo y cotizaciones con material académico y fuentes oficiales — y te digo siempre de dónde saqué el dato.\n\nPodés arrancar por acá:\n- ¿Qué es una **obligación negociable** y qué riesgo tiene?\n- Diferencia entre **CEDEAR y ADR**\n- ¿Cómo verifico una **matrícula en la CNV**?\n- Señales típicas de una **estafa financiera**\n- ¿Cómo armo una **cartera en dólares**?\n\nSi el dato es de mercado, lo busco en fuentes reales y te muestro la fuente. Información general. No constituye recomendación de inversión.",
};

const SUGGESTIONS = [
  "¿Qué es una obligación negociable y qué riesgo tiene?",
  "¿Cuál es la diferencia entre CEDEAR y ADR?",
  "¿Cómo verifico una matrícula en la CNV?",
  "¿Cómo detecto una estafa financiera?",
  "¿Cómo armo una cartera en dólares?",
];

function isWhatsAppLink(url: string): boolean {
  return /wa\.me\/|whatsapp\//i.test(url);
}

function WhatsAppButton({ url, text }: { url: string; text?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribirle a Cintia por WhatsApp"
      title="Escribirle a Cintia por WhatsApp"
      className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#128C7E] hover:shadow-lg"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="sr-only">{text || "WhatsApp"}</span>
    </a>
  );
}

function LinkRenderer({
  href,
  children,
}: {
  href?: string | undefined;
  children: React.ReactNode;
}) {
  if (!href) return <span>{children}</span>;

  if (isWhatsAppLink(href)) {
    return <WhatsAppButton url={href} text={String(children)} />;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 640px)").matches,
  );
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(MODELO_POR_DEFECTO.id);
  const [modelInfo, setModelInfo] = useState<AgentModel>(MODELO_POR_DEFECTO);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [buscandoNoticias, setBuscandoNoticias] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [valorando, setValorando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, searching]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function startResize(e: React.PointerEvent<HTMLDivElement>, dir: "w" | "h" | "wh") {
    e.preventDefault();
    const startW = isDesktop ? (size?.w ?? 460) : window.innerWidth;
    const startH = size?.h ?? window.innerHeight;
    const startX = e.clientX;
    const startY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      let w = startW;
      let h = startH;
      if (dir === "w" || dir === "wh") {
        w = clamp(window.innerWidth - ev.clientX + 8, 320, window.innerWidth - 16);
      }
      if (dir === "h" || dir === "wh") {
        h = clamp(ev.clientY + 8, 320, window.innerHeight);
      }
      setSize({ w, h });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      dir === "h" ? "ns-resize" : dir === "w" ? "ew-resize" : "nwse-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function updateLast(patch: Partial<Msg>) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) next[next.length - 1] = { ...last, ...patch };
      return next;
    });
  }

  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string }>).detail;
      setOpen(true);
      setMinimized(false);
      if (detail?.question && detail.question.trim()) void sendRef.current(detail.question);
    };
    window.addEventListener(CHAT_OPEN_EVENT_NAME, handler);
    return () => window.removeEventListener(CHAT_OPEN_EVENT_NAME, handler);
  }, []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    const history = [
      ...messages.filter((m) => m !== WELCOME),
      { role: "user" as const, content: question },
    ].map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, model }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "sin respuesta");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let fuentes: Fuente[] = [];

      const handle = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let evt: { t?: string; v?: unknown; q?: string };
        try {
          evt = JSON.parse(trimmed);
        } catch {
          return;
        }
        if (evt.t === "status") {
          if (evt.v === "searching") {
            setSearching(evt.q ?? "");
            setConsultando(false);
            setBuscandoNoticias(false);
            setLeyendo(false);
            setValorando(false);
          } else if (evt.v === "mercado") {
            setConsultando(true);
            setSearching(null);
            setBuscandoNoticias(false);
            setLeyendo(false);
            setValorando(false);
          } else if (evt.v === "noticias") {
            setBuscandoNoticias(true);
            setSearching(null);
            setConsultando(false);
            setLeyendo(false);
            setValorando(false);
          } else if (evt.v === "base_conocimiento") {
            setLeyendo(true);
            setSearching(null);
            setConsultando(false);
            setBuscandoNoticias(false);
            setValorando(false);
          } else if (evt.v === "valoracion") {
            setValorando(true);
            setSearching(null);
            setConsultando(false);
            setBuscandoNoticias(false);
            setLeyendo(false);
          } else {
            setSearching(null);
            setConsultando(false);
            setBuscandoNoticias(false);
            setLeyendo(false);
            setValorando(false);
          }
        } else if (evt.t === "sources") {
          fuentes = [...fuentes, ...((evt.v as Fuente[]) ?? [])];
          updateLast({ sources: fuentes });
        } else if (evt.t === "text") {
          setSearching(null);
          setConsultando(false);
          setBuscandoNoticias(false);
          setLeyendo(false);
          setValorando(false);
          acc += String(evt.v ?? "");
          updateLast({ content: acc });
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handle);
      }
      if (buffer) handle(buffer);
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : "No pude responder ahora mismo.";
      updateLast({
        content: `${msg}\n\nPodés escribirle directo a Cintia por [WhatsApp](${WHATSAPP}).`,
      });
    } finally {
      setSearching(null);
      setConsultando(false);
      setBuscandoNoticias(false);
      setLeyendo(false);
      setValorando(false);
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          aria-label="Abrir asistente virtual"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm sm:hidden"
        />
      )}

      <aside
        style={
          open && !minimized && size && isDesktop
            ? { width: `${size.w}px`, height: `${size.h}px` }
            : undefined
        }
        className={`fixed right-0 z-40 flex flex-col border-border bg-background/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          minimized
            ? "bottom-0 h-16 w-full border-t sm:w-[460px] sm:rounded-t-2xl sm:border-l"
            : "top-0 h-[100dvh] w-full border-l sm:w-[460px]"
        } ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
      >
        {open && !minimized && isDesktop && (
          <div className="pointer-events-none absolute inset-0 z-30">
            <div
              onPointerDown={(e) => startResize(e, "w")}
              role="separator"
              aria-orientation="vertical"
              aria-label="Cambiar ancho del chat"
              className="pointer-events-auto absolute -left-2 top-1/2 h-24 w-4 -translate-y-1/2 cursor-ew-resize"
            >
              <div className="mx-auto flex h-full w-6 items-center justify-center rounded-r-full bg-border/20 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-primary/40 hover:text-primary-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
            </div>
            <div
              onPointerDown={(e) => startResize(e, "h")}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Cambiar alto del chat"
              className="pointer-events-auto absolute -bottom-2 left-0 w-full h-4 cursor-ns-resize"
            >
              <div className="mt-2 h-1 w-full rounded-full bg-border/0 transition-colors hover:bg-primary/40" />
            </div>
            <div
              onPointerDown={(e) => startResize(e, "wh")}
              aria-label="Cambiar tamaño del chat (lateral e inferior)"
              className="pointer-events-auto absolute -bottom-2 -left-2 h-8 w-8 cursor-nwse-resize"
            />
          </div>
        )}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-gold/60 bg-gradient-to-br from-[#0a0f1a] to-[#141b2e] font-display text-[15px] font-semibold text-gold shadow-[0_0_18px_rgba(201,162,39,0.35)]">
            N
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold">
              NORTE <span className="text-gold">·</span>{" "}
              <span className="text-muted-foreground">
                Asistente del mercado de capitales argentino
              </span>
            </p>
          </div>
          <button
            onClick={() => setMessages([WELCOME])}
            aria-label="Limpiar conversación"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMinimized((v) => !v);
            }}
            aria-label={minimized ? "Restaurar asistente" : "Minimizar asistente"}
            title={minimized ? "Restaurar" : "Minimizar"}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setMinimized(false);
            }}
            aria-label="Cerrar"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!minimized && (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground"
                        : "max-w-[92%] text-[13px] leading-relaxed text-foreground"
                    }
                  >
                    {m.role === "assistant" && !m.content ? (
                      <span className="text-muted-foreground">Escribiendo…</span>
                    ) : (
                      <div className="chat-md">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <LinkRenderer href={href}>{children}</LinkRenderer>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                      <p className="mt-2 border-t border-border pt-2 text-[10.5px] leading-snug text-muted-foreground">
                        Fuentes consultadas:{" "}
                        {m.sources.slice(0, 3).map((s, idx) => (
                          <span key={s.url}>
                            {idx > 0 && " · "}
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              {s.dominio}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {searching !== null && (
                <p className="flex items-center gap-2 text-[12px] text-primary">
                  <Search className="h-3.5 w-3.5 animate-pulse" />
                  Consultando fuentes{searching ? `: “${searching}”` : ""}…
                </p>
              )}
              {consultando && (
                <p className="flex items-center gap-2 text-[12px] text-primary">
                  <TrendingUp className="h-3.5 w-3.5 animate-pulse" />
                  Cotizando…
                </p>
              )}
              {buscandoNoticias && (
                <p className="flex items-center gap-2 text-[12px] text-primary">
                  <Newspaper className="h-3.5 w-3.5 animate-pulse" />
                  Buscando noticias…
                </p>
              )}
              {leyendo && (
                <p className="flex items-center gap-2 text-[12px] text-primary">
                  <BookOpen className="h-3.5 w-3.5 animate-pulse" />
                  Leyendo corpus académico…
                </p>
              )}
              {valorando && (
                <p className="flex items-center gap-2 text-[12px] text-primary">
                  <Calculator className="h-3.5 w-3.5 animate-pulse" />
                  Calculando valor intrínseco con datos reales y buscando noticias…
                </p>
              )}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      disabled={loading}
                      className="cursor-pointer rounded-full border border-primary/30 bg-primary/[0.07] px-3 py-1.5 text-[11.5px] text-primary transition-colors hover:border-primary hover:bg-primary/15 active:scale-[0.98]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="border-t border-border p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <Select
                  value={model}
                  onValueChange={(v) => {
                    setModel(v);
                    setModelInfo(obtenerModelo(v));
                  }}
                  disabled={loading}
                >
                  <SelectTrigger
                    aria-label="Modelo del asistente"
                    className="h-8 w-auto flex-none rounded-lg border-border/70 px-2.5 text-[11px] shadow-none focus:ring-primary/50"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[300px]">
                    <SelectGroup>
                      <SelectLabel className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        {CATEGORIA_RAPIDEZ_LABEL}
                      </SelectLabel>
                      {MODELOS_RAPIDEZ.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-[12px] leading-tight"
                          title={m.descripcion}
                        >
                          {m.nombre}
                          <span className="block truncate text-[10.5px] text-muted-foreground">
                            {m.editor} · {m.descripcion.slice(0, 60)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        {CATEGORIA_RAZONAMIENTO_LABEL}
                      </SelectLabel>
                      {MODELOS_RAZONAMIENTO.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-[12px] leading-tight"
                          title={m.descripcion}
                        >
                          {m.nombre}
                          <span className="block truncate text-[10.5px] text-muted-foreground">
                            {m.editor} · {m.descripcion.slice(0, 60)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="min-w-0 flex-1 truncate text-[10.5px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/70">{modelInfo.nombre}</span>
                  {" · "}
                  {modelInfo.descripcion}
                </p>
              </div>
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/60">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="Escribí tu consulta…"
                  className="max-h-28 flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Enviar"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10.5px] leading-snug text-muted-foreground">
                Información general. No constituye recomendación de inversión.
              </p>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
