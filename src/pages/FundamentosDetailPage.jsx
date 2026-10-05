import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ESPERA_ENVIO,
  PLANTILLA_PSEINT,
  buscarEjercicioDe,
  buscarNivel,
  buscarTema,
} from '../scripts/fundamentosData';
import { aperturaDe, registrarVisita } from '../scripts/fundamentosProgreso';
import { NIVELES } from '../scripts/problemsData';
import { NivelBarra } from '../components/ProblemBits';
import { Editor, Plegable, Ejemplo } from '../components/ExerciseBits';
import { LockIcon, CollapseIcon, ExpandIcon } from '../components/AppIcons';

const reloj = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/* ── Panel del gato ──
   Un segundo sidebar, pegado al borde derecho. Parece un chat pero es de solo
   lectura: los mensajes vienen con el tema y aclaran el concepto, nunca el
   ejercicio. Se pliega igual que el menú: el contenido conserva su ancho y
   el panel lo recorta. */
const PanelGato = ({ tema, extra, oculto, onAlternar }) => {
  const mensajes = extra ? [...tema.conceptos, { texto: extra }] : tema.conceptos;
  const accion = oculto ? 'Mostrar los datos del tema' : 'Ocultar los datos del tema';

  return (
    <aside className={`nb-fd-lateral${oculto ? ' is-collapsed' : ''}`} aria-label={`Datos del tema ${tema.titulo}`}>
      <div className="nb-fd-lateral-head">
        <button
          type="button"
          className="nb-fd-lateral-toggle"
          onClick={onAlternar}
          aria-expanded={!oculto}
          title={accion}
          aria-label={accion}
        >
          {oculto ? <CollapseIcon /> : <ExpandIcon />}
        </button>
        <div className="nb-fd-lateral-quien">
          <span className="nb-fd-lateral-nombre">¡Datos que debes tener en cuenta!</span>
          <span className="nb-fd-lateral-tema">{tema.titulo}</span>
        </div>
      </div>

      {/* Con el panel plegado solo queda la cara del gato, que lo vuelve a abrir. */}
      <button
        type="button"
        className="nb-fd-lateral-cara"
        onClick={onAlternar}
        tabIndex={oculto ? 0 : -1}
        aria-hidden={!oculto}
        title={accion}
        aria-label={accion}
      >
        <span className="nb-fd-gato-avatar"><img src="/cat-pixel.png" alt="" /></span>
      </button>

      <div className="nb-fd-lateral-body" inert={oculto}>
        {mensajes.map((m) => (
          <div key={m.texto} className="nb-fd-msg">
            <span className="nb-fd-gato-avatar" aria-hidden="true"><img src="/cat-pixel.png" alt="" /></span>
            <div className="nb-fd-burbuja">
              <p>{m.texto}</p>
              {m.codigo && <pre>{m.codigo}</pre>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

const Ejercicio = ({ nivel, ejercicio }) => {
  const tema = buscarTema(ejercicio.tema);
  const listado = `/dashboard/fundamentos/${nivel.slug}`;

  const [codigo, setCodigo] = useState(PLANTILLA_PSEINT);
  const [expandido, setExpandido] = useState(false);
  const [temaClaro, setTemaClaro] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // El panel arranca plegado: el estudiante lo abre cuando quiere repasar el tema.
  const [gatoOculto, setGatoOculto] = useState(true);
  const [desbloqueoEn] = useState(() => aperturaDe(nivel.slug, ejercicio.numero) + ESPERA_ENVIO * 1000);
  const [ahora, setAhora] = useState(() => Date.now());

  const restante = Math.max(0, Math.ceil((desbloqueoEn - ahora) / 1000));
  const bloqueado = restante > 0;

  // La tarjeta del nivel usa esto para ofrecer "Continuar".
  useEffect(() => {
    registrarVisita(nivel.slug, ejercicio.numero);
  }, [nivel.slug, ejercicio.numero]);

  useEffect(() => {
    if (!bloqueado) return undefined;
    const tic = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(tic);
  }, [bloqueado]);

  const reiniciar = () => {
    setCodigo(PLANTILLA_PSEINT);
    setEnviado(false);
  };

  return (
    <div className="nb-fd-vista">
      <div className="nb-fd-vista-main">
      <Link to={listado} className="nb-pb-back">
        ← Volver a {nivel.titulo.toLowerCase()}
      </Link>

      <div className={`nb-ex nb-fd-ex${expandido ? ' is-expanded' : ''}`}>

        {/* ══ Columna izquierda: el enunciado ══ */}
        <div className="nb-ex-left">
          <div className="nb-ex-card nb-ex-title-card" style={{ '--cat-bg': nivel.color.bgSuave, '--cat-ink': nivel.color.inkSuave }}>
            <div className="nb-ex-title-main">
              <div className="nb-ex-kicker">{tema.titulo}</div>
              <h1 className="nb-ex-title">{ejercicio.titulo}</h1>
            </div>
            <div className="nb-ex-title-side">
              <span className="nb-ex-numero">{ejercicio.numero}</span>
            </div>
          </div>

          <div className="nb-ex-meta">
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Dificultad</span>
              <span className="nb-ex-meta-value">
                {NIVELES[ejercicio.nivel]} <NivelBarra nivel={ejercicio.nivel} />
              </span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Tema</span>
              <span className="nb-ex-meta-value">{tema.titulo}</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Ejercicio</span>
              <span className="nb-ex-meta-value">{ejercicio.numero} de {nivel.ejercicios.length}</span>
            </div>
          </div>

          <Plegable titulo="Descripción" abiertoInicial>
            {ejercicio.descripcion.map((p) => (
              <p key={p} className="nb-ex-text">{p}</p>
            ))}
          </Plegable>

          <Plegable titulo="Entrada y salida">
            <h3 className="nb-ex-h3">Entrada</h3>
            <p className="nb-ex-text">{ejercicio.entrada}</p>
            <h3 className="nb-ex-h3" style={{ marginTop: 'var(--sp-gap)' }}>Salida</h3>
            <p className="nb-ex-text">{ejercicio.salida}</p>
          </Plegable>

          <Plegable titulo="Ejemplos">
            <div className="nb-ex-samples">
              {ejercicio.ejemplos.map((ej, i) => (
                <Ejemplo key={`${ej.entrada}|${ej.salida}`} n={i + 1} entrada={ej.entrada} salida={ej.salida} />
              ))}
            </div>
          </Plegable>
        </div>

        {/* ══ Columna derecha: el editor ══ */}
        <div className="nb-ex-right">
          <div className="nb-ex-toolbar">
            <div className="nb-fd-lenguaje">
              <span className="nb-select-label">Lenguaje</span>
              <span className="nb-fd-lenguaje-valor">PSeInt</span>
            </div>

            <button
              type="button"
              className={`nb-ex-send${bloqueado ? ' is-locked' : ''}`}
              onClick={() => setEnviado(true)}
              disabled={bloqueado}
              title={bloqueado ? 'Lee el enunciado y piensa tu solución: el envío se abre en un momento' : undefined}
            >
              {bloqueado
                ? <><LockIcon /> Enviar en {reloj(restante)}</>
                : 'Enviar'}
            </button>
          </div>

          <Editor
            codigo={codigo}
            lenguajeId="pseint"
            onChange={(v) => {
              setCodigo(v);
              setEnviado(false);
            }}
            expandido={expandido}
            onExpandir={() => setExpandido((v) => !v)}
            claro={temaClaro}
            onTema={() => setTemaClaro((v) => !v)}
            onReiniciar={reiniciar}
            bloquearPegado
            tabulador
          />

          <div className="nb-ex-feedback">
            <img className="nb-ex-cat" src="/cat-pixel.png" alt="" aria-hidden="true" />
            <div className="nb-ex-feedback-main">
              <div className="nb-ex-feedback-title">
                {enviado ? 'El juez de PSeInt llegará pronto' : '¡Resuélvelo primero, vamos!'}
              </div>
              <p className="nb-ex-feedback-text">
                {enviado
                  ? 'Tu solución todavía no se puede evaluar aquí, así que no se calificó ni se guardó. Mientras tanto, pruébala en PSeInt con los ejemplos del enunciado.'
                  : bloqueado
                    ? 'Tómate este tiempo para leer el enunciado y pensar los pasos. El envío se desbloquea cuando termine la cuenta.'
                    : 'Escribe tu solución y envíala. Aquí aparecerá el veredicto del juez.'}
              </p>
            </div>
          </div>
        </div>

      </div>
      </div>

      <PanelGato
        tema={tema}
        extra={ejercicio.pistaConcepto}
        oculto={gatoOculto}
        onAlternar={() => setGatoOculto((v) => !v)}
      />
    </div>
  );
};

const FundamentosDetailPage = () => {
  const { nivel: nivelSlug, numero } = useParams();
  const nivel = buscarNivel(nivelSlug);
  const ejercicio = buscarEjercicioDe(nivelSlug, numero);

  if (!ejercicio) {
    return (
      <div className="nb-dash-inner">
        <Link to={nivel ? `/dashboard/fundamentos/${nivel.slug}` : '/dashboard/fundamentos'} className="nb-pb-back">← Volver</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Ejercicio no encontrado</h3>
          <p className="nb-dash-body-text">No existe ese ejercicio en este nivel.</p>
        </div>
      </div>
    );
  }

  // La `key` reinicia el editor y la cuenta atrás al pasar de un ejercicio a otro.
  return <Ejercicio key={`${nivel.slug}:${ejercicio.numero}`} nivel={nivel} ejercicio={ejercicio} />;
};

export default FundamentosDetailPage;
