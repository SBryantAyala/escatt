import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconoCerrar, IconoDocumento, IconoPresentacion } from "./iconos";
import useDialogoAccesible from "./ui/useDialogoAccesible";
import { AVISOS_ESCOLARES, calendarioAviso, estadoAviso, fechaMexico, ordenarAvisos } from "../lib/avisosEscolares";

const TEMAS = ["Todos", "Protocolos", "TT I / II", "Escolares"];

function descargarFecha(aviso) {
  const contenido = calendarioAviso(aviso);
  if (!contenido) return;
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/calendar;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `ESCATT-${aviso.id}.ics`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DetalleAviso({ aviso, onCerrar, onLeido, leido, hoy }) {
  const ref = useDialogoAccesible(Boolean(aviso), onCerrar);
  useEffect(() => {
    if (!aviso) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, [Boolean(aviso)]);
  if (!aviso) return null;
  const estado = estadoAviso(aviso, hoy);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04182C]/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-aviso" className="landing-profile-menu max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.color}`}>{estado.etiqueta}</span><button type="button" onClick={onCerrar} aria-label="Cerrar aviso" title="Cerrar aviso" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"><IconoCerrar /></button></div>
        <p className="mt-4 text-xs font-semibold text-sky-700">{aviso.tema} · {aviso.fuente}</p>
        <h2 id="titulo-detalle-aviso" className="mt-2 text-2xl font-bold leading-tight text-slate-900">{aviso.titulo}</h2>
        <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-sky-700"><IconoPresentacion className="h-5 w-5 shrink-0" />{aviso.fecha}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{aviso.resumen}</p>
        <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm leading-relaxed text-slate-600">{aviso.detalles.map((detalle) => <li key={detalle} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" /><span>{detalle}</span></li>)}</ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={aviso.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white transition hover:bg-[#1264A3]"><IconoDocumento />Consultar fuente &#8599;</a>
          {aviso.inicio && estado.orden !== 4 && <button type="button" onClick={() => descargarFecha(aviso)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-200 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"><IconoPresentacion />Añadir al calendario</button>}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{leido ? "Leído en este navegador" : "Sin leer"}</span><button type="button" onClick={onLeido} className="min-h-10 rounded-full px-3 font-semibold text-sky-700 transition hover:bg-sky-50">{leido ? "Marcar sin leer" : "Marcar como leído"}</button></div>
      </div>
    </div>, document.body,
  );
}

export default function TablonAvisos({ usuarioId = "publico" }) {
  const clave = `escatt:avisos-leidos:${usuarioId}:v1`;
  const [leidos, setLeidos] = useState(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem(clave) || "[]");
      return Array.isArray(guardados) ? guardados.filter((id) => typeof id === "string") : [];
    } catch { return []; }
  });
  const [tema, setTema] = useState("Todos");
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [incluirFinalizados, setIncluirFinalizados] = useState(false);
  const [hoy, setHoy] = useState(() => fechaMexico());
  const [idActivo, setIdActivo] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [pausado, setPausado] = useState(false);
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [reducirMovimiento, setReducirMovimiento] = useState(true);
  const gesto = useRef(null);
  const cerrarDetalle = useCallback(() => setDetalle(null), []);

  useEffect(() => {
    try { localStorage.setItem(clave, JSON.stringify(leidos)); } catch { /* La lectura funciona sin almacenamiento. */ }
  }, [clave, leidos]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const movimiento = () => setReducirMovimiento(media.matches);
    const visibilidad = () => { setOculto(document.hidden); setHoy(fechaMexico()); };
    movimiento();
    visibilidad();
    media.addEventListener("change", movimiento);
    document.addEventListener("visibilitychange", visibilidad);
    const reloj = setInterval(() => setHoy(fechaMexico()), 60000);
    return () => { media.removeEventListener("change", movimiento); document.removeEventListener("visibilitychange", visibilidad); clearInterval(reloj); };
  }, []);

  const ordenados = useMemo(() => ordenarAvisos(AVISOS_ESCOLARES, hoy), [hoy]);
  const vigentes = ordenados.filter((aviso) => estadoAviso(aviso, hoy).orden !== 4);
  const sinLeer = vigentes.filter((aviso) => !leidos.includes(aviso.id)).length;
  const filtrados = ordenados.filter((aviso) => (incluirFinalizados || estadoAviso(aviso, hoy).orden !== 4) && (tema === "Todos" || aviso.tema === tema) && (!soloSinLeer || !leidos.includes(aviso.id)));
  const activo = filtrados.find((aviso) => aviso.id === idActivo) || filtrados[0];
  const indice = activo ? filtrados.indexOf(activo) : 0;
  const suspendido = pausado || hover || foco || oculto || reducirMovimiento || Boolean(detalle);
  const cambiar = (delta) => setIdActivo(filtrados[(indice + delta + filtrados.length) % filtrados.length]?.id || null);
  const alternarLeido = (id) => setLeidos((previos) => previos.includes(id) ? previos.filter((item) => item !== id) : [...previos, id]);

  useEffect(() => {
    if (suspendido || filtrados.length < 2) return;
    const siguiente = filtrados[(indice + 1) % filtrados.length].id;
    const temporizador = setTimeout(() => setIdActivo(siguiente), 8000);
    return () => clearTimeout(temporizador);
  }, [suspendido, activo?.id, tema, soloSinLeer, incluirFinalizados, leidos, hoy]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1878B6]">ESCOM · CATT · Gestión Escolar</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Que no se te pase.</h1></div>
        <span aria-live="polite" className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />{sinLeer} {sinLeer === 1 ? "aviso sin leer" : "avisos sin leer"}</span>
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filtrar avisos por tema" className="flex flex-wrap gap-2">{TEMAS.map((item) => <button key={item} type="button" aria-pressed={tema === item} onClick={() => { setTema(item); setIdActivo(null); }} className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${tema === item ? "border-[#1878B6] bg-[#1878B6] text-white shadow-md shadow-sky-500/15" : "border-sky-100 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"}`}>{item}</button>)}</div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600"><label className="flex min-h-10 cursor-pointer items-center gap-2"><input type="checkbox" checked={soloSinLeer} onChange={(evento) => setSoloSinLeer(evento.target.checked)} className="h-4 w-4 accent-[#1878B6]" />Solo sin leer</label><label className="flex min-h-10 cursor-pointer items-center gap-2"><input type="checkbox" checked={incluirFinalizados} onChange={(evento) => setIncluirFinalizados(evento.target.checked)} className="h-4 w-4 accent-[#1878B6]" />Incluir finalizados</label></div>
      </div>
      {activo ? (
        <>
          <div role="region" aria-roledescription="carrusel" aria-label="Avisos escolares destacados" tabIndex={0} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setFoco(true)} onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setFoco(false); }} onKeyDown={(evento) => { if (evento.target !== evento.currentTarget) return; if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") { evento.preventDefault(); cambiar(evento.key === "ArrowLeft" ? -1 : 1); } }} onTouchStart={(evento) => { gesto.current = { x: evento.touches[0].clientX, y: evento.touches[0].clientY }; }} onTouchEnd={(evento) => { if (!gesto.current) return; const x = evento.changedTouches[0].clientX - gesto.current.x; const y = evento.changedTouches[0].clientY - gesto.current.y; if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.5) cambiar(x > 0 ? -1 : 1); gesto.current = null; }} className="relative isolate overflow-hidden rounded-[2rem] bg-[#0D4774] shadow-xl shadow-sky-900/15 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
            <div key={activo.id} className="landing-reveal relative isolate flex min-h-[380px] flex-col justify-center px-6 py-8 sm:min-h-[400px] sm:px-10 sm:py-10 lg:px-12">
              <img src={activo.imagen} alt={activo.alt} width="920" height="880" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#073458] via-[#0D4774]/95 to-[#0D4774]/35" />
              <div className="max-w-2xl text-white">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${estadoAviso(activo, hoy).color}`}>{estadoAviso(activo, hoy).etiqueta}</span><span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">{activo.tema}</span>{!leidos.includes(activo.id) && <span className="text-xs font-semibold text-sky-200">Sin leer</span>}</div>
                <h2 className="mt-5 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">{activo.titulo}</h2>
                <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-sky-100"><IconoPresentacion className="h-5 w-5 shrink-0" />{activo.fecha}</p>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">{activo.resumen}</p>
                <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setDetalle(activo)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#0F5C8C] shadow-md transition hover:bg-sky-50 hover:shadow-lg"><IconoDocumento />Ver aviso<span aria-hidden="true">&#8599;</span></button><a href={activo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Fuente oficial &#8599;</a></div>
              </div>
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-[#063051]/65 px-6 py-4 text-white backdrop-blur-md sm:px-10">
              <span className="text-xs text-sky-100">{indice + 1} / {filtrados.length} · {activo.fuente}</span>
              <div className="flex items-center gap-2"><button type="button" onClick={() => cambiar(-1)} aria-label="Aviso anterior" title="Aviso anterior" disabled={filtrados.length < 2} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white/15 disabled:opacity-40"><span aria-hidden="true" className="h-2 w-2 rotate-45 border-b-2 border-l-2" /></button><button type="button" onClick={() => setPausado((previo) => !previo)} aria-label={pausado ? "Reanudar avisos automáticos" : "Pausar avisos automáticos"} title={pausado ? "Reanudar avisos" : "Pausar avisos"} aria-pressed={pausado} disabled={reducirMovimiento || filtrados.length < 2} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white/15 disabled:opacity-40"><span aria-hidden="true" className={pausado ? "ml-1 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" : "h-3 w-2.5 border-x-[3px] border-white"} /></button><button type="button" onClick={() => cambiar(1)} aria-label="Aviso siguiente" title="Aviso siguiente" disabled={filtrados.length < 2} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white/15 disabled:opacity-40"><span aria-hidden="true" className="h-2 w-2 rotate-45 border-r-2 border-t-2" /></button></div>
            </div>
            {!suspendido && filtrados.length > 1 && <div key={`${activo.id}-avance`} aria-hidden="true" className="aviso-autoplay absolute bottom-0 left-0 h-1 w-full origin-left bg-sky-300" />}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-800">Todos los avisos</h2><p aria-live="polite" className="text-xs text-slate-500">{filtrados.length} {filtrados.length === 1 ? "aviso" : "avisos"}</p></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtrados.map((aviso) => {
            const estado = estadoAviso(aviso, hoy);
            return <button key={aviso.id} type="button" onClick={() => { setIdActivo(aviso.id); setDetalle(aviso); }} className={`group flex items-start gap-3 rounded-lg border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-900/5 ${aviso.id === activo.id ? "border-sky-300 bg-sky-50" : "border-sky-100 bg-white"}`}><span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"><IconoDocumento /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${estado.color}`}>{estado.etiqueta}</span>{!leidos.includes(aviso.id) && <span className="text-[10px] font-semibold text-sky-700">Sin leer</span>}</span><span className="mt-2 block text-sm font-semibold leading-snug text-slate-800">{aviso.titulo}</span><span className="mt-2 block text-xs leading-relaxed text-slate-500">{aviso.fecha}</span></span></button>;
          })}</div>
        </>
      ) : <div className="rounded-lg border border-sky-100 bg-white px-6 py-12 text-center"><h2 className="text-lg font-bold text-slate-800">{soloSinLeer ? "Estás al día con estos avisos" : "No hay avisos vigentes en este tema"}</h2><button type="button" onClick={() => { setTema("Todos"); setSoloSinLeer(false); setIncluirFinalizados(true); }} className="mt-4 min-h-11 rounded-full bg-sky-50 px-5 text-sm font-semibold text-sky-700">Ver todos los avisos</button></div>}
      <DetalleAviso aviso={detalle} hoy={hoy} onCerrar={cerrarDetalle} leido={detalle ? leidos.includes(detalle.id) : false} onLeido={() => detalle && alternarLeido(detalle.id)} />
    </div>
  );
}
