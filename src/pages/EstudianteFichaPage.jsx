import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cambiarEscalon, getFichaEstudiante } from '../scripts/docenteApi';
import { NIVELES } from '../scripts/problemsData';
import NbSelect from '../components/NbSelect';
import {
  CATEGORIAS_TEMA, duracion, fecha, lenguajeDe, nivelDeCelda, nombreVisible, porcentaje, temasPorCategoria, veredictoEs,
} from '../scripts/docenteData';
import { Plegable } from '../components/ExerciseBits';
import NivelEvolucion from '../components/NivelEvolucion';

const Seccion = ({ titulo, sub, children }) => (
  <section className="nb-dash-card nb-dash-pad">
    <h2 className="nb-dash-section-title">{titulo}</h2>
    {sub && <div className="nb-dash-section-sub">{sub}</div>}
    {children}
  </section>
);

/** Escalón del estudiante y piso que el docente puede subir (bloqueo suave, S4). */
const EscalonDocente = ({ user, estudianteId, escalon, onCambio }) => {
  const [minimo, setMinimo] = useState(escalon.minimo);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const data = await cambiarEscalon(user, estudianteId, minimo);
      onCambio(data.escalon);
      setMensaje({ ok: true, texto: 'Escalón mínimo guardado.' });
    } catch (e) {
      setMensaje({ ok: false, texto: e.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Seccion titulo={`Escalón: ${NIVELES[escalon.actual]}`} sub={`Escalón ${escalon.actual} de 5 · por nivel ${escalon.porNivel} · por resueltos ${escalon.porResueltos} · mínimo ${escalon.minimo}`}>
      <p className="nb-doc-nota nb-doc-nota-top">
        Sube solo con su nivel real o con 5 resueltos del escalón. Si ya sabe más, súbele el mínimo: ve marcados como
        «Fuera de su escalón» los problemas de arriba, pero nunca se le impide enviarlos.
      </p>
      <div className="nb-dash-clase-form">
        <NbSelect
          label="Escalón mínimo"
          value={minimo}
          onChange={setMinimo}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} · ${NIVELES[n]}` }))}
        />
        <button type="button" className={`nb-ex-send${guardando ? ' is-busy' : ''}`} disabled={guardando || minimo === escalon.minimo} onClick={guardar}>
          Guardar
        </button>
      </div>
      {mensaje && <p className={`nb-dash-clase-msg${mensaje.ok ? '' : ' is-error'}`} role="status">{mensaje.texto}</p>}
    </Seccion>
  );
};

const EstudianteFichaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [ficha, setFicha] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !isAdmin) navigate('/dashboard', { replace: true });
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return undefined;
    let vigente = true;
    getFichaEstudiante(user, id)
      .then((data) => { if (vigente) setFicha(data); })
      .catch((e) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [user, isAdmin, id]);

  const temas = useMemo(() => temasPorCategoria(ficha?.temas || []), [ficha]);

  if (!user || !isAdmin) return null;
  if (error) {
    return (
      <div className="nb-dash-inner">
        <Link className="nb-pb-back" to="/historial-usuarios">← Estudiantes</Link>
        <div className="nb-pb-empty"><p className="nb-pb-empty-title">{error}</p></div>
      </div>
    );
  }
  if (!ficha) return <div className="nb-dash-inner"><p className="nb-doc-vacio">Cargando la ficha…</p></div>;

  const { usuario, clase, evolucion, envios, pistas, actividad, fundamentos, parecidos } = ficha;
  const segundos30 = actividad.reduce((t, d) => t + d.segundos, 0);
  const pegados30 = actividad.reduce((t, d) => t + d.pegados, 0);

  return (
    <div className="nb-dash-inner">
      <Link className="nb-pb-back" to="/historial-usuarios">← Estudiantes</Link>

      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">{clase.nombre}</div>
          <h1 className="nb-dash-hero-title">{nombreVisible(usuario.username)}</h1>
          <p className="nb-dash-hero-text">
            {usuario.email} · {usuario.datos_autorizados === true ? 'Autorizó el registro de actividad' : 'No ha autorizado el registro de actividad'}
          </p>
        </div>
        <div className="nb-pb-hero-stats">
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Nivel</div><div className="nb-pb-hstat-value">{Math.round(Number(usuario.nivel))}</div></div>
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Resueltos</div><div className="nb-pb-hstat-value">{usuario.solved_count}</div></div>
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">30 días</div><div className="nb-pb-hstat-value">{duracion(segundos30)}</div></div>
        </div>
      </div>

      <div className="nb-doc-stack">
        {ficha.escalon && (
          <EscalonDocente
            key={ficha.escalon.minimo}
            user={user}
            estudianteId={id}
            escalon={ficha.escalon}
            onCambio={(escalon) => setFicha((f) => ({ ...f, escalon }))}
          />
        )}
        <Seccion titulo="Evolución del nivel" sub={`${evolucion.length} problemas cerrados · ${evolucion.filter((r) => r.aceptado).length} resueltos`}>
          {evolucion.length ? (
            <>
              <NivelEvolucion puntos={evolucion} />
              <ul className="nb-doc-tabla">
                {[...evolucion].reverse().slice(0, 10).map((r) => (
                  <li key={`${r.numero}-${r.cerrado_en}`} className="nb-doc-fila">
                    <span className={`nb-doc-estado${r.aceptado ? ' is-on' : ''}`}>{r.aceptado ? 'Resuelto' : 'Sin resolver'}</span>
                    <span className="nb-doc-celda is-grande"><strong>#{r.numero} · {r.titulo}</strong><small>{fecha(r.cerrado_en)} · puntaje {Number(r.puntaje).toFixed(2)}</small></span>
                    <span className="nb-doc-dato"><small>Cambio</small><strong>{Number(r.cambio) >= 0 ? '+' : ''}{Number(r.cambio).toFixed(1)}</strong></span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="nb-doc-vacio">Todavía no ha cerrado ningún problema: el nivel cambia al resolverlo o al cerrarlo sin resolver.</p>}
        </Seccion>

        <div className="nb-dash-row">
          <div className="nb-dash-col is-5 nb-doc-stack">
            <Seccion titulo="Temas" sub="Envíos aceptados por tema">
              <ul className="nb-doc-tabla">
                {CATEGORIAS_TEMA.map((c) => {
                  const dato = temas[c.slug];
                  const pct = porcentaje(dato);
                  return (
                    <li key={c.slug} className="nb-doc-fila">
                      <span className="nb-doc-celda is-grande"><strong>{c.titulo}</strong><small>{dato ? `${dato.aciertos} de ${dato.intentos} envíos` : 'Nunca lo ha practicado'}</small></span>
                      <span className={`nb-doc-pct is-${nivelDeCelda(dato)}`}>{pct === null ? '—' : `${pct}%`}</span>
                    </li>
                  );
                })}
              </ul>
            </Seccion>
            <Seccion titulo="Actividad" sub="Últimos 30 días">
              <ul className="nb-doc-tabla">
                <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><strong>Tiempo activo</strong></span><span className="nb-doc-dato"><strong>{duracion(segundos30)}</strong></span></li>
                <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><strong>Días con actividad</strong></span><span className="nb-doc-dato"><strong>{actividad.filter((d) => d.segundos > 0).length}</strong></span></li>
                <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><strong>Veces que pegó código</strong><small>Solo se guarda el tamaño</small></span><span className="nb-doc-dato"><strong>{pegados30}</strong></span></li>
              </ul>
            </Seccion>
          </div>

          <div className="nb-dash-col is-7 nb-doc-stack">
            <Seccion titulo="Envíos recientes" sub={`Últimos ${envios.length} · abre uno para ver el código`}>
              {envios.length ? (
                <ul className="nb-doc-tabla">
                  {envios.map((e) => (
                    <li key={e.id} className="nb-doc-fila is-col">
                      <div className="nb-doc-fila-top">
                        <span className={`nb-doc-estado${e.verdict === 'ACCEPTED' ? ' is-on' : ''}`}>{veredictoEs(e.verdict)}</span>
                        <span className="nb-doc-celda is-grande">
                          <strong>#{e.numero} · {e.titulo}</strong>
                          <small>{fecha(e.created_at)} · {lenguajeDe(e.language_id)}{e.caso_fallido ? ` · falló en el caso ${e.caso_fallido}` : ''}</small>
                        </span>
                      </div>
                      <details className="nb-doc-codigo">
                        <summary>Ver código</summary>
                        <pre>{e.source_code}</pre>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : <p className="nb-doc-vacio">Sin envíos en Problemas.</p>}
            </Seccion>
          </div>
        </div>

        <Seccion titulo="Pistas del tutor" sub="Lo que el tutor le respondió, con el veredicto que la motivó">
          {pistas.length ? (
            <ul className="nb-doc-tabla">
              {pistas.map((p) => (
                <li key={`${p.numero}-${p.creado_en}`} className="nb-doc-fila is-col">
                  <div className="nb-doc-fila-top">
                    <span className="nb-doc-estado">{veredictoEs(p.veredicto)}</span>
                    <span className="nb-doc-celda is-grande"><strong>#{p.numero} · {p.titulo}</strong><small>{fecha(p.creado_en)}</small></span>
                  </div>
                  <p className="nb-doc-pista">{p.pista}</p>
                </li>
              ))}
            </ul>
          ) : <p className="nb-doc-vacio">No ha pedido pistas.</p>}
        </Seccion>

        <Seccion titulo="Fundamentos (PSeInt)" sub="Últimos envíos">
          {fundamentos.length ? (
            <ul className="nb-doc-tabla">
              {fundamentos.map((f) => (
                <li key={`${f.nivel}-${f.numero}-${f.creado_en}`} className="nb-doc-fila is-col">
                  <div className="nb-doc-fila-top">
                    <span className={`nb-doc-estado${f.veredicto === 'ACEPTADO' ? ' is-on' : ''}`}>{f.veredicto}</span>
                    <span className="nb-doc-celda is-grande"><strong>{f.titulo}</strong><small>{f.nivel} #{f.numero} · {fecha(f.creado_en)}{f.ejemplo_fallido ? ` · falló en el ejemplo ${f.ejemplo_fallido}` : ''}</small></span>
                  </div>
                  <details className="nb-doc-codigo"><summary>Ver código</summary><pre>{f.codigo}</pre></details>
                </li>
              ))}
            </ul>
          ) : <p className="nb-doc-vacio">Sin envíos en Fundamentos.</p>}
        </Seccion>

        {parecidos.length > 0 && (
          <Plegable titulo={`Soluciones muy parecidas a las de un compañero (${parecidos.length})`} className="nb-doc-plegable">
            <p className="nb-doc-nota">Es un indicio para conversar con el estudiante, no una prueba de copia.</p>
            <ul className="nb-doc-tabla">
              {parecidos.map((p) => (
                <li key={`${p.numero}-${p.companero}`} className="nb-doc-fila">
                  <span className="nb-doc-celda is-grande"><strong>#{p.numero} · {p.titulo}</strong><small>Con {nombreVisible(p.companero)}</small></span>
                  <span className="nb-doc-dato"><small>Parecido</small><strong>{Math.round(p.parecido * 100)}%</strong></span>
                </li>
              ))}
            </ul>
          </Plegable>
        )}
      </div>
    </div>
  );
};

export default EstudianteFichaPage;
