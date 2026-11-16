import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NIVELES_FUNDAMENTOS, TEMAS, buscarTema, temasDe } from '../scripts/fundamentosData';
import { guardarTemporizador, temporizadorActivo } from '../scripts/fundamentosProgreso';
import { useFundamentos } from '../scripts/useFundamentos';
import FundamentosCarga from '../components/FundamentosCarga';
import { Plegable } from '../components/ExerciseBits';
import VitrinaLogros from '../components/VitrinaLogros';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, LockIcon, ClockIcon } from '../components/AppIcons';

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

/* Pie de la tarjeta: cuántos resolvió (barra), dónde quedó (último abierto), el
   botón para seguir y el interruptor del temporizador. Sin visitas el botón lleva al primero. */
const PieNivel = ({ nivel, ejercicios, numero, resueltos, temporizador, onTemporizador }) => {
  const total = ejercicios.length;
  const ejercicio = ejercicios.find((e) => e.numero === numero);
  const hechos = ejercicios.filter((e) => resueltos?.has(e.numero)).length;
  const destino = ejercicio ? numero : ejercicios[0]?.numero;
  const accionReloj = temporizador ? 'Desactivar el temporizador' : 'Activar el temporizador';

  return (
    <div className="nb-fd-card-foot">
      <div className="nb-fd-avance">
        {!nivel.pronto && (
          <div className="nb-fd-avance-info">
            <span className="nb-fd-avance-label">{`${hechos} de ${total} resueltos`}</span>
            {ejercicio && (
              <span className="nb-fd-avance-tema">
                Último: {numero} · {buscarTema(ejercicio.tema).titulo} · {ejercicio.titulo}
              </span>
            )}
          </div>
        )}
        <div
          className="nb-fd-avance-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={hechos}
          aria-label={`${hechos} de ${total} ejercicios resueltos`}
        >
          {hechos > 0 && <div style={{ width: `${(hechos / total) * 100}%` }} />}
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
const TarjetaNivel = ({ nivel, ejercicios, visita, resueltos, temporizador, onTemporizador }) => (
  <div
    className={`nb-fd-card${nivel.pronto ? ' is-soon' : ''}`}
    style={{ '--cat-bg': nivel.color.bg, '--cat-ink': nivel.color.ink, '--cat-soft': nivel.color.franja }}
  >
    <div className="nb-fd-card-top">
      <span className="nb-fd-card-kicker">Nivel {nivel.n}</span>
      <span className="nb-fd-card-kicker">
        {nivel.pronto ? 'Pronto' : `${ejercicios.length} ejercicios`}
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
          <Link to={`/dashboard/fundamentos/${nivel.slug}`} className="nb-fd-play" data-tour={`nivel-${nivel.slug}`}>
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

    <PieNivel
      nivel={nivel}
      ejercicios={ejercicios}
      numero={visita}
      resueltos={resueltos}
      temporizador={temporizador}
      onTemporizador={onTemporizador}
    />
  </div>
);

const FundamentosPage = () => {
  const [actual, setActual] = useState(0);
  // Se piden al entrar: al volver de un ejercicio la página se monta de nuevo.
  const { ejercicios, visitas, resueltos, cargando, error } = useFundamentos({ conVisitas: true });
  // Una sola preferencia para todos los niveles; el editor la lee al abrir un ejercicio.
  const [temporizador, setTemporizador] = useState(temporizadorActivo);
  const alternarTemporizador = () => setTemporizador((v) => {
    guardarTemporizador(!v);
    return !v;
  });
  const ultimo = NIVELES_FUNDAMENTOS.length - 1;

  if (cargando || error) return <FundamentosCarga error={error} />;

  const totalEjercicios = Object.values(ejercicios).reduce((total, lista) => total + lista.length, 0);

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
              <div className="nb-pb-hstat-value">{totalEjercicios}</div>
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
              const delNivel = ejercicios[nivel.slug] || [];

              return (
                // `inert` saca del tabulador a la diapositiva que no se ve.
                <section key={nivel.slug} className="nb-fd-slide" aria-hidden={!visible} inert={!visible}>
                  <TarjetaNivel
                    nivel={nivel}
                    ejercicios={delNivel}
                    visita={visitas[nivel.slug]}
                    resueltos={resueltos[nivel.slug]}
                    temporizador={temporizador}
                    onTemporizador={alternarTemporizador}
                  />

                  {/* Vitrina: todos salen bloqueados porque aún no se cuentan los logros de Fundamentos. */}
                  <VitrinaLogros
                    titulo="Logros desbloqueables"
                    logros={nivel.logros.map((l) => ({ id: l.slug, titulo: l.titulo, texto: l.condicion }))}
                    vacio="Los logros de este nivel llegarán junto con sus ejercicios."
                  />

                  <Plegable titulo="Temas recomendados o bases" abiertoInicial>
                    <ListaTemas temas={nivel.temasFuturos || temasDe(delNivel)} />
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
