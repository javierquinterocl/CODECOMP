import { useState } from 'react';

/**
 * Listas largas sin alargar la página: muestra `paso` filas y abre las siguientes de a `paso`.
 * Nada se quita, solo se pliega. Devuelve las filas visibles y el botón para ponerlo bajo la lista.
 */
const useVerMas = (lista, paso = 8) => {
  const [cuantas, setCuantas] = useState(paso);
  const total = lista?.length ?? 0;
  const visibles = (lista ?? []).slice(0, cuantas);
  const quedan = total - visibles.length;
  const boton = total > paso ? (
    <div className="nb-vermas">
      {quedan > 0 && (
        <button type="button" className="nb-vermas-btn" onClick={() => setCuantas((n) => n + paso)}>
          Ver {Math.min(paso, quedan)} más <small>· quedan {quedan}</small>
        </button>
      )}
      {quedan > paso && (
        <button type="button" className="nb-vermas-btn is-claro" onClick={() => setCuantas(total)}>
          Ver todos ({total})
        </button>
      )}
      {quedan <= 0 && (
        <button type="button" className="nb-vermas-btn is-claro" onClick={() => setCuantas(paso)}>
          Ver menos
        </button>
      )}
    </div>
  ) : null;
  return { visibles, boton };
};

/** Lista `<ul>` con "Ver más": `render(item)` pinta cada fila con su `key`. */
const ListaVerMas = ({ lista, render, className, paso = 8 }) => {
  const { visibles, boton } = useVerMas(lista, paso);
  return (
    <>
      <ul className={className}>{visibles.map(render)}</ul>
      {boton}
    </>
  );
};

export default ListaVerMas;
