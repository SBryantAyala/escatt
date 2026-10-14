import SeccionProximamente from "../Panel/SeccionProximamente";
import { ADMIN_Y_CATT } from "../../routes/secciones";
import { tieneRol } from "../../lib/roles";
import VistaAlumno from "./VistaAlumno";
import VistaDirector from "./VistaDirector";
import VistaSinodal from "./VistaSinodal";
import VistaValidacion from "./VistaValidacion";

const DESCRIPCION_PROXIMAMENTE =
  "Esta sección estará disponible en un próximo sprint. Ya está conectada al panel: cuando se implemente aparecerá aquí sin tocar el layout.";

// Pantalla "Protocolo" del panel: hoy cubre HU-12 (el alumno sube evidencia
// de requisitos para TT), HU-13 (la CATT la valida), HU-21 (el sinodal
// evalúa) y HU-25 (el director consulta los protocolos que dirige). El resto
// del flujo de protocolo (registro, turnar, sinodales) sigue pendiente.
export default function ProtocoloPage({ actor }) {
  if (tieneRol(actor, "alumno")) return <VistaAlumno />;

  const esPersonal = tieneRol(actor, ...ADMIN_Y_CATT);
  // Cualquier cuenta con perfil de docente puede ser director (HU-25) o
  // sinodal (HU-21), con o sin rol de presidente o de la CATT.
  const esDirector = Boolean(actor?.perfiles?.includes("docente"));

  if (!esPersonal && !esDirector) {
    return <SeccionProximamente titulo="Protocolo" descripcion={DESCRIPCION_PROXIMAMENTE} />;
  }

  // Una misma persona puede ser a la vez personal CATT y docente (docente
  // comisionado): ve todas sus vistas, una debajo de la otra. La de sinodal
  // va antes que la de director porque es la que pide acción.
  return (
    <div className="space-y-10">
      {esPersonal && <VistaValidacion actor={actor} />}
      {esDirector && <VistaSinodal />}
      {esDirector && <VistaDirector />}
    </div>
  );
}
