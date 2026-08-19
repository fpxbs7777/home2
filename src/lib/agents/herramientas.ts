/**
 * Definición de herramientas del asistente IA (esquema OpenAI function).
 * Compartido por todos los agentes del sistema multi-agente.
 */

export type ToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
};

export const TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "buscar_web",
      description:
        "Busca información actual en la web y devuelve resultados reales con el texto extraído de las páginas. Usar para cotizaciones, noticias, normativa vigente, sitios oficiales y verificación de entidades.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Consulta de búsqueda en español." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_mercado",
      description:
        "Consulta cotizaciones y datos de mercado actuales del mercado argentino desde fuentes públicas y APIs oficiales: CriptoYa, ArgentinaDatos, BCRA (Estadísticas Cambiarias y Estadísticas v4 con token) y, como fallback para lo que no está en las APIs, la web (panel de cauciones de PPI/BYMA). Incluye: dólar (oficial, blue, MEP, CCL, mayorista, tarjeta, ahorro), riesgo país, UVA, inflación, letras del Tesoro (LECAP/BONCAP), tasas de plazo fijo, rendimiento de fondos comunes de inversión, cotización de otras monedas (euro, real, libra), tasas oficiales del BCRA (BADLAR, TM20, depósitos a 30 días, LELIQ, pases a 1 día) y la tasa de caución a 30 días. Usar siempre que se pidan cotizaciones, tasas o valores actuales. NO usar para acciones o bonos puntuales (ej. AL30).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Palabras clave del dato buscado, en español. Ejemplos: 'dólar blue y MEP', 'riesgo país', 'UVA', 'letras LECAP', 'mejor plazo fijo', 'fondo de money market', 'cotización del euro'.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_noticias",
      description:
        "Busca noticias actuales o de un período pasado (en español) sobre un tema del mercado argentino o empresas, desde fuentes públicas sin API key (RSS de Ámbito, El Cronista, Infobae Economía y Google Noticias). Usar siempre que el usuario pregunte por noticias, novedades o 'qué pasó con X' en un período de tiempo.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Tema de las noticias, en español. Ejemplos: 'dólar', 'bonos argentinos', 'riesgo país', 'inflación', 'MercadoLibre', 'obligaciones negociables', 'CEDEARs'. Si no hay tema puntual, usá 'mercado argentino'.",
          },
          periodo: {
            type: "string",
            description:
              "Período de tiempo en español. Ejemplos: 'hoy', 'ayer', 'última semana', 'último mes', 'último trimestre', 'último año', 'de marzo', 'de marzo 2025', 'de 2025', 'del 1/6 al 15/6', 'del 1 de marzo al 15 de abril'. Dejalo vacío si el usuario no pide un período puntual (trae lo más reciente).",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_base_conocimiento",
      description:
        "Consulta la base de conocimiento interna del sitio web de Cintia Boos y el corpus académico indexado (55 documentos de finanzas y contabilidad: Pascale, Fowler Newton, Dumrauf, Blanchard, Dornbusch, Biondi, etc.). Úsala para preguntas sobre servicios (7 ítems), instrumentos (12 ítems), brokers (3 ítems), preguntas frecuentes (4 ítems), alianzas (2 ítems), o para explicar conceptos, métodos, fórmulas y teoría de finanzas, contabilidad y macroeconomía (valoración, tasas, estados contables, carteras, costo de capital, DCF, etc.). El parámetro query es la pregunta del usuario en español.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Pregunta sobre el sitio web, servicios, instrumentos, brokers, FAQs o alianzas. Ejemplos: 'Qué es el servicio 3', 'Qué son los CEDEARs', 'Cuántos brokers tiene Cintia', 'Qué dice la FAQ sobre el costo', 'Quién es Franco Lamas'.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_dcf",
      description:
        "Calcula el valor intrínseco teórico de una empresa mediante el método de flujo de caja descontado (DCF), a partir de los supuestos que el usuario indique (o los que el asistente proponga como base de trabajo). Es un ejercicio educativo: el resultado depende de los supuestos y NO es recomendación de inversión ni promesa de rentabilidad. Usar cuando el usuario pregunte por valoración de empresas, valor intrínseco, DCF, 'cuánto vale' una acción o comparar alternativas de inversión.",
      parameters: {
        type: "object",
        properties: {
          empresa: {
            type: "string",
            description:
              "Nombre de la empresa o acción que se valora (en español, según la preguntó el usuario). Es obligatorio para poder validar después el resultado contra la cotización real de mercado.",
          },
          flujoCajaLibre: {
            type: "number",
            description:
              "Flujo de caja libre del año base, en la moneda elegida. Ejemplo: 100 para 100 millones de USD (o de pesos).",
          },
          moneda: {
            type: "string",
            description: "Moneda: 'USD' (default) o 'ARS'.",
          },
          crecimiento: {
            type: "number",
            description:
              "Crecimiento anual del flujo de caja durante la proyección explícita, en %. Default 5.",
          },
          anos: {
            type: "number",
            description: "Años de proyección explícita. Default 5.",
          },
          crecimientoTerminal: {
            type: "number",
            description: "Crecimiento perpetuo del valor terminal, en %. Default 2.5.",
          },
          tasaDescuento: {
            type: "number",
            description:
              "Tasa de descuento / WACC, en %. Debe ser mayor al crecimiento terminal. Default 12.",
          },
          deudaNeta: {
            type: "number",
            description:
              "Deuda neta a restar del valor de la empresa, en la misma moneda. Default 0.",
          },
          acciones: {
            type: "number",
            description:
              "Cantidad de acciones en circulación, para estimar el valor por acción. Opcional.",
          },
        },
        required: ["empresa", "flujoCajaLibre"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "valor_intrinseco_real",
      description:
        "Calcula el valor intrínseco REAL de una empresa/acción usando datos en vivo de Yahoo Finance (flujo de caja libre, deuda neta, beta vía CAPM, WACC, crecimiento de analistas), aplicando la metodología del paper académico correspondiente (DCF, empresas emergentes o CAPM) de la base de conocimiento, y busca noticias recientes sobre la empresa para fundamentar el dato y el resultado. Para preguntas tipo 'cuánto vale X', 'valor intrínseco de X', 'analizá el valor de X' o 'DCF de X'. Acepta ticker o nombre (ej. IBM, Microsoft, GGAL.BA). No requiere que el usuario aporte supuestos: los datos se obtienen de la API.",
      parameters: {
        type: "object",
        properties: {
          simbolo: {
            type: "string",
            description:
              "Ticker o nombre de la empresa a valorar, en español o con su ticker de mercado (ej. 'IBM', 'Microsoft', 'MSFT', 'GGAL.BA', 'YPF', 'MercadoLibre').",
          },
          tema: {
            type: "string",
            description:
              "Metodología del paper: 'DCF Flujo de Caja Descontado', 'Valuación empresas emergentes' o 'CAPM / beta'. Opcional: se autodetecta desde la pregunta si no se indica.",
          },
        },
        required: ["simbolo"],
        additionalProperties: false,
      },
    },
  },
];

export type EstadoHerramienta =
  "searching" | "mercado" | "noticias" | "base_conocimiento" | "dcf" | "valoracion";

export function estadoDeHerramienta(name: string): EstadoHerramienta {
  switch (name) {
    case "consultar_mercado":
      return "mercado";
    case "buscar_noticias":
      return "noticias";
    case "consultar_base_conocimiento":
      return "base_conocimiento";
    case "calcular_dcf":
      return "dcf";
    case "valor_intrinseco_real":
      return "valoracion";
    default:
      return "searching";
  }
}

export const NOMBRE_HERRAMIENTAS = TOOLS.map((t) => t.function.name);
