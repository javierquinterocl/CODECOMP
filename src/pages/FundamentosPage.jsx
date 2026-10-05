import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NIVELES_FUNDAMENTOS, TEMAS, buscarTema, temasDeNivel } from '../scripts/fundamentosData';
import { ultimaVisita } from '../scripts/fundamentosProgreso';
import { Plegable } from '../components/ExerciseBits';
import { StarIcon } from '../components/ProblemBits';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, LockIcon } from '../components/AppIcons';

const TOTAL_EJERCICIOS = NIVELES_FUNDAMENTOS.reduce((total, n) => total + n.ejercicios.length, 0);

// Estrellas de fondo del cuadro de logros: posición, tamaño y desfase.
const ESTRELLAS = [
  { left: '4%', top: '18%', size: 18, delay: '0s' },
  { left: '22%', top: '72%', size: 12, delay: '0.9s' },
  { left: '41%', top: '12%', size: 14, delay: '1.7s' },
  { left: '58%', top: '80%', size: 20, delay: '0.4s' },
  { left: '73%', top: '22%', size: 12, delay: '2.2s' },
  { left: '88%', top: '64%', size: 16, delay: '1.2s' },
  { left: '95%', top: '10%', size: 22, delay: '0.6s' },
];

const ListaTemas = ({ temas }) => (
  <ol className="nb-fd-temas">
    {temas.map((t, i) => (
      <li key={t.titulo} className="nb-fd-tema">
        <span className="nb-fd-tema-n">{i + 1}</span>
        <div className="nb-fd-tema-main">
          <div className="nb-fd-tema-titulo">{t.titulo}</div>
          <div className="nb-fd-tema-texto">{t.resumen}</div>
        </div>
        {t.total > 0 && <span className="nb-fd-tema-total">{t.total} ejercicios</span>}
      </li>
    ))}
  </ol>
);

const Cielo = () => (
  <div className="nb-fd-logros-cielo" aria-hidden="true">
    {ESTRELLAS.map((e) => (
      <span
        key={e.left}
        className="nb-fd-estrella"
        style={{ left: e.left, top: e.top, width: e.size, height: e.size, animationDelay: e.delay }}
      >
        <StarIcon relleno />
      </span>
    ))}
  </div>
);

/* Vitrina de logros. Todos salen bloqueados: todavía no hay juez que diga
   qué resolvió cada estudiante. */
const Logros = ({ logros }) => (
  <Plegable
    className="nb-fd-logros"
    adorno={<Cielo />}
    titulo={(
      <>
        Logros desbloqueables
        {logros.length > 0 && <span className="nb-fd-logros-cuenta">0 de {logros.length}</span>}
      </>
    )}
  >
    {logros.length === 0 ? (
      <p className="nb-fd-logros-vacio">Los logros de este nivel llegarán junto con sus ejercicios.</p>
    ) : (
      <ul className="nb-fd-logros-grid">
        {logros.map((l) => (
          <li key={l.slug} className="nb-fd-logro">
            <span className="nb-fd-logro-icono" aria-hidden="true"><StarIcon /></span>
            <div className="nb-fd-logro-main">
              <div className="nb-fd-logro-titulo">{l.titulo}</div>
              <div className="nb-fd-logro-texto">{l.condicion}</div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Plegable>
);

/* Dónde quedó el estudiante. No aparece la primera vez: sin visitas no hay
   nada que continuar. Marca el último ejercicio abierto, no los resueltos. */
const Avance = ({ nivel, numero }) => {
  const ejercicio = nivel.ejercicios.find((e) => e.numero === numero);
  if (!ejercicio) return null;

  const total = nivel.ejercicios.length;
  const tema = buscarTema(ejercicio.tema);

  return (
    <div className="nb-fd-avance">
      <div className="nb-fd-avance-info">
        <span className="nb-fd-avance-label">Vas en el ejercicio {numero} de {total}</span>
        <span className="nb-fd-avance-tema">{tema.titulo} · {ejercicio.titulo}</span>
      </div>
      <div
        className="nb-fd-avance-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={numero}
        aria-label={`Ejercicio ${numero} de ${total}`}
      >
        <div style={{ width: `${(numero / total) * 100}%` }} />
      </div>
      <Link to={`/dashboard/fundamentos/${nivel.slug}/${numero}`} className="nb-fd-continuar">
        Continuar <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
};

const TarjetaNivel = ({ nivel, visita }) => (
  <div
    className={`nb-fd-card${nivel.pronto ? ' is-soon' : ''}`}
    style={{ '--cat-bg': nivel.color.bg, '--cat-ink': nivel.color.ink }}
  >
    {/* Adorno: dos ventanitas de código que no dicen nada del ejercicio. */}
    <div className="nb-fd-card-deco" aria-hidden="true">
      {nivel.codigo.map((fragmento, i) => (
        <div key={fragmento} className={`nb-dash-code-float nb-fd-code is-${i === 0 ? 'izq' : 'der'}`}>
          <div className="nb-fd-code-barra"><span /><span /></div>
          <pre>{fragmento}</pre>
        </div>
      ))}
    </div>

    <div className="nb-fd-card-kicker">Nivel {nivel.n}</div>
    <h2 className="nb-fd-card-title">{nivel.titulo}</h2>

    {nivel.pronto ? (
      <span className="nb-fd-play" aria-hidden="true"><LockIcon /></span>
    ) : (
      // El enlace se estira sobre toda la tarjeta con ::after.
      <Link
        to={`/dashboard/fundamentos/${nivel.slug}`}
        className="nb-fd-play"
        aria-label={`Ver los ejercicios de ${nivel.titulo}`}
        title="Ver los ejercicios"
      >
        <PlayIcon />
      </Link>
    )}

    <p className="nb-fd-card-text">{nivel.texto}</p>

    {visita && <Avance nivel={nivel} numero={visita} />}
  </div>
);

const FundamentosPage = () => {
  const [actual, setActual] = useState(0);
  // Se lee una vez al entrar: al volver de un ejercicio la página se monta de nuevo.
  const [visitas] = useState(() => Object.fromEntries(
    NIVELES_FUNDAMENTOS.map((n) => [n.slug, ultimaVisita(n.slug)]),
  ));
  const ultimo = NIVELES_FUNDAMENTOS.length - 1;

  return (
    <div className="nb-dash-inner">
      <div className="nb-fd-slider">
        {/* Va dentro de la rejilla para compartir columna con la tarjeta. */}
        <div className="nb-dash-card nb-fd-hero">
          <div className="nb-fd-hero-main">
            <div className="nb-fd-kicker">Principiante</div>
            <h1 className="nb-fd-title">Ejercicios para todos, en español</h1>
            <p className="nb-fd-hero-text">
              Aquí se empieza desde cero: lees el enunciado, piensas los pasos y escribes tu
              algoritmo en PSeInt.
            </p>
          </div>

          <div className="nb-fd-hero-stats">
            <div className="nb-pb-hstat">
              <div className="nb-pb-hstat-label">Ejercicios</div>
              <div className="nb-pb-hstat-value">{TOTAL_EJERCICIOS}</div>
            </div>
            <div className="nb-pb-hstat">
              <div className="nb-pb-hstat-label">Temas</div>
              <div className="nb-pb-hstat-value">{TEMAS.length}</div>
            </div>
            <div className="nb-pb-hstat">
              <div className="nb-pb-hstat-label">Nivel</div>
              <div className="nb-pb-hstat-value" aria-live="polite">{actual + 1}/{NIVELES_FUNDAMENTOS.length}</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="nb-fd-flecha"
          onClick={() => setActual((v) => Math.max(0, v - 1))}
          disabled={actual === 0}
          aria-label="Nivel anterior"
          title="Nivel anterior"
        >
          <ArrowLeftIcon />
        </button>

        <div className="nb-fd-viewport">
          <div className="nb-fd-track" style={{ transform: `translateX(-${actual * 100}%)` }}>
            {NIVELES_FUNDAMENTOS.map((nivel, i) => {
              const visible = i === actual;

              return (
                // `inert` saca del tabulador a la diapositiva que no se ve.
                <section key={nivel.slug} className="nb-fd-slide" aria-hidden={!visible} inert={!visible}>
                  <TarjetaNivel nivel={nivel} visita={visitas[nivel.slug]} />

                  <Logros logros={nivel.logros} />

                  <Plegable titulo="Temas recomendados o bases" abiertoInicial>
                    <ListaTemas temas={nivel.temasFuturos || temasDeNivel(nivel)} />
                  </Plegable>
                </section>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="nb-fd-flecha"
          onClick={() => setActual((v) => Math.min(ultimo, v + 1))}
          disabled={actual === ultimo}
          aria-label="Nivel siguiente"
          title="Nivel siguiente"
        >
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};

export default FundamentosPage;
