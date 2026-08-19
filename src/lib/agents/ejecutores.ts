/**
 * Ejecutores de las herramientas del asistente IA.
 *
 * Cada ejecutor recibe los argumentos crudos del tool call (JSON string) y
 * devuelve { texto, fuentes }. Son los bloques que ejecutan los agentes
 * especializados de forma rápida y en paralelo vía ColaDeTareas.
 */

import { buscar, dominio, extraerTexto } from "@/lib/search.server";
import { consultarMercado, type FuenteMercado } from "@/lib/mercado.server";
import { consultarNoticias } from "@/lib/noticias.server";
import { buscarEnBase } from "@/lib/knowledge-base";
import { buscarAcademico } from "@/lib/kb-academic";
import { calcularDCF, textoResultadoDCF, type EntradaDCF } from "@/lib/dcf";
import { valorIntrinsecoConNoticias } from "@/lib/valoracion-ia";
import { analizarSemaforo, textoSemaforo } from "@/lib/semaforo.server";

export type ResultadoTool = { texto: string; fuentes: FuenteMercado[] };

export type ResultadoConocimiento = { texto: string; similitud: number } & {
  categoria?: string;
  archivo?: string;
  pagina?: number;
};

export function esAcademico(r: ResultadoConocimiento): r is ResultadoConocimiento & {
  categoria: string;
  archivo: string;
  pagina: number;
} {
  return typeof r.archivo === "string" && typeof r.pagina === "number";
}

export async function ejecutarBusqueda(query: string): Promise<ResultadoTool> {
  const results = await buscar(query);
  const top = results.slice(0, 3);
  const paginas = await Promise.all(
    top.map(async (r) => ({ ...r, texto: await extraerTexto(r.url) })),
  );
  const fuentes = paginas
    .filter((p) => p.url)
    .map((p) => ({ dominio: dominio(p.url), url: p.url, title: p.title }));
  const texto = results.length
    ? results
        .map((r, i) => {
          const pag = paginas.find((p) => p.url === r.url);
          const cuerpo = pag?.texto ? `\nContenido de la página: ${pag.texto}` : "";
          return `${i + 1}. ${r.title}\nResumen: ${r.snippet}\nFuente: ${dominio(r.url)}${cuerpo}`;
        })
        .join("\n\n")
    : "SIN RESULTADOS: la búsqueda no devolvió información. Decile al usuario que buscaste y no encontraste una fuente confiable.";
  return { texto, fuentes };
}

export async function ejecutarMercado(query: string): Promise<ResultadoTool> {
  const { texto, fuentes } = await consultarMercado(query);
  return {
    texto:
      texto ||
      "SIN RESULTADOS: no se pudo obtener esa cotización de las fuentes de datos disponibles. Decile al usuario con honestidad que el dato no está disponible en este momento, sin inventar cifras.",
    fuentes,
  };
}

export async function ejecutarNoticias(query: string, periodo: string): Promise<ResultadoTool> {
  const { texto, fuentes } = await consultarNoticias(query, periodo);
  return {
    texto: texto || "SIN RESULTADOS: no se encontraron noticias para ese tema y período.",
    fuentes,
  };
}

export async function ejecutarBaseConocimiento(
  query: string,
  baseUrl?: string,
): Promise<ResultadoTool> {
  const [sitio, academicos] = await Promise.all([
    buscarEnBase(query),
    buscarAcademico(query, 5, baseUrl),
  ]);
  const resultados: ResultadoConocimiento[] = [...sitio, ...academicos];
  if (!resultados.length) {
    return {
      texto: `SIN RESULTADOS: no encontré información sobre "${query}" en la base de conocimiento del sitio. Podés probar con otra formulación o consultarme sobre otro tema.`,
      fuentes: [],
    };
  }
  const contenido = resultados
    .map((r) => {
      if (esAcademico(r)) {
        return `- [${r.categoria} · ${r.archivo} · pág. ${r.pagina}] ${r.texto}`;
      }
      return `- ${r.texto}`;
    })
    .join("\n");
  return {
    texto: `Información interna del sitio web de Cintia Boos y material académico:\n\n${contenido}`,
    fuentes: [],
  };
}

export async function ejecutarDCF(argsRaw: string): Promise<ResultadoTool> {
  let entrada: EntradaDCF;
  try {
    entrada = JSON.parse(argsRaw) as EntradaDCF;
  } catch {
    return {
      texto:
        "SIN RESULTADOS: no recibí parámetros válidos para el cálculo. Pedile al usuario que indique el flujo de caja libre esperado (y, si quiere, crecimiento, tasa de descuento y deuda neta).",
      fuentes: [],
    };
  }
  if (!entrada.empresa?.trim()) {
    return {
      texto:
        "SIN RESULTADOS: no se recibió el nombre de la empresa a valorar. Reinvocá la herramienta con el parámetro empresa y el flujo de caja libre.",
      fuentes: [],
    };
  }
  const resultado = calcularDCF(entrada);
  return { texto: textoResultadoDCF(entrada, resultado), fuentes: [] };
}

/** Valor intrínseco con datos reales (Yahoo Finance) + metodología del paper + noticias de sustento. */
export async function ejecutarValorIntrinseco(argsRaw: string): Promise<{
  texto: string;
  fuentes: FuenteMercado[];
  ok: boolean;
  textoUsuario: string;
}> {
  let simbolo = "";
  let tema = "";
  try {
    const args = JSON.parse(argsRaw) as { simbolo?: string; tema?: string };
    simbolo = String(args.simbolo ?? "").trim();
    tema = String(args.tema ?? "").trim();
  } catch {
    /* sin args */
  }
  if (!simbolo) {
    return {
      texto:
        "SIN RESULTADOS: no recibí el símbolo/empresa a valorar. Reinvocá la herramienta con el parámetro simbolo (ej. 'IBM', 'Microsoft', 'GGAL.BA').",
      fuentes: [],
      ok: false,
      textoUsuario:
        "No recibí un activo puntual para valorar. Decime cuál empresa querés analizar (por ejemplo IBM, Microsoft o YPF) y lo calculo con datos en vivo.",
    };
  }
  const resultado = await valorIntrinsecoConNoticias(simbolo, tema);
  const ok = resultado.analisis?.ok === true;
  const textoBase = resultado.texto || "SIN RESULTADOS: no se pudo completar la valoración.";
  const texto = ok
    ? textoBase
    : `RESULTADO DEL TOOL valor_intrinseco_real:\nNO se pudo completar el cálculo de valor intrínseco en vivo con datos reales (${
        resultado.error ?? "sin datos de mercado"
      }).\nESTÁ TERMINANTEMENTE PROHIBIDO inventar supuestos ni cifras de FCF, WACC, deuda, precio o valor por acción, y PROHIBIDO presentar un DCF "ilustrativo" o "con supuestos aproximados" como si fuera el resultado real. Si el dato en vivo no está disponible, respondé con honestidad que el cálculo no pudo completarse en este momento, ofrecé reintentar más tarde y, si corresponde, citá las noticias que sí se obtuvieron.\n\n${textoBase}`;
  const noticiasUtiles =
    resultado.noticias && !/no se pudieron obtener noticias/i.test(resultado.noticias)
      ? resultado.noticias
      : "";
  const textoUsuario = ok
    ? ""
    : `No pude obtener en este momento los datos reales en vivo de ${simbolo} desde Yahoo Finance (${
        resultado.error ?? "el proveedor de datos no respondió"
      }). Sin esos datos no te voy a inventar un valor intrínseco: no sería honesto.\n\nPodés reintentarlo en unos minutos o consultarme por otro activo.${
        noticiasUtiles
          ? `\n\nMientras tanto, esto es lo que encontré en noticias recientes:\n${noticiasUtiles}`
          : ""
      }`;
  return { texto, fuentes: resultado.fuentes, ok, textoUsuario };
}

/** Semáforo técnico + fundamental con datos reales (Yahoo Finance) + noticias de validación. */
export async function ejecutarSemaforo(argsRaw: string): Promise<{
  texto: string;
  fuentes: FuenteMercado[];
  ok: boolean;
  textoUsuario: string;
}> {
  let simbolo = "";
  try {
    const args = JSON.parse(argsRaw) as { simbolo?: string };
    simbolo = String(args.simbolo ?? "").trim();
  } catch {
    /* sin args */
  }
  if (!simbolo) {
    return {
      texto:
        "SIN RESULTADOS: no recibí el símbolo/activo a analizar. Reinvocá la herramienta con el parámetro simbolo (ej. 'YPF', 'AAPL', 'GGAL.BA').",
      fuentes: [],
      ok: false,
      textoUsuario:
        "No recibí un activo puntual para el análisis. Decime cuál querés analizar (por ejemplo YPF, MercadoLibre o Apple) y lo calculo con el semáforo técnico + fundamental.",
    };
  }
  const resultado = await analizarSemaforo(simbolo);
  const ok = resultado.error == null;
  const texto = ok
    ? textoSemaforo(resultado)
    : `RESULTADO DEL TOOL analizar_semaforo:\nNO se pudo completar el análisis técnico + fundamental en vivo con datos reales (${
        resultado.error ?? "sin datos de mercado"
      }).\nESTÁ TERMINANTEMENTE PROHIBIDO inventar indicadores (RSI, MACD, medias, soportes/resistencias), métricas fundamentales, puntajes ni clasificaciones. Si el dato en vivo no está disponible, respondé con honestidad que el análisis no pudo completarse en este momento, ofrecé reintentar más tarde y, si corresponde, citá las noticias que sí se obtuvieron.\n\n${
        resultado.noticias && !/no se pudieron obtener noticias/i.test(resultado.noticias)
          ? resultado.noticias
          : ""
      }`;
  const textoUsuario = ok
    ? ""
    : `No pude obtener en este momento los datos reales en vivo de ${simbolo} desde Yahoo Finance (${
        resultado.error ?? "el proveedor de datos no respondió"
      }). Sin esos datos no te voy a inventar un análisis técnico ni una clasificación: no sería honesto.\n\nPodés reintentarlo en unos minutos o consultarme por otro activo.`;
  return { texto, fuentes: resultado.fuentes, ok, textoUsuario };
}

/** Busca en la web el valor real de mercado de la empresa, para validar y explicar la diferencia con el DCF teórico. */
export async function validarDCFEnWeb(
  empresa: string,
): Promise<{ texto: string; fuentes: FuenteMercado[] }> {
  const query = `${empresa} acción cotización precio actual valor de mercado capitalización`;
  return ejecutarBusqueda(query);
}

// ---------------------------------------------------------------------------
// Análisis cuantitativo de portafolios (réplica del corpus de referencia).
// ---------------------------------------------------------------------------

import { analizarCAPM, matrizCAPM, calcularHedge } from "@/lib/capm-engine";
import { analisisSectorial, correlacionesBenchmarks } from "@/lib/sector-analysis";
import { buscarEnCatalogo, activoPorTicker } from "@/lib/catalogo-activos";
import {
  analizarPortafolio,
  tipoPortafolioValidos,
  tipoPortafolioEspanol,
  fmtPct,
  serieDiariaConFechas,
} from "@/lib/portafolio";
import { computeDistribucion } from "@/lib/estadisticas";
import { returns } from "@/lib/stats";
import { buscarBenchmark } from "@/lib/benchmarks-master";

const ETIQUETAS_TIPO: Record<string, string> = {
  "min-variance-l1": "Mínima varianza L1 (permite cortos)",
  "min-variance-l2": "Mínima varianza L2 (normalizado por norma)",
  "long-only": "Long-only (solo posiciones largas)",
  markowitz: "Markowitz (target de retorno)",
  "equi-weight": "Equi-weight (pesos iguales)",
  "volatility-weighted": "Riesgo inverso (volatility-weighted)",
};

function pctEtiqueta(t: string): string {
  return tipoPortafolioEspanol?.(t) ?? ETIQUETAS_TIPO[t] ?? t;
}

/** Estadísticas de distribución de retornos de un activo (clase `distribution`). */
export async function ejecutarDistribucion(argsRaw: string): Promise<{
  texto: string;
  fuentes: FuenteMercado[];
  ok: boolean;
}> {
  const { simbolo, rango } = (() => {
    try {
      return JSON.parse(argsRaw) as { simbolo?: string; rango?: string };
    } catch {
      return { simbolo: "", rango: "2y" };
    }
  })();
  const ticker = (simbolo ?? "").trim();
  if (!ticker) {
    return {
      texto:
        "SIN RESULTADOS: no recibí el símbolo. Reinvocá la herramienta con el parámetro simbolo (ej. 'AAPL', 'GGAL.BA', 'SPY').",
      fuentes: [],
      ok: false,
    };
  }
  try {
    const capm = await analizarCAPM({ simbolo: ticker, rango: rango ?? "2y" });
    if (capm.error) {
      return {
        texto: `RESULTADO DEL TOOL estadisticas_retornos:\nNO se pudo calcular la distribución de ${ticker} (${capm.error}).\nPROHIBIDO inventar estadísticas.`,
        fuentes: [],
        ok: false,
      };
    }
    const pts = await serieDiariaConFechas(ticker, rango ?? "2y");
    const retornos = returns(pts.map((p) => p.close));
    const d = computeDistribucion(retornos);
    const nombre = activoPorTicker(ticker)?.nombre ?? ticker;
    const L: string[] = [];
    L.push(`Distribución de retornos diarios de ${nombre} (${ticker}) — ${pts.length} obs.`);
    L.push(`- Retorno media anual: ${fmtPct(d.meanAnnual ?? 0, 2)}`);
    L.push(`- Volatilidad anual: ${fmtPct(d.volatilityAnnual ?? 0, 2)}`);
    L.push(`- Sharpe (ann.): ${(d.sharpeRatio ?? 0).toFixed(2)}`);
    L.push(`- VaR 95% (diario): ${fmtPct(d.var95 ?? 0, 2)}`);
    L.push(`- Sesgo (skewness): ${(d.skewness ?? 0).toFixed(3)}`);
    L.push(`- Curtosis (exceso): ${(d.kurtosis ?? 0).toFixed(3)}`);
    L.push(`- Jarque-Bera: ${(d.jbStat ?? 0).toFixed(2)} (p = ${(d.pValue ?? 0).toFixed(4)})`);
    L.push(`- Distribución normal: ${d.isNormal ? "SÍ (no se rechaza normalidad)" : "NO (cola gruesa / no normal)"}`);
    L.push(`\nValidación beta (CAPM): β = ${(capm.beta ?? 0).toFixed(2)} contra ${capm.benchmarkLabel ?? "—"}, R² = ${(capm.rSquared ?? 0).toFixed(2)}.`);
    const noticias = await consultarNoticias(nombre, "última semana").catch(() => null);
    if (noticias && noticias.texto) {
      L.push(`\nValidación con noticias recientes:\n${noticias.texto}`);
      return { texto: L.join("\n"), fuentes: noticias.fuentes, ok: true };
    }
    return { texto: L.join("\n"), fuentes: [], ok: true };
  } catch (e) {
    return {
      texto: `SIN RESULTADOS: error al calcular distribución (${e instanceof Error ? e.message : "desconocido"}).`,
      fuentes: [],
      ok: false,
    };
  }
}

/** Optimización de portafolio completa (covarianza, optimizadores, PCA, hedge). */
export async function ejecutarOptimizarPortafolio(argsRaw: string): Promise<{
  texto: string;
  fuentes: FuenteMercado[];
  ok: boolean;
}> {
  let activos: Array<{ ticker: string; montoUSD?: number }> = [];
  let tipo: string | null = null;
  let targetReturn: number | undefined;
  let benchmark = "SPY";
  let rango = "2y";
  try {
    const args = JSON.parse(argsRaw) as {
      activos?: Array<{ ticker?: string; montoUSD?: number }>;
      tipo?: string;
      targetReturn?: number;
      benchmark?: string;
      rango?: string;
    };
    activos = (args.activos ?? [])
      .filter((a) => a?.ticker)
      .map((a) => ({ ticker: String(a.ticker).trim(), montoUSD: a.montoUSD }));
    tipo = args.tipo?.trim() ? args.tipo.trim() : null;
    targetReturn = args.targetReturn;
    benchmark = args.benchmark?.trim() || "SPY";
    rango = args.rango?.trim() || "2y";
  } catch {
    /* sin args */
  }
  const tipos: string[] = tipo ? [tipo] : [
    "equi-weight",
    "volatility-weighted",
    "min-variance-l1",
    "min-variance-l2",
    "long-only",
    "markowitz",
  ];
  for (const t of tipos) {
    if (!tipoPortafolioValidos(t)) {
      return {
        texto: `SIN RESULTADOS: tipo de optimización inválido "${t}". Usá: min-variance-l1, min-variance-l2, long-only, markowitz, equi-weight, volatility-weighted.`,
        fuentes: [],
        ok: false,
      };
    }
  }
  try {
    const res = await analizarPortafolio({
      activos,
      rango,
      tipos: tipos as never,
      targetReturn,
      benchmark,
    });
    const L: string[] = [];
    L.push(`Portafolio: ${res.simbolos.map((s, i) => `${res.labels[i]} (${s})`).join(", ")}`);
    L.push(`Rango: ${res.fechas[0]} → ${res.fechas[res.fechas.length - 1]} · ${res.fechas.length} sesiones`);
    L.push(`\nMatriz de correlación (anualizada):\n  ${res.simbolos.join("\t")}`);
    res.corr.forEach((row, i) => {
      L.push(`  ${res.simbolos[i]} ${row.map((c) => c.toFixed(2).padStart(6)).join(" ")}`);
    });
    L.push(`\nEstadísticas por activo (retornos diarios):`);
    res.simbolos.forEach((s, i) => {
      const d = res.distribucionPorActivo[i]!;
      L.push(`- ${res.labels[i]} (${s}): anual ${fmtPct(d.meanAnnual ?? 0, 1)} · vol ${fmtPct(d.volatilityAnnual ?? 0, 1)} · Sharpe ${(d.sharpeRatio ?? 0).toFixed(2)} · VaR95 ${fmtPct(d.var95 ?? 0, 1)} · JB p=${(d.pValue ?? 0).toFixed(3)} ${d.isNormal ? "(normal)" : "(no normal)"}`);
    });
    L.push(`\nOptimizaciones (pesos):`);
    for (const t of tipos) {
      const o = res.optimizaciones[t as keyof typeof res.optimizaciones];
      if (!o) continue;
      const pesos = res.simbolos.map((s, i) => `${s} ${fmtPct(o.pesos[s] ?? 0, 1)}`).join(" · ");
      L.push(`- ${ETIQUETAS_TIPO[t] ?? t}: ${pesos}`);
      L.push(`  · Retorno ${fmtPct(o.retornoAnual, 1)} · Vol ${fmtPct(o.volatilidadAnual, 1)} · Sharpe ${o.sharpe.toFixed(2)} · VaR95 ${fmtPct(o.var95, 1)}`);
    }
    L.push(`\nFrontera eficiente (long-only):`);
    const fe = res.frontera;
    if (fe.length) {
      const minSharpe = fe.reduce((m, p) => (p.sharpe < m.sharpe ? p : m), fe[0]!);
      const maxSharpe = fe.reduce((m, p) => (p.sharpe > m.sharpe ? p : m), fe[0]!);
      const minVol = fe.reduce((m, p) => (p.volatilidad < m.volatilidad ? p : m), fe[0]!);
      L.push(`- Mínima volatilidad: ${fmtPct(minVol.volatilidad, 1)} → retorno ${fmtPct(minVol.retorno, 1)}`);
      L.push(`- Máximo Sharpe: ${fmtPct(maxSharpe.retorno, 1)} / vol ${fmtPct(maxSharpe.volatilidad, 1)} (Sharpe ${maxSharpe.sharpe.toFixed(2)})`);
      L.push(`- Peor Sharpe: ${fmtPct(minSharpe.retorno, 1)} / vol ${fmtPct(minSharpe.volatilidad, 1)}`);
    }
    L.push(`\nPCA (covarianza anualizada):`);
    const ev = res.pca.valores.map((v) => v.toFixed(2));
    L.push(`- Autovalores: ${ev.join(", ")}`);
    L.push(`- Varianza explicada PC1: ${fmtPct(res.pca.varianzaExplicada[0] ?? 0, 1)} · PC2: ${fmtPct(res.pca.varianzaExplicada[1] ?? 0, 1)}`);
    L.push(`- Vector de mínima varianza (L2): ${res.simbolos.map((s, i) => `${s} ${(res.pca.vectorMinVarianza[i] ?? 0).toFixed(3)}`).join(" · ")}`);
    if (res.hedger && "hedges" in res.hedger) {
      L.push(`\nHedger CAPM contra ${res.hedger.posicion.ticker} (β portafolio ${res.hedger.posicion.beta.toFixed(2)}):`);
      res.hedger.hedges.forEach((h) => {
        L.push(`- ${h.name} (${h.ticker}): β=${h.beta.toFixed(2)} · nocional cobertura ${h.nocional >= 0 ? "+" : ""}${h.nocional.toFixed(0)} USD`);
      });
      L.push(`- Costo de cobertura: ${res.hedger.cost.toFixed(4)}`);
    }
    const noticias = await consultarNoticias(res.labels[0] ?? activos[0]!.ticker, "última semana").catch(() => null);
    if (noticias && noticias.texto) {
      L.push(`\nValidación con noticias recientes (${res.labels[0] ?? activos[0]!.ticker}):\n${noticias.texto}`);
      return { texto: L.join("\n"), fuentes: noticias.fuentes, ok: true };
    }
    return { texto: L.join("\n"), fuentes: [], ok: true };
  } catch (e) {
    return {
      texto: `SIN RESULTADOS: error al optimizar portafolio (${e instanceof Error ? e.message : "desconocido"}). Reintentá con menos activos o tickers válidos.`,
      fuentes: [],
      ok: false,
    };
  }
}

/** Correlaciones de un activo contra los 140+ factores maestros. */
export async function ejecutarFactores(argsRaw: string): Promise<{
  texto: string;
  fuentes: FuenteMercado[];
  ok: boolean;
}> {
  const { simbolo, limite, rango } = (() => {
    try {
      return JSON.parse(argsRaw) as { simbolo?: string; limite?: number; rango?: string };
    } catch {
      return { simbolo: "", limite: 10, rango: "1y" };
    }
  })();
  const ticker = (simbolo ?? "").trim();
  if (!ticker) {
    return {
      texto: "SIN RESULTADOS: no recibí el símbolo. Reinvocá con el parámetro simbolo.",
      fuentes: [],
      ok: false,
    };
  }
  try {
    const corr = await correlacionesBenchmarks(ticker, limite ?? 10, rango ?? "1y");
    if (!corr.length) {
      return { texto: `SIN RESULTADOS: no hay datos de factores para ${ticker}.`, fuentes: [], ok: false };
    }
    const nombre = activoPorTicker(ticker)?.nombre ?? ticker;
    const L: string[] = [`Correlaciones de ${nombre} (${ticker}) contra los factores maestros (${rango ?? "1y"}):`];
    corr.forEach((c) => {
      const signo = c.correlation >= 0 ? "+" : "";
      L.push(`- ${c.name} (${c.ticker}): r=${signo}${c.correlation.toFixed(2)} · β=${c.beta.toFixed(2)} · R²=${c.rSquared.toFixed(2)}`);
    });
    return { texto: L.join("\n"), fuentes: [], ok: true };
  } catch (e) {
    return {
      texto: `SIN RESULTADOS: error al calcular correlaciones (${e instanceof Error ? e.message : "desconocido"}).`,
      fuentes: [],
      ok: false,
    };
  }
}
