/**
 * Ejecutores de las herramientas del asistente NORTE.
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

/** Busca en la web el valor real de mercado de la empresa, para validar y explicar la diferencia con el DCF teórico. */
export async function validarDCFEnWeb(
  empresa: string,
): Promise<{ texto: string; fuentes: FuenteMercado[] }> {
  const query = `${empresa} acción cotización precio actual valor de mercado capitalización`;
  return ejecutarBusqueda(query);
}
