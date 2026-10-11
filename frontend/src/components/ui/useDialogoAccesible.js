import { useEffect, useRef } from "react";

const SELECTOR_FOCOSABLES =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Foco atrapado + Escape + devolver el foco al cerrar, para diálogos propios
// (no DialogoConfirmacion, que ya lo trae incluido). Devuelve el ref que hay
// que poner en el contenedor del diálogo.
//
//   const contenedorRef = useDialogoAccesible(abierto, onCerrar);
//   <div ref={contenedorRef} role="dialog" aria-modal="true">...</div>
export default function useDialogoAccesible(abierto, onCerrar, { enfocarAlAbrir } = {}) {
  const contenedorRef = useRef(null);
  const elementoPrevioRef = useRef(null);

  useEffect(() => {
    if (abierto) {
      elementoPrevioRef.current = document.activeElement;
      const foco = enfocarAlAbrir?.() ?? contenedorRef.current?.querySelector(SELECTOR_FOCOSABLES);
      foco?.focus?.();
    } else {
      elementoPrevioRef.current?.focus?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    function alTeclado(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const focosables = contenedorRef.current?.querySelectorAll(SELECTOR_FOCOSABLES);
      if (!focosables || focosables.length === 0) return;
      const primero = focosables[0];
      const ultimo = focosables[focosables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto, onCerrar]);

  return contenedorRef;
}
