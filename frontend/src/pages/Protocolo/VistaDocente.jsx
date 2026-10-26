import { useState } from "react";
import Pestanas, { usePestanaUrl } from "../../components/ui/Pestanas";
import { IconoDocumento } from "../../components/iconos";
import { tieneRol } from "../../lib/roles";
import VistaDirector from "./VistaDirector";
import VistaSinodalesPresidente from "./VistaSinodalesPresidente";
import VistaSinodal from "./VistaSinodal";

// "Mis protocolos" del docente (HU-21, HU-25): lo que evalúa como sinodal y
// lo que dirige, en pestañas en vez de dos bloques apilados. La pestaña vive
// en ?tab= para que el Inicio pueda enlazar directo a cualquiera de las dos.
//
// Los dos paneles se montan desde el principio (el inactivo solo se oculta)
// para que cada pestaña muestre su contador sin esperar a que la abran.

const PESTANAS_BASE = [
  { id: "evaluar", etiqueta: "Por evaluar" },
  { id: "dirijo", etiqueta: "Que dirijo" },
];
const PESTANA_ACADEMIA = { id: "academia", etiqueta: "Sinodales de mi Academia" };

export default function VistaDocente({ actor }) {
  const presidente = tieneRol(actor, "presidente_academia");
  const [activa, cambiar] = usePestanaUrl(presidente ? [...PESTANAS_BASE, PESTANA_ACADEMIA] : PESTANAS_BASE);
  const [porEvaluar, setPorEvaluar] = useState(null);
  const [dirigidos, setDirigidos] = useState(null);
  const [sinSinodales, setSinSinodales] = useState(null);

  const pendientes = porEvaluar?.filter((p) => !p.mi_evaluacion && p.estado === "en_evaluacion").length;
  const pestanas = [
    { ...PESTANAS_BASE[0], contador: pendientes || null },
    { ...PESTANAS_BASE[1], contador: dirigidos?.length || null },
    ...(presidente ? [{ ...PESTANA_ACADEMIA, contador: sinSinodales?.filter((p) => p.sinodales.length === 0 && p.estado === "registrado").length || null }] : []),
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis protocolos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Evalúa los protocolos que te asignaron, da seguimiento a los que diriges{presidente ? " y asigna sinodales en tu Academia" : ""}
          </p>
        </div>
      </div>

      <div>
        <Pestanas pestanas={pestanas} activa={activa} onCambiar={cambiar} idBase="mis-protocolos" />
        <div
          role="tabpanel"
          id="mis-protocolos-panel-evaluar"
          aria-labelledby="mis-protocolos-tab-evaluar"
          hidden={activa !== "evaluar"}
        >
          <VistaSinodal encabezado={false} onCargado={setPorEvaluar} />
        </div>
        <div
          role="tabpanel"
          id="mis-protocolos-panel-dirijo"
          aria-labelledby="mis-protocolos-tab-dirijo"
          hidden={activa !== "dirijo"}
        >
          <VistaDirector encabezado={false} onCargado={setDirigidos} />
        </div>
        {presidente && (
          <div
            role="tabpanel"
            id="mis-protocolos-panel-academia"
            aria-labelledby="mis-protocolos-tab-academia"
            hidden={activa !== "academia"}
          >
            <VistaSinodalesPresidente actor={actor} encabezado={false} onCargado={setSinSinodales} />
          </div>
        )}
      </div>
    </div>
  );
}
