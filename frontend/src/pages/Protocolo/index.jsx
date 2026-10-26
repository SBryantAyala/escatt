import { useState } from "react";
import SeccionProximamente from "../Panel/SeccionProximamente";
import { ADMIN_Y_CATT } from "../../routes/secciones";
import { tieneRol } from "../../lib/roles";
import CambioDirector from "./CambioDirector";
import CambioTitulo from "./CambioTitulo";
import MiProtocolo from "./MiProtocolo";
import RegistroProtocolo from "./RegistroProtocolo";
import VistaAlumno from "./VistaAlumno";
import VistaCambiosDirector from "./VistaCambiosDirector";
import VistaCambiosTitulo from "./VistaCambiosTitulo";
import VistaDirector from "./VistaDirector";
import VistaDocente from "./VistaDocente";
import VistaSinodal from "./VistaSinodal";
import VistaSinodalesPresidente from "./VistaSinodalesPresidente";
import VistaTurnar from "./VistaTurnar";
import VistaValidacion from "./VistaValidacion";

const DESCRIPCION_PROXIMAMENTE =
  "Esta sección estará disponible en un próximo sprint. Ya está conectada al panel: cuando se implemente aparecerá aquí sin tocar el layout.";

// Pantalla "Protocolo" del panel: hoy cubre HU-12 (el alumno sube evidencia
// de requisitos para TT), HU-13 (la CATT la valida), HU-21 (el sinodal
// evalúa), HU-22 (alumno y director ven el dictamen), HU-24 (cambio de
// director), el cambio de título y HU-25 (el director consulta los protocolos que
// dirige). El alumno también registra su protocolo (HU-18), con directores
// docentes o un director externo.
export default function ProtocoloPage({ actor }) {
  // Cambia cuando el alumno registra su protocolo, se sale de su equipo o sube
  // evidencia de elegibilidad, para recargar las secciones que dependen de eso.
  const [version, setVersion] = useState(0);

  if (tieneRol(actor, "alumno")) {
    return (
      <div className="space-y-10">
        <MiProtocolo key={`mi-${version}`} actor={actor} onSalir={() => setVersion((v) => v + 1)} />
        <VistaAlumno actor={actor} onEnviado={() => setVersion((v) => v + 1)} />
        <RegistroProtocolo key={`registro-${version}`} onRegistrado={() => setVersion((v) => v + 1)} />
        <CambioDirector key={`cambio-${version}`} actor={actor} />
        <CambioTitulo key={`titulo-${version}`} actor={actor} />
      </div>
    );
  }

  const esPersonal = tieneRol(actor, ...ADMIN_Y_CATT);
  // Cualquier cuenta con perfil de docente puede ser director (HU-25) o
  // sinodal (HU-21), con o sin rol de presidente o de la CATT.
  const esDirector = Boolean(actor?.perfiles?.includes("docente"));

  if (!esPersonal && !esDirector) {
    return <SeccionProximamente titulo="Protocolo" descripcion={DESCRIPCION_PROXIMAMENTE} />;
  }

  // El docente sin funciones de la CATT ve "Mis protocolos" con pestañas.
  if (!esPersonal) return <VistaDocente actor={actor} />;

  // Personal CATT o admin que además es docente (docente comisionado): ve
  // todas sus vistas, una debajo de la otra. La de sinodal va antes que la
  // de director porque es la que pide acción.
  return (
    <div className="space-y-10">
      {esPersonal && <VistaValidacion actor={actor} />}
      {tieneRol(actor, "catt_ejecutivo") && <VistaTurnar />}
      {esPersonal && <VistaCambiosDirector actor={actor} />}
      {esPersonal && <VistaCambiosTitulo actor={actor} />}
      {tieneRol(actor, "presidente_academia") && <VistaSinodalesPresidente actor={actor} />}
      {esDirector && <VistaSinodal />}
      {esDirector && <VistaDirector />}
    </div>
  );
}
