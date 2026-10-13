// Convierte el enunciado crudo del catálogo en bloques que la vista pinta uno a uno.
// Solo reconoce seis etiquetas; lo demás que parezca etiqueta se queda como texto.

const ORIGEN_IMAGENES = 'https://espresso.codeforces.com/';
const ETIQUETA = /<(\/?)(img|sup|sub|ul|li|center)\b([^<>]*)>/gi;

const SUBINDICES = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };

// En el dataset «<=» es un espacio fino mal exportado, no un operador. Las fórmulas $...$ no se tocan.
const sinSeparadores = (texto) => texto
  .split(/(\$[^$\n]*\$)/)
  .map((trozo, i) => (i % 2 ? trozo : trozo.replace(/<=/g, ' ')))
  .join('');

// Limpia un trozo de texto sin recortarlo: los espacios de los bordes separan de la etiqueta vecina.
const limpiarTrozo = (texto) => texto
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\*([a-zA-Z])\*(\d+)/g, (_, letra, numero) => `${letra}${[...numero].map((d) => SUBINDICES[d]).join('')}`)
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/[ \t]+/g, ' ')
  .replace(/\( /g, '(')
  .replace(/ ([),])/g, '$1');

/** Texto de una sola línea (títulos): sin marcado y sin etiquetas que pintar. */
export const limpiarTexto = (valor = '') => limpiarTrozo(sinSeparadores(String(valor)))
  .replace(/ ?\n ?/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const atributo = (atributos, nombre) =>
  atributos.match(new RegExp(`\\b${nombre}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] ?? '';

const agregar = (hijos, nodo) => {
  const ultimo = hijos.length - 1;
  if (typeof nodo === 'string' && typeof hijos[ultimo] === 'string') hijos[ultimo] += nodo;
  else if (nodo !== '') hijos.push(nodo);
};

// Quita los espacios de los extremos de un bloque y descarta lo que quede vacío.
const recortar = (hijos) => {
  const limpios = [...hijos];
  if (typeof limpios[0] === 'string') limpios[0] = limpios[0].trimStart();
  const ultimo = limpios.length - 1;
  if (typeof limpios[ultimo] === 'string') limpios[ultimo] = limpios[ultimo].trimEnd();
  return limpios.filter((h) => h !== '');
};

const bloquesDeParrafo = (parrafo) => {
  const bloques = [];
  let lista = null;
  let bloque = null;
  // Pila de contenedores en línea: el bloque abierto y, encima, los sup/sub sin cerrar.
  let pila = [];

  const cerrarBloque = () => {
    if (bloque) {
      const hijos = recortar(bloque.hijos);
      if (hijos.length) {
        if (lista) lista.items.push(hijos);
        else bloques.push({ tipo: bloque.tipo, hijos });
      }
    }
    bloque = null;
    pila = [];
  };
  const cerrarLista = () => {
    cerrarBloque();
    if (lista?.items.length) bloques.push(lista);
    lista = null;
  };
  const destino = () => {
    if (!bloque) {
      bloque = { tipo: 'p', hijos: [] };
      pila = [bloque.hijos];
    }
    return pila[pila.length - 1];
  };
  const abrir = (tipo) => {
    cerrarBloque();
    bloque = { tipo, hijos: [] };
    pila = [bloque.hijos];
  };

  let cursor = 0;
  for (const hallazgo of parrafo.matchAll(ETIQUETA)) {
    const [cruda, barra, nombreCrudo, atributos] = hallazgo;
    const nombre = nombreCrudo.toLowerCase();
    const cierre = barra === '/';
    agregar(destino(), limpiarTrozo(parrafo.slice(cursor, hallazgo.index)));
    cursor = hallazgo.index + cruda.length;

    if (nombre === 'img') {
      const src = atributo(atributos, 'src');
      if (cierre || !src.startsWith(ORIGEN_IMAGENES)) {
        agregar(destino(), limpiarTrozo(cruda));
      } else if (/\btex-graphics\b/.test(atributo(atributos, 'class')) && !lista) {
        cerrarBloque();
        bloques.push({ tipo: 'figura', src });
      } else {
        agregar(destino(), { tipo: 'formula', src });
      }
    } else if (nombre === 'sup' || nombre === 'sub') {
      if (!cierre) {
        const nodo = { tipo: nombre, hijos: [] };
        destino().push(nodo);
        pila.push(nodo.hijos);
      } else if (pila.length > 1) {
        pila.pop();
      }
    } else if (nombre === 'ul') {
      cerrarLista();
      if (!cierre) lista = { tipo: 'lista', items: [] };
    } else if (nombre === 'li') {
      cerrarBloque();
      if (!cierre && !lista) lista = { tipo: 'lista', items: [] };
    } else if (cierre) {
      cerrarBloque();
    } else {
      cerrarLista();
      abrir('centro');
    }
  }
  agregar(destino(), limpiarTrozo(parrafo.slice(cursor)));
  cerrarLista();
  return bloques;
};

/** Bloques del enunciado: párrafos, figuras, listas y texto centrado, con sus hijos en línea. */
export const bloquesDe = (markdown = '') => {
  const bloques = sinSeparadores(String(markdown)).split(/\n\s*\n/).flatMap(bloquesDeParrafo);
  // El dataset cierra con "none" los enunciados sin nota: ese párrafo no se muestra.
  const ultimo = bloques[bloques.length - 1];
  if (bloques.length > 1 && ultimo.tipo === 'p' && ultimo.hijos.length === 1
    && /^none\.?$/i.test(ultimo.hijos[0])) bloques.pop();
  return bloques;
};

const textoDe = (hijos) => hijos
  .map((h) => (typeof h === 'string' ? h : h.hijos ? textoDe(h.hijos) : ''))
  .join('');

/** El enunciado como texto corrido, sin etiquetas ni imágenes (resumen de los listados). */
export const textoPlano = (markdown = '') => bloquesDe(markdown)
  .map((b) => (b.tipo === 'lista' ? b.items.map(textoDe).join(' ') : textoDe(b.hijos || [])))
  .filter(Boolean)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();
