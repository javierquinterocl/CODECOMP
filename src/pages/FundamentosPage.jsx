import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NIVELES_FUNDAMENTOS, TEMAS, buscarTema, temasDeNivel } from '../scripts/fundamentosData';
import { guardarTemporizador, temporizadorActivo, ultimaVisita } from '../scripts/fundamentosProgreso';
import { Plegable } from '../components/ExerciseBits';
import { StarIcon } from '../components/ProblemBits';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, LockIcon, ClockIcon } from '../components/AppIcons';

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

/* Pie de la tarjeta: dónde quedó el estudiante, el botón para seguir y el
   interruptor del temporizador. Marca el último ejercicio abierto, no los
   resueltos; sin visitas la barra va vacía y el botón lleva al primero. */
const PieNivel = ({ nivel, numero, temporizador, onTemporizador }) => {
  const total = nivel.ejercicios.length;
  const ejercicio = nivel.ejercicios.find((e) => e.numero === numero);
  const actual = ejercicio ? numero : 0;
  const destino = ejercicio ? numero : nivel.ejercicios[0]?.numero;
  const accionReloj = temporizador ? 'Desactivar el temporizador' : 'Activar el temporizador';

  return (
    <div className="nb-fd-card-foot">
      <div className="nb-fd-avance">
        {!nivel.pronto && (
          <div className="nb-fd-avance-info">
            <span className="nb-fd-avance-label">
              {ejercicio ? `Vas en el ejercicio ${actual} de ${total}` : `Ejercicio 0 de ${total}`}
            </span>
            {ejercicio && (
              <span className="nb-fd-avance-tema">{buscarTema(ejercicio.tema).titulo} · {ejercicio.titulo}</span>
            )}
          </div>
        )}
        <div
          className="nb-fd-avance-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={actual}
          aria-label={`Ejercicio ${actual} de ${total}`}
        >
          {actual > 0 && <div style={{ width: `${(actual / total) * 100}%` }} />}
        </div>
      </div>

      {!nivel.pronto && (
        <div className="nb-fd-card-acciones">
          <Link to={`/dashboard/fundamentos/${nivel.slug}/${destino}`} className="nb-fd-continuar">
            {ejercicio ? 'Continuar' : 'Empezar'} <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            className={`nb-fd-reloj${temporizador ? ' is-on' : ''}`}
            onClick={onTemporizador}
            aria-pressed={temporizador}
            aria-label="Temporizador de práctica"
            title={accionReloj}
          >
            <ClockIcon />
          </button>
        </div>
      )}
    </div>
  );
};

/* Tres franjas: el nivel arriba, la presentación al centro (texto a la
   izquierda, ventana de código a la derecha) y el avance abajo. */
const TarjetaNivel = ({ nivel, visita, temporizador, onTemporizador }) => (
  <div
    className={`nb-fd-card${nivel.pronto ? ' is-soon' : ''}`}
    style={{ '--cat-bg': nivel.color.bg, '--cat-ink': nivel.color.ink, '--cat-soft': nivel.color.bgSuave }}
  >
    <div className="nb-fd-card-top">
      <span className="nb-fd-card-kicker">Nivel {nivel.n}</span>
      <span className="nb-fd-card-kicker">
        {nivel.pronto ? 'Pronto' : `${nivel.ejercicios.length} ejercicios`}
      </span>
    </div>

    <div className="nb-fd-card-body">
      <div className="nb-fd-card-main">
        <h2 className="nb-fd-card-title">{nivel.titulo}</h2>
        <p className="nb-fd-card-text">{nivel.texto}</p>

        {nivel.pronto ? (
          <span className="nb-fd-play is-locked"><LockIcon /> Pronto</span>
        ) : (
          // El enlace se estira sobre toda la tarjeta con ::after.
          <Link to={`/dashboard/fundamentos/${nivel.slug}`} className="nb-fd-play">
            <PlayIcon /> Ver los ejercicios
          </Link>
        )}
      </div>

      {/* Adorno: una ventana de código que no dice nada del ejercicio. */}
      <div className="nb-fd-code" aria-hidden="true">
        <div className="nb-fd-code-barra"><span /><span /></div>
        <pre>{nivel.codigo.join('\n\n')}</pre>
      </div>
    </div>

    <PieNivel nivel={nivel} numero={visita} temporizador={temporizador} onTemporizador={onTemporizador} />
  </div>
);

const FundamentosPage = () => {
  const [actual, setActual] = useState(0);
  // Se lee una vez al entrar: al volver de un ejercicio la página se monta de nuevo.
  const [visitas] = useState(() => Object.fromEntries(
    NIVELES_FUNDAMENTOS.map((n) => [n.slug, ultimaVisita(n.slug)]),
  ));
  // Una sola preferencia para todos los niveles; el editor la lee al abrir un ejercicio.
  const [temporizador, setTemporizador] = useState(temporizadorActivo);
  const alternarTemporizador = () => setTemporizador((v) => {
    guardarTemporizador(!v);
    return !v;
  });
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
                  <TarjetaNivel
                    nivel={nivel}
                    visita={visitas[nivel.slug]}
                    temporizador={temporizador}
                    onTemporizador={alternarTemporizador}
                  />

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
