import { useState } from "react";

const CATT = "https://www.escom.ipn.mx/htmls/escomunidad/catt.php";
const ESTUDIANTES = "https://www.ipn.mx/comunidad/estudiantes/";
const CALENDARIO = "https://www.escom.ipn.mx/docs/escomunidad/catt/Calendario_CATT_27_1.pdf";

// Selección editorial de fuentes oficiales. Las fechas indican eventos o
// publicaciones identificadas; los recursos sin fecha no simulan noticias nuevas.
const NOTICIAS = [
  {
    id: "icpc", categoria: "Comunidad", tipo: "Evento", fuente: "ICPC México",
    titulo: "ESCOM, sede de la Final Mexicana ICPC 2026",
    resumen: "Programación, trabajo en equipo y talento universitario: conoce la agenda del regional que reunirá a los mejores equipos de México.",
    fecha: "6 y 7 nov 2026", iso: "2026-11-06", url: "https://finals2026.icpcmexico.org/",
    imagen: "/images/noticias/icpc-mexico.webp", alt: "Vista del campus publicada en el sitio oficial de ICPC México.",
  },
  {
    id: "cronograma", categoria: "Trabajo Terminal", tipo: "Calendario", fuente: "CATT · ESCOM",
    titulo: "Las fechas que debes tener en el radar para tu TT",
    resumen: "Consulta el cronograma 2027/1: presentaciones, evaluaciones de protocolo y entrega de dictámenes.",
    fecha: "Semestre 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/presentacion-tt.webp", alt: "Imagen ilustrativa de una presentación académica.",
  },
  {
    id: "maestria-ia", categoria: "Oportunidades", tipo: "Convocatoria", fuente: "SEPI · ESCOM",
    titulo: "Tu siguiente reto: una maestría en IA y Ciencia de Datos",
    resumen: "Explora la convocatoria A27, el perfil de ingreso y las líneas de investigación del programa multisede.",
    fecha: "Ingreso en enero 2027", url: "https://www.escom.ipn.mx/posgrado/convocatoriaMaestriaIACD/",
    imagen: "/images/noticias/laboratorio-computo.webp", alt: "Imagen ilustrativa de estudiantes trabajando en un laboratorio.",
  },
  {
    id: "sinodales", categoria: "Trabajo Terminal", tipo: "Agenda", fuente: "CATT · ESCOM",
    titulo: "Protocolos: asignación de sinodales del 8 al 14 de octubre",
    resumen: "El calendario de protocolos para cursar en 2027/2 contempla la primera evaluación del 19 al 23 de octubre.",
    fecha: "8–14 oct 2026", iso: "2026-10-08", url: CALENDARIO,
    imagen: "/images/noticias/registro-protocolo.webp", alt: "Imagen ilustrativa de estudiantes revisando una propuesta.",
  },
  {
    id: "india", categoria: "Comunidad", tipo: "Talento ESCOM", fuente: "Gaceta Politécnica",
    titulo: "De ESCOM a India: una experiencia en inteligencia artificial",
    resumen: "Pavel Montoya participó en el programa InStep de Infosys. Conoce su experiencia de formación, investigación y colaboración internacional.",
    fecha: "Publicado el 3 feb 2026", iso: "2026-02-03", url: "https://www.ipn.mx/gacetapolitecnica/ver-detalle.html?g=407",
    imagen: "/images/noticias/talento-india.webp", alt: "Fotografía de Pavel Montoya publicada por la Gaceta Politécnica. Crédito: Jorge Aguilar.",
  },
  {
    id: "protocolo", categoria: "Trabajo Terminal", tipo: "Recurso", fuente: "CATT · ESCOM",
    titulo: "Dale forma a tu idea: formatos para el protocolo",
    resumen: "Localiza las plantillas de protocolo, evaluación y modificación de Trabajo Terminal en el portal de la CATT.",
    url: CATT, imagen: "/images/noticias/registro-protocolo.webp", alt: "Imagen ilustrativa de una revisión de proyecto.",
  },
  {
    id: "becas", categoria: "Oportunidades", tipo: "Apoyos", fuente: "IPN",
    titulo: "Becas: encuentra los apoyos para tu trayectoria",
    resumen: "El portal de estudiantes reúne el programa de becas, sus convocatorias, resultados y documentos de consulta.",
    url: ESTUDIANTES, imagen: "/images/noticias/alumnos-biblioteca.webp", alt: "Imagen ilustrativa de estudiantes en una biblioteca.",
  },
  {
    id: "movilidad", categoria: "Oportunidades", tipo: "Movilidad", fuente: "IPN",
    titulo: "Lleva tu formación más lejos con movilidad académica",
    resumen: "Conoce el acceso institucional a movilidad estudiantil, experiencias de intercambio y sus formatos.",
    url: ESTUDIANTES, imagen: "/images/noticias/campus-escom.webp", alt: "Imagen ilustrativa de un campus universitario.",
  },
  {
    id: "reporte", categoria: "Trabajo Terminal", tipo: "Recurso", fuente: "CATT · ESCOM",
    titulo: "Reporte técnico y artículo: prepara tus entregables",
    resumen: "Consulta los formatos del reporte, artículo y carta responsiva, junto con la guía de publicaciones técnicas.",
    url: CATT, imagen: "/images/noticias/entrega-documentos.webp", alt: "Imagen ilustrativa de documentos académicos.",
  },
  {
    id: "titulacion", categoria: "Trámites", tipo: "Titulación", fuente: "ESCOM",
    titulo: "Terminaste tu TT. ¿Qué sigue para titularte?",
    resumen: "Revisa las modalidades de titulación y la documentación para tramitar el Acta de Examen Profesional.",
    url: "https://www.escom.ipn.mx/SSEIS/apoyoseducativos/servicios/titulacion.php",
    imagen: "/images/noticias/entrega-documentos.webp", alt: "Imagen ilustrativa de la preparación de un expediente.",
  },
  {
    id: "clubs", categoria: "Comunidad", tipo: "Vida estudiantil", fuente: "ESCOM",
    titulo: "Encuentra tu comunidad más allá del salón",
    resumen: "Los clubes académicos de ESCOM reúnen a estudiantes para aprender, practicar y compartir intereses fuera del aula.",
    url: "https://www.escom.ipn.mx/htmls/escomunidad/clubs.php",
    imagen: "/images/noticias/alumnos-biblioteca.webp", alt: "Imagen ilustrativa de un equipo de estudiantes.",
  },
  {
    id: "maestria-movil", categoria: "Oportunidades", tipo: "Convocatoria", fuente: "SEPI · ESCOM",
    titulo: "Investiga el futuro del cómputo móvil en ESCOM",
    resumen: "Conoce la convocatoria A27 de la Maestría en Ciencias en Sistemas Computacionales Móviles y sus líneas de investigación.",
    fecha: "Ingreso en enero 2027", url: "https://www.escom.ipn.mx/posgrado/convocatoria/",
    imagen: "/images/noticias/laboratorio-computo.webp", alt: "Imagen ilustrativa de trabajo en laboratorio.",
  },
];

const TEMAS = ["Todo", "Trabajo Terminal", "Oportunidades", "Comunidad", "Trámites"];
const COLORES = {
  "Trabajo Terminal": "bg-[#1D4ED8] text-white",
  Oportunidades: "bg-[#0F766E] text-white",
  Comunidad: "bg-[#6D28D9] text-white",
  Trámites: "bg-[#C2410C] text-white",
};

function Categoria({ noticia }) {
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${COLORES[noticia.categoria]}`}>{noticia.categoria}</span>;
}

function Fecha({ noticia }) {
  if (!noticia.fecha) return <span>{noticia.tipo}</span>;
  return noticia.iso ? <time dateTime={noticia.iso}>{noticia.fecha}</time> : <span>{noticia.fecha}</span>;
}

function TarjetaNoticia({ noticia }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/9] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500" aria-label={`${noticia.titulo} (abre en otra pestaña)`}>
        <img src={noticia.imagen} alt={noticia.alt} loading="lazy" decoding="async" width="800" height="450" className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105" />
        <span className="absolute left-4 top-4"><Categoria noticia={noticia} /></span>
      </a>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500"><span>{noticia.fuente}</span><span aria-hidden="true">/</span><Fecha noticia={noticia} /></div>
        <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900"><a href={noticia.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky-700">{noticia.titulo}</a></h3>
        <p className="mb-5 mt-3 text-sm leading-relaxed text-slate-600">{noticia.resumen}</p>
        <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="mt-auto flex min-h-10 items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700" aria-label={`Consultar ${noticia.titulo} en ${noticia.fuente} (abre en otra pestaña)`}>Consultar fuente<span aria-hidden="true" className="text-lg transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">&#8599;</span></a>
      </div>
    </article>
  );
}

export default function SeccionNoticias() {
  const [tema, setTema] = useState("Todo");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const filtradas = NOTICIAS.filter((noticia) => (tema === "Todo" || noticia.categoria === tema) && normalizar(`${noticia.titulo} ${noticia.resumen} ${noticia.categoria} ${noticia.tipo}`).includes(consulta));
  const visibles = mostrarTodas ? filtradas : filtradas.slice(0, 6);
  const destacada = NOTICIAS[0];

  return (
    <section id="noticias" aria-labelledby="titulo-noticias" className="scroll-mt-36 bg-[#F4F7FB] px-4 py-14 text-slate-800 md:scroll-mt-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1878B6]">ESCOMunidad</p>
            <h2 id="titulo-noticias" className="mt-2 text-3xl font-bold leading-tight text-[#102D4B]">Noticias y oportunidades</h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">Lo que pasa en tu comunidad y lo que sigue en tu camino: talento, convocatorias y fechas para tu TT.</p>
          </div>
          <a href={CATT} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-fit shrink-0 items-center gap-3 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#0F5C8C]">Portal de la CATT<span aria-hidden="true">&#8599;</span></a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="group relative isolate flex min-h-[400px] flex-col justify-end overflow-hidden rounded-[24px] bg-[#102D4B] p-6 text-white shadow-lg shadow-sky-900/10 sm:min-h-[460px] sm:p-8">
            <img src={destacada.imagen} alt={destacada.alt} loading="lazy" decoding="async" width="765" height="1020" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_65%] transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#031B2F] via-[#031B2F]/65 to-transparent" />
            <span className="absolute left-6 top-6 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md sm:left-8 sm:top-8">En portada · {destacada.tipo}</span>
            <div className="max-w-lg">
              <p className="text-xs font-semibold text-sky-200"><Fecha noticia={destacada} /> · {destacada.fuente}</p>
              <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl"><a href={destacada.url} target="_blank" rel="noopener noreferrer" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{destacada.titulo}</a></h3>
              <p className="mt-3 text-sm leading-relaxed text-sky-50/85">{destacada.resumen}</p>
              <a href={destacada.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-4 rounded-full bg-white px-5 text-sm font-bold text-[#125B8B] transition hover:bg-sky-100">Conocer el evento<span aria-hidden="true">&#8599;</span></a>
            </div>
          </article>
          <div className="flex flex-col justify-between gap-5">
            <p className="text-sm font-semibold text-[#102D4B]">También en el radar</p>
            {NOTICIAS.slice(1, 3).map((noticia) => (
              <article key={noticia.id} className={`group flex flex-1 flex-col justify-center rounded-[20px] p-5 text-white shadow-md ${COLORES[noticia.categoria]}`}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{noticia.categoria}</p>
                    <h3 className="mt-2 text-lg font-bold leading-snug text-white"><a href={noticia.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{noticia.titulo}</a></h3>
                  </div>
                  <img src={noticia.imagen} alt={noticia.alt} loading="lazy" width="112" height="112" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white">{noticia.resumen}</p>
                <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-10 items-center justify-between gap-3 border-t border-white/20 pt-2 text-xs font-semibold text-white"><span><Fecha noticia={noticia} /></span><span>Consultar &#8599;</span></a>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-sky-200 pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Filtrar noticias por tema" className="flex flex-wrap gap-2">
              {TEMAS.map((item) => <button key={item} type="button" aria-pressed={tema === item} onClick={() => { setTema(item); setMostrarTodas(false); }} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${tema === item ? "border-[#1878B6] bg-[#1878B6] text-white shadow-sm shadow-sky-500/20" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"}`}>{item}<span className={tema === item ? "text-sky-100" : "text-slate-400"}>{item === "Todo" ? NOTICIAS.length : NOTICIAS.filter((noticia) => noticia.categoria === item).length}</span></button>)}
            </div>
            <label className="w-full lg:max-w-[240px]"><span className="sr-only">Buscar noticias</span><input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setMostrarTodas(false); }} placeholder="Buscar noticias…" className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          </div>
          <p aria-live="polite" className="mt-5 text-xs text-slate-500">{filtradas.length} {filtradas.length === 1 ? "publicación" : "publicaciones"}{tema !== "Todo" ? ` en ${tema}` : " para explorar"}</p>
          {visibles.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibles.map((noticia) => <TarjetaNoticia key={noticia.id} noticia={noticia} />)}</div> : <div className="py-16 text-center"><h3 className="text-lg font-bold text-slate-800">No encontramos publicaciones</h3><p className="mt-2 text-sm text-slate-500">Prueba con otro tema o una búsqueda diferente.</p><button type="button" onClick={() => { setTema("Todo"); setBusqueda(""); setMostrarTodas(false); }} className="mt-4 min-h-10 rounded-full bg-sky-100 px-5 text-sm font-semibold text-sky-700">Restablecer filtros</button></div>}
          {!mostrarTodas && filtradas.length > visibles.length && <div className="mt-8 text-center"><button type="button" onClick={() => setMostrarTodas(true)} className="min-h-11 rounded-full border border-sky-200 bg-white px-6 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50">Ver más publicaciones ({filtradas.length - visibles.length})</button></div>}
        </div>
      </div>
    </section>
  );
}
