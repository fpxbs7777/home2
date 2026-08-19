// Build del índice académico precomputado (embeddings NVIDIA) para el RAG del chat.
// Lee pt/TXT/*.txt, arma chunks por archivo+página, genera embeddings y escribe
// public/kb/academic-index.json (vectores base64 Float32 + texto + metadata).
//
// Uso: node scripts/build-kb-index.mjs [carpetaTxt] [salida]
//  - carpetaTxt: ruta a la carpeta con los TXT (default: ../../pt/TXT relativo a este script)
//  - salida: ruta del JSON generado (default: ../public/kb/academic-index.json)
// El script es reanudable: guarda progreso en <salida>.progress.json

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carpetaTxt = resolve(process.argv[2] ?? join(__dirname, "..", "..", "pt", "TXT"));
const salida = resolve(
  process.argv[3] ?? join(__dirname, "..", "public", "kb", "academic-index.json"),
);
const progreso = join(__dirname, ".kb-index.progress.json");

const EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const EMBED_MODEL = "nvidia/nemotron-3-embed-1b";
const NVIDIA_API_KEY =
  process.env["NVIDIA_API_KEY"] ??
  "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";

const LOTE = 8; // concurrencia de llamadas
const MAX_CHARS = 2200; // tamaño objetivo por chunk

function normalizar(v) {
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return Float32Array.from(v.map((x) => x / norma));
}

// Convierte Float32Array a base64 Float16 (mitad del tamaño).
function base64F16(v) {
  const f32 = new Float32Array(v);
  const u16 = new Uint16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    u16[i] = float32ToFloat16(f32[i]);
  }
  return Buffer.from(new Uint8Array(u16.buffer)).toString("base64");
}

// IEEE 754: Float32 -> Float16 (aproximación estándar, preserva orden y signo).
function float32ToFloat16(val) {
  const f = new Float32Array(1);
  const bits = new Uint32Array(f.buffer);
  f[0] = val;
  const x = bits[0];
  const sign = (x >>> 16) & 0x8000;
  const exp = (x >>> 23) & 0xff;
  let mant = x & 0x7fffff;
  if (exp === 0) return sign;
  if (exp === 0x7ff) {
    return sign | 0x7c00 | (mant ? 0x200 : 0);
  }
  // normalizamos
  const e16 = exp - 127 + 15;
  if (e16 >= 31) return sign | 0x7c00; // inf
  if (e16 <= 0) {
    // subnormal f16
    if (e16 < -10) return sign;
    mant |= 0x800000;
    let shift = 14 - e16;
    let m = mant >> shift;
    const rem = mant & ((1 << shift) - 1);
    if (rem > 0x1000 || (rem === 0x1000 && m & 1)) m++;
    return sign | m;
  }
  let m16 = mant >> 13;
  const rem = mant & 0x1fff;
  if (rem > 0x1000 || (rem === 0x1000 && m16 & 1)) m16++;
  if (m16 > 0x3ff) {
    // redondeo a exponente siguiente
    return sign | ((e16 + 1) << 10);
  }
  return sign | (e16 << 10) | m16;
}

function limpiarPagina(texto) {
  const lineas = texto.split(/\r?\n/);
  const ruidoFooter =
    /^este material se utiliza con fines|^exclusivamente did[áa]cticos|^este material es para uso de la universidad/i;
  const limpias = [];
  let numerosConsecutivos = 0;
  for (const raw of lineas) {
    const l = raw.trim();
    if (!l) continue;
    if (/^(=+|-+)\s*$/.test(l)) continue; // separadores de encabezado
    if (/^\d+\s*$/.test(l)) {
      numerosConsecutivos++;
      if (numerosConsecutivos <= 1) continue; // número de página aislado
    }
    if (/^\[\s*pagina \d+\/\d+\s*\]$/i.test(l)) continue; // marcador de página
    if (ruidoFooter.test(l)) continue;
    numerosConsecutivos = 0;
    limpias.push(l);
  }

  // Detección de tablas de contenido: muchas líneas con secuencias de puntos
  // ("Contenido......... 12") indican páginas TOC/índice: se descartan.
  const lineasConPuntos = limpias.filter((l) => /\.{3,}/.test(l)).length;
  if (lineasConPuntos >= 2 && lineasConPuntos / Math.max(1, limpias.length) >= 0.3) {
    return "";
  }

  return limpias
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Convierte el TXT completo en chunks con metadata + key única.
function parsearTxt(contenido, categoriaDef) {
  const chunks = [];
  let categoria = categoriaDef;
  let archivo = "";
  const lineas = contenido.split(/\r?\n/);
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i].trim();
    const mCat = l.match(/^CATEGORIA:\s*(.+)$/i);
    if (mCat) {
      categoria = mCat[1].trim();
      i++;
      continue;
    }
    const mArch = l.match(/^ARCHIVO:\s*(.+)$/i);
    if (mArch) {
      archivo = mArch[1].trim();
      i++;
      continue;
    }
    const mPag = l.match(/^\[?\s?Pagina\s+(\d+)\s*\/\s*(\d+)\s*\]?\s*$/i);
    if (mPag) {
      const pagina = Number(mPag[1]);
      const totalPag = Number(mPag[2]);
      const cuerpo = [];
      i++;
      while (i < lineas.length) {
        const sig = lineas[i].trim();
        if (/^\[?\s?Pagina\s+\d+\s*\/\s*\d+\s*\]?\s*$/i.test(sig) || /^ARCHIVO:/i.test(sig)) break;
        cuerpo.push(lineas[i]);
        i++;
      }
      const texto = limpiarPagina(cuerpo.join("\n"));
      if (texto.length >= 120) {
        chunks.push({ categoria, archivo, pagina, totalPag, texto });
      }
      continue;
    }
    i++;
  }
  return chunks;
}

// Subdivide chunks demasiado largos conservando metadata (pagina + offset).
function subdividir(chunks) {
  const out = [];
  for (const c of chunks) {
    if (c.texto.length <= MAX_CHARS) {
      out.push(c);
      continue;
    }
    let restante = c.texto;
    let offset = 0;
    while (restante.length > 0) {
      let corte = MAX_CHARS;
      if (restante.length > MAX_CHARS) {
        const punto = restante.lastIndexOf(" ", MAX_CHARS);
        if (punto > MAX_CHARS * 0.6) corte = punto;
      }
      const pedazo = restante.slice(0, corte).trim();
      if (pedazo) {
        out.push({ ...c, offset, texto: pedazo });
      }
      restante = restante.slice(corte).trim();
      offset++;
    }
  }
  return out;
}

// Asigna key única por chunk.
function asignarKeys(todos) {
  const conteos = new Map();
  for (const c of todos) {
    const base = `${c.categoria}::${c.archivo}::${c.pagina}::${c.offset ?? 0}`;
    const n = conteos.get(base) ?? 0;
    conteos.set(base, n + 1);
    c.key = `${base}::${n}`;
  }
  return todos;
}

async function run() {
  if (!existsSync(carpetaTxt)) throw new Error("No existe la carpeta de TXT: " + carpetaTxt);
  const archivosTxt = readdirSync(carpetaTxt).filter((f) => f.toLowerCase().endsWith(".txt"));
  if (!archivosTxt.length) throw new Error("No hay TXT en " + carpetaTxt);

  console.log("Carpeta TXT:", carpetaTxt);
  const todos = [];
  for (const f of archivosTxt) {
    const contenido = readFileSync(join(carpetaTxt, f), "utf8");
    todos.push(...subdividir(parsearTxt(contenido, f.replace(/\.txt$/i, ""))));
  }
  asignarKeys(todos);
  console.log("Chunks totales:", todos.length);

  const previo = existsSync(progreso) ? JSON.parse(readFileSync(progreso, "utf8")) : null;
  const hechos = new Map(previo?.vectorizados ?? []);
  const pendientes = todos.filter((c) => !hechos.has(c.key));
  console.log("Ya vectorizados:", hechos.size, "| pendientes:", pendientes.length);

  const guardarProgreso = () => {
    mkdirSync(dirname(progreso), { recursive: true });
    writeFileSync(progreso, JSON.stringify({ vectorizados: [...hechos.entries()] }));
  };

  const inicio = Date.now();
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < pendientes.length; i += LOTE) {
    const lote = pendientes.slice(i, i + LOTE);
    let exito = false;
    for (let intento = 0; intento < 4 && !exito; intento++) {
      try {
        const resp = await fetch(EMBED_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + NVIDIA_API_KEY,
          },
          body: JSON.stringify({ model: EMBED_MODEL, input: lote.map((c) => c.texto) }),
        });
        if (!resp.ok) throw new Error("embedding http " + resp.status);
        const data = await resp.json();
        const embs = (data.data ?? []).map((d) => d.embedding);
        embs.forEach((emb, j) => {
          if (!emb || emb.length === 0) return;
          const c = lote[j];
          if (!c) return;
          hechos.set(c.key, { b64: base64F16(normalizar(emb)), dims: emb.length });
        });
        exito = true;
      } catch (err) {
        console.warn(`lote ${i / LOTE} intento ${intento + 1}: ${err.message}`);
        await dormir(2000 * (intento + 1));
      }
    }
    if (!exito) {
      // reintento individual
      for (const c of lote) {
        for (let intento = 0; intento < 3; intento++) {
          try {
            const resp = await fetch(EMBED_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + NVIDIA_API_KEY,
              },
              body: JSON.stringify({ model: EMBED_MODEL, input: [c.texto] }),
            });
            if (resp.ok) {
              const data = await resp.json();
              const emb = data.data?.[0]?.embedding;
              if (emb?.length)
                hechos.set(c.key, { b64: base64F16(normalizar(emb)), dims: emb.length });
              break;
            }
          } catch {
            /* sin emb en este intento */
          }
          await dormir(1500);
        }
      }
    }
    await dormir(150); // separación mínima entre lotes
    if ((i / LOTE) % 5 === 0 || i + LOTE >= pendientes.length) {
      guardarProgreso();
      const seg = Math.round((Date.now() - inicio) / 1000);
      console.log(`Progreso: ${hechos.size}/${todos.length} (${seg}s)`);
    }
  }
  guardarProgreso();

  const indice = {
    modelo: EMBED_MODEL,
    dims: [...hechos.values()].find((h) => h.dims)?.dims ?? 0,
    fecha: new Date().toISOString(),
    chunks: todos
      .map((c) => {
        const v = hechos.get(c.key);
        if (!v) return null;
        return {
          categoria: c.categoria,
          archivo: c.archivo.replace(/\.pdf$/i, ""),
          pagina: c.pagina,
          offset: c.offset ?? 0,
          texto: c.texto,
          v: v.b64,
        };
      })
      .filter(Boolean),
  };

  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, JSON.stringify(indice));
  console.log("Índice escrito:", salida, "| chunks:", indice.chunks.length, "| dims:", indice.dims);
}

run().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
