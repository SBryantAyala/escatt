import SeccionProximamente from "../Panel/SeccionProximamente";
import { ADMIN_Y_CATT } from "../../routes/secciones";
import { tieneRol } from "../../lib/roles";
import VistaAlumno from "./VistaAlumno";
import VistaValidacion from "./VistaValidacion";

const DESCRIPCION_PROXIMAMENTE =
  "Esta sección estará disponible en un próximo sprint. Ya está conectada al panel: cuando se implemente aparecerá aquí sin tocar el layout.";

// Pantalla "Protocolo" del panel: hoy cubre HU-12 (el alumno sube evidencia
// de requisitos para TT) y HU-13 (la CATT la valida). El resto del flujo de
// protocolo (registro, sinodales) sigue pendiente.
export default function ProtocoloPage({ actor }) {
  if (tieneRol(actor, "alumno")) return <VistaAlumno />;
  if (tieneRol(actor, ...ADMIN_Y_CATT)) return <VistaValidacion actor={actor} />;
  return <SeccionProximamente titulo="Protocolo" descripcion={DESCRIPCION_PROXIMAMENTE} />;
}
