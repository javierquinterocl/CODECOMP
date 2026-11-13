import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClases } from '../scripts/registroApi';
import { getPanelClase } from '../scripts/docenteApi';
import {
  ALERTAS, CATEGORIAS_TEMA, duracion, haceCuanto, nivelDeCelda, nombreVisible, porcentaje, temasPorCategoria,
} from '../scripts/docenteData';
import NbSelect from '../components/NbSelect';
import HistorialSesiones from '../components/HistorialSesiones';
import { Plegable } from '../components/ExerciseBits';
import { SearchIcon } from '../components/AppIcons';

const Alertas = ({ lista }) => (lista.length ? (
  <span className="nb-doc-alertas">
    {lista.map((a) => <span key={a} className="nb-dash-chip nb-doc-alerta">{ALERTAS[a] || a}</span>)}
  </span>
) : null);

/** Panel docente: la clase de un vistazo, cada estudiante y el historial de sesiones. */
const UserHistoryPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [clases, setClases] = useState(null);
  const [elegida, setElegida] = useState('');
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (user && !isAdmin) navigate('/dashboard', { replace: true });
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return undefined;
    let vigente = true;
    getClases(user)
      .then((data) => { if (vigente) setClases(data.clases || []); })
      .catch((e) => { if (vigente) { setClases([]); setError(e.message); } });
    return () => { vigente = false; };
  }, [user, isAdmin]);

  const claseId = elegida || clases?.[0]?.id || '';

  useEffect(() => {
    if (!user || !claseId) return undefined;
    let vigente = true;
    getPanelClase(user, claseId)
      .then((data) => { if (vigente) { setPanel(data); setError(''); } })
      .catch((e) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [user, claseId]);

  const datos = panel?.clase?.id === claseId ? panel : null;
  const estudiantes = useMemo(() => datos?.estudiantes || [], [datos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q
      ? estudiantes.filter((e) => `${nombreVisible(e.username)} ${e.email}`.toLowerCase().includes(q))
      : estudiantes;
  }, [estudiantes, busqueda]);

  const temas = useMemo(() => {
    const porUsuario = {};
    for (const fila of datos?.temas || []) (porUsuario[fila.user_id] ||= []).push(fila);
    return Object.fromEntries(Object.entries(porUsuario).map(([id, filas]) => [id, temasPorCategoria(filas)]));
  }, [datos]);

  if (!user || !isAdmin) return null;

  const activos = estudiantes.filter((e) => e.ultimaActividad && Date.now() - new Date(e.ultimaActividad) < 7 * 86_400_000).length;
  const conAlertas = estudiantes.filter((e) => e.alertas.length).length;
  const maxSegundos = Math.max(1, ...(datos?.actividad || []).map((d) => d.segundos));

  return (
    <div className="nb-dash-inner">
      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">Panel docente</div>
          <h1 className="nb-dash-hero-title">Estudiantes</h1>
          <p className="nb-dash-hero-text">
            Cómo va tu clase: quién practica, qué le cuesta y a quién conviene acompañar esta semana.
          </p>
        </div>
        {datos && (
          <div className="nb-pb-hero-stats">
            <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Estudiantes</div><div className="nb-pb-hstat-value">{estudiantes.length}</div></div>
            <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Activos 7 días</div><div className="nb-pb-hstat-value">{activos}</div></div>
            <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Con alertas</div><div className="nb-pb-hstat-value">{conAlertas}</div></div>
          </div>
        )}
      </div>

      {error && <p className="nb-dash-clase-msg is-error" role="alert">{error}</p>}

      {clases && !clases.length && (
        <div className="nb-pb-empty">
          <p className="nb-pb-empty-title">Aún no tienes clases</p>
          <p>Crea una desde <Link to="/dashboard">Inicio</Link> con «Crear clase» y comparte el código con tus estudiantes.</p>
        </div>
      )}

      {clases?.length > 0 && (
        <div className="nb-doc-stack">
          <div className="nb-dash-card nb-dash-pad nb-doc-clase">
            <div>
              {clases.length === 1 && <div className="nb-dash-kicker">Clase</div>}
              {clases.length > 1 ? (
                <NbSelect
                  label="Clase"
                  value={claseId}
                  onChange={setElegida}
                  options={clases.map((c) => ({ value: c.id, label: c.nombre }))}
                />
              ) : <h2 className="nb-dash-section-title">{clases[0].nombre}</h2>}
            </div>
            {datos && <span className="nb-dash-clase-codigo" title="Código para entrar a la clase">{datos.clase.codigo}</span>}
          </div>

          {!datos && !error && <p className="nb-doc-vacio">Cargando la clase…</p>}

          {datos && !estudiantes.length && (
            <div className="nb-pb-empty">
              <p className="nb-pb-empty-title">Todavía no hay estudiantes</p>
              <p>Comparte el código <strong>{datos.clase.codigo}</strong>: cada estudiante lo escribe en «Únete a tu clase» desde Inicio.</p>
            </div>
          )}

          {datos && estudiantes.length > 0 && (
            <>
              <section className="nb-dash-card nb-dash-pad">
                <div className="nb-dash-sechead">
                  <div>
                    <h2 className="nb-dash-section-title">Estudiantes de la clase</h2>
                    <div className="nb-dash-section-sub">Ordenados por nivel · toca uno para ver su ficha</div>
                  </div>
                  <div className="nb-pb-search nb-pb-search-inline nb-doc-buscar">
                    <SearchIcon />
                    <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar estudiante" />
                  </div>
                </div>
                <ul className="nb-doc-lista">
                  {filtrados.map((e, i) => (
                    <li key={e.id} className="nb-pb-row nb-doc-estudiante">
                      <span className="nb-pb-row-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="nb-pb-row-main">
                        <Link className="nb-pb-row-link" to={`/historial-usuarios/${e.id}`}>{nombreVisible(e.username)}</Link>
                        <span className="nb-pb-row-sub">{e.email} · {haceCuanto(e.ultimaActividad)}</span>
                        <Alertas lista={e.alertas} />
                      </span>
                      <span className="nb-doc-dato"><small>Nivel</small><strong>{Math.round(e.nivel)}</strong></span>
                      <span className="nb-doc-dato" title={`${e.resueltos} problemas · ${e.fundamentosResueltos} Fundamentos`}>
                        <small>Resueltos</small><strong>{e.resueltos + e.fundamentosResueltos}</strong>
                      </span>
                      <span className="nb-doc-dato"><small>Problemas</small><strong>{e.resueltos}</strong></span>
                      <span className="nb-doc-dato"><small>Fundamentos</small><strong>{e.fundamentosResueltos}</strong></span>
                      <span className="nb-doc-dato"><small>Envíos</small><strong>{e.envios}</strong></span>
                      <span className="nb-doc-dato"><small>Esta semana</small><strong>{duracion(e.segundosSemana)}</strong></span>
                      <span className="nb-pb-row-go" aria-hidden="true">→</span>
                    </li>
                  ))}
                </ul>
                {!filtrados.length && <p className="nb-doc-vacio">Nadie coincide con «{busqueda}».</p>}
              </section>

              <section className="nb-dash-card nb-dash-pad">
                <h2 className="nb-dash-section-title">Mapa de temas</h2>
                <div className="nb-dash-section-sub">Porcentaje de envíos aceptados por tema · vacío: nunca lo ha practicado</div>
                <div className="nb-doc-mapa-scroll">
                  <table className="nb-doc-mapa">
                    <thead>
                      <tr>
                        <th scope="col">Estudiante</th>
                        {CATEGORIAS_TEMA.map((c) => <th key={c.slug} scope="col">{c.titulo}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantes.map((e) => (
                        <tr key={e.id}>
                          <th scope="row">{nombreVisible(e.username)}</th>
                          {CATEGORIAS_TEMA.map((c) => {
                            const dato = temas[e.id]?.[c.slug];
                            const pct = porcentaje(dato);
                            return (
                              <td key={c.slug} className={`is-${nivelDeCelda(dato)}`} title={dato ? `${dato.aciertos} de ${dato.intentos} envíos aceptados` : 'Sin práctica'}>
                                {pct === null ? '—' : `${pct}%`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="nb-dash-row">
                <div className="nb-dash-col is-7">
                <section className="nb-dash-card nb-dash-pad">
                  <h2 className="nb-dash-section-title">Problemas que más cuestan</h2>
                  <div className="nb-dash-section-sub">Por envíos fallidos de la clase</div>
                  {datos.problemas.length ? (
                    <ul className="nb-doc-tabla">
                      {datos.problemas.map((p) => (
                        <li key={p.numero} className="nb-doc-fila">
                          <span className="nb-doc-celda is-grande">
                            <strong>#{p.numero} · {p.titulo_es || p.titulo}</strong>
                            <small>Dificultad {p.dificultad}</small>
                          </span>
                          <span className="nb-doc-dato"><small>Fallos</small><strong>{p.fallos}</strong></span>
                          <span className="nb-doc-dato"><small>Resolvieron</small><strong>{p.resolvieron}/{p.intentaron}</strong></span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="nb-doc-vacio">Aún no hay envíos fallidos.</p>}
                </section>
                </div>

                <div className="nb-dash-col is-5">
                <section className="nb-dash-card nb-dash-pad">
                  <h2 className="nb-dash-section-title">Actividad de la clase</h2>
                  <div className="nb-dash-section-sub">Tiempo activo por día · últimos 14 días</div>
                  {datos.actividad.length ? (
                    <div className="nb-doc-barras" role="img" aria-label="Tiempo activo por día de la clase">
                      {datos.actividad.map((d) => (
                        <div key={d.dia} className="nb-doc-barra" title={`${d.dia}: ${duracion(d.segundos)} · ${d.estudiantes} estudiantes`}>
                          <span style={{ '--alto': `${Math.max(4, (d.segundos / maxSegundos) * 100)}%` }} />
                          <small>{d.dia.slice(8)}</small>
                        </div>
                      ))}
                    </div>
                  ) : <p className="nb-doc-vacio">Sin actividad registrada en estos días.</p>}
                </section>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Plegable titulo="Historial de inicios de sesión" className="nb-doc-plegable">
        <HistorialSesiones />
      </Plegable>
    </div>
  );
};

export default UserHistoryPage;
