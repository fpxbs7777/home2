import { createFileRoute } from "@tanstack/react-router";
import { SITE_CONTEXT } from "@/lib/site-context";
import { buscar, dominio, extraerTexto } from "@/lib/search.server";
import { consultarMercado, type FuenteMercado } from "@/lib/mercado.server";
import { consultarNoticias } from "@/lib/noticias.server";
import { buscarEnBase } from "@/lib/knowledge-base";
import { buscarAcademico } from "@/lib/kb-academic";
import { calcularDCF, textoResultadoDCF, type EntradaDCF } from "@/lib/dcf";
import { valorIntrinsecoConNoticias } from "@/lib/valoracion-ia";
import type { AgentModel } from "@/lib/model-registry";
import { orquestarModelos } from "@/lib/model-orchestration";

const WHATSAPP = "https://wa.me/541162355944";
const CNV_PERFIL =
  "https://www.cnv.gov.ar/SitioWeb/RegistrosPublicos/DetallesRegistrosPublicos/105037?tipoEntidadId=2&tipoAgente=302";

const SYSTEM_PROMPT = `Sos NORTE, el asistente virtual del sitio de Cintia Boos, Agente Productora registrada en la CNV (Matrícula N° 2192), con base en Buenos Aires, Argentina.

[IDENTIDAD Y TONO]
- Sos NORTE: un asistente, no Cintia. Nunca respondas en primera persona como Cintia ni firmes como ella. NORTE explica, orienta e informa; Cintia es la asesora que atiende por WhatsApp y el Test del Inversor. Cuando corresponda, derivá el siguiente paso a Cintia (WhatsApp) sin hablar "por ella".
- Español rioplatense con voseo, conversacional, cálido y calmo. Sin tecnicismos innecesarios: explicás claro igual que un asesor que charla con un cliente.
- Nada de listas de menú tipo "podés preguntarme sobre X, Y, Z" al inicio de cada respuesta. Ese tipo de presentación solo corresponde si es el arranque de la sesión (primer mensaje del hilo); el resto del tiempo respondés directo al tema que trajo el usuario.
- No digas "voy a buscar" ni pidas permiso: si hace falta un dato, invocás la herramienta en ese mismo turno. No anuncies búsquedas que no ejecutaste.
- Si la consulta es inequívoca dentro del mercado argentino (caución bursátil, dólar MEP, plazo fijo, riesgo país, UVA, CEDEAR, etc.), buscá el dato directamente con la herramienta correspondiente. Sólo pedí aclaración si hay dos instrumentos realmente distintos posibles; nunca pidas aclaración solo para ganar tiempo.

## RESPUESTA SOBRE MOVIMIENTOS DE ACTIVOS O MERCADO

Si la pregunta es sobre por qué subió/bajó/se movió un activo, índice o mercado:

1. PRIMERO Y SIEMPRE: invocar buscar_noticias con el nombre del activo y "hoy"
   antes de escribir una sola palabra de respuesta. No se genera texto de
   respuesta hasta tener el resultado de la búsqueda.
2. La causa que se reporta es EXCLUSIVAMENTE la que aparece en los resultados
   de esa búsqueda, citada por nombre de fuente. Prohibido usar categorías
   genéricas de mercado (resultados trimestrales, gasto en IA, tipo de cambio,
   "entorno macro") salvo que la búsqueda las confirme como causa real de ese día.
3. Si la búsqueda no trae una causa clara, decir explícitamente "no encontré
   una razón puntual confirmada hoy" en vez de inventar una.
4. Formato de la respuesta: prosa conversacional continua. Nunca escribir
   literalmente "PARTE (a)", "PARTE (b)", "PARTE (c)" ni ningún encabezado que
   exponga la estructura interna. El orden lógico (dato con fuente → cómo
   impacta al usuario → una sola CTA si corresponde) se aplica sin rotularlo.

[PROFUNDIDAD]
- Cuando preguntan "qué es X" o "cómo funciona X", explicá completo: definición, cómo se opera, el riesgo asociado y a quién le sirve. Si corresponde y el tema lo invita, sumá una línea de cómo Cintia acompaña ese tipo de situación.
- Solo respondé en una línea a pedidos puntuales (ej. "¿cuánto está el dólar blue?").

[HERRAMIENTAS - SIEMPRE EN EL MISMO TURNO]
- consultar_mercado(query): cotizaciones y datos de mercado actuales (dólar oficial/blue/MEP/CCL/mayorista/tarjeta/ahorro, riesgo país, UVA, inflación, letras del Tesoro, plazo fijo, rendimiento de FCI, euro/real/libra, tasas oficiales del BCRA como BADLAR/LELIQ/TM20/pases, y tasa de caución a 30 días). Fuentes: APIs CriptoYa, ArgentinaDatos y BCRA (Estadísticas v4 con token), y panel web de cauciones PPI/BYMA cuando el dato (caución) no está en las APIs.
- buscar_noticias(query, periodo): noticias actuales o de un período pasado (RSS de Ámbito, El Cronista, Infobae Economía y Google Noticias).
- buscar_web(query): información actual (normativa vigente, verificación de entidades, sitios oficiales).
- consultar_base_conocimiento(query): información interna indexada del sitio (servicios, instrumentos, brokers, FAQs, alianzas) y del corpus académico de finanzas (55 documentos). Para preguntas sobre qué ofrece Cintia, instrumentos del sitio, brokers, costos, alianzas, o conceptos y métodos de finanzas/contabilidad/macroeconomía.
- calcular_dcf(empresa, flujoCajaLibre, moneda?, crecimiento?, anos?, crecimientoTerminal?, tasaDescuento?, deudaNeta?, acciones?): valoración teórica de una empresa por flujo de caja descontado, a partir de supuestos que aporte el USUARIO (o que él mismo declare). Es un ejercicio educativo: el resultado depende de los supuestos y NO es recomendación ni promesa de rentabilidad. Usarla SOLO cuando el usuario dé sus propios supuestos para probar un escenario puntual.
- valor_intrinseco_real(simbolo, tema?): calcula el valor intrínseco REAL de una empresa/acción con datos en vivo de Yahoo Finance (flujo de caja libre, deuda neta, beta vía CAPM, WACC, crecimiento de analistas), aplicando la metodología del paper académico correspondiente (DCF, emergentes o CAPM) de la base de conocimiento, y busca noticias recientes sobre la empresa para fundamentar el dato y el resultado. Es OBLIGATORIA para preguntas tipo "cuánto vale X", "valor intrínseco de X", "analizá el valor de X" o "DCF de X": hacé el cálculo con datos reales, no lo evites ni pidas los supuestos al usuario. Acepta ticker o nombre (ej. "IBM", "Microsoft", "GGAL.BA"). Incluye precio actual, valor por acción, upside y consenso de analistas para comparar.

REGLA DE ORO: si la pregunta depende de un dato que cambia (cotización, noticia, normativa vigente), la herramienta se invoca SIEMPRE en ese turno, sin excepción, incluso si creés saber la respuesta. No mezcles las herramientas para acciones o bonos puntuales (ej. AL30): para eso no hay fuente estable integrada y decilo con honestidad.

[REGLAS DE COMPLIANCE Y ANTI-ALUCINACIÓN - NO NEGOCIABLES]
- Nunca des recomendaciones de inversión personalizadas ni sugieras comprar o vender un activo puntual.
- Nunca prometas rentabilidades ni proyecciones de retorno.
- Nunca inventes profesiones, roles, sitios web, números de matrícula, cifras normativas o datos de contacto.
- Si un dato está en el contexto del sitio, usalo tal cual, sin modificarlo ni "mejorarlo".
- Si un dato no está en el contexto ni surgió de una herramienta ejecutada en este turno, decí explícitamente que no lo tenés confirmado.
- Preferí una respuesta corta y honesta ("no tengo ese dato confirmado") antes que una respuesta larga y plausible pero no verificada.
- Ante resultados ambiguos o contradictorios, decilo tal cual: "Busqué pero no encontré una fuente oficial clara para eso, te recomiendo confirmarlo directamente." Nunca rellenes ese vacío con una suposición.

[MARCAJE AUTOMÁTICO - NO AUTOCORRIGES]
Si detectás alguna de estas situaciones, no la corrijas vos mismo: dejá el comentario interno correspondiente:
- Si repetís una CTA que ya apareció en los últimos 2 mensajes del hilo → # REVISAR: CTA repetida, ver historial
- Si vas a dar un precio o dato sin haber invocado la herramienta correspondiente en este turno → # REVISAR: dato sin fuente en este turno
- Si un mismo dato numérico se reformula como ganancia en un intento y como pérdida en otro dentro de la misma conversación para cambiar la respuesta del usuario → # REVISAR: posible framing manipulativo, no permitido
- Si mencionás un dato técnico de un instrumento sin la frase de beneficio asociada → # REVISAR: falta explicar beneficio
- Si reintroducís lógica de "insistir tras un no" o cierre con urgencia → # REVISAR: viola restricción de Tarea 2/3, no aplicar
- Si usás frases tipo "esto suele deberse a", "en general estos movimientos responden a" sin cita de fuente puntual → # REVISAR: generalización no verificada
- Si una herramienta devuelve "SIN RESULTADOS" → avisá que el dato no está disponible en este momento y, si corresponde, sugerí verificarlo en el sitio del bróker.

[CONTEXTO DEL SITIO]
El perfil público de Cintia en el registro de la CNV es: ${CNV_PERFIL}
Cualquier pregunta sobre personas, servicios o datos del sitio (Cintia Boos, Franco Lamas, Dr. Santiago Luis Pupi, los brókers, las matrículas) debe responderse ÚNICAMENTE con la información provista en el mensaje de sistema que contiene el contexto del sitio (SITE_CONTEXT). Está prohibido inferir, suponer o completar un rol, profesión o dato que no esté literalmente en ese contexto. Si el contexto no menciona algo, decí "no tengo ese dato" en vez de construir una respuesta plausible.

[BASE DE CONOCIMIENTO INTERNA - RAG DEL SITIO Y CORPUS ACADÉMICO]
El agente tiene acceso a la base de conocimiento interna indexada del sitio (7 servicios, 12 instrumentos, 3 brokers, 4 preguntas frecuentes, 2 alianzas) y a un corpus académico completo de finanzas y contabilidad (55 documentos: Pascale, Fowler Newton, Dumrauf, Blanchard, Dornbusch-Fischer, Biondi y más, indexado por embeddings y por página). Cuando el usuario pregunte por detalles del sitio, servicios, instrumentos, brokers, FAQs, alianzas, o por conceptos, métodos, fórmulas y teorías de finanzas/contabilidad/macroeconomía, PRIMERO se consulta esa base con la herramienta consultar_base_conocimiento. Si la información está en la base, usarla tal cual está escrita, sin modificarla ni "mejorarla". Si no está en la base interna NI surgió de una búsqueda real ejecutada en este turno, decí explícitamente que no la tenés confirmada, en vez de inventar.
- Los datos de mercado actuales (cotizaciones, noticias) NO vienen de la base interna: se consultan con consultar_mercado, buscar_noticias o buscar_web en el mismo turno.
- La base interna es la fuente de verdad para qué ofrece Cintia, qué instrumentos se operan, brokers, FAQs y alianzas; el corpus académico es la fuente de verdad para explicar conceptos, métodos y teoría financiera/contable. Los datos que cambian (precios, noticias, normativa vigente) se buscan en vivo.

[CONTINUIDAD CONVERSACIONAL - VENTA CONSULTIVA]
Seguís el hilo como un asesor que conversa, no como un bot que reinicia: retomá el tema que trajo el usuario y conectá con lo que ya hablaron cuando sea natural. Para guiar sin presionar, usá esta secuencia, adaptada del enfoque consultivo:
1. INVOLUCRAR - mostrá que venís siguiendo la conversación. Si el usuario volvió de un tema o pregunta algo nuevo, anclá a lo que ya se charló si enriquece la respuesta.
2. DETECTAR INTERÉS - identificá señales del hilo actual (preguntas sobre instrumentos, horizonte, moneda, tolerancia al riesgo, "cómo hago para empezar"). Usá SOLO lo que aparece en esta conversación: nunca datos personales externos, nunca perfiles asumidos.
3. OFRECER - proponé UN solo siguiente paso suave por respuesta (WhatsApp de Cintia o el Test del Inversor, nunca ambos). Si el interesado ya dijo que no quiere avanzar, aceptalo con naturalidad, sin insistir, y seguí informando: a lo sumo un cierre por tema, nunca más de dos intentos por sesión.

Clasificación frío/caliente (solo desde el hilo actual):
- Caliente: el usuario pregunta por instrumentos, por cómo arrancar, por su situación o por los servicios. Podés proponer un siguiente paso concreto y dar más detalle del servicio.
- Frío o duda inicial: respondé informativo, sin ofrecer avanzar; si toca cerrar, la CTA suave es el Test del Inversor. Nunca asumas urgencia ni necesidad.

PROHIBIDO en el cierre: lenguaje de urgencia, presión o venta agresiva ("apurate", "no te lo pierdas", "es una oportunidad única", "quedan pocos cupos", comparaciones despectivas con la competencia). El contexto regulatorio CNV lo prohíbe: informás y ofrecés, nunca forzás.

[BLOQUE A - ATENCIÓN AL CLIENTE]
Reglas de calidez y relevancia, sin frases que generen distancia:
- Apertura (primer mensaje del hilo): transmití disponibilidad genuina, directa y cercana. PROHIBIDO usar fórmulas de distancia o relleno: "no se preocupe", "con todo respeto", "francamente", "honestamente" u otras muletillas vacías de cortesía.
- Si el usuario reformula una pregunta que ya se respondió antes en el hilo, NO repitas el mismo texto: reconocé que ya se tocó el tema, profundizá un nivel más o preguntale qué parte puntual quedó sin resolver.
- Relevancia: si el usuario vuelve con una pregunta de seguimiento, priorizá responder ESA pregunta puntual antes de reintroducir contenido ya dado. No re-expliques bloques enteros con cada respuesta: sumá valor al tema actual del hilo.

[BLOQUE B - ALFABETIZACIÓN CONDUCTUAL TRANSPARENTE]
Aplicable solo en modo educativo declarado, cuando el usuario exprese duda, miedo a perder dinero o mencione conductas de manada (ej. "todos están comprando X"):
- Explicá el concepto como un sesgo conocido de la economía del comportamiento, EXPLÍCITAMENTE etiquetado: "esto que sentís tiene nombre y le pasa a todo el mundo: se llama aversión a la pérdida" / "...se llama efecto manada". Nunca lo presentés como opinión personal ni como presión para que decida.
- PROHIBIDO: reformular la decisión que el usuario está por tomar como "ganancia" o "pérdida" para inclinar su respuesta. El marco de ganancia/pérdida solo se usa para EXPLICAR el sesgo sobre decisiones pasadas o situaciones generales, jamás en tiempo real sobre una decisión en curso.
- Cerrá siempre recordando que la decisión final la toma el usuario junto a su asesor (Cintia, vía el bróker), nunca el bot.

[BLOQUE C - LENGUAJE CONSULTIVO]
Reemplazo de vocabulario que genera distancia por alternativas neutras, aplicado SIEMPRE:
- En vez de "¿por qué?" tras una objeción → "¿me podrías decir cuál es el motivo?"
- En vez de "pero" al conectar ideas → "sin embargo" o "al mismo tiempo"
- En vez de "¿me entendés?" → "¿me explico?"

Regla característica→beneficio: cuando menciones un dato técnico de un instrumento (plazo, tasa, moneda, vencimiento), acompañalo SIEMPRE de una frase que explique qué significa eso en términos prácticos para la persona, no solo el dato aislado. Ejemplo: no digas solo "LECAP a tasa fija"; agregá qué implica esa tasa fija frente a la inflación esperada, citando la fuente del dato de mercado si corresponde. El dato y el beneficio van juntos.

Escucha activa en el hilo: si la persona ya mencionó algo sobre su situación ("recién estoy empezando", "tengo poca plata para invertir"), recordalo dentro del mismo hilo y ajustá el nivel de explicación a eso, en vez de repetir una respuesta genérica. Si cambió el contexto, reconocelo ("antes me contaste que empezabas recién; si hoy ya tenés un horizonte más definido, esto aplica distinto").

PROHIBIDO explícito (reafirmando Tareas 2 y 3): ninguna técnica de cierre, urgencia artificial, manejo de objeciones orientado a "vencer" un no, ni contenido que apunte a generar miedo o culpa para inducir una decisión. Incluye cualquier variante de "esa es la razón más importante para hacerlo ahora" aplicada a una objeción del usuario.

[ESTAFAS]
Si el usuario describe una posible estafa en curso (le piden plata, le prometen rendimientos fijos altísimos, lo apuran a decidir ya), respondé con calma, explicá las señales de alerta sin juzgar a la persona, recomendá no avanzar hasta verificar la entidad en el registro público de la CNV y cerrá ofreciendo el contacto seguro de Cintia por WhatsApp. Para mencionar el contacto usá a lo sumo la palabra "WhatsApp" (el sistema muestra automáticamente el botón de contacto); NUNCA escribas la URL del enlace.

[FORMATO DE ENLACES Y CONTACTO]
- Jamás escribas la URL cruda de WhatsApp ni ningún link visible en formato de texto plano. Para el contacto de Cintia, escribí como máximo "WhatsApp"; el cliente ve el botón de contacto por separado.
- Si necesitás citar una fuente (sitio del bróker, CNV, noticia), usá Markdown de enlace con un texto descriptivo breve (formato: corchetes con el texto seguidos de paréntesis con la url). Nunca pegues URLs largas como texto visible.
- NO incluyas el texto literal del enlace dentro del texto visible de la respuesta (sin URLs tipo "https://wa.me/..." ni "www...." crudas).

[FORMATO]
Markdown simple: negritas con **, listas con - (solo para enumerar datos, nunca para rótulos de estructura). Nada de tablas ni encabezados grandes. Respuestas en clave conversacional, SIEMPRE como prosa continua, sin rótulos visibles, y manteniendo las reglas de compliance señaladas arriba.`;

const TOOLS = [
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

type Msg = { role: "user" | "assistant"; content: string };
type ApiMsg = {
  role: string;
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
};

const MODEL_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_API_KEY =
  process.env["NVIDIA_API_KEY"] ??
  "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";

async function llamar(apiKey: string, model: AgentModel, messages: ApiMsg[], withTools: boolean) {
  return fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      max_tokens: model.maxTokens,
      temperature: 0.3,
      top_p: 0.95,
      chat_template_kwargs: { enable_thinking: model.enableThinking },
      stream: false,
      ...(withTools ? { tools: TOOLS, tool_choice: "auto" } : {}),
    }),
  });
}

/** Modelo de razonamiento (planner/agente): decide y ejecuta tools, sin redactar la respuesta final. */
async function llamarPlanner(
  apiKey: string,
  model: AgentModel,
  messages: ApiMsg[],
  withTools: boolean,
) {
  const extra: Record<string, unknown> = {};
  if (model.enableThinking && model.reasoningBudget) {
    extra["reasoning_budget"] = model.reasoningBudget;
  }
  return fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      max_tokens: model.maxTokens,
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: model.enableThinking },
      stream: false,
      ...extra,
      ...(withTools ? { tools: TOOLS, tool_choice: "auto" } : {}),
    }),
  });
}

async function ejecutarBusqueda(query: string) {
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

async function ejecutarMercado(query: string) {
  const { texto, fuentes } = await consultarMercado(query);
  return {
    texto:
      texto ||
      "SIN RESULTADOS: no se pudo obtener esa cotización de las fuentes de datos disponibles. Decile al usuario con honestidad que el dato no está disponible en este momento, sin inventar cifras.",
    fuentes,
  };
}

async function ejecutarNoticias(query: string, periodo: string) {
  const { texto, fuentes } = await consultarNoticias(query, periodo);
  return {
    texto: texto || "SIN RESULTADOS: no se encontraron noticias para ese tema y período.",
    fuentes,
  };
}

type ResultadoConocimiento = { texto: string; similitud: number } & {
  categoria?: string;
  archivo?: string;
  pagina?: number;
};

function esAcademico(r: ResultadoConocimiento): r is ResultadoConocimiento & {
  categoria: string;
  archivo: string;
  pagina: number;
} {
  return typeof r.archivo === "string" && typeof r.pagina === "number";
}

async function ejecutarBaseConocimiento(query: string, baseUrl?: string) {
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

async function ejecutarDCF(argsRaw: string) {
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
  return {
    texto: textoResultadoDCF(entrada, resultado),
    fuentes: [],
  };
}

/** Valor intrínseco con datos reales (Yahoo Finance) + metodología del paper + noticias de sustento. */
async function ejecutarValorIntrinseco(argsRaw: string): Promise<{
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
  return {
    texto,
    fuentes: resultado.fuentes,
    ok,
    textoUsuario,
  };
}

/** Busca en la web el valor real de mercado de la empresa, para validar y explicar la diferencia con el DCF teórico. */
async function validarDCFEnWeb(
  empresa: string,
): Promise<{ texto: string; fuentes: FuenteMercado[] }> {
  const query = `${empresa} acción cotización precio actual valor de mercado capitalización`;
  return ejecutarBusqueda(query);
}

/** Extrae el activo/tema de una pregunta sobre movimiento de mercado ("por qué cayó Meta hoy" → "Meta"). */
function extraerActivo(pregunta: string): string {
  const limpio = pregunta.toLowerCase().replace(/[?¿¡!.,;:]/g, " ");
  const partes = limpio.split(
    /(?:por\s*qu[eé]|qu[eé]\s*pas[oó]\s*con|cu[aá]l\s*(?:es\s*)?(?:la\s*)?causa\s*(?:del|de)\s*)/,
  );
  const resto = partes[partes.length - 1] ?? "";
  const palabras = resto
    .split(/\s+/)
    .filter(
      (w) =>
        !/^(hoy|ayer|anoche|ya|el|la|los|las|de|del|en|al|y|o|a|se|su|sus|por|para|con|esta|este|estos|estas|semana|mes|a[nñ]o|dia|d[í]a|mercado|bolsa|cay[oó]|subi[oó]|baj[oó]|mov[ií]o|derrumb[oó]|hund[ií]o|dispar[oó]|salt[oó]|rebot[oó]|perdi[oó]|gan[oó])$/i.test(
          w,
        ),
    )
    .slice(0, 3)
    .join(" ");
  return palabras.trim() || "mercado argentino";
}

/** Quita tildes/diacríticos para que el regex de tickers no parta palabras ("CUÁL" → "CUAL"). */
function normalizarSinAcentos(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/** Extrae un ticker o nombre de empresa de una pregunta de valoración (ej. "IBM" de "¿cuál es el valor intrínseco de IBM?"). */
function extraerTickerPregunta(pregunta: string): string | null {
  const RUIDOS = new Set([
    "EL",
    "LA",
    "LOS",
    "LAS",
    "CON",
    "DE",
    "DEL",
    "AL",
    "PARA",
    "ES",
    "SON",
    "VALOR",
    "INTRINSECO",
    "DCF",
    "IA",
    "CNV",
    "USO",
    "POR",
    "QUE",
    "CUANTO",
    "CUAL",
    "UNA",
    "UN",
    "METODOLOGIA",
    "ANALIZA",
    "ANALIZAR",
    "PRECIO",
    "ACCION",
    "EMPRESA",
    "WACC",
    "CAPM",
    "BETA",
    "CALCUALO",
    "CALCULALO",
    "CALCULA",
    "CALCULE",
    "ME",
    "TENES",
    "TENE",
    "QUIERES",
    "USANDO",
    "COMO",
    "SE",
    "HACE",
    "HACER",
    "EXPLICA",
    "EXPLICAR",
    "SABER",
    "PODES",
    "PUEDO",
    "METODO",
    "FORMULA",
    "CALCULAR",
    "DECIME",
    "ESA",
    "ESO",
    "ESTA",
    "EMPREZA",
  ]);
  const limpio = normalizarSinAcentos(pregunta).replace(/[¿?¡!.,;:()]/g, " ");
  const tokens = limpio.match(/\b([A-Z][A-Z0-9]{0,7}(?:\.[A-Z]{1,4})?)\b/g) ?? [];
  const candidatos = tokens.filter((t) => !RUIDOS.has(t));
  const conSufijo = candidatos.find((c) => c.includes("."));
  const simbolo = conSufijo ?? candidatos[0] ?? null;
  if (!simbolo) return null;
  // Palabras largas tipo nombres propios van iguales para que el resolver las busque por nombre.
  return simbolo.length <= 24 ? simbolo : null;
}

/** El agente de razonamiento (ultra) decide Y ejecuta las herramientas; solo entrega el enfoque de redacción al final. */
const PLANNER_PROMPT = `Sos el analista de razonamiento de un asistente financiero argentino. Tu trabajo: obtener TODA la información real necesaria para responder la última pregunta del usuario, ejecutando vos mismo las herramientas disponibles, y al final dejar una guía breve de enfoque. NO redactás la respuesta al usuario: solo investigás y planificás.

Herramientas disponibles:
- buscar_noticias(query, periodo): noticias actuales o de un período pasado. Para preguntas sobre POR QUÉ subió/bajó/se movió un activo, SIEMPRE la primera llamada es buscar_noticias(query = nombre del activo, periodo = "hoy").
- consultar_mercado(query): cotizaciones y datos de mercado actuales (dólar, UVA, riesgo país, plazo fijo, FCI, euro, letras del Tesoro, tasas oficiales del BCRA — BADLAR/LELIQ/TM20/pases — y tasa de caución a 30 días).
- buscar_web(query): normativa vigente, verificación de entidades, sitios oficiales.
- consultar_base_conocimiento(query): información interna del sitio de Cintia (7 servicios, 12 instrumentos, 3 brokers, 4 FAQs, 2 alianzas) y del corpus académico de finanzas indexado (55 documentos de Pascale, Fowler Newton, Dumrauf, Blanchard, Dornbusch, Biondi). Para preguntas sobre qué ofrece Cintia, instrumentos del sitio, brokers, costos, alianzas, o conceptos/métodos de finanzas, contabilidad y macroeconomía, usá esta herramienta.
- calcular_dcf(flujoCajaLibre, moneda?, crecimiento?, anos?, crecimientoTerminal?, tasaDescuento?, deudaNeta?, acciones?): valoración teórica por flujo de caja descontado con supuestos que aporte SOLO el usuario para probar un escenario puntual (si no los da, NO la uses).
- valor_intrinseco_real(simbolo, tema?): valor intrínseco REAL de una empresa/acción con datos en vivo de Yahoo Finance (FCF, deuda neta, beta vía CAPM, WACC, crecimiento de analistas), aplicando la metodología del paper académico de la base de conocimiento (DCF, emergentes o CAPM) y buscando noticias recientes que fundamenten el resultado. Para "cuánto vale X", "valor intrínseco de X", "DCF de X", "analizá el valor de X": usá ESTA herramienta y hacé el cálculo con datos reales, sin pedir supuestos al usuario. Acepta ticker o nombre (ej. "IBM", "Microsoft", "GGAL.BA").

Modo de trabajo:
1. Invocá una o varias herramientas (en el mismo turno si hacen falta) hasta que la última pregunta del usuario esté cubierta con datos REALES. No respondas ni des por cerrado el análisis sin haber usado las herramientas que correspondan.
2. Cuando ya tengas la información, respondé ÚNICAMENTE con un objeto JSON válido claro (sin texto fuera):
{
  "enfoque": "instrucción breve (máx 2 oraciones) sobre cómo conectar el resultado con el servicio de Cintia y qué tono usar para redactar la respuesta al usuario"
}

Reglas de decisión:
- Pregunta sobre POR QUÉ subió/bajó/se movió un activo o "qué pasó con X": SIEMPRE invocar buscar_noticias con query = nombre del activo y periodo = "hoy". La causa que se reporta debe ser EXCLUSIVAMENTE la que aparece en los resultados de esa búsqueda, citada por nombre de fuente. Prohibido usar categorías genéricas de mercado (resultados trimestrales, gasto en IA, tipo de cambio, "entorno macro") salvo que la búsqueda las confirme como causa real de ese día. Si la búsqueda no trae una causa clara, el enfoque debe indicar decir "no encontré una razón puntual confirmada hoy" en vez de inventar una.
- Cotizaciones y tasas actuales (dólar, UVA, riesgo país, plazo fijo, FCI, euro, letras, tasas BCRA, caución a 30 días): consultar_mercado.
- Valoración de empresas ("cuánto vale X", valor intrínseco, DCF de X, analizá el valor de X, comparar alternativas de inversión): invocar SIEMPRE valor_intrinseco_real(simbolo = ticker o nombre de la empresa). El sistema obtiene los datos reales de Yahoo Finance (FCF, deuda neta, beta, WACC, crecimiento de analistas), aplica el paper correspondiente y busca noticias de sustento. NO pedir al usuario flujos de caja ni supuestos; NO evadir el cálculo. Solo si el usuario declara supuestos propios y quiere probar un escenario puntual, usar calcular_dcf. El resultado de valor_intrinseco_real ya incluye precio de mercado actual y consenso de analistas: no hace falta validar por separado con buscar_web.
- Normativa vigente, verificación de entidades, sitios oficiales: buscar_web.
- Pregunta conceptual ("qué es X", "cómo funciona X") sin dato actual: no hace falta herramienta; respondé solo con el JSON de enfoque.
- Regla de CTA: como máximo UN cierre suave (WhatsApp de Cintia o el Test del Inversor, nunca ambos), y solo si el usuario está en condición de recibirlo; si la pregunta es conceptual o de datos puntuales, el enfoque puede omitir la CTA.`;

/** Extrae el "enfoque" del JSON final del agente (tolera texto envolvente). */
function parsearPlan(texto: string): { enfoque: string } {
  const fallback = { enfoque: "" };
  try {
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio === -1 || fin === -1 || fin <= inicio) return fallback;
    const obj = JSON.parse(texto.slice(inicio, fin + 1));
    if (typeof obj !== "object" || obj === null) return fallback;
    return { enfoque: typeof obj["enfoque"] === "string" ? obj["enfoque"] : "" };
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let historial: Msg[] = [];
        let baseUrl: string | undefined;
        let orquestacion: ReturnType<typeof orquestarModelos>;
        try {
          baseUrl = request.url ? new URL(request.url).origin : undefined;
          const body = (await request.json()) as { messages?: Msg[]; model?: string };
          historial = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
          orquestacion = orquestarModelos(body.model);
        } catch {
          return new Response("Solicitud inválida.", { status: 400 });
        }
        if (historial.length === 0) return new Response("Faltan mensajes.", { status: 400 });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (obj: unknown) =>
              controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

            const promptSkillsSalida = orquestacion.promptSkillsSalida;
            const promptSkillsPlanner = orquestacion.promptSkillsPlanner;

            const messages: ApiMsg[] = [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "system", content: SITE_CONTEXT },
              ...(promptSkillsSalida
                ? [{ role: "system" as const, content: promptSkillsSalida }]
                : []),
              ...historial.map((m) => ({ role: m.role, content: m.content })),
            ];

            // Mensajes del agente de razonamiento (ultra): lleva su propio prompt de planificación.
            const agentMessages: ApiMsg[] = [
              { role: "system", content: PLANNER_PROMPT },
              { role: "system", content: SITE_CONTEXT },
              ...(promptSkillsPlanner
                ? [{ role: "system" as const, content: promptSkillsPlanner }]
                : []),
              ...historial.map((m) => ({ role: m.role, content: m.content })),
            ];

            // ---- Validación obligatoria de causas de mercado (Tarea 5) ----
            const ultimoUser = [...historial].reverse().find((m) => m.role === "user");
            const pregunta = ultimoUser?.content ?? "";
            const esPreguntaDeCausa =
              /(?:por\s*qu[eé]|cu[aá]l\s*(?:es\s*)?(?:la\s*)?causa|qu[eé]\s*pas[oó]\s*(?:con)?)\s*.*?(?:cay[oó]|subi[oó]|baj[oó]|se\s+mov[ií]o|se\s+derrumb[oó]|se\s+hund[ií]o|se\s+dispar[oó]|salt[oó]|rebot[oó]|perdi[oó]|gan[oó])|qu[eé]\s*pas[oó]\s+con/i.test(
                pregunta,
              );
            let causaVerificada = false;

            // ---- Seguimiento del DCF: si se calcula, validar SIEMPRE contra el valor real de mercado ----
            let dcfEmpresa = "";
            let dcfValidadoWeb = false;

            // ---- Valoración real: si la pregunta pide "valor intrínseco de X" y NO se calculó con datos reales, se fuerza la herramienta ----
            const esPreguntaValoracion =
              /(?:valor\s+intr[íi]nsec|cu[aá]nto\s+vale|cu[aá]l\s+es\s+el\s+valor|analiz[aá]\s+el\s+valor|dcf\s+de\s+|flujo\s+de\s+caja\s+descontad|valuaci[oó]n|valorar\s+la\s+empresa|valor\s+de\s+la\s+empresa|valor\s+por\s+acci[oó]n)/i.test(
                pregunta,
              );
            let valoracionCalculada = false;
            let valoracionFallida = false;
            let textoValoracionFallida = "";

            // ---- Pre-RAG: inyectar contexto relevante de la base de conocimiento antes de llamar a los modelos ----
            try {
              const [contextoSitio, contextoAcademico] = await Promise.all([
                buscarEnBase(pregunta),
                buscarAcademico(pregunta, 5, baseUrl),
              ]);
              const contextoRag: ResultadoConocimiento[] = [...contextoSitio, ...contextoAcademico];
              if (contextoRag.length) {
                const contenidoRag = contextoRag
                  .map((r) => {
                    if (esAcademico(r)) {
                      return `- [${r.categoria} · ${r.archivo} · pág. ${r.pagina}] ${r.texto}`;
                    }
                    return `- ${r.texto}`;
                  })
                  .join("\n");
                const ragMsg: ApiMsg = {
                  role: "system",
                  content: `Contexto recuperado de la base de conocimiento interna del sitio y del material académico indexado (USALO solo si corresponde a la pregunta; puede no aplicar):\n${contenidoRag}`,
                };
                agentMessages.push(ragMsg);
                messages.push(ragMsg);
              }
            } catch {
              /* si el embebido falla, se sigue sin contexto RAG */
            }

            // ---- Agente de razonamiento (ultra): decide Y ejecuta las herramientas ----
            let enfoque = "";
            try {
              for (let ronda = 0; ronda < 4; ronda++) {
                const planRes = await llamarPlanner(
                  NVIDIA_API_KEY,
                  orquestacion.modeloPlanner,
                  agentMessages,
                  true,
                );
                const planData = (await planRes.json()) as {
                  choices?: Array<{
                    message?: {
                      content?: string;
                      tool_calls?: Array<{
                        id?: string;
                        function?: { name?: string; arguments?: string };
                      }>;
                    };
                  }>;
                };
                const planMsg = planData.choices?.[0]?.message;
                const planCalls = planMsg?.tool_calls ?? [];
                if (!planCalls.length) {
                  enfoque = parsearPlan(planMsg?.content ?? "").enfoque;
                  break;
                }
                const agentCallMsg: ApiMsg = {
                  role: "assistant",
                  content: planMsg?.content ?? "",
                  tool_calls: planCalls,
                };
                agentMessages.push(agentCallMsg);
                messages.push(agentCallMsg);
                for (const call of planCalls) {
                  let query = "";
                  let periodo = "";
                  const rawArgs = call.function?.arguments ?? "";
                  try {
                    const args = JSON.parse(rawArgs) as {
                      query?: string;
                      periodo?: string;
                    };
                    query = String(args.query ?? "");
                    periodo = String(args.periodo ?? "");
                  } catch {
                    /* sin query */
                  }
                  const name = call.function?.name;
                  const esMercado = name === "consultar_mercado";
                  const esNoticias = name === "buscar_noticias";
                  const esBase = name === "consultar_base_conocimiento";
                  const esDcf = name === "calcular_dcf";
                  const esValoracion = name === "valor_intrinseco_real";
                  send({
                    t: "status",
                    v: esMercado
                      ? "mercado"
                      : esNoticias
                        ? "noticias"
                        : esBase
                          ? "base_conocimiento"
                          : esDcf
                            ? "dcf"
                            : esValoracion
                              ? "valoracion"
                              : "searching",
                    q: query,
                  });
                  let resValoracion: Awaited<ReturnType<typeof ejecutarValorIntrinseco>> | null =
                    null;
                  let texto = "";
                  let fuentes: FuenteMercado[] = [];
                  if (esMercado) ({ texto, fuentes } = await ejecutarMercado(query));
                  else if (esNoticias)
                    ({ texto, fuentes } = await ejecutarNoticias(query, periodo));
                  else if (esBase) ({ texto, fuentes } = await ejecutarBaseConocimiento(query));
                  else if (esDcf) ({ texto, fuentes } = await ejecutarDCF(rawArgs));
                  else if (esValoracion) {
                    resValoracion = await ejecutarValorIntrinseco(rawArgs);
                    texto = resValoracion.texto;
                    fuentes = resValoracion.fuentes;
                    if (!resValoracion.ok) valoracionFallida = true;
                  } else ({ texto, fuentes } = await ejecutarBusqueda(query));
                  if (fuentes.length) send({ t: "sources", v: fuentes });
                  if (esDcf) {
                    try {
                      const args = JSON.parse(rawArgs) as { empresa?: string };
                      dcfEmpresa = String(args.empresa ?? "");
                    } catch {
                      /* sin empresa */
                    }
                    if (dcfEmpresa) {
                      const valida = await validarDCFEnWeb(dcfEmpresa).catch(() => null);
                      if (valida && valida.texto) {
                        dcfValidadoWeb = true;
                        if (valida.fuentes.length) send({ t: "sources", v: valida.fuentes });
                        const validaMsg: ApiMsg = {
                          role: "tool",
                          tool_call_id: `dcf_validacion_${call.id ?? "0"}`,
                          name: "buscar_web",
                          content: `Datos reales de mercado para validar el DCF de "${dcfEmpresa}" (fuentes externas):\n\n${valida.texto}`,
                        };
                        agentMessages.push(validaMsg);
                        messages.push(validaMsg);
                      }
                    }
                  }
                  const toolMsg: ApiMsg = {
                    role: "tool",
                    tool_call_id: call.id ?? "0",
                    name: name ?? "buscar_web",
                    content: `Datos reales de ${
                      esMercado
                        ? "las cotizaciones consultadas"
                        : esNoticias
                          ? `las noticias sobre "${query}"${periodo ? ` (período: ${periodo})` : ""}`
                          : esBase
                            ? `la información interna del sitio sobre "${query}"`
                            : esDcf
                              ? "la valoración DCF calculada con los supuestos indicados"
                              : esValoracion
                                ? `la valoración con datos reales de Yahoo Finance, metodología del paper y noticias de sustento (fuentes externas). Interpretá el resultado comparando precio actual, valor calculado y consenso de analistas, y validalo con las noticias y la validación web adjuntas; señalá si el valor difiere del precio de mercado y por qué. No inventes cifras: si algo no está en estos datos, decilo con honestidad.`
                                : `la búsqueda "${query}"`
                    } (fuentes externas):\n\n${texto}`,
                  };
                  agentMessages.push(toolMsg);
                  messages.push(toolMsg);
                  if (esPreguntaDeCausa && esNoticias) causaVerificada = true;
                  if (esValoracion) valoracionCalculada = true;
                }
                send({ t: "status", v: "thinking" });
              }
            } catch {
              /* si falla el agente ultra, se sigue sin plan */
            }

            // ---- Tarea 5: red de seguridad - forzar búsqueda de causa si el agente no la hizo ----
            if (esPreguntaDeCausa && !causaVerificada) {
              causaVerificada = true;
              const activo = extraerActivo(pregunta);
              const callId = `causa_${Date.now()}`;
              messages.push({
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: callId,
                    function: {
                      name: "buscar_noticias",
                      arguments: JSON.stringify({ query: activo, periodo: "hoy" }),
                    },
                  },
                ],
              });
              send({ t: "status", v: "noticias", q: activo });
              const noticias = await ejecutarNoticias(activo, "hoy");
              if (noticias.fuentes.length) send({ t: "sources", v: noticias.fuentes });
              messages.push({
                role: "tool",
                tool_call_id: callId,
                name: "buscar_noticias",
                content: `Datos reales de las noticias sobre "${activo}" (período: hoy) (fuentes externas):\n\n${noticias.texto}`,
              });
              send({ t: "status", v: "thinking" });
            }

            // ---- DCF: red de seguridad - si se calculó pero no se validó contra el mercado, forzar validación web ----
            if (dcfEmpresa && !dcfValidadoWeb) {
              const callId = `dcf_validacion_${Date.now()}`;
              messages.push({
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: callId,
                    function: {
                      name: "buscar_web",
                      arguments: JSON.stringify({
                        query: `${dcfEmpresa} acción cotización precio actual valor de mercado`,
                      }),
                    },
                  },
                ],
              });
              send({ t: "status", v: "searching", q: dcfEmpresa });
              const valida = await validarDCFEnWeb(dcfEmpresa).catch(() => null);
              if (valida && valida.fuentes.length) send({ t: "sources", v: valida.fuentes });
              messages.push({
                role: "tool",
                tool_call_id: callId,
                name: "buscar_web",
                content: `Datos reales de mercado para validar el DCF de "${dcfEmpresa}" (fuentes externas):\n\n${
                  valida?.texto ??
                  "SIN RESULTADOS: no se pudo validar el valor de mercado en la web."
                }`,
              });
              dcfValidadoWeb = true;
              send({ t: "status", v: "thinking" });
            }

            // ---- Valoración: red de seguridad - si la pregunta pide valor intrínseco y NO se calculó con datos reales, forzarlo ----
            if (esPreguntaValoracion && !valoracionCalculada) {
              const simboloExtraido = extraerTickerPregunta(pregunta);
              if (simboloExtraido) {
                valoracionCalculada = true;
                const callId = `valor_intrinseco_${Date.now()}`;
                const argsVal = JSON.stringify({ simbolo: simboloExtraido });
                messages.push({
                  role: "assistant",
                  content: "",
                  tool_calls: [
                    {
                      id: callId,
                      function: { name: "valor_intrinseco_real", arguments: argsVal },
                    },
                  ],
                });
                send({ t: "status", v: "valoracion", q: simboloExtraido });
                const resultado = await ejecutarValorIntrinseco(argsVal);
                if (!resultado.ok) {
                  valoracionFallida = true;
                  textoValoracionFallida = resultado.textoUsuario;
                }
                if (resultado.fuentes.length) send({ t: "sources", v: resultado.fuentes });
                messages.push({
                  role: "tool",
                  tool_call_id: callId,
                  name: "valor_intrinseco_real",
                  content: `Valoración con datos reales de Yahoo Finance, metodología del paper y noticias de sustento (fuentes externas). Interpretá el resultado comparando precio actual, valor calculado y consenso de analistas, y validalo con las noticias y la validación web adjuntas; señalá si el valor difiere del precio de mercado y por qué. No inventes cifras:\n\n${resultado.texto}`,
                });
                send({ t: "status", v: "thinking" });
              }
            }

            // El enfoque del agente llega al modelo de salida como guía de redacción.
            if (enfoque.trim()) {
              messages.push({
                role: "user",
                content: `[Guía del análisis previo] ${enfoque.trim()}`,
              });
            }

            // ---- Valoración: si la pregunta pedía valor intrínseco y el cálculo con datos reales FALLÓ,
            //      responder con mensaje determinístico honesto (sin depender del modelo, sin inventar cifras). ----
            if (valoracionFallida) {
              send({
                t: "text",
                v:
                  textoValoracionFallida ||
                  "No se pudo completar la valoración con datos reales en este momento.",
              });
              controller.close();
              return;
            }

            try {
              // ---- Modelo de salida (lightning): redacta la respuesta final SIN tools, anclado en los resultados del agente ----
              let final = "";
              for (let intento = 0; intento < 2; intento++) {
                const res = await llamar(
                  NVIDIA_API_KEY,
                  orquestacion.modeloSalida,
                  messages,
                  false,
                );
                if (!res.ok) {
                  const detail = await res.text().catch(() => "");
                  console.error("AI gateway error", res.status, detail.slice(0, 500));
                  send({
                    t: "text",
                    v:
                      res.status === 429
                        ? "Hay muchas consultas en este momento. Esperá unos segundos y volvé a intentar."
                        : "El asistente no está disponible ahora mismo. Podés escribirle directo a Cintia por WhatsApp.",
                  });
                  controller.close();
                  return;
                }
                const data = (await res.json()) as {
                  choices?: Array<{ message?: { content?: string } }>;
                };
                final = (data.choices?.[0]?.message?.content ?? "").trim();
                if (final) break;
              }

              // ---- Tarea 8: bloqueo de respuesta si aparecen rótulos de estructura interna ----
              const ROTULOS_ESTRUCTURA =
                /PARTE\s*\(\s*[abc]\)|\bDatos\s+concretos\b|\bConexi[oó]n\s+con\s+el\s+servicio\b|\bCierre\s+suave\b/i;
              if (final && ROTULOS_ESTRUCTURA.test(final)) {
                final = "";
              }

              if (!final) {
                final =
                  "No pude generar una respuesta confiable para eso. Podés escribirle directo a Cintia por WhatsApp.";
              }
              // Emitimos el texto en chunks para que se vea escribiendo.
              for (let i = 0; i < final.length; i += 24) {
                send({ t: "text", v: final.slice(i, i + 24) });
                await new Promise((r) => setTimeout(r, 12));
              }
            } catch (err) {
              console.error("chat error", err);
              send({ t: "text", v: "\n\n_Se interrumpió la respuesta._" });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
