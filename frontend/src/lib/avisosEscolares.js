const CALENDARIO = "https://www.escom.ipn.mx/docs/escomunidad/catt/Calendario_CATT_27_1.pdf";
const CATT = "https://www.escom.ipn.mx/htmls/escomunidad/catt.php";

// Selección manual de avisos oficiales; no implica sincronización con ESCOM.
export const AVISOS_ESCOLARES = [
  {
    id: "sinodales-2027-2", tema: "Protocolos", titulo: "Asignación de sinodales para protocolos",
    resumen: "Periodo del 8 al 14 de octubre para protocolos a cursar en 2027/2.",
    inicio: "2026-10-08", fin: "2026-10-14", fecha: "8 al 14 de octubre de 2026", fuente: "CATT · Cronograma 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/registro-protocolo.webp", alt: "Imagen ilustrativa de estudiantes revisando su proyecto.",
    detalles: ["Consulta el cronograma oficial de la CATT.", "Ten a la mano tu número de TT para consultar con la coordinación cualquier duda sobre tu asignación."],
  },
  {
    id: "evaluacion-2027-2", tema: "Protocolos", titulo: "Primera evaluación de protocolos",
    resumen: "La primera evaluación está programada del 19 al 23 de octubre.",
    inicio: "2026-10-19", fin: "2026-10-23", fecha: "19 al 23 de octubre de 2026", fuente: "CATT · Cronograma 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/entrega-documentos.webp", alt: "Imagen ilustrativa de documentos de un proyecto.",
    detalles: ["Revisa con tus directores la propuesta que registraste.", "Consulta el cronograma y mantente pendiente de los comunicados de la CATT."],
  },
  {
    id: "calendario-presentaciones-27-1", tema: "TT I / II", titulo: "Calendario de presentaciones: fecha de publicación",
    resumen: "La publicación está prevista para el 22 de octubre en el cronograma.",
    inicio: "2026-10-22", fin: "2026-10-22", fecha: "22 de octubre de 2026", fuente: "CATT · Cronograma 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/campus-escom.webp", alt: "Imagen ilustrativa de un campus universitario.",
    detalles: ["Consulta el portal de la CATT en la fecha programada.", "Confirma allí los datos de tu presentación antes de organizar tu exposición."],
  },
  {
    id: "presentaciones-tti-27-1", tema: "TT I / II", titulo: "Presentaciones ordinarias de Trabajo Terminal I",
    resumen: "Periodo de presentaciones: del 29 de octubre al 13 de noviembre.",
    inicio: "2026-10-29", fin: "2026-11-13", fecha: "29 de octubre al 13 de noviembre de 2026", fuente: "CATT · Cronograma 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/presentacion-tt.webp", alt: "Imagen ilustrativa de una exposición académica.",
    detalles: ["Este aviso corresponde al periodo general, no a una cita individual.", "Confirma el día, la hora y el lugar asignados en el calendario de la CATT."],
  },
  {
    id: "presentaciones-ttii-27-1", tema: "TT I / II", titulo: "Presentaciones ordinarias de Trabajo Terminal II",
    resumen: "Periodo de presentaciones: del 17 de noviembre al 1 de diciembre.",
    inicio: "2026-11-17", fin: "2026-12-01", fecha: "17 de noviembre al 1 de diciembre de 2026", fuente: "CATT · Cronograma 2027/1", url: CALENDARIO,
    imagen: "/images/noticias/presentacion-tt.webp", alt: "Imagen ilustrativa de una presentación de proyecto.",
    detalles: ["Este aviso corresponde al periodo general, no a una cita individual.", "Revisa con tus directores los preparativos y confirma tu cita en el calendario de la CATT."],
  },
  {
    id: "reinscripciones-portal", tema: "Escolares", titulo: "Reinscripciones: pendiente de publicación",
    resumen: "Gestión Escolar muestra el procedimiento de reinscripción como próximo.",
    fecha: "Sin fecha publicada", pendiente: true, fuente: "Gestión Escolar · ESCOM", url: "https://www.escom.ipn.mx/SSEIS/gestionescolar/servicios/procedimiento.php",
    imagen: "/images/noticias/campus-escom.webp", alt: "Imagen ilustrativa de un campus universitario.",
    detalles: ["Consulta el sitio de Gestión Escolar para comprobar si se publicó el procedimiento.", "Este aviso no confirma una apertura ni un periodo de reinscripción."],
  },
  {
    id: "formatos-catt", tema: "Escolares", titulo: "Formatos de TT en un solo lugar",
    resumen: "Protocolo, reporte técnico y carta responsiva en el portal de la CATT.",
    fecha: "Recurso de consulta", fuente: "CATT · ESCOM", url: CATT,
    imagen: "/images/noticias/entrega-documentos.webp", alt: "Imagen ilustrativa de la preparación de documentos.",
    detalles: ["Elige el formato correspondiente a tu etapa en el portal oficial.", "Consulta con tus directores o la coordinación si tienes dudas sobre qué documento utilizar."],
  },
];

export function fechaMexico(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ahora);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function estadoAviso(aviso, hoy = fechaMexico()) {
  if (aviso.pendiente) return { etiqueta: "Por publicar", color: "bg-slate-100 text-slate-600", orden: 3 };
  if (!aviso.inicio) return { etiqueta: "Consulta", color: "bg-sky-50 text-sky-700", orden: 3 };
  if (hoy > aviso.fin) return { etiqueta: "Finalizado", color: "bg-slate-100 text-slate-500", orden: 4 };
  if (hoy >= aviso.inicio) return { etiqueta: "En periodo", color: "bg-amber-100 text-amber-900", orden: 0 };
  const dias = Math.round((Date.parse(`${aviso.inicio}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);
  return dias <= 7 ? { etiqueta: dias === 1 ? "Mañana" : `En ${dias} días`, color: "bg-amber-50 text-amber-800", orden: 1 } : { etiqueta: "Próximamente", color: "bg-sky-50 text-sky-700", orden: 2 };
}

export function ordenarAvisos(avisos, hoy) {
  return [...avisos].sort((a, b) => estadoAviso(a, hoy).orden - estadoAviso(b, hoy).orden || (a.inicio || "9999").localeCompare(b.inicio || "9999"));
}

export function calendarioAviso(aviso, ahora = new Date()) {
  if (!aviso.inicio || !aviso.fin) return null;
  const escapar = (texto) => texto.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const fin = new Date(`${aviso.fin}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + 1);
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ESCATT//Avisos escolares//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${aviso.id}@escatt.local`, `DTSTAMP:${ahora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART;VALUE=DATE:${aviso.inicio.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${fin.toISOString().slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${escapar(aviso.titulo)}`, `DESCRIPTION:${escapar(`${aviso.resumen}\n${aviso.fuente}\n${aviso.url}`)}`, `URL:${aviso.url}`, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${escapar(aviso.titulo)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  // iCalendar limita cada línea a 75 bytes y usa finales CRLF.
  const encoder = new TextEncoder();
  return lineas.map((linea) => {
    let resultado = "";
    let bytes = 0;
    for (const caracter of linea) {
      const longitud = encoder.encode(caracter).length;
      if (bytes + longitud > 75) { resultado += "\r\n "; bytes = 1; }
      resultado += caracter;
      bytes += longitud;
    }
    return resultado;
  }).join("\r\n") + "\r\n";
}
