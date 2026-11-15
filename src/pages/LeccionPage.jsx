import { useId, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LECCIONES } from '../scripts/lecciones/contenido';
import { rutaDeTemas } from '../scripts/entrenamiento';
import { useEntrenamiento } from '../scripts/useEntrenamiento';
import { useIdioma } from '../scripts/useIdioma';
import { resaltar } from '../scripts/syntaxHighlight';
import { buscarCategoria } from '../scripts/problemsData';
import Reproductor from '../components/Reproductor';
import { Leyenda, VistaArreglo, VistaCuadricula, VistaGrafo, VistaPila, VistaTabla } from '../components/VistasLeccion';
import {
  Desbordamiento, Divisores, EstimadorOps, ExploradorCadena, Frecuencias, LectorEntrada, PilaCola, PlanoPuntos, RepresentacionGrafo,
} from '../components/WidgetsLeccion';
import { validarBfs } from '../scripts/lecciones/pasos';
import { EsqFilas } from '../components/Esqueleto';

const VISTAS = { arreglo: VistaArreglo, cuadricula: VistaCuadricula, grafo: VistaGrafo, tabla: VistaTabla, pila: VistaPila };
// Ejemplos interactivos simples, por nombre (los usa contenido.js y conceptos.js).
const WIDGETS = {
  lector: () => <LectorEntrada />,
  desbordamiento: () => <Desbordamiento />,
  estimador: () => <EstimadorOps />,
  cadena: () => <ExploradorCadena />,
  frecuencias: () => <Frecuencias modo="letras" />,
  palabras: () => <Frecuencias modo="palabras" />,
  divisores: () => <Divisores />,
  pila: () => <PilaCola modo="pila" />,
  cola: () => <PilaCola modo="cola" />,
  grafo: () => <RepresentacionGrafo validar={validarBfs} />,
  plano: () => <PlanoPuntos />,
};
const LENGUAJES = [{ id: 'cpp', nombre: 'C++' }, { id: 'python', nombre: 'Python' }];

const Seccion = ({ numero, titulo, children, className = '' }) => (
  <section className={`nb-dash-card nb-leccion-sec ${className}`} aria-labelledby={`leccion-${numero}`}>
    <h2 id={`leccion-${numero}`} className="nb-leccion-h2"><span className="nb-leccion-n" aria-hidden="true">{numero}</span>{titulo}</h2>
    {children}
  </section>
);

/** Código del ejemplo con pestañas de lenguaje. El código es fijo de la lección: se resalta sin riesgo. */
const Codigo = ({ codigo }) => {
  const id = useId();
  const [lenguaje, setLenguaje] = useState('cpp');
  const html = useMemo(() => resaltar(codigo[lenguaje], lenguaje), [codigo, lenguaje]);
  const flechas = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    setLenguaje((l) => (l === 'cpp' ? 'python' : 'cpp'));
  };
  return (
    <div className="nb-leccion-codigo-caja">
      <div className="nb-leccion-tabs" role="tablist" aria-label="Lenguaje del código" onKeyDown={flechas}>
        {LENGUAJES.map((l) => (
          <button key={l.id} type="button" role="tab" id={`${id}-${l.id}`} aria-selected={lenguaje === l.id} aria-controls={`${id}-panel`} tabIndex={lenguaje === l.id ? 0 : -1} className={`nb-leccion-tab${lenguaje === l.id ? ' is-active' : ''}`} onClick={() => setLenguaje(l.id)}>
            {l.nombre}
          </button>
        ))}
      </div>
      <pre id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${lenguaje}`} className="nb-leccion-codigo"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
};

/** Entrada editable: se valida antes de regenerar los pasos; una entrada nueva reinicia el reproductor. */
const Visualizacion = ({ visual }) => {
  if (visual.tipo === 'widget') return WIDGETS[visual.widget]?.() ?? null;
  return <Reproduccion visual={visual} />;
};

const Reproduccion = ({ visual }) => {
  const errorId = useId();
  const iniciales = Object.fromEntries(visual.campos.map((c) => [c.id, c.inicial]));
  const [borrador, setBorrador] = useState(iniciales);
  const [entrada, setEntrada] = useState(iniciales);
  const [error, setError] = useState('');
  const resultado = useMemo(() => visual.generar(entrada), [visual, entrada]);
  const Vista = VISTAS[visual.tipo];

  const aplicar = (e) => {
    e.preventDefault();
    const prueba = visual.generar(borrador);
    if (prueba.error) { setError(prueba.error); return; }
    setError('');
    setEntrada(borrador);
  };

  return (
    <>
      <form className="nb-leccion-entrada" onSubmit={aplicar} noValidate>
        {visual.campos.map((c) => (
          <label key={c.id} className="nb-leccion-campo">
            <span className="nb-leccion-campo-label">{c.label}</span>
            <input className={`nb-input${error ? ' is-error' : ''}`} value={borrador[c.id]} maxLength={80} onChange={(e) => setBorrador((b) => ({ ...b, [c.id]: e.target.value }))} aria-invalid={Boolean(error)} aria-describedby={`${errorId}-${c.id}${error ? ` ${errorId}` : ''}`} />
            <span id={`${errorId}-${c.id}`} className="nb-ayuda">{c.ayuda}</span>
          </label>
        ))}
        <button type="submit" className="nb-ex-send nb-leccion-probar">Probar</button>
      </form>
      {error && <p id={errorId} className="nb-error" role="alert">{error}</p>}
      {resultado.aviso && <p className="nb-leccion-aviso">{resultado.aviso}</p>}
      <Leyenda tipo={visual.tipo} />
      <Reproductor key={JSON.stringify(entrada)} pasos={resultado.pasos} pseudo={visual.pseudo}>
        {(paso) => <Vista paso={paso} />}
      </Reproductor>
    </>
  );
};

/** Un concepto básico: explicación, código corto y su ejemplo interactivo. */
const Concepto = ({ concepto, n }) => (
  <article id={`concepto-${n}`} className="nb-leccion-concepto" aria-labelledby={`concepto-${n}-titulo`}>
    <h3 id={`concepto-${n}-titulo`} className="nb-leccion-h3"><span aria-hidden="true">{n + 1}</span>{concepto.titulo}</h3>
    {concepto.texto.map((p, k) => <p key={k} className="nb-leccion-p">{p}</p>)}
    {concepto.codigo && <Codigo codigo={concepto.codigo} />}
    {concepto.visual && <Visualizacion visual={concepto.visual} />}
    {concepto.widget && WIDGETS[concepto.widget]?.()}
  </article>
);

const Pregunta = ({ p, n }) => {
  const [elegida, setElegida] = useState(null);
  const acerto = elegida === p.correcta;
  return (
    <fieldset className="nb-leccion-pregunta">
      <legend>{n}. {p.pregunta}</legend>
      <div className="nb-leccion-opciones" role="radiogroup">
        {p.opciones.map((o, k) => (
          <label key={o} className={`nb-leccion-opcion${elegida === k ? (acerto ? ' is-ok' : ' is-fail') : ''}`}>
            <input type="radio" name={`pregunta-${n}`} checked={elegida === k} onChange={() => setElegida(k)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <p className="nb-leccion-explicacion" aria-live="polite">
        {elegida !== null && (<><strong>{acerto ? '¡Correcto! ' : 'No exactamente. '}</strong>{p.explicacion}</>)}
      </p>
    </fieldset>
  );
};

const LeccionPage = () => {
  const { tema } = useParams();
  const leccion = LECCIONES[tema];
  const { user } = useAuth();
  const { idioma } = useIdioma();
  const { datos, catalogo } = useEntrenamiento(user);
  const propuestos = useMemo(() => {
    if (!datos || !catalogo) return null;
    return rutaDeTemas(catalogo, datos.resueltos, datos.nivel).find((t) => t.slug === tema)?.propuestos ?? [];
  }, [datos, catalogo, tema]);

  if (!leccion) return <Navigate to="/dashboard/ruta" replace />;
  const categoria = buscarCategoria(tema);

  return (
    <div className="nb-dash-inner nb-leccion">
      <Link to="/dashboard/ruta" className="nb-pb-back">← Volver a la ruta</Link>
      <div className="nb-dash-card nb-fd-hero nb-leccion-hero">
        <div className="nb-fd-hero-main">
          <div className="nb-fd-kicker">Lección de la ruta</div>
          <h1 className="nb-fd-title">{categoria?.titulo ?? tema}</h1>
          <p className="nb-fd-hero-text">Lo básico del tema y su técnica clave: <strong>{leccion.tecnica}</strong>. {leccion.resumen}</p>
        </div>
        <div className="nb-fd-hero-stats">
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Tiempo</div><div className="nb-pb-hstat-value">{leccion.complejidad.tiempo}</div></div>
          <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Memoria</div><div className="nb-pb-hstat-value">{leccion.complejidad.espacio}</div></div>
        </div>
      </div>

      <Seccion numero="01" titulo={`Lo básico de ${categoria?.titulo ?? tema}`}>
        <p className="nb-leccion-p">Antes de cualquier ejercicio, estas son las ideas en las que se apoya todo el tema. Cada una trae un ejemplo para que lo pruebes.</p>
        <nav className="nb-leccion-indice" aria-label="Conceptos">
          {leccion.conceptos.map((c, k) => <a key={c.titulo} href={`#concepto-${k}`}>{k + 1}. {c.titulo}</a>)}
        </nav>
        {leccion.conceptos.map((c, k) => <Concepto key={c.titulo} concepto={c} n={k} />)}
      </Seccion>

      <Seccion numero="02" titulo={`La técnica clave: ${leccion.tecnica}`}>
        {leccion.teoria.map((p, k) => <p key={k} className="nb-leccion-p">{p}</p>)}
        <div className="nb-leccion-cuando">
          <span className="nb-leccion-kicker">Cuándo usarla</span>
          <ul>{leccion.cuando.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="nb-leccion-nota">{leccion.complejidad.nota}</p>
        </div>
      </Seccion>

      <Seccion numero="03" titulo={`Ejemplo resuelto: ${leccion.ejemplo.titulo}`}>
        <p className="nb-leccion-enunciado">{leccion.ejemplo.enunciado}</p>
        <ol className="nb-leccion-pasos">{leccion.ejemplo.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
        <Codigo codigo={leccion.codigo} />
      </Seccion>

      <Seccion numero="04" titulo="Míralo funcionar" className="nb-leccion-visual">
        <p className="nb-leccion-p">{leccion.visual.texto ?? 'Reproduce el algoritmo o avanza paso a paso. Cambia la entrada y pulsa «Probar» para verlo con tus propios datos.'}</p>
        <Visualizacion visual={leccion.visual} />
      </Seccion>

      <Seccion numero="05" titulo="Comprueba que entendiste">
        {leccion.preguntas.map((p, k) => <Pregunta key={p.pregunta} p={p} n={k + 1} />)}
      </Seccion>

      <Seccion numero="06" titulo="Practica">
        <p className="nb-leccion-p">Problemas de este tema a tu altura. Si te atascas, pide las pistas por niveles.</p>
        {propuestos === null && <EsqFilas n={3} aviso="Cargando problemas…" />}
        {propuestos?.length > 0 && (
          <ul className="nb-ruta-problemas">
            {propuestos.map((p) => (
              <li key={p.numero}>
                <Link to={`/dashboard/problemas/${tema}/${p.numero}`} className="nb-ruta-problema">
                  <span className="nb-ruta-problema-num">#{p.numero}</span>
                  <span className="nb-ruta-problema-titulo">{idioma === 'es' && p.tituloEs ? p.tituloEs : p.titulo}</span>
                  <span className="nb-ruta-problema-nivel">{p.dificultadRating}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {propuestos?.length === 0 && <Link to={`/dashboard/problemas/${tema}`} className="nb-ruta-mas">Ver todos los problemas de {categoria?.titulo ?? tema} →</Link>}
      </Seccion>
    </div>
  );
};

export default LeccionPage;
