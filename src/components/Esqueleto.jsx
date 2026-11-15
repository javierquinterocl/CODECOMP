/**
 * Esqueletos de carga: la forma de lo que va a llegar, con bloques planos que laten (sin
 * degradados). El lector de pantalla oye solo el texto `aviso`.
 */

const Barra = ({ ancho = '100%', alto, className = '' }) => (
  <span className={`nb-esq${className ? ` ${className}` : ''}`} style={{ '--esq-w': ancho, ...(alto ? { '--esq-h': alto } : {}) }} />
);

const Cargando = ({ aviso, children, className = '' }) => (
  <div className={className} aria-busy="true">
    <span className="nb-sr" role="status">{aviso}</span>
    <div aria-hidden="true" className="nb-esq-contenido">{children}</div>
  </div>
);

const ANCHOS = ['72%', '58%', '84%', '64%', '76%', '52%'];

/** Filas de listado (problemas, ejercicios, estudiantes). */
export const EsqFilas = ({ n = 8, aviso = 'Cargando…' }) => (
  <Cargando aviso={aviso} className="nb-esq-filas">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="nb-esq-fila">
        <Barra ancho="44px" alto="44px" />
        <div className="nb-esq-col">
          <Barra ancho={ANCHOS[i % ANCHOS.length]} alto="16px" />
          <Barra ancho="38%" alto="11px" />
        </div>
        <Barra ancho="86px" alto="24px" className="nb-esq-chip" />
      </div>
    ))}
  </Cargando>
);

/** Rejilla de tarjetas (categorías de problemas). */
export const EsqTarjetas = ({ n = 6, aviso = 'Cargando…' }) => (
  <Cargando aviso={aviso} className="nb-esq-tarjetas">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="nb-esq-tarjeta">
        <Barra ancho="36%" alto="11px" />
        <Barra ancho={ANCHOS[i % ANCHOS.length]} alto="22px" />
        <Barra ancho="90%" alto="12px" />
        <Barra ancho="70%" alto="12px" />
      </div>
    ))}
  </Cargando>
);

/** Tarjeta blanca con título y unas líneas. */
const Tarjeta = ({ lineas = 4, alta = false }) => (
  <div className={`nb-esq-tarjeta${alta ? ' is-alta' : ''}`}>
    <Barra ancho="42%" alto="20px" />
    <Barra ancho="28%" alto="11px" />
    {Array.from({ length: lineas }, (_, i) => <Barra key={i} ancho={ANCHOS[i % ANCHOS.length]} alto="14px" />)}
  </div>
);

/**
 * Página del tablero: banda de cabecera y debajo la forma del contenido.
 * forma: 'panel' (dos tarjetas lado a lado y una ancha), 'niveles' (tarjetas grandes),
 * 'lista' (filas) o 'ejercicio' (enunciado y editor).
 */
export const EsqPagina = ({ forma = 'panel', aviso = 'Cargando…', ancha = false }) => (
  <div className={`nb-dash-inner${ancha ? ' is-wide' : ''}`}>
    <Cargando aviso={aviso} className="nb-esq-pagina">
      {forma !== 'ejercicio' && (
        <div className="nb-esq-tarjeta nb-esq-cabecera">
          <Barra ancho="18%" alto="11px" />
          <Barra ancho="46%" alto="30px" />
          <Barra ancho="64%" alto="14px" />
        </div>
      )}
      {forma === 'panel' && (
        <>
          <div className="nb-esq-fila-doble">
            <Tarjeta lineas={5} />
            <Tarjeta lineas={5} />
          </div>
          <Tarjeta lineas={3} />
        </>
      )}
      {forma === 'niveles' && (
        <>
          <div className="nb-esq-tarjeta is-alta" />
          <div className="nb-esq-tarjeta is-alta" />
        </>
      )}
      {forma === 'lista' && (
        <div className="nb-esq-tarjeta">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="nb-esq-fila is-plana">
              <Barra ancho="44px" alto="44px" />
              <div className="nb-esq-col">
                <Barra ancho={ANCHOS[i % ANCHOS.length]} alto="16px" />
                <Barra ancho="38%" alto="11px" />
              </div>
            </div>
          ))}
        </div>
      )}
      {forma === 'ejercicio' && (
        <div className="nb-esq-fila-doble">
          <div className="nb-esq-col">
            <div className="nb-esq-tarjeta"><Barra ancho="30%" alto="11px" /><Barra ancho="60%" alto="26px" /></div>
            <Tarjeta lineas={6} />
          </div>
          <div className="nb-esq-tarjeta is-editor" />
        </div>
      )}
    </Cargando>
  </div>
);
