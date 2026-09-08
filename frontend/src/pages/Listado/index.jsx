// Pantalla: Listado (+ Revocar acceso + Eliminar)
// Responsable: Edgar (rama feature/listado-revocar-eliminar)
// Consume la API bajo /api/usuarios segun el contrato acordado:
//   GET /usuarios, PATCH /usuarios/:id/revocar, DELETE /usuarios/:id

export default function ListadoPage({ onVolver }) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          ← Volver
        </button>
      )}
      <h1 className="text-xl font-semibold">Listado de usuarios</h1>
      <p className="text-sm text-slate-500">Pantalla pendiente de implementar.</p>
    </div>
  );
}
