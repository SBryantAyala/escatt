import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ICONO_ACADEMIA_COMPONENTE } from "../../components/iconosAcademia";
import { useAviso } from "../../components/ui/Avisos";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { api } from "../../lib/api";
import { colorDe } from "../../lib/academias";
import { tieneRol } from "../../lib/roles";
import DialogoNuevaAcademia from "./DialogoNuevaAcademia";

// Pantalla: Academias (HU-10), galería de tarjetas. El Secretario Ejecutivo
// es el dueño del catálogo (alta, presidente, integrantes, configuración —
// todo desde la ficha de cada academia); aquí solo se consulta y se entra.
//
// Regla de diseño del módulo: nada peligroso a la vista. Las tarjetas solo
// abren (van a la ficha); no hay botones de acción en la galería. Si el rol
// no puede administrar, el control simplemente no existe — como mucho, una
// etiqueta "Solo lectura".

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function IconoAviso({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 9v4M12 16.5h.01" strokeLinecap="round" />
      <path d="M10.3 3.9 2.7 17.5A1.5 1.5 0 0 0 4 19.8h16a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconoMas({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TarjetaAcademia({ academia, indice }) {
  const color = colorDe(academia.color);
  const Icono = ICONO_ACADEMIA_COMPONENTE[academia.icono] ?? ICONO_ACADEMIA_COMPONENTE.codigo;
  const inactiva = !academia.activa;

  return (
    <Link
      to={`/panel/academias/${academia.id}`}
      style={{ animationDelay: `${indice * 80}ms` }}
      className={`tarjeta-academia group relative flex flex-col overflow-hidden rounded-[20px] shadow-md motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        inactiva ? "grayscale" : ""
      }`}
    >
      <div
        className="flex items-center gap-3 px-5 py-6"
        style={{ backgroundColor: inactiva ? "#64748b" : color.hex }}
      >
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-white/25">
          <Icono className="h-6 w-6 text-white motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-6" />
        </span>
        <span className="min-w-0 truncate text-xl font-bold text-white">{academia.nombre}</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 bg-white p-5">
        {inactiva && (
          <Etiqueta variante="neutro" className="self-start">
            Inactiva
          </Etiqueta>
        )}

        <div className="flex items-center gap-3">
          {academia.presidente ? (
            <>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: color.claro, color: color.hex }}
                aria-hidden="true"
              >
                {academia.presidente.iniciales}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Presidente</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {academia.presidente.nombre_completo}
                </p>
              </div>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
              <IconoAviso />
              Sin asignar
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-2xl font-bold text-slate-800">
            {academia.total_docentes}
            <span className="ml-1 text-xs font-medium text-slate-400">docentes</span>
          </span>
          <span className="text-sm font-semibold" style={{ color: inactiva ? "#64748b" : color.hex }}>
            Abrir →
          </span>
        </div>
      </div>
    </Link>
  );
}

function TarjetaNuevaAcademia({ onAbrir, indice }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      style={{ animationDelay: `${indice * 80}ms` }}
      className="tarjeta-academia flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-slate-300 p-6 text-center motion-safe:transition-all motion-safe:duration-300 hover:border-[#1878B6] hover:bg-[#4FB3E8]/5 motion-safe:hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1878B6] text-white">
        <IconoMas />
      </span>
      <span className="font-semibold text-slate-700">Nueva academia</span>
      <span className="text-sm text-slate-500">Elige nombre, color e ícono</span>
    </button>
  );
}

function TarjetaEsqueleto() {
  return (
    <div className="overflow-hidden rounded-[20px] shadow-md">
      <Esqueleto className="h-[88px] w-full rounded-none" />
      <div className="space-y-3 bg-white p-5">
        <Esqueleto className="h-10 w-10 rounded-full" />
        <Esqueleto className="h-4 w-2/3" />
        <Esqueleto className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export default function AcademiasPage({ actor }) {
  const navigate = useNavigate();
  const aviso = useAviso();
  const puedeAdministrar = tieneRol(actor, "catt_ejecutivo");

  const [academias, setAcademias] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("activas"); // activas | inactivas | todas
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    try {
      const datos = await api(puedeAdministrar ? "/api/academias?todas=1" : "/api/academias");
      setAcademias(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setErrorCarga(e.message);
    }
  }

  useEffect(() => {
    cargar();
    // Los datos se cargan solos; no hay botón "Actualizar". Se refrescan de
    // nuevo después de cada acción (crear, abrir y volver, etc.).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeAdministrar]);

  const totalActivas = useMemo(() => (academias ?? []).filter((a) => a.activa).length, [academias]);
  const totalDocentes = useMemo(
    () => (academias ?? []).reduce((sum, a) => sum + (a.total_docentes ?? 0), 0),
    [academias],
  );

  const visibles = useMemo(() => {
    let lista = academias ?? [];
    if (puedeAdministrar) {
      if (filtro === "activas") lista = lista.filter((a) => a.activa);
      if (filtro === "inactivas") lista = lista.filter((a) => !a.activa);
    }
    const consulta = normalizar(busqueda.trim());
    if (!consulta) return lista;
    return lista.filter(
      (a) =>
        normalizar(a.nombre).includes(consulta) ||
        normalizar(a.presidente?.nombre_completo).includes(consulta),
    );
  }, [academias, filtro, busqueda, puedeAdministrar]);

  async function crearAcademia(datos) {
    setCreando(true);
    try {
      const ficha = await api("/api/academias", { method: "POST", body: datos });
      setDialogoAbierto(false);
      aviso.exito(`Academia "${ficha.academia.nombre}" creada.`);
      navigate(`/panel/academias/${ficha.academia.id}`);
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Academias</h1>
            {!puedeAdministrar && <Etiqueta variante="neutro">Solo lectura</Etiqueta>}
          </div>
          {academias && (
            <p className="mt-1 text-sm text-slate-500">
              {totalActivas} academias activas · {totalDocentes} docentes en total
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por academia o presidente…"
            aria-label="Buscar academias"
            className="min-h-11 w-56 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
          />
          {puedeAdministrar && (
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Filtrar por estado"
              className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
            >
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
              <option value="todas">Todas</option>
            </select>
          )}
        </div>
      </div>

      {errorCarga && !academias && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar el catálogo ({errorCarga}).
        </p>
      )}

      {!academias && !errorCarga && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TarjetaEsqueleto key={i} />
          ))}
        </div>
      )}

      {academias && visibles.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-base font-medium text-slate-700">No encontramos academias para tu búsqueda.</p>
          <p className="text-sm text-slate-500">Prueba con otro nombre o con el de su presidente.</p>
        </div>
      )}

      {academias && visibles.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((academia, i) => (
            <TarjetaAcademia key={academia.id} academia={academia} indice={i} />
          ))}
          {puedeAdministrar && (
            <TarjetaNuevaAcademia onAbrir={() => setDialogoAbierto(true)} indice={visibles.length} />
          )}
        </div>
      )}

      <DialogoNuevaAcademia
        abierto={dialogoAbierto}
        onCerrar={() => !creando && setDialogoAbierto(false)}
        onCrear={crearAcademia}
        creando={creando}
      />
    </div>
  );
}
