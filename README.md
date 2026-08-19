# Cintia Boos Advisor

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cintia Boos · Agente Productora CNV 2192</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #070b10;
    --grid: #16222E;
    --teal: #7FE8C9;
    --rose: #E3A8C2;
    --gold: #D9B36C;
    --ink: #F5F1E8;
    --ink-soft: #9AA5B1;
    --nav-h: 60px;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    color: var(--ink);
    min-height: 100vh;
    background-color: var(--bg);
    /* Foto real de gráfico financiero (Unsplash, licencia libre) */
    background-image:
      linear-gradient(180deg, rgba(5,9,14,0.88) 0%, rgba(5,9,14,0.93) 45%, rgba(5,9,14,0.97) 100%),
      url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?fm=jpg&q=80&w=1600&auto=format&fit=crop');
    background-repeat: no-repeat;
    background-position: top center;
    background-size: cover;
    background-attachment: fixed;
  }

.cb-wrap { max-width: 460px; margin: 0 auto; padding: 26px 20px 40px; }

/* ===== Tabs de navegación ===== */
.cb-nav-outer {
position: sticky;
top: 0;
z-index: 20;
background: rgba(7,11,16,0.82);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border-bottom: 1px solid rgba(127,232,201,0.12);
}
.cb-nav {
max-width: 460px;
margin: 0 auto;
height: var(--nav-h);
display: flex;
align-items: center;
gap: 6px;
overflow-x: auto;
padding: 0 14px;
scrollbar-width: none;
}
.cb-nav::-webkit-scrollbar { display: none; }
.cb-tab {
flex: none;
border: none;
background: transparent;
font-family: 'Inter', sans-serif;
text-decoration: none;
font-size: 11.5px;
letter-spacing: 0.06em;
text-transform: uppercase;
color: var(--ink-soft);
padding: 8px 14px;
border: 1px solid var(--grid);
border-radius: 999px;
white-space: nowrap;
cursor: pointer;
transition: color .15s ease, border-color .15s ease, background .15s ease;
}
.cb-tab:hover { color: var(--teal); border-color: rgba(127,232,201,0.4); }
.cb-tab.active {
color: #06110d;
background: var(--teal);
border-color: var(--teal);
font-weight: 600;
}

/* ===== Contenido por panel ===== */
.cb-panel { display: none; animation: cbfade .25s ease; }
.cb-panel.active { display: block; }
@keyframes cbfade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.cb-kicker {
font-size: 11px;
letter-spacing: 0.18em;
text-transform: uppercase;
color: var(--teal);
text-align: center;
margin-bottom: 18px;
}

.cb-avatar {
width: 84px;
height: 84px;
border-radius: 50%;
margin: 0 auto 16px;
display: flex;
align-items: center;
justify-content: center;
font-family: 'Playfair Display', serif;
font-size: 28px;
font-style: italic;
color: #06110d;
background: linear-gradient(135deg, var(--teal), #5fc9a8);
box-shadow: 0 0 0 1px rgba(127,232,201,0.25), 0 8px 30px rgba(0,0,0,0.4);
}

.cb-name {
font-family: 'Playfair Display', serif;
font-size: 28px;
text-align: center;
margin: 0 0 4px;
font-weight: 600;
}
.cb-name em { color: var(--teal); font-style: italic; font-weight: 500; }

.cb-sub {
text-align: center;
color: var(--ink-soft);
font-size: 13px;
line-height: 1.5;
margin: 0 0 26px;
}

.cb-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--grid) 20%, var(--grid) 80%, transparent); margin: 26px 0; }

.cb-btn {
display: block;
text-decoration: none;
background: rgba(245,241,232,0.035);
border: 1px solid var(--grid);
border-radius: 12px;
padding: 15px 16px;
margin-bottom: 10px;
backdrop-filter: blur(4px);
-webkit-backdrop-filter: blur(4px);
transition: border-color .15s ease, transform .15s ease, background .15s ease;
}
.cb-btn:hover, .cb-btn:active { border-color: var(--teal); transform: translateY(-1px); background: rgba(127,232,201,0.05); }

.cb-btn-title { color: var(--ink); font-size: 14.5px; font-weight: 600; margin: 0 0 2px; }
.cb-btn-sub { color: var(--ink-soft); font-size: 12.5px; margin: 0; line-height: 1.4; }

.cb-btn.primary { background: rgba(127,232,201,0.09); border-color: rgba(127,232,201,0.35); }
.cb-btn.primary .cb-btn-title { color: var(--teal); }

.cb-section-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 4px 4px; }
.cb-section-note { font-size: 11.5px; color: var(--ink-soft); opacity: 0.8; margin: 0 0 14px 4px; line-height: 1.4; }

.cb-alliance { border-left: 2px solid var(--accent, var(--teal)); }
.cb-alliance.web { --accent: var(--teal); }
.cb-alliance.legal { --accent: var(--rose); }

.cb-tag { display: inline-block; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent, var(--teal)); margin-bottom: 6px; }

.cb-detail-list { list-style: none; margin: 10px 0 0; padding: 10px 0 0; border-top: 1px solid var(--grid); }
.cb-detail-list li { font-size: 12px; color: var(--ink-soft); line-height: 1.5; padding-left: 12px; position: relative; margin-bottom: 4px; }
.cb-detail-list li::before { content: '—'; position: absolute; left: 0; color: var(--accent, var(--teal)); }
.cb-detail-list li:last-child { margin-bottom: 0; }
.cb-detail-list b { color: var(--ink); font-weight: 600; }

.cb-responsible { font-size: 11px; color: var(--ink-soft); opacity: 0.8; margin: 8px 0 0; font-style: italic; }

.cb-service { border-left: 2px solid var(--teal); }

.cb-static { cursor: default; }
.cb-static:hover, .cb-static:active { border-color: var(--grid); transform: none; background: rgba(245,241,232,0.035); }

.cb-broker-grid { display: flex; gap: 10px; margin-bottom: 8px; }
.cb-broker { flex: 1; text-decoration: none; border: 1px solid var(--grid); border-radius: 12px; padding: 14px 8px; text-align: center; transition: border-color .15s ease; background: rgba(245,241,232,0.02); }
.cb-broker:hover, .cb-broker:active { border-color: var(--teal); }
.cb-broker-logo { width: 100%; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; letter-spacing: 0.02em; margin-bottom: 8px; }
.cb-broker-mat { font-size: 9.5px; color: var(--ink-soft); line-height: 1.4; }

.cb-tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
.cb-instrument { font-size: 11px; color: var(--ink); background: rgba(127,232,201,0.07); border: 1px solid rgba(127,232,201,0.25); border-radius: 999px; padding: 6px 11px; }

.cb-footer { text-align: center; margin-top: 32px; font-size: 11px; color: var(--ink-soft); opacity: 0.7; line-height: 1.6; }
.cb-footer strong { color: var(--ink-soft); opacity: 1; }

/* Mobile fine-tuning */
@media (max-width: 380px) {
.cb-wrap { padding: 20px 14px 32px; }
.cb-name { font-size: 24px; }
.cb-avatar { width: 72px; height: 72px; font-size: 24px; }
.cb-tab { font-size: 11px; padding: 7px 12px; }
.cb-btn-title { font-size: 14px; }
}

      Contacto
      Servicios
      Instrumentos
      Brokers
      Alianzas

Agente Productora CNV · Mat. N° 2192

CB

Cintia Boos

Asesoramiento patrimonial personalizado.
Buenos Aires, Argentina.

Escribime por WhatsApp

Asesoramiento sin costo para vos, siempre — Ley 26.831

Canal de recomendaciones

Ideas de inversión en pesos y dólares

LinkedIn

Trayectoria profesional y trayectoria como Agente Productora

Verificá mi matrícula

Mi perfil público en el Registro de Agentes · CNV

Mis servicios

Como Agente Productora, mi actividad se remunera vía el bróker — nunca con un cargo directo a vos.

        Primer contacto

Consulta y asesoramiento

Diagnóstico de tu cartera, definición de tu perfil de riesgo y primeros pasos

        Construcción

Armado de carteras

A medida, combinando bonos, acciones, CEDEARs y money market según tu horizonte y moneda

        Seguimiento

Gestión activa de cartera

Seguimiento profesional dentro de tu perfil de riesgo, con reportes periódicos

        Delegación

Mandato discrecional

Delegás la ejecución de las decisiones de inversión dentro del perfil y los límites que definimos juntos, mediante contrato de comitente con el bróker

        Dolarización

Flujo de fondos en USD

Renta en dólares a partir de bonos y obligaciones negociables, para ingresos periódicos predecibles

        Eficiencia

Optimización de carteras

Reacomodo tu cartera actual con modelos cuantitativos de asignación de activos

        Análisis

Análisis financiero

Fundamental y técnico de bonos, acciones y CEDEARs para acompañar tus decisiones

Instrumentos que podés operar

        Bonos soberanos
        Obligaciones negociables
        Acciones locales (BCBA)
        Acciones internacionales (NYSE/NASDAQ)
        CEDEARs
        ADRs (Argentina, Brasil, Chile, México, otros)
        ETFs (EE.UU., desarrollados, emergentes, sectoriales)
        Letras del Tesoro
        Fondos comunes / Money market
        Cauciones bursátiles
        Cheques de pago diferido
        Opciones

Opero a través de

Toda operación se ejecuta en tu cuenta comitente, en el bróker registrado en CNV que elijas.

BALANZ

ALyC Integral
Mat. CNV N° 210

inviu

ALyC Integral
Mat. CNV N° 205

IOL

ALyC Integral
Mat. CNV N° 273

Alianzas

Servicios prestados por profesionales independientes, ajenos a mi actividad regulada por la CNV.

        Presencia digital

Franco Lamas · Desarrollo de software

Sitios, landing pages y aplicaciones a medida · stack Python, PHP, Laravel

Landing page: una página, responsive, con SEO

Sitio completo: multi-página, panel de administración e integraciones

Apps a medida: desarrollo, DevOps y mantenimiento (SRE)

Hosting incluido los primeros meses, con costo mensual luego

Franco Lamas · Developer · DevOps · SRE

        Recupero de criptoestafas

Estudio Jurídico Dr. Pupi Cervio

Si te estafaron con criptoactivos, te conecto con representación penal especializada

Representación penal del caso (abogado penalista)

Rastreo forense de fondos y billeteras

Presentación de la denuncia y seguimiento judicial

Dr. Santiago Luis Pupi · Abogado penalista

      AP CNV — Mat. N° 2192

      Primero verificá el registro. Siempre.

Quiero que crees un sitio web de asesoramiento financiero para Cintia Boos, Agente Productora CNV Mat. N° 2192, en Buenos Aires, Argentina. Es una landing de una sola página cuyo único objetivo de negocio es que la persona que llega termine escribiendo por WhatsApp.

STACK Y DESPLIEGUE

- Desplegable directo en Vercel desde el repositorio de GitHub, sin pasos manuales de configuración.

- HTML/CSS/JS o React liviano, mobile-first, una sola página con secciones ancladas (no rutas separadas).

- Rápido: imágenes optimizadas, sin librerías innecesarias, primer contenido visible en menos de 2 segundos.

DISEÑO VISUAL

- Tema dark financiero, minimalista, profesional y formal.

- Fondo con foto financiera real (gráfico de mercado, velas, pantalla de trading) con overlay oscuro para legibilidad.

- Paleta: fondo casi negro (#070b10), acento verde-teal (#7FE8C9), detalle rosa suave (#E3A8C2) y dorado (#D9B36C) para jerarquías puntuales, texto marfil (#F5F1E8).

- Tipografía serif elegante en títulos (tipo Playfair Display) + sans-serif en cuerpo (tipo Inter).

- Navegación tipo tabs sticky arriba: Contacto, Servicios, Instrumentos, Brokers, Alianzas.

- Micro-interacciones sutiles en hover/tap (elevar tarjeta, cambiar borde), nada estridente.

PRINCIPIO RECTOR DE LA ESTRUCTURA: los primeros segundos deciden si la persona se queda

La persona forma una impresión de si esto es serio o no antes de leer una sola palabra: por el orden visual, el contraste, y qué tan ordenado se ve todo. Por eso:

- El header y el primer bloque visible (sin necesidad de scroll en desktop, y con scroll mínimo en mobile) tienen que comunicar en simultáneo: quién es Cintia, que está matriculada en CNV, y un botón de WhatsApp bien visible. Nada de textos largos antes de esto.

- Todo texto de la página debe poder leerse en pocos segundos por bloque: frases cortas, sin relleno, sin adjetivos vacíos ("solución integral", "lo mejor para vos"). Cada bloque dice UNA cosa concreta.

ESTRUCTURA Y CONTENIDO (orden pensado para construir confianza de forma creciente)

1. Header de identidad

   - Sello "Agente Productora CNV · Mat. N° 2192" siempre visible.

   - Avatar/inicial, "Cintia Boos", descripción corta: "Asesoramiento patrimonial personalizado. Buenos Aires, Argentina."

2. Bloque de contacto (arriba, y repetido al final + botón flotante en mobile)

   - CTA principal: "Escribime por WhatsApp", con la línea de abajo: "Asesoramiento sin costo para vos, siempre — Ley 26.831" (neutraliza la objeción de costo antes de que aparezca en la cabeza del visitante).

   - Canal de recomendaciones.

   - LinkedIn.

   - "Verificá mi matrícula" con link al registro público CNV — visualmente distinto (ícono de check o borde propio), porque es el elemento que más peso de confianza aporta en toda la página.

   - El botón de WhatsApp del header y el del footer deben ser exactamente el mismo destino, sin fricción de más de un toque.

3. Servicios

   - Aclaración arriba de la grilla: "Como Agente Productora, mi actividad se remunera vía el bróker — nunca con un cargo directo a vos." (elimina la objeción de precio antes de que el visitante la piense).

   - Tarjetas cortas, una idea por tarjeta, redactadas en términos de beneficio y protección, no de característica técnica: no "gestión activa de cartera" a secas, sino qué gana la persona con eso (tranquilidad, seguimiento, no estar sola tomando decisiones). Cubrir: Consulta inicial, Armado de carteras, Gestión activa, Mandato discrecional, Dolarización, Optimización, Análisis financiero.

4. Instrumentos que se pueden operar

   - Chips/etiquetas cortas y escaneables (bonos, ONs, acciones locales e internacionales, CEDEARs, ADRs, ETFs, Letras, money market, cauciones, cheques de pago diferido, opciones).

5. Brokers (ALyCs habilitados)

   - Grid con el logo oficial de cada bróker (Balanz, InvertirOnline/IOL, Inviu) y su matrícula CNV.

   - Toda la tarjeta del bróker debe ser clickeable y redirigir a su página oficial en pestaña nueva (target="_blank" rel="noopener noreferrer").

   - Usar logos oficiales reales (dejar el espacio listo si Lovable no puede traer el asset exacto, para que se reemplace después).

6. Preguntas frecuentes / objeciones (sección nueva)

   Esta sección responde, en formato acordeón o de preguntas cortas, a las dudas que alguien que nunca invirtió con un asesor se hace en silencio antes de escribir. No usar tono de venta, sino de aclaración directa:

   - "¿Cuánto cuesta esto?" → la remuneración es vía el bróker, nunca un cargo directo.

   - "¿Necesito tener mucho capital para empezar?" → responder con honestidad según lo que indique el negocio; si no hay un mínimo, decirlo explícito, porque elimina una barrera de entrada común.

   - "¿Qué pasa si no sé nada de inversiones?" → el primer paso es justamente un diagnóstico para partir de cero sin presión.

   - "¿Es seguro operar con un ALyC regulado?" → reforzar que toda operación queda en la cuenta comitente del bróker que el cliente elija, registrado en CNV.

   Cada respuesta cierra con un link o botón chico a WhatsApp tipo "Consultame esto directamente".

7. Alianzas

   - Dos alianzas de terceros independientes, aclarando que son ajenas a la actividad regulada por CNV:

     a) Desarrollo de software (Franco Lamas) — landing pages, sitios completos, apps a medida.

     b) Recupero de criptoestafas (Estudio Jurídico Dr. Pupi Cervio) — representación penal, rastreo forense, denuncia y seguimiento judicial.

8. Footer

   - Repetir matrícula CNV y la frase: "Primero verificá el registro. Siempre."

   - Botón de WhatsApp fijo/flotante visible en todo momento en mobile.

CRITERIOS DE COPY Y UX A APLICAR EN TODA LA PÁGINA (no son secciones, son reglas transversales)

- Encuadrar todo en términos de protección y continuidad, no solo de rendimiento: la gente reacciona con más fuerza a evitar una pérdida o un error que a perseguir una ganancia. Por eso frases como "para que tu perfil de riesgo se respete siempre" o "sin quedar expuesto a decisiones apuradas" funcionan mejor que promesas de rentabilidad, que además está prohibido prometer.

- Cada bloque de beneficio debe estar redactado desde lo que la persona gana o deja de arriesgar, no desde la característica técnica en sí. Ejemplo: no "armado de carteras diversificadas", sino "una cartera pensada para vos, no un producto genérico".

- El botón de WhatsApp nunca debe decir algo genérico como "Enviar" o "Contacto". Siempre en primera persona y accionable: "Escribime por WhatsApp", "Consultame esto directamente".

- Nada de presión artificial ni urgencia falsa (no usar countdowns, "cupos limitados" ni nada que no sea 100% cierto) — la confianza en un asesor financiero se construye con transparencia, no con tácticas de urgencia.

- El texto de la aclaración regulatoria (matrícula, forma de cobro, cuenta comitente del bróker) debe aparecer más de una vez en la página (header, servicios, brokers, footer) porque es el elemento que más reduce la sensación de riesgo percibido en alguien que nunca trató con un asesor.

- Si en algún momento se suma un testimonio o mención de trayectoria, usar datos reales y verificables (años de matrícula, cantidad de brokers con los que opera) en lugar de frases genéricas de elogio — la prueba social funciona mejor con hechos concretos que con adjetivos.

- Evitar cualquier frase que suene "vendida" o forzada; el tono general es el de un profesional serio explicando con calma, no el de alguien tratando de cerrar una venta.

No incluir en ningún lugar del sitio visible texto sobre neurociencia, psicología de ventas, técnicas de prospección o negociación — todo esto es únicamente el criterio de diseño interno. El contenido visible habla solo de los servicios financieros de Cintia Boos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/935b7ff1-1358-4c94-9d87-ecd8c2b6d832).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
