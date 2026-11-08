import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMiProgreso, responderDatos } from '../scripts/registroApi';
import { CATEGORIAS_TEMA, duracion, fecha, nivelDeCelda, porcentaje, temasPorCategoria } from '../scripts/docenteData';
import { NIVELES, buscarCategoria, categoriaDeProblema } from '../scripts/problemsData';
import { NivelBarra } from '../components/ProblemBits';

const RESUELTOS_PARA_SUBIR = 5;
import NivelEvolucion from '../components/NivelEvolucion';

// La columna envuelve a la tarjeta: si la tarjeta fuera la columna, heredaría su separación grande.
const Seccion = ({ titulo, sub, children, className = '' }) => {
  const tarjeta = (
    <section className="nb-dash-card nb-dash-pad">
      <h2 className="nb-dash-section-title">{titulo}</h2>
      {sub && <div className="nb-dash-section-sub">{sub}</div>}
      {children}
    </section>
  );
  return className ? <div className={className}>{tarjeta}</div> : tarjeta;
};

const PendienteFila = ({ p }) => {
  const categoria = buscarCategoria(categoriaDeProblema({ tags: p.tags, dificultadRating: p.dificultad }));
  return (
    <li className="nb-pb-row nb-doc-estudiante">
      <span className="nb-pb-row-num">#{p.numero}</span>
      <span className="nb-pb-row-main">
        <Link className="nb-pb-row-link" to={`/dashboard/problemas/todos/${p.numero}`}>{p.titulo_es || p.titulo}</Link>
        <span className="nb-pb-row-sub">{categoria?.titulo} · dificultad {p.dificultad} · último intento {fecha(p.ultimo)}</span>
      </span>
      <span className="nb-doc-dato"><small>Intentos</small><strong>{p.intentos}</strong></span>
      <span className="nb-pb-row-go" aria-hidden="true">→</span>
    </li>
  );
};

/** Lo que el estudiante necesita para saber qué mejorar y qué resolver. Textos: borrador. */
const MiProgresoPage = () => {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    getMiProgreso(user)
      .then((data) => { if (vigente) setDatos(data); })
      .catch((e) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [user]);

  // Del tema más débil al más fuerte; los que nunca practicó van primero.
  const temas = useMemo(() => {
    const porCategoria = temasPorCategoria(datos?.temas || []);
    return CATEGORIAS_TEMA
      .map((c) => ({ categoria: c, dato: porCategoria[c.slug] }))
      .sort((a, b) => (porcentaje(a.dato) ?? -1) - (porcentaje(b.dato) ?? -1));
  }, [datos]);

  if (error) return <div className="nb-dash-inner"><div className="nb-pb-empty"><p className="nb-pb-empty-title">{error}</p></div></div>;
  if (!datos) return <div className="nb-dash-inner"><p className="nb-doc-vacio">Cargando tu progreso…</p></div>;

  const { usuario, evolucion, pendientes, actividad } = datos;
  const semana = actividad.slice(-7).reduce((t, d) => t + d.segundos, 0);
  const maxSegundos = Math.max(1, ...actividad.map((d) => d.segundos));
  const abiertos = pendientes.filter((p) => !p.cerrado);
  const cerrados = pendientes.filter((p) => p.cerrado);

  const cambiarAutorizacion = async () => {
    const acepta = usuario.datos_autorizados !== true;
    if (!acepta && !window.confirm('Si retiras la autorización, borraremos tu actividad registrada. ¿Continuar?')) return;
    setGuardando(true);
    try {
      const r = await responderDatos(user, acepta);
      setDatos((d) => ({ ...d, usuario: { ...d.usuario, datos_autorizados: r.autorizado }, actividad: r.autorizado ? d.actividad : [] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="nb-dash-inner">
      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">Tu avance</div>
          <h1 className="nb-dash-hero-title">Mi progreso</h1>
          <p className="nb-dash-hero-text">Tu nivel real, los temas que dominas, los que te cuestan y lo que te conviene resolver ahora.</p>
        </div>
        <div className="nb-pb-hero-stats">
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Nivel</div><div className="nb-pb-hstat-value">{Math.round(usuario.nivel)}</div></div>
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Resueltos</div><div className="nb-pb-hstat-value">{usuario.resueltos}</div></div>
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Esta semana</div><div className="nb-pb-hstat-value">{duracion(semana)}</div></div>
        </div>
      </div>

      <div className="nb-doc-stack">
        {datos.escalon && (
          <Seccion titulo={`Tu escalón: ${NIVELES[datos.escalon.actual]}`} sub={`Escalón ${datos.escalon.actual} de 5`}>
            <div className="nb-doc-escalon">
              <NivelBarra nivel={datos.escalon.actual} />
              <p className="nb-doc-nota nb-doc-nota-top">
                {datos.escalon.actual < 5
                  ? `Para subir a «${NIVELES[datos.escalon.actual + 1]}»: llega a nivel ${datos.escalon.nivelParaSubir} o resuelve ${RESUELTOS_PARA_SUBIR} problemas de este escalón (llevas ${Math.min(datos.escalon.resueltosEnActual, RESUELTOS_PARA_SUBIR)}).`
                  : 'Estás en el escalón más alto.'}
                {' '}Puedes intentar problemas más difíciles: se marcan como «Fuera de tu escalón» y no se recomiendan.
              </p>
            </div>
            <Link className="nb-doc-filtro" to="/dashboard/problemas">Ver problemas</Link>
          </Seccion>
        )}

        <Seccion titulo="Evolución de tu nivel" sub="Cada punto es un problema cerrado">
          <p className="nb-doc-nota nb-doc-nota-top">
            Tu nivel sube al resolver un problema: más si es al primer intento, sin pistas y difícil para ti.
            Baja solo si un problema se cierra sin resolverlo (5 fallos o 7 días desde el primer fallo).
          </p>
          {evolucion.length ? <NivelEvolucion puntos={evolucion} /> : <p className="nb-doc-vacio">Resuelve tu primer problema para ver tu evolución.</p>}
        </Seccion>

        <div className="nb-dash-row">
          <Seccion titulo="Tus temas" sub="De lo que más te cuesta a lo que dominas" className="nb-dash-col is-5">
            <ul className="nb-doc-tabla">
              {temas.map(({ categoria, dato }) => {
                const pct = porcentaje(dato);
                return (
                  <li key={categoria.slug} className="nb-doc-fila">
                    <span className="nb-doc-celda is-grande">
                      <strong>{categoria.titulo}</strong>
                      <small>{dato ? `${dato.aciertos} de ${dato.intentos} envíos aceptados` : 'Aún no lo practicas'}</small>
                    </span>
                    <span className={`nb-doc-pct is-${nivelDeCelda(dato)}`}>{pct === null ? '—' : `${pct}%`}</span>
                    <Link className="nb-doc-filtro" to={`/dashboard/problemas/${categoria.slug}`}>Practicar</Link>
                  </li>
                );
              })}
            </ul>
          </Seccion>

          <Seccion titulo="Qué resolver ahora" sub="Problemas que empezaste y aún no resuelves" className="nb-dash-col is-7">
            {abiertos.length ? (
              <ul className="nb-doc-lista">{abiertos.map((p) => <PendienteFila key={p.numero} p={p} />)}</ul>
            ) : <p className="nb-doc-vacio">No tienes problemas a medias. Busca uno nuevo en los <Link to="/dashboard">recomendados de Inicio</Link>.</p>}
            {cerrados.length > 0 && (
              <>
                <p className="nb-doc-nota nb-doc-nota-top">Cerrados sin resolver: ya no cambian tu nivel, pero puedes volver a intentarlos para practicar.</p>
                <ul className="nb-doc-lista">{cerrados.map((p) => <PendienteFila key={p.numero} p={p} />)}</ul>
              </>
            )}
          </Seccion>
        </div>

        <div className="nb-dash-row">
          <Seccion titulo="Tu actividad" sub="Tiempo activo por día · últimos 14 días" className="nb-dash-col is-7">
            {usuario.datos_autorizados !== true ? (
              <p className="nb-doc-vacio">No registramos tu actividad porque no la has autorizado.</p>
            ) : actividad.length ? (
              <div className="nb-doc-barras" role="img" aria-label="Tu tiempo activo por día">
                {actividad.map((d) => (
                  <div key={d.dia} className="nb-doc-barra" title={`${d.dia}: ${duracion(d.segundos)}`}>
                    <span style={{ '--alto': `${Math.max(4, (d.segundos / maxSegundos) * 100)}%` }} />
                    <small>{d.dia.slice(8)}</small>
                  </div>
                ))}
              </div>
            ) : <p className="nb-doc-vacio">Aún no hay actividad registrada.</p>}
          </Seccion>

          <Seccion titulo="Tus datos" sub="Ley 1581 de 2012" className="nb-dash-col is-5">
            <p className="nb-doc-nota nb-doc-nota-top">
              {usuario.datos_autorizados === true
                ? 'Autorizaste registrar tu tiempo activo, cuándo abres cada problema y cuántas veces pegas código. Si la retiras, borramos esa actividad.'
                : 'No has autorizado el registro de tu actividad. Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio.'}
            </p>
            <div className="nb-dash-aviso-acciones">
              <button
                type="button"
                className={usuario.datos_autorizados === true ? `nb-dash-btn-claro${guardando ? ' is-busy' : ''}` : `nb-ex-send${guardando ? ' is-busy' : ''}`}
                disabled={guardando}
                onClick={cambiarAutorizacion}
              >
                {usuario.datos_autorizados === true ? 'Retirar autorización' : 'Autorizar'}
              </button>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
};

export default MiProgresoPage;
