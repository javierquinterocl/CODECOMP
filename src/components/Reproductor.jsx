import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, ReloadIcon } from './AppIcons';

const RITMO_MS = { 1: 1100, 2: 550 };

/**
 * Reproductor paso a paso de una lección. Se monta con `key` por entrada: una entrada nueva
 * empieza en el paso 1 y en pausa. Las flechas y el espacio solo actúan con el foco en el
 * reproductor (nunca mientras se escribe en un campo).
 */
const Reproductor = ({ pasos, pseudo, children }) => {
  const [indice, setIndice] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const ultimo = pasos.length - 1;
  const paso = pasos[Math.min(indice, ultimo)];

  useEffect(() => {
    if (!corriendo) return undefined;
    const reloj = setTimeout(() => {
      if (indice >= ultimo) setCorriendo(false);
      else setIndice((i) => i + 1);
    }, RITMO_MS[velocidad]);
    return () => clearTimeout(reloj);
  }, [corriendo, indice, ultimo, velocidad]);

  const ir = (n) => { setCorriendo(false); setIndice(Math.max(0, Math.min(ultimo, n))); };
  const alternar = () => {
    if (indice >= ultimo) { setIndice(0); setCorriendo(true); } else setCorriendo((c) => !c);
  };
  const teclas = (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]') || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(indice + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(indice - 1); }
    if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); alternar(); }
  };

  return (
    <div className="nb-repro" tabIndex={0} onKeyDown={teclas} aria-label="Visualización paso a paso. Usa las flechas para avanzar o retroceder.">
      <div className="nb-repro-escena">{children(paso)}</div>

      <div className="nb-repro-panel">
        <ol className="nb-repro-pseudo" aria-label="Pseudocódigo">
          {pseudo.map((linea, k) => (
            <li key={linea} className={k === paso.linea ? 'is-active' : ''} aria-current={k === paso.linea ? 'step' : undefined}>
              <code>{linea}</code>
            </li>
          ))}
        </ol>
        {/* Durante la reproducción no se anuncia cada paso: satura el lector de pantalla. */}
        <p className={`nb-repro-nota${paso.resultado === false ? ' is-fail' : paso.resultado ? ' is-ok' : ''}`} aria-live={corriendo ? 'off' : 'polite'}>
          {paso.nota}
        </p>
      </div>

      <div className="nb-repro-controles">
        <button type="button" className="nb-repro-btn" onClick={() => ir(0)} title="Reiniciar" aria-label="Volver al primer paso"><ReloadIcon /></button>
        <button type="button" className="nb-repro-btn" onClick={() => ir(indice - 1)} disabled={indice === 0} title="Paso anterior" aria-label="Paso anterior"><ArrowLeftIcon /></button>
        <button type="button" className="nb-repro-btn is-principal" onClick={alternar} aria-label={corriendo ? 'Pausar' : 'Reproducir'}>
          {corriendo ? <span className="nb-repro-pausa" aria-hidden="true" /> : <PlayIcon />}
          <span>{corriendo ? 'Pausa' : indice >= ultimo ? 'Otra vez' : 'Reproducir'}</span>
        </button>
        <button type="button" className="nb-repro-btn" onClick={() => ir(indice + 1)} disabled={indice >= ultimo} title="Paso siguiente" aria-label="Paso siguiente"><ArrowRightIcon /></button>
        <span className="nb-repro-cuenta">Paso {indice + 1} de {pasos.length}</span>
        <div className="nb-ex-idioma nb-repro-velocidad" role="group" aria-label="Velocidad">
          {[1, 2].map((v) => (
            <button key={v} type="button" className={`nb-ex-idioma-btn${velocidad === v ? ' is-active' : ''}`} aria-pressed={velocidad === v} onClick={() => setVelocidad(v)}>{v}×</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reproductor;
