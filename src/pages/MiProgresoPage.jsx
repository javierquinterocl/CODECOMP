import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EVENTO_ACTIVIDAD_ENVIADA, EVENTO_VACIAR_ACTIVIDAD, getMiProgreso } from '../scripts/registroApi';
import { buscarNivel } from '../scripts/fundamentosData';
import { CATEGORIAS_TEMA, duracion, fecha, nivelDeCelda, porcentaje, temasPorCategoria, ultimosDias } from '../scripts/docenteData';
import { NIVELES, buscarCategoria, categoriaDeProblema } from '../scripts/problemsData';
import { NivelBarra } from '../components/ProblemBits';
import NivelEvolucion from '../components/NivelEvolucion';
import MapaActividad from '../components/MapaActividad';
import TiempoEjercicios from '../components/TiempoEjercicios';

const RESUELTOS_PARA_SUBIR = 5;

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
  const { user, isAdmin } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  // Al abrir se envía la actividad acumulada; cada envío que llega y cada vuelta a la pestaña
  // vuelven a cargar, así los tiempos se ven al día sin recargar la página.
  useEffect(() => {
    if (!user || isAdmin) return undefined;
    let vigente = true;
    const cargar = () => getMiProgreso(user)
      .then((data) => { if (vigente) { setDatos(data); setError(''); } })
      .catch((e) => { if (vigente) setError(e.message); });
    cargar();
    window.dispatchEvent(new Event(EVENTO_VACIAR_ACTIVIDAD));
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    window.addEventListener(EVENTO_ACTIVIDAD_ENVIADA, cargar);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO_ACTIVIDAD_ENVIADA, cargar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [user, isAdmin]);

  // Del tema más débil al más fuerte; los que nunca practicó van primero.
  const temas = useMemo(() => {
    const porCategoria = temasPorCategoria(datos?.temas || []);
    return CATEGORIAS_TEMA
      .map((c) => ({ categoria: c, dato: porCategoria[c.slug] }))
      .sort((a, b) => (porcentaje(a.dato) ?? -1) - (porcentaje(b.dato) ?? -1));
  }, [datos]);

  // Solo para estudiantes (decisión del equipo): el docente va a su vista.
  if (isAdmin) return <Navigate to="/historial-usuarios" replace />;
  if (error && !datos) return <div className="nb-dash-inner"><div className="nb-pb-empty"><p className="nb-pb-empty-title">{error}</p></div></div>;
  if (!datos) return <div className="nb-dash-inner"><p className="nb-doc-vacio">Cargando tu progreso…</p></div>;

  const { usuario, evolucion, pendientes, mapa, ejercicios } = datos;
  const autorizado = usuario.datos_autorizados === true;
  const semana = ultimosDias(mapa, 7);
  const abiertos = pendientes.filter((p) => !p.cerrado);
  const cerrados = pendientes.filter((p) => p.cerrado);

  const fundamentos = datos.fundamentos || [];
  const fundamentosHechos = usuario.fundamentos_resueltos ?? fundamentos.reduce((t, f) => t + f.resueltos, 0);

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
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Resueltos</div>
            <div className="nb-pb-hstat-value">{usuario.resueltos + fundamentosHechos}</div>
            <div className="nb-pb-hstat-sub">{usuario.resueltos} problemas · {fundamentosHechos} Fundamentos</div>
          </div>
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">En ejercicios</div>
            <div className="nb-pb-hstat-value">{autorizado ? duracion(semana.segundosEjercicios) : '—'}</div>
            <div className="nb-pb-hstat-sub">últimos 7 días</div>
          </div>
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">En la plataforma</div>
            <div className="nb-pb-hstat-value">{autorizado ? duracion(semana.segundos) : '—'}</div>
            <div className="nb-pb-hstat-sub">últimos 7 días</div>
          </div>
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
                {' '}Tu nivel y tu escalón salen de Problemas, que tienen dificultad medida; Fundamentos cuenta en tus resueltos.
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

        <Seccion titulo="Tu actividad" sub={autorizado ? 'Últimos 12 meses · pasa el cursor por un día para ver el detalle' : 'Últimos 12 meses · tus envíos por día'}>
          {!autorizado && (
            <p className="nb-doc-nota nb-doc-nota-top">No registramos tu tiempo porque no lo has autorizado; aquí solo ves tus envíos. Puedes cambiarlo en <Link to="/dashboard/cuenta">Mi cuenta</Link>.</p>
          )}
          <MapaActividad mapa={mapa} conTiempo={autorizado} />
        </Seccion>

        <div className="nb-dash-row">
          <Seccion titulo="Tiempo por ejercicio" sub="Dónde se te va el tiempo de verdad · últimos 12 meses" className="nb-dash-col is-7">
            {autorizado
              ? <TiempoEjercicios ejercicios={ejercicios} totales={mapa.totales} />
              : <p className="nb-doc-vacio">Para medir cuánto tardas en cada ejercicio necesitamos tu autorización en <Link to="/dashboard/cuenta">Mi cuenta</Link>.</p>}
          </Seccion>

          <Seccion titulo="Fundamentos (PSeInt)" sub="Ejercicios resueltos por nivel" className="nb-dash-col is-5">
            <ul className="nb-doc-tabla">
              {fundamentos.map((f) => (
                <li key={f.nivel} className="nb-doc-fila">
                  <span className="nb-doc-celda is-grande">
                    <strong>{buscarNivel(f.nivel)?.titulo || f.nivel}</strong>
                    <small>{f.resueltos} de {f.total} resueltos</small>
                  </span>
                  <Link className="nb-doc-filtro" to={`/dashboard/fundamentos/${f.nivel}`}>Practicar</Link>
                </li>
              ))}
            </ul>
            {!fundamentos.length && <p className="nb-doc-vacio">Aún no hay ejercicios de Fundamentos.</p>}
          </Seccion>
        </div>
      </div>
    </div>
  );
};

export default MiProgresoPage;
