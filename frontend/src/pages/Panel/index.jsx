import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import PanelSencilloLayout from "../../components/PanelSencilloLayout";
import { useSesion } from "../../context/SesionContext";
import { etiquetaRolPrincipal, rolPrincipal } from "../../lib/roles";
import { etiquetaDe, navegacionPara, seccionPorRuta } from "../../routes/secciones";

// PanelLayout: el centro de navegación del sistema. Ya no decide qué pantalla
// mostrar (eso lo hacen las rutas hijas de /panel en App.jsx); solo calcula
// la navegación visible para el rol y el breadcrumb a partir de la URL, y
// monta el shell correspondiente + <Outlet/>.
//
// Quien no hace funciones administrativas usa PanelSencilloLayout (topbar
// sin sidebar): el que SOLO es alumno, y el docente o presidente de academia
// sin ningún rol de la CATT ni de administrador. Tienen pocas secciones y un
// dashboard tipo "administrador" les queda grande. Todos los demás (incluido
// un docente comisionado a la CATT) siguen en DashboardLayout.
const ROLES_SENCILLOS = ["alumno", "docente", "presidente_academia"];
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
  const rol = rolPrincipal(usuario);

  async function alCerrarSesion() {
    await cerrarSesion();
    navigate("/");
  }

  if (ROLES_SENCILLOS.includes(rol)) {
    // En la barra va la etiqueta fija de cada sección ("Mi academia"), no
    // la personalizada del sidebar: el nombre completo de la academia no cabe.
    // Para el docente, "Protocolo" se llama como su página: "Mis protocolos".
    const detalleCuenta =
      rol === "alumno"
        ? `Alumno · ${usuario.boleta ?? "sin boleta"}`
        : `${etiquetaRol} · ${usuario.academia ?? "sin academia"}`;
    return (
      <PanelSencilloLayout
        usuario={usuario}
        etiquetaRol={etiquetaRol}
        detalleCuenta={detalleCuenta}
        navegacion={navegacionPara(clavesRoles.split(",")).map((grupo) => ({
          ...grupo,
          items: grupo.items.map((item) =>
            item.clave === "protocolo" && rol !== "alumno" ? { ...item, etiqueta: "Mis protocolos" } : item,
          ),
        }))}
        onCerrarSesion={alCerrarSesion}
      >
        <Outlet />
      </PanelSencilloLayout>
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
