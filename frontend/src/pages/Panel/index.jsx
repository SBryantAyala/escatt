import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import { useSesion } from "../../context/SesionContext";
import { etiquetaRolPrincipal } from "../../lib/roles";
import { navegacionPara, seccionPorRuta } from "../../routes/secciones";

// PanelLayout: el centro de navegación del sistema. Ya no decide qué pantalla
// mostrar (eso lo hacen las rutas hijas de /panel en App.jsx); solo calcula
// la navegación visible para el rol y el breadcrumb a partir de la URL, y
// monta DashboardLayout + <Outlet/>.
export default function PanelLayout() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();

  const clavesRoles = (usuario.roles ?? []).join(",");
  const navegacion = useMemo(() => navegacionPara(clavesRoles.split(",")), [clavesRoles]);
  const etiquetaRol = etiquetaRolPrincipal(usuario);
  const seccionActual = seccionPorRuta(location.pathname);

  async function alCerrarSesion() {
    await cerrarSesion();
    navigate("/");
  }

  return (
    <DashboardLayout
      usuario={usuario}
      etiquetaRol={etiquetaRol}
      navegacion={navegacion}
      breadcrumb={seccionActual?.etiqueta ?? "Inicio"}
      onCerrarSesion={alCerrarSesion}
      onVolverInicio={() => navigate("/")}
    >
      <Outlet />
    </DashboardLayout>
  );
}
