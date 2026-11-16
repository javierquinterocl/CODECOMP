import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { META_TEMA } from '../scripts/entrenamiento';
import { LECCIONES } from '../scripts/lecciones/contenido';
import { LockIcon, PlayIcon } from './AppIcons';

// Textos borrador: los decide el equipo.
const ESTADOS = {
  dominado: 'Dominado',
  'en-curso': 'En curso',
  recomendado: 'Empieza aquí',
  'por-empezar': 'Por empezar',
};

// Tres tonos por tema, como las tarjetas de Fundamentos: franja oscura, base y cuadro claro.
// Los de Principiante y Ad-Hoc los eligió Javier; los demás siguen la misma relación (borrador).
const TONOS = {
  principiante: ['#025643', '#0AB05D', '#5FE39D'],
  'ad-hoc': ['#BD3400', '#F97110', '#FFB695'],
  cadenas: ['#015265', '#09AACE', '#6CD1E7'],
  matematicas: ['#840047', '#F72194', '#ED8BC0'],
  'estructuras-de-datos': ['#6E0307', '#E10E15', '#E77A7D'],
  paradigmas: ['#5E075E', '#C115C1', '#DF73DF'],
  grafos: ['#010170', '#0A0AE6', '#7878E9'],
  geometria: ['#44000B', '#8B041A', '#E4455F'],
};

const colores = (slug) => {
  const [oscuro, base, claro] = TONOS[slug] ?? ['#000', '#333', '#ccc'];
  return { '--cat-oscuro': oscuro, '--cat-bg': base, '--cat-claro': claro };
};

/** Curva hacia el nodo siguiente: baja si el siguiente va abajo y sube si va arriba. */
const Curva = ({ baja, hecha }) => (
  <svg
    className={`nb-ruta-curva ${baja ? 'is-baja' : 'is-sube'}${hecha ? ' is-hecha' : ''}`}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M0 0 C 50 0, 50 100, 100 100" vectorEffect="non-scaling-stroke" />
  </svg>
);

const Nodo = ({ t, i, total, titulo }) => {
  const leccion = LECCIONES[t.slug];
  const etiqueta = t.recomendado && t.estado === 'en-curso' ? 'Sigue aquí' : ESTADOS[t.estado];
  return (
    <section className="nb-ruta-nodo" aria-labelledby={`ruta-${t.slug}`}>
      {i > 0 && <span className="nb-ruta-puerto is-entrada" aria-hidden="true" />}
      {i < total - 1 && <span className="nb-ruta-puerto is-salida" aria-hidden="true" />}
      <div className="nb-ruta-nodo-cabeza">
        <span className="nb-ruta-nodo-num" aria-hidden="true">{t.estado === 'dominado' ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <h2 id={`ruta-${t.slug}`} className="nb-ruta-titulo">{t.titulo}</h2>
        <span className="nb-ruta-estado">{etiqueta}</span>
      </div>
      <div className="nb-ruta-nodo-cuerpo">
        <p className="nb-ruta-idea">{t.idea}</p>
        {leccion ? (
          <Link to={`/dashboard/ruta/${t.slug}`} className="nb-ruta-aprende">
            <span className="nb-ruta-aprende-texto">Aprende {t.titulo}: lo básico y {leccion.tecnica.toLowerCase()} →</span>
            <span className="nb-ruta-play" aria-hidden="true"><PlayIcon /></span>
          </Link>
        ) : (
          <span className="nb-ruta-aprende is-pronto">
            <span className="nb-ruta-aprende-texto">Lección interactiva en preparación</span>
            <span className="nb-ruta-play" aria-hidden="true"><LockIcon /></span>
          </span>
        )}
        <div className="nb-ruta-avance">
          <span className="nb-ruta-barra" style={{ '--avance': `${(t.resueltos / META_TEMA) * 100}%` }} aria-hidden="true" />
          <span className="nb-ruta-cifra">{t.resueltos}/{META_TEMA} resueltos · {t.total} en el tema</span>
        </div>
        {t.estado !== 'dominado' && t.propuestos.length > 0 && (
          <ul className="nb-ruta-problemas">
            {t.propuestos.map((p) => (
              <li key={p.numero}>
                <Link to={`/dashboard/problemas/${t.slug}/${p.numero}`} className="nb-ruta-problema">
                  <span className="nb-ruta-problema-num">#{p.numero}</span>
                  <span className="nb-ruta-problema-titulo">{titulo(p)}</span>
                  <span className="nb-ruta-problema-nivel">{p.dificultadRating}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {t.estado === 'dominado' && (
          <Link to={`/dashboard/problemas/${t.slug}`} className="nb-ruta-mas">Seguir practicando {t.titulo} →</Link>
        )}
      </div>
    </section>
  );
};

/**
 * La ruta como un mapa de nodos: cada tema es un nodo del color de su categoría, escalonados
 * arriba y abajo y unidos por curvas. Al abrir, el lienzo deja a la vista el tema recomendado.
 */
const GrafoRuta = ({ ruta, titulo }) => {
  const grafoRef = useRef(null);
  const recomendadoRef = useRef(null);

  useEffect(() => {
    const grafo = grafoRef.current;
    const nodo = recomendadoRef.current;
    if (!grafo || !nodo || grafo.scrollWidth <= grafo.clientWidth) return;
    // El recomendado queda al borde izquierdo: así se ven él y el siguiente.
    const margen = parseFloat(getComputedStyle(grafo).paddingLeft) || 0;
    const desde = nodo.getBoundingClientRect().left - grafo.getBoundingClientRect().left + grafo.scrollLeft;
    grafo.scrollLeft = Math.max(desde - margen, 0);
  }, [ruta]);

  return (
    <section className="nb-ruta-lienzo" aria-labelledby="ruta-camino">
      <div className="nb-ruta-lienzo-cabeza">
        <h2 id="ruta-camino" className="nb-ruta-lienzo-titulo">Tu camino</h2>
        <p className="nb-ruta-lienzo-ayuda">Sigue las líneas: cada tema se apoya en el anterior.</p>
      </div>
      <div className="nb-ruta-grafo" ref={grafoRef} tabIndex={0} role="region" aria-label="Temas de la ruta, de izquierda a derecha">
        <ol className="nb-ruta-nodos" role="list">
          {ruta.map((t, i) => (
            <li
              key={t.slug}
              ref={t.recomendado ? recomendadoRef : undefined}
              className={`nb-ruta-paso${i % 2 ? ' is-abajo' : ''} is-${t.estado}${t.recomendado ? ' is-recomendado' : ''}`}
              style={colores(t.slug)}
            >
              <Nodo t={t} i={i} total={ruta.length} titulo={titulo} />
              {i < ruta.length - 1 && <Curva baja={i % 2 === 0} hecha={t.estado === 'dominado'} />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default GrafoRuta;
