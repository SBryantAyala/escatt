import { Navigate, useLocation } from "react-router-dom";
import CargandoPantalla from "../components/CargandoPantalla";
import { useSesion } from "../context/SesionContext";

// Guarda: sin sesión -> /login?next=<ruta actual> (para volver aquí al
// entrar). Con contraseña temporal pendiente -> siempre /cambiar-password,
// salvo que ya estemos ahí (cerrar sesión desde esa pantalla no pasa por acá).
export default function RequiereSesion({ children }) {
  const { usuario, cargando } = useSesion();
  const location = useLocation();

  if (cargando) return <CargandoPantalla />;

  if (!usuario) {
    const siguiente = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(siguiente)}`} replace />;
  }

  if (usuario.debe_cambiar_password && location.pathname !== "/cambiar-password") {
    return <Navigate to="/cambiar-password" replace />;
  }

  return children;
}
