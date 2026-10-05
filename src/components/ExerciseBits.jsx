import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resaltar } from '../scripts/syntaxHighlight';
import { ReloadIcon } from './AppIcons';

/* Piezas de la vista del ejercicio, compartidas entre Problemas y Fundamentos. */

const MIN_LINEAS = 18;
const SANGRIA = '    ';

/* Sangra o quita sangría a las líneas que toca la selección. Devuelve el
   texto nuevo y dónde debe quedar la selección. */
const tabular = (texto, inicio, fin, quitar) => {
  if (!quitar && inicio === fin) {
    return {
      texto: texto.slice(0, inicio) + SANGRIA + texto.slice(fin),
      inicio: inicio + SANGRIA.length,
      fin: inicio + SANGRIA.length,
    };
  }

  const desde = texto.lastIndexOf('\n', inicio - 1) + 1;
  const lineas = texto.slice(desde, fin).split('\n');
  let cambioPrimera = 0;
  let cambioTotal = 0;

  const nuevas = lineas.map((linea, i) => {
    let delta;
    let nueva;
    if (quitar) {
      const sobra = linea.match(/^ {1,4}|^\t/)?.[0].length ?? 0;
      nueva = linea.slice(sobra);
      delta = -sobra;
    } else {
      nueva = SANGRIA + linea;
      delta = SANGRIA.length;
    }
    if (i === 0) cambioPrimera = delta;
    cambioTotal += delta;
    return nueva;
  });

  return {
    texto: texto.slice(0, desde) + nuevas.join('\n') + texto.slice(fin),
    inicio: Math.max(desde, inicio + cambioPrimera),
    fin: fin + cambioTotal,
  };
};

/* ── Editor ──
   El resaltado no cabe en un <textarea>: se pinta en un <pre> detrás y el
   textarea queda encima con el texto invisible. */
export const Editor = ({
  codigo, lenguajeId, onChange, expandido, onExpandir, claro, onTema, onReiniciar,
  bloquearPegado = false, tabulador = false,
}) => {
  const regletaRef = useRef(null);
  const resaltadoRef = useRef(null);
  const areaRef = useRef(null);
  // Tras tabular, React reescribe el valor y el cursor salta al final.
  const seleccionRef = useRef(null);
  const [aviso, setAviso] = useState(false);

  const lineas = useMemo(() => {
    const total = Math.max(codigo.split('\n').length, MIN_LINEAS);
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [codigo]);

  const html = useMemo(() => resaltar(codigo, lenguajeId), [codigo, lenguajeId]);

  useLayoutEffect(() => {
    if (!seleccionRef.current || !areaRef.current) return;
    const { inicio, fin } = seleccionRef.current;
    seleccionRef.current = null;
    areaRef.current.setSelectionRange(inicio, fin);
  }, [codigo]);

  useEffect(() => {
    if (!aviso) return undefined;
    const reloj = setTimeout(() => setAviso(false), 2200);
    return () => clearTimeout(reloj);
  }, [aviso]);

  // Ni la regleta ni la capa de color tienen barra propia: siguen al textarea.
  const sincronizarScroll = (e) => {
    const { scrollTop, scrollLeft } = e.target;
    if (regletaRef.current) regletaRef.current.scrollTop = scrollTop;
    if (resaltadoRef.current) {
      resaltadoRef.current.scrollTop = scrollTop;
      resaltadoRef.current.scrollLeft = scrollLeft;
    }
  };

  const alTeclear = (e) => {
    if (!tabulador || e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    const { selectionStart, selectionEnd, value } = e.target;
    const resultado = tabular(value, selectionStart, selectionEnd, e.shiftKey);
    if (resultado.texto === value) return;
    seleccionRef.current = { inicio: resultado.inicio, fin: resultado.fin };
    onChange(resultado.texto);
  };

  const rechazar = (e) => {
    if (!bloquearPegado) return;
    e.preventDefault();
    setAviso(true);
  };

  return (
    <div className={`nb-ex-editor${expandido ? ' is-expanded' : ''}${claro ? ' is-light' : ''}`}>
      <div className="nb-ex-editor-head">
        <span className="nb-ex-editor-label">
          {aviso ? 'Pegar está desactivado: escríbelo tú' : 'Código fuente'}
        </span>
        <div className="nb-ex-editor-tools">
          <button
            type="button"
            className="nb-ex-icon-btn is-square"
            onClick={onReiniciar}
            title="Reiniciar el código a la plantilla"
            aria-label="Reiniciar el código"
          >
            <ReloadIcon />
          </button>
          <button
            type="button"
            className="nb-ex-icon-btn is-square"
            onClick={onTema}
            aria-pressed={claro}
            title={claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {claro ? '🌙' : '☀'}
          </button>
          <button
            type="button"
            className="nb-ex-icon-btn"
            onClick={onExpandir}
            aria-pressed={expandido}
            title={expandido ? 'Reducir el editor' : 'Agrandar el editor'}
          >
            {expandido ? '⤡ Reducir' : '⤢ Agrandar'}
          </button>
        </div>
      </div>

      <div className="nb-ex-editor-body">
        <div className="nb-ex-gutter" ref={regletaRef} aria-hidden="true">
          {lineas.map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="nb-ex-code-wrap">
          <pre className="nb-ex-highlight" ref={resaltadoRef} aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
          <textarea
            ref={areaRef}
            className="nb-ex-code"
            value={codigo}
            onChange={(e) => onChange(e.target.value)}
            onScroll={sincronizarScroll}
            onKeyDown={alTeclear}
            onPaste={rechazar}
            onDrop={rechazar}
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Editor de código"
          />
        </div>
      </div>
    </div>
  );
};

/* Bloque plegable del enunciado; solo la descripción viene abierta.
   `adorno` se pinta siempre, abierto o cerrado (p. ej. un fondo decorativo). */
export const Plegable = ({ titulo, abiertoInicial = false, className = '', adorno = null, children }) => {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <div className={`nb-ex-card nb-ex-fold${abierto ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      {adorno}
      <button
        type="button"
        className="nb-ex-fold-head"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="nb-ex-fold-title">{titulo}</span>
        <span className="nb-ex-fold-caret" aria-hidden="true">▾</span>
      </button>
      {abierto && <div className="nb-ex-fold-body">{children}</div>}
    </div>
  );
};

/* ── Bloque de ejemplo: entrada y salida lado a lado ── */
export const Ejemplo = ({ n, entrada, salida }) => (
  <div className="nb-ex-sample">
    <div className="nb-ex-sample-col">
      <div className="nb-ex-sample-label">Entrada {n}</div>
      <pre className="nb-ex-pre">{entrada || '(sin entrada)'}</pre>
    </div>
    <div className="nb-ex-sample-col">
      <div className="nb-ex-sample-label">Salida {n}</div>
      <pre className="nb-ex-pre">{salida}</pre>
    </div>
  </div>
);
