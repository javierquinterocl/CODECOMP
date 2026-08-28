import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Iconos del diseño ───────────────────────────────────────── */
const Stroke = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
    {children}
  </svg>
);
const PencilIcon = () => <Stroke><path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></Stroke>;
const CpuIcon    = () => <Stroke><rect x="2" y="7" width="20" height="11" /><path d="M6 10v5M4 12.5h4M15 11h.01M18 14h.01" /></Stroke>;
const TrophyIcon = () => <Stroke><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" /><path d="M12 14v4M8 21h8M9 21v-3h6v3" /></Stroke>;
const BookIcon   = () => <Stroke><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V4Z" /><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V4Z" /></Stroke>;

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
        {nombre}{me && <span className="nb-mono" style={{ fontWeight: 400 }}> (tú)</span>}
      </div>
      <div className="nb-dash-member-code" style={{ opacity: me ? 0.85 : 1 }}>{codigo}</div>
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

  const photo = storedPhotoURL || user?.photoURL || null;
  const inicial = (displayName || user?.email || '?')[0].toUpperCase();

  return (
    <div className="nb-dash-inner">

      {/* ── Banner de bienvenida ── */}
      <div className="nb-dash-hero">
        <div className="nb-dash-hero-deco" aria-hidden="true">
          <div className="nb-dash-code-float" style={{ right: '2.5%', top: '12%', width: 'clamp(120px,11vw,240px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', padding: '5px 8px' }}>
              <span style={{ width: 7, height: 7, background: 'rgba(255,255,255,0.7)', display: 'block' }} />
              <span style={{ width: 7, height: 7, background: 'rgba(255,255,255,0.4)', display: 'block' }} />
            </div>
            <pre>
              <span style={{ color: 'rgba(255,255,255,0.95)' }}>for</span>{' i '}
              <span style={{ color: 'rgba(255,255,255,0.95)' }}>in</span>{' range(n):\n  dp[i] = min(\n    dp[i-1] + 1,\n    dp[i-2] + w)'}
            </pre>
          </div>
          <span className="nb-dash-float-text" style={{ right: '2.5%', top: '4%', fontSize: 'clamp(9px,0.7vw,16px)', color: 'rgba(255,255,255,0.34)' }}>O(n log n)</span>
          <span className="nb-dash-float-text" style={{ right: '2.5%', bottom: '20%', fontSize: 'clamp(9px,0.7vw,17px)', color: 'rgba(255,255,255,0.3)' }}>while (l &lt;= r)</span>
          <span className="nb-dash-float-text" style={{ right: '2.5%', bottom: '6%', fontWeight: 400, fontSize: 'clamp(8px,0.6vw,15px)', color: 'rgba(255,255,255,0.24)' }}>#include &lt;bits/stdc++.h&gt;</span>
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

          <div className="nb-dash-card nb-dash-pad" style={{ flex: '5 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-gap)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-gap)', alignItems: 'stretch' }}>
              <div className="nb-dash-photo">
                {photo && !photoError
                  ? <img src={photo} alt="Foto de perfil" onError={() => setPhotoError(true)} />
                  : <img src="/cat-pixel.png" alt="Foto de perfil" style={{ imageRendering: 'pixelated' }} />}
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-gap)' }}>
                <div className="nb-dash-metric">
                  <span className="nb-dash-metric-label">Puntos</span>
                  <span className="nb-dash-metric-value">0</span>
                </div>
                <div className="nb-dash-metric">
                  <span className="nb-dash-metric-label">Trofeos</span>
                  <span className="nb-dash-metric-value">0</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-gap)', alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 170px', minWidth: 0, border: '2px solid #000', display: 'flex', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 0', minWidth: 0, padding: 'clamp(11px,0.9vw,20px) clamp(12px,1vw,22px)' }}>
                  <h3 className="nb-dash-name">{displayName}</h3>
                  <div className="nb-dash-email">{user?.email}</div>
                </div>
                <Link to="/reset" title="Editar perfil" aria-label="Editar perfil" className="nb-dash-edit">
                  <PencilIcon />
                </Link>
              </div>

              <div className="nb-dash-title-card">
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <span style={{ position: 'absolute', right: '8%', top: '12%', fontSize: '1.7em', lineHeight: 1, color: 'rgba(255,255,255,0.22)' }}>★</span>
                  <span style={{ position: 'absolute', right: '26%', top: '52%', fontSize: '1.1em', lineHeight: 1, color: 'rgba(255,255,255,0.16)' }}>★</span>
                  <span style={{ position: 'absolute', right: '3%', bottom: '8%', fontSize: '0.9em', lineHeight: 1, color: 'rgba(255,255,255,0.2)' }}>★</span>
                  <span style={{ position: 'absolute', left: '6%', bottom: '6%', fontSize: '0.75em', lineHeight: 1, color: 'rgba(255,255,255,0.14)' }}>★</span>
                </div>
                <div className="nb-dash-title-label">Título</div>
                <div className="nb-dash-title-value">&quot;Programador más rápido&quot;</div>
              </div>
            </div>

            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="nb-dash-danger">
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </div>

          <div className="nb-dash-col" style={{ flex: '7 1 420px' }}>
            <Link to="/dashboard/problemas" className="nb-dash-card nb-dash-link-card nb-dash-pad" style={{ flex: 1, display: 'flex', gap: 'var(--sp-gap)', alignItems: 'center' }}>
              <div className="nb-dash-icon"><CpuIcon /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nb-dash-kicker">Módulo</div>
                <h3 className="nb-dash-h3" style={{ marginBottom: 8 }}>Problemas</h3>
                <p className="nb-dash-body-text">Explora nuestro repositorio de problemas para prepararte en la programacion competitiva.</p>
              </div>
              <span className="nb-mono" style={{ fontWeight: 700, fontSize: 'var(--fs-lg)' }}>↗</span>
            </Link>

            <div className="nb-dash-pad" style={{ flex: 1, background: '#E9EDFB', border: '3px dashed #000', display: 'flex', gap: 'var(--sp-gap)', alignItems: 'center' }}>
              <div className="nb-dash-icon" style={{ background: '#fff', color: '#000' }}><TrophyIcon /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="nb-mono" style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Módulo</span>
                  <span className="nb-dash-tag">Próximamente</span>
                </div>
                <h3 className="nb-dash-h3" style={{ marginBottom: 8 }}>Competencias</h3>
                <p className="nb-dash-body-text">Este módulo se activa en la feria de proyectos de la UFPSO.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Nivel en progreso ── */}
        <div className="nb-dash-card nb-dash-pad" style={{ display: 'flex', gap: 'var(--sp-gap)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="nb-dash-badge">En progreso</div>
            <h2 className="nb-dash-level-title">Nivel 2: Estructuras Repetitivas</h2>
            <p className="nb-dash-body-text" style={{ marginBottom: 16, fontSize: 'var(--fs-base)' }}>
              Domina el manejo de estructuras repetitivas, desde una sola hasta anidadas. Estás al 60% de este nivel.
            </p>
            <div className="nb-dash-progress"><div style={{ width: '60%' }} /></div>
            <Link to="/dashboard/retos" className="nb-dash-cta">Continuar<span className="nb-mono">→</span></Link>
          </div>

          <div className="nb-dash-terminal">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, background: '#fff', display: 'block' }} />
              <span style={{ width: 8, height: 8, background: '#0736FE', display: 'block' }} />
            </div>
            <pre>
              <span style={{ color: '#7EA0FF' }}>const</span>{' useData = () => {\n  '}
              <span style={{ color: '#7EA0FF' }}>const</span>{' [data,\n    setData]\n  = useState('}
              <span style={{ color: '#7EA0FF' }}>null</span>{');\n  ...\n}'}
            </pre>
          </div>
        </div>

        {/* ── Recursos + eventos ── */}
        <div className="nb-dash-row">
          <div className="nb-dash-col" style={{ flex: '5 1 320px' }}>
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="nb-dash-card nb-dash-pad" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-gap)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-gap)' }}>
                  <div className="nb-dash-icon" style={r.oscuro ? { background: '#000', fontWeight: 700, fontSize: 'var(--fs-lg)' } : undefined}>
                    {r.icono}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nb-dash-kicker">Recursos</div>
                    <h3 className="nb-dash-h3">{r.titulo}</h3>
                  </div>
                  <span className="nb-dash-tag">Pronto</span>
                </div>
                <p className="nb-dash-body-text">{r.texto}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {r.chips.map((c) => <span key={c} className="nb-dash-chip">{c}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="nb-dash-card nb-dash-pad" style={{ flex: '7 1 420px', minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
              <div>
                <h3 className="nb-dash-section-title">Competencias RPC 2026</h3>
                <div className="nb-dash-section-sub">Red de Programación Competitiva</div>
              </div>
              <a href="https://www.facebook.com/RedProgramacionCompetitiva" target="_blank" rel="noopener noreferrer" className="nb-dash-outline">Ver RPC ↗</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {RPC_EVENTS.map((e) => (
                <div key={e.titulo} className="nb-dash-event">
                  <div className={`nb-dash-date${e.destacado ? '' : ' is-past'}`}>
                    <span className="nb-dash-date-m">{e.mes}</span>
                    <span className="nb-dash-date-d">{e.dia}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div>
              <h3 className="nb-dash-section-title">Grupo Estable</h3>
              <div className="nb-dash-section-sub">Maratón de Programación · UFPSO</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[['Integrantes', 5], ['Sesiones', 24], ['Envíos totales', 454]].map(([label, value]) => (
                <div key={label} className="nb-dash-stat">
                  <div className="nb-dash-stat-label">{label}</div>
                  <div className="nb-dash-stat-value">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
