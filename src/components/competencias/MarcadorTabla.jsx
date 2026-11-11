/** Tabla del marcador de una competencia; la usan el estudiante (congelado) y el jurado (completo). */
const MarcadorTabla = ({ tabla, aviso }) => (
  <div className="nb-dash-card nb-comp-panel">
    {aviso && <p className="nb-comp-congelado">{aviso}</p>}
    <div className="nb-comp-tabla-caja">
      <table className="nb-comp-tabla">
        <thead>
          <tr>
            <th>#</th><th className="is-equipo">Equipo</th><th>Resueltos</th><th>Tiempo</th>
            {tabla.letras.map((l) => <th key={l}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((f) => (
            <tr key={f.equipo} className={f.propio ? 'is-propio' : ''}>
              <td>{f.puesto}</td>
              <td className="is-equipo">{f.equipo}</td>
              <td><strong>{f.resueltos}</strong></td>
              <td>{f.tiempo}</td>
              {f.problemas.map((p) => (
                <td key={p.letra} className={`nb-comp-celda${p.resuelto ? ' is-ok' : p.pendientes ? ' is-wait' : p.intentos ? ' is-fail' : ''}${p.primero ? ' is-primero' : ''}`}>
                  {p.intentos > 0 && (
                    <>
                      <span>{p.intentos} {p.intentos === 1 ? 'intento' : 'intentos'}</span>
                      {p.resuelto && <small>{p.minuto} min</small>}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default MarcadorTabla;
