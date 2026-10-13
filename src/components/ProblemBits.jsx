/* Piezas compartidas entre el listado de una categoría y la vista del
   ejercicio: la barra de complejidad y la estrella de favorito.
   La etiqueta de cada nivel (NIVELES) vive en problemsData.js. */

import { useState } from 'react';
import { IDIOMAS } from '../scripts/useIdioma';

/* Imagen del enunciado, servida por Codeforces. Si no carga, queda su texto. */
const Imagen = ({ src, figura = false }) => {
  const [rota, setRota] = useState(false);
  if (rota && figura) return <p className="nb-ex-text nb-ex-sin-imagen">[figura]</p>;
  if (rota) return <span className="nb-ex-sin-imagen">[fórmula]</span>;

  return (
    <img
      className={figura ? 'nb-ex-figura' : 'nb-ex-formula'}
      src={src}
      alt={figura ? 'Figura del enunciado' : 'fórmula'}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setRota(true)}
    />
  );
};

const EnLinea = ({ hijos }) => hijos.map((h, i) => {
  if (typeof h === 'string') return h;
  if (h.tipo === 'formula') return <Imagen key={i} src={h.src} />;
  const Marca = h.tipo === 'sup' ? 'sup' : 'sub';
  return <Marca key={i}><EnLinea hijos={h.hijos} /></Marca>;
});

/** Enunciado por bloques (los de `bloquesDe`); una cadena suelta vale como párrafo. */
export const Enunciado = ({ bloques, lang }) => bloques.map((b, i) => {
  if (typeof b === 'string') return <p key={i} className="nb-ex-text" lang={lang}>{b}</p>;
  if (b.tipo === 'figura') return <Imagen key={i} src={b.src} figura />;
  if (b.tipo === 'lista') {
    return (
      <ul key={i} className="nb-ex-lista" lang={lang}>
        {b.items.map((item, j) => <li key={j}><EnLinea hijos={item} /></li>)}
      </ul>
    );
  }
  return (
    <p key={i} className={`nb-ex-text${b.tipo === 'centro' ? ' nb-ex-centro' : ''}`} lang={lang}>
      <EnLinea hijos={b.hijos} />
    </p>
  );
});

/** Conmutador de idioma de los problemas: dos segmentos, el activo en negro. */
export const IdiomaSwitch = ({ idioma, onCambiar, conEtiqueta = false }) => (
  <div className={`nb-ex-idioma${conEtiqueta ? ' is-bar' : ''}`} role="group" aria-label="Idioma de los problemas">
    {conEtiqueta && <span className="nb-ex-idioma-label">Idioma</span>}
    {IDIOMAS.map((opcion) => (
      <button
        key={opcion.id}
        type="button"
        className={`nb-ex-idioma-btn${idioma === opcion.id ? ' is-active' : ''}`}
        onClick={() => onCambiar(opcion.id)}
        aria-pressed={idioma === opcion.id}
        title={`Ver los problemas en ${opcion.nombre.toLowerCase()}`}
      >
        {conEtiqueta ? opcion.nombre : opcion.id}
      </button>
    ))}
  </div>
);

/** Barra de 5 casillas: se llenan tantas como diga el nivel. */
export const NivelBarra = ({ nivel }) => (
  <span className="nb-pb-nivel" role="img" aria-label={`Complejidad ${nivel} de 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`nb-pb-nivel-seg${i <= nivel ? ' is-on' : ''}`} />
    ))}
  </span>
);

export const StarIcon = ({ relleno = false }) => (
  <svg viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
  </svg>
);
