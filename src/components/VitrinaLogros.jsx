import { Plegable } from './ExerciseBits';
import { StarIcon } from './ProblemBits';

// Las de la cabecera se miden desde arriba y las del cuerpo desde abajo: así ninguna cae sobre la
// línea que separa la cabecera de las tarjetas, esté abierta o cerrada la vitrina.
const ESTRELLAS = [
  { left: '4%', top: '12px', size: 16, delay: '0s' },
  { left: '41%', top: '10px', size: 14, delay: '1.7s' },
  { left: '73%', top: '38px', size: 12, delay: '2.2s' },
  { left: '95%', top: '8px', size: 22, delay: '0.6s' },
  { left: '22%', bottom: '10%', size: 12, delay: '0.9s' },
  { left: '58%', bottom: '6%', size: 20, delay: '0.4s' },
  { left: '88%', bottom: '24%', size: 16, delay: '1.2s' },
];

const Cielo = () => (
  <div className="nb-fd-logros-cielo" aria-hidden="true">
    {ESTRELLAS.map((e) => (
      <span
        key={e.left}
        className="nb-fd-estrella"
        style={{ left: e.left, top: e.top, bottom: e.bottom, width: e.size, height: e.size, animationDelay: e.delay }}
      >
        <StarIcon relleno />
      </span>
    ))}
  </div>
);

/**
 * Vitrina de logros: banda azul plegable con estrellas que titilan y una tarjeta por logro.
 * La usan Fundamentos y Mi cuenta. Cada logro: `{ id, titulo, texto, conseguido?, avance? }`.
 */
const VitrinaLogros = ({ titulo, logros, conseguidos = 0, vacio, abiertoInicial = false }) => (
  <Plegable
    className="nb-fd-logros"
    adorno={<Cielo />}
    abiertoInicial={abiertoInicial}
    titulo={(
      <>
        {titulo}
        {logros.length > 0 && <span className="nb-fd-logros-cuenta">{conseguidos} de {logros.length}</span>}
      </>
    )}
  >
    {logros.length === 0 ? (
      <p className="nb-fd-logros-vacio">{vacio}</p>
    ) : (
      <ul className="nb-fd-logros-grid">
        {logros.map((l) => (
          <li key={l.id} className={`nb-fd-logro${l.conseguido ? ' is-ok' : ''}`}>
            <span className="nb-fd-logro-icono" aria-hidden="true"><StarIcon relleno={Boolean(l.conseguido)} /></span>
            <div className="nb-fd-logro-main">
              <div className="nb-fd-logro-titulo">{l.titulo}</div>
              <div className="nb-fd-logro-texto">{l.texto}</div>
              {l.avance && <div className="nb-fd-logro-avance">{l.avance}</div>}
            </div>
          </li>
        ))}
      </ul>
    )}
  </Plegable>
);

export default VitrinaLogros;
