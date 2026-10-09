import { Navigate } from "react-router-dom";
import CargandoPantalla from "../components/CargandoPantalla";
import { useSesion } from "../context/SesionContext";

// Guarda inversa: con sesión iniciada, /login y /registro no tienen sentido
// y mandan directo al panel.
export default function RequiereInvitado({ children }) {
  const { usuario, cargando } = useSesion();

  if (cargando) return <CargandoPantalla />;
  if (usuario) return <Navigate to="/panel/inicio" replace />;

  return children;
}
