import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProgress } from '../scripts/progressApi';
import { getRecommendations } from '../scripts/recommendationApi';
import { NIVELES, buscarCategoria, categoriaDeProblema, nivelDeRating } from '../scripts/problemsData';
import { PencilIcon, CpuIcon, TrophyIcon, BookIcon, ReloadIcon } from '../components/AppIcons';

/* ── Datos de muestra del diseño (aún sin fuente real) ───────── */
const RPC_EVENTS = [
  { mes: 'Abr', dia: '11', destacado: true, titulo: 'Competencia 03 RPC 2026', estado: 'Finalizado',
    cuando: 'Sáb 11 de abril · 13:00 UTC-5 · 5 horas',
    detalle: '~12 retos de todos los niveles para equipos latinos clasificatorios.' },
  { mes: 'Mar', dia: '14', destacado: false, titulo: 'Competencia 02 RPC 2026', estado: 'Finalizado',
    cuando: 'Sáb 14 de marzo · 13:00 UTC-5 · 5 horas',
    detalle: 'Maratón con ~12 retos para continuar el ciclo de entrenamiento latino.' },
];

const GRUPO = [
  { nombre: 'Andres Salas',    codigo: '192164',  tiempo: '3 semestres', envios: 114, puntos: 0 },
  { nombre: 'Andrey Castilla', codigo: '1021634', tiempo: '2 semestres', envios: 96,  puntos: 0 },
  { nombre: 'Laura Aura',      codigo: '1021592', tiempo: '2 semestres', envios: 75,  puntos: 0 },
  { nombre: 'Ivan Cepeda',     codigo: '1021718', tiempo: '1 semestre',  envios: 41,  puntos: 0 },
];

const RECURSOS = [
  { titulo: 'Guías', icono: <BookIcon />, oscuro: false,
    texto: 'Rutas de estudio paso a paso: estructuras de datos, grafos, programación dinámica y más.',
    chips: ['18 guías', 'Básico a avanzado'] },
  { titulo: 'Videos', icono: '▶', oscuro: true,
    texto: 'Sesiones grabadas del grupo estable y explicaciones de problemas resueltos en vivo.',
    chips: ['42 videos', 'UFPSO'] },
];


const RECO_MIN_TARJETAS = 8;
const RECO_SEG_POR_TARJETA = 5;


const categoriaDeReco = (reco) => categoriaDeProblema({
  tags: reco.tags || [],
  dificultadRating: reco.difficulty_rating,
});

const RecoCard = ({ reco, duplicado }) => {
  const categoria = buscarCategoria(categoriaDeReco(reco));

  return (
    <Link
      to={`/dashboard/problemas/todos/${reco.problem_number}`}
      className="nb-dash-reco"
      style={{ '--cat-bg': categoria?.bg, '--cat-ink': categoria?.ink }}
      title={reco.title}
      // La copia es decorativa: ni se lee ni se tabula dos veces.
      aria-hidden={duplicado || undefined}
      tabIndex={duplicado ? -1 : undefined}
    >
      <span className="nb-dash-reco-num">Problema {reco.problem_number}</span>
      <h3 className="nb-dash-reco-title">{reco.title}</h3>
      <div className="nb-dash-reco-foot">
        <span className="nb-dash-reco-cat">{categoria?.titulo}</span>
        <div className="nb-dash-reco-nivel">
          <span className="nb-dash-reco-label">{NIVELES[nivelDeRating(reco.difficulty_rating)]}</span>
          <span className="nb-dash-reco-val">{reco.difficulty_rating}</span>
        </div>
      </div>
    </Link>
  );
};

const RecoCarrusel = ({ recomendados }) => {
  const base = useMemo(() => {
 
    const utiles = recomendados
      .filter((reco) => categoriaDeReco(reco) !== 'otros')
      .slice(0, RECO_MIN_TARJETAS);
    if (utiles.length === 0) return [];
    // Con pocas la cinta no llenaría el ancho: se repite hasta cubrirlo.
    const lista = [];
    while (lista.length < RECO_MIN_TARJETAS) lista.push(...utiles);
    return lista;
  }, [recomendados]);

  if (base.length === 0) return null;

  return (
    <div className="nb-dash-reco-marquee">
      <div
        className="nb-dash-reco-track"
        style={{ '--reco-dur': `${(base.length * RECO_SEG_POR_TARJETA).toFixed(1)}s` }}
      >
        {[...base, ...base].map((reco, i) => (
          <RecoCard key={`${reco.id}-${i}`} reco={reco} duplicado={i >= base.length} />
        ))}
      </div>
    </div>
  );
};

const MemberField = ({ label, value }) => (
  <div className="nb-dash-member-field">
    <div className="nb-dash-member-label">{label}</div>
    <div className="nb-dash-member-value">{value}</div>
  </div>
);

const MemberRow = ({ pos, nombre, codigo, tiempo, envios, puntos, me = false, inicial }) => (
  <div className={`nb-dash-member${me ? ' is-me' : ''}`}>
    <span className="nb-dash-member-pos">{pos}</span>
    <div className="nb-dash-member-av">{inicial}</div>
    <div className="nb-dash-member-main">
      <div className="nb-dash-member-name">
        {nombre}{me && <span className="nb-dash-member-you"> (tú)</span>}
      </div>
      <div className="nb-dash-member-code">{codigo}</div>
    </div>
    <MemberField label="Tiempo inscrito" value={tiempo} />
    <MemberField label="Envíos" value={envios} />
    <div className="nb-dash-member-points">
      <div className="nb-dash-member-label">Puntos</div>
      <div className="nb-dash-member-points-value">{puntos}</div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user, displayName, firstName, codigoEstudiante, storedPhotoURL, handleLogout, isLoggingOut } = useAuth();
  const [photoError, setPhotoError] = useState(false);
  const [progress, setProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [refrescando, setRefrescando] = useState(false);


  const traerRecomendados = useCallback(
    () => getRecommendations(user, 14).then(setRecommendations).catch(() => {}),
    [user],
  );


  const refrescarRecomendados = () => {
    setRefrescando(true);
    traerRecomendados().finally(() => setRefrescando(false));
  };

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true' || !user) return;
    getProgress(user).then(setProgress).catch(() => {});
    traerRecomendados();
  }, [user, traerRecomendados]);

  const photo = storedPhotoURL || user?.photoURL || null;
  const inicial = (displayName || user?.email || '?')[0].toUpperCase();

  return (
    <div className="nb-dash-inner">

      {/* ── Banner de bienvenida ── */}
      <div className="nb-dash-hero">
        <div className="nb-dash-hero-deco" aria-hidden="true">
          <div className="nb-dash-code-float nb-dash-hero-code">
            <div className="nb-dash-code-bar"><span /><span /></div>
            <pre>
              <span className="nb-dash-code-kw">for</span>{' i '}
              <span className="nb-dash-code-kw">in</span>{' range(n):\n  dp[i] = min(\n    dp[i-1] + 1,\n    dp[i-2] + w)'}
            </pre>
          </div>
          <span className="nb-dash-float-text is-a">O(n log n)</span>
          <span className="nb-dash-float-text is-b">while (l &lt;= r)</span>
          <span className="nb-dash-float-text is-c">#include &lt;bits/stdc++.h&gt;</span>
        </div>

        <div className="nb-dash-hero-inner">
          <div className="nb-dash-hero-kicker">Panel del estudiante</div>
          <h1 className="nb-dash-hero-title">
            Bienvenido de nuevo,<span className="nb-dash-hero-name">{firstName}!</span>
          </h1>
          <p className="nb-dash-hero-text">¿Listo para los algoritmos de hoy? Sigue explorando y mejorando tus habilidades en código.</p>
        </div>
      </div>

      <div className="nb-dash-stack">

        {/* ── Perfil + módulos ── */}
        <div className="nb-dash-row">

          <div className="nb-dash-card nb-dash-pad nb-dash-profile">
            <div className="nb-dash-profile-top">
              <div className="nb-dash-photo">
                {photo && !photoError
                  ? <img src={photo} alt="Foto de perfil" onError={() => setPhotoError(true)} />
                  : <img src="/cat-pixel.png" alt="Foto de perfil" width="512" height="512" className="is-pixel" />}
              </div>
              <div className="nb-dash-metrics">
                <div className="nb-dash-metric">
                  <span className="nb-dash-metric-label">Rating</span>
                  <span className="nb-dash-metric-value">{progress?.user?.global_rating ?? 1000}</span>
                </div>
                <div className="nb-dash-metric">
                  <span className="nb-dash-metric-label">Resueltos</span>
                  <span className="nb-dash-metric-value">{progress?.user?.solved_count ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="nb-dash-profile-bottom">
              <div className="nb-dash-idcard">
                <div className="nb-dash-idcard-text">
                  <h3 className="nb-dash-name">{displayName}</h3>
                  <div className="nb-dash-email">{user?.email}</div>
                </div>
                <Link to="/reset" title="Editar perfil" aria-label="Editar perfil" className="nb-dash-edit">
                  <PencilIcon />
                </Link>
              </div>

              <div className="nb-dash-title-card">
                <div className="nb-dash-title-stars" aria-hidden="true">
                  <span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <div className="nb-dash-title-label">Título</div>
                <div className="nb-dash-title-value">&quot;Programador más rápido&quot;</div>
              </div>
            </div>

            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="nb-dash-danger">
              {isLoggingOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>

          <div className="nb-dash-col is-7">
            <Link to="/dashboard/problemas" className="nb-dash-card nb-dash-link-card nb-dash-pad nb-dash-module">
              <div className="nb-dash-icon"><CpuIcon /></div>
              <div className="nb-dash-grow">
                <div className="nb-dash-kicker">Módulo</div>
                <h3 className="nb-dash-h3 is-gap">Problemas</h3>
                <p className="nb-dash-body-text">Explora nuestro repositorio de problemas para prepararte en la programacion competitiva.</p>
              </div>
              <span className="nb-dash-module-go" aria-hidden="true">↗</span>
            </Link>

            <div className="nb-dash-pad nb-dash-module is-soon">
              <div className="nb-dash-icon is-white"><TrophyIcon /></div>
              <div className="nb-dash-grow">
                <div className="nb-dash-kicker-row">
                  <span className="nb-dash-kicker is-ink">Módulo</span>
                  <span className="nb-dash-tag">Próximamente</span>
                </div>
                <h3 className="nb-dash-h3 is-gap">Competencias</h3>
                <p className="nb-dash-body-text">Este módulo se activa en la feria de proyectos de la UFPSO.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Nivel en progreso ── */}
        <div className="nb-dash-card nb-dash-pad nb-dash-level">
          <div className="nb-dash-level-main">
            <div className="nb-dash-badge">En progreso</div>
            <h2 className="nb-dash-level-title">Rating actual: {progress?.user?.global_rating ?? 1000}</h2>
            <p className="nb-dash-body-text is-lead">
              Has resuelto {progress?.user?.solved_count ?? 0} problemas de {progress?.user?.attempted_count ?? 0} intentos registrados. Continúa practicando para fortalecer tus tags más débiles.
            </p>
            <div className="nb-dash-progress"><div style={{ width: `${Math.min(100, ((progress?.user?.solved_count || 0) / Math.max(progress?.user?.attempted_count || 1, 1)) * 100)}%` }} /></div>
            <Link to="/dashboard/retos" className="nb-dash-cta">Continuar<span className="nb-mono">→</span></Link>
          </div>

          <div className="nb-dash-terminal">
            <div className="nb-dash-terminal-dots"><span /><span /></div>
            <pre>
              <span className="nb-dash-terminal-kw">const</span>{' useData = () => {\n  '}
              <span className="nb-dash-terminal-kw">const</span>{' [data,\n    setData]\n  = useState('}
              <span className="nb-dash-terminal-kw">null</span>{');\n  ...\n}'}
            </pre>
          </div>
        </div>

        <div className="nb-dash-card nb-dash-pad">
          <div className="nb-dash-sechead">
            <div>
              <div className="nb-dash-badge">Ruta adaptativa</div>
              <h2 className="nb-dash-section-title">Problemas recomendados</h2>
              <div className="nb-dash-section-sub">Seleccionados según tu rating y tus temas por fortalecer</div>
            </div>
            <div className="nb-dash-reco-acciones">
              <button
                type="button"
                className="nb-dash-outline nb-dash-refresh"
                onClick={refrescarRecomendados}
                disabled={refrescando}
                title="Traer otra ronda de recomendados"
              >
                <ReloadIcon />
                {refrescando ? 'Actualizando' : 'Refrescar'}
              </button>
              <Link to="/dashboard/problemas" className="nb-dash-outline">Ver banco ↗</Link>
            </div>
          </div>
          {recommendations.length > 0 ? (
            <RecoCarrusel recomendados={recommendations} />
          ) : (
            <p className="nb-dash-body-text">Completa un envío para construir tu primera ruta de práctica.</p>
          )}
        </div>

        {/* ── Recursos + eventos ── */}
        <div className="nb-dash-row">
          <div className="nb-dash-col is-5">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="nb-dash-card nb-dash-pad nb-dash-resource">
                <div className="nb-dash-resource-head">
                  <div className={`nb-dash-icon${r.oscuro ? ' is-dark' : ''}`}>
                    {r.icono}
                  </div>
                  <div className="nb-dash-grow">
                    <div className="nb-dash-kicker">Recursos</div>
                    <h3 className="nb-dash-h3">{r.titulo}</h3>
                  </div>
                  <span className="nb-dash-tag">Pronto</span>
                </div>
                <p className="nb-dash-body-text">{r.texto}</p>
                <div className="nb-dash-chips">
                  {r.chips.map((c) => <span key={c} className="nb-dash-chip">{c}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="nb-dash-card nb-dash-pad nb-dash-events">
            <div className="nb-dash-sechead is-top">
              <div>
                <h3 className="nb-dash-section-title">Competencias RPC 2026</h3>
                <div className="nb-dash-section-sub">Red de Programación Competitiva</div>
              </div>
              <a href="https://www.facebook.com/RedProgramacionCompetitiva" target="_blank" rel="noopener noreferrer" className="nb-dash-outline">Ver RPC ↗</a>
            </div>

            <div className="nb-dash-list">
              {RPC_EVENTS.map((e) => (
                <div key={e.titulo} className="nb-dash-event">
                  <div className={`nb-dash-date${e.destacado ? '' : ' is-past'}`}>
                    <span className="nb-dash-date-m">{e.mes}</span>
                    <span className="nb-dash-date-d">{e.dia}</span>
                  </div>
                  <div className="nb-dash-grow">
                    <div className="nb-dash-event-head">
                      <span className="nb-dash-event-title">{e.titulo}</span>
                      <span className="nb-dash-tag">{e.estado}</span>
                    </div>
                    <div className="nb-dash-event-when">{e.cuando}</div>
                    <div className="nb-dash-body-text">{e.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grupo estable ── */}
        <div className="nb-dash-card nb-dash-pad">
          <div className="nb-dash-sechead">
            <div>
              <h3 className="nb-dash-section-title">Grupo Estable</h3>
              <div className="nb-dash-section-sub">Maratón de Programación · UFPSO</div>
            </div>
            <div className="nb-dash-stats">
              {[['Integrantes', 5], ['Sesiones', 24], ['Envíos totales', 454]].map(([label, value]) => (
                <div key={label} className="nb-dash-stat">
                  <div className="nb-dash-stat-label">{label}</div>
                  <div className="nb-dash-stat-value">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="nb-dash-list is-tight">
            <MemberRow
              me pos="01" inicial={inicial}
              nombre={displayName}
              codigo={codigoEstudiante || '—'}
              tiempo="3 semestres" envios={128} puntos={0}
            />
            {GRUPO.map((m, i) => (
              <MemberRow
                key={m.codigo}
                pos={String(i + 2).padStart(2, '0')}
                inicial={m.nombre[0]}
                {...m}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
