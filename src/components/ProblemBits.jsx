/* Piezas compartidas entre el listado de una categoría y la vista del
   ejercicio: la barra de complejidad y la estrella de favorito.
   La etiqueta de cada nivel (NIVELES) vive en problemsData.js. */

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
