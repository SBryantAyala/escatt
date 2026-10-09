import SeccionProximamente from "../pages/Panel/SeccionProximamente";
import { useSesion } from "../context/SesionContext";
import { permiteA, seccionPorClave } from "./secciones";

// Guarda: si el usuario no tiene ninguno de los roles de la sección (o está
// en `excepto`), muestra "Acceso denegado" dentro del layout del panel en vez
// de la pantalla real. Lee los roles de routes/secciones.js: es la misma
// fuente de verdad que usa el sidebar, así nunca se desincronizan.
export default function RequiereRol({ clave, children }) {
  const { usuario } = useSesion();
  const seccion = seccionPorClave(clave);
  const permitido = seccion ? permiteA(seccion, usuario?.roles ?? []) : false;

  if (!permitido) {
    return (
      <SeccionProximamente
        titulo="Acceso denegado"
        descripcion="Tu rol no tiene acceso a esta sección del panel. Si crees que es un error, comunícate con la CATT."
      />
    );
  }

  return children;
}
