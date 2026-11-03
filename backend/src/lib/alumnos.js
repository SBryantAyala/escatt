export const sqlCarreraVisible = (alias) =>
  `CASE WHEN ${alias}.procedencia = 'externa' THEN concat_ws(' · ', ${alias}.carrera, ${alias}.escuela_origen) ELSE ${alias}.carrera END`;
