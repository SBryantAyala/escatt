export function nombreDirector(director) {
  return director.externo && director.institucion ? `${director.nombre} (${director.institucion})` : director.nombre;
}

export function claveDirector(director) {
  return director.externo ? `e:${director.externo_id}` : `d:${director.id}`;
}

export function separarClave(clave) {
  const [tipo, id] = clave.split(":");
  return { externo: tipo === "e", id };
}
