import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import PanelAlumnoLayout from "../../components/PanelAlumnoLayout";
import { useSesion } from "../../context/SesionContext";
import { etiquetaRolPrincipal, rolPrincipal } from "../../lib/roles";
import { etiquetaDe, navegacionPara, seccionPorRuta } from "../../routes/secciones";

// PanelLayout: el centro de navegación del sistema. Ya no decide qué pantalla
// mostrar (eso lo hacen las rutas hijas de /panel en App.jsx); solo calcula
// la navegación visible para el rol y el breadcrumb a partir de la URL, y
// monta el shell correspondiente + <Outlet/>.
//
// Quien SOLO es alumno (sin ningún otro rol) usa PanelAlumnoLayout: topbar
// simple sin sidebar, porque solo tiene 3 secciones y un dashboard tipo
// "administrador" le queda grande. Todos los demás roles (incluido un
// alumno que además fuera, p. ej., personal CATT) siguen en DashboardLayout.
export default function PanelLayout() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();

  const clavesRoles = (usuario.roles ?? []).join(",");
  const academia = usuario.academia ?? null;
  const navegacion = useMemo(
    () =>
      navegacionPara(clavesRoles.split(",")).map((grupo) => ({
        ...grupo,
        items: grupo.items.map((item) => ({ ...item, etiqueta: etiquetaDe(item, { academia }) })),
      })),
    [clavesRoles, academia],
  );
  const etiquetaRol = etiquetaRolPrincipal(usuario);
  const seccionActual = seccionPorRuta(location.pathname);
  const esSoloAlumno = rolPrincipal(usuario) === "alumno";

  async function alCerrarSesion() {
    await cerrarSesion();
    navigate("/");
  }

  if (esSoloAlumno) {
    return (
      <PanelAlumnoLayout usuario={usuario} navegacion={navegacion} onCerrarSesion={alCerrarSesion}>
        <Outlet />
      </PanelAlumnoLayout>
    );
  }

  return (
    <DashboardLayout
      usuario={usuario}
      etiquetaRol={etiquetaRol}
      navegacion={navegacion}
      breadcrumb={seccionActual ? etiquetaDe(seccionActual, usuario) : "Inicio"}
      onCerrarSesion={alCerrarSesion}
    >
      <Outlet />
    </DashboardLayout>
  );
}
