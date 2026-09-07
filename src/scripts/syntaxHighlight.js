

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapar = (texto) => texto.replace(/[&<>]/g, (c) => ESCAPES[c]);

const palabras = (lista) => `\\b(?:${lista.join('|')})\\b`;

// Control de flujo aparte del resto: en el tema de VS Code va en morado.
const CONTROL_COMUN = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
  'break', 'continue', 'return', 'goto', 'try', 'catch', 'finally', 'throw',
];



const COMENTARIO_C = String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
const CADENA_C = String.raw`"(?:\\[\s\S]|[^"\\\n])*"?|'(?:\\[\s\S]|[^'\\\n])*'?`;
const NUMERO = String.raw`\b(?:0[xXbB][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:[fFdDlLuUmM]+)?\b`;

const comunes = ({ control, clave, tipo, literal, comentario = COMENTARIO_C, cadena = CADENA_C, extra = [] }) => [
  ...extra,
  ['tok-comentario', comentario],
  ['tok-cadena', cadena],
  ['tok-numero', NUMERO],
  ['tok-literal', palabras(literal)],
  ['tok-control', palabras(control)],
  ['tok-clave', palabras(clave)],
  ['tok-tipo', palabras(tipo)],
  // Un identificador seguido de "(" se pinta como llamada a función.
  ['tok-funcion', String.raw`\b[A-Za-z_]\w*(?=\s*\()`],
  // Por convención, lo que empieza en mayúscula es una clase o un tipo.
  ['tok-tipo', String.raw`\b[A-Z]\w*\b`],
  ['tok-operador', String.raw`[+\-*/%=!<>&|^~?]+`],
  ['tok-punt', String.raw`[{}()\[\];,.:]`],
];

const LENGUAJES = {
  csharp: comunes({
    extra: [['tok-preproc', String.raw`^[ \t]*#[a-z]+[^\n]*`]],
    control: [...CONTROL_COMUN, 'foreach', 'in', 'yield', 'async', 'await', 'when'],
    clave: ['using', 'namespace', 'class', 'struct', 'interface', 'enum', 'record',
      'public', 'private', 'protected', 'internal', 'static', 'readonly', 'const',
      'new', 'override', 'virtual', 'abstract', 'sealed', 'partial', 'this', 'base',
      'is', 'as', 'ref', 'out', 'params', 'get', 'set', 'operator', 'delegate',
      'event', 'lock', 'checked', 'unchecked', 'typeof', 'sizeof', 'stackalloc'],
    tipo: ['int', 'long', 'short', 'byte', 'sbyte', 'uint', 'ulong', 'ushort',
      'char', 'bool', 'float', 'double', 'decimal', 'string', 'object', 'void',
      'var', 'dynamic'],
    literal: ['true', 'false', 'null'],
  }),

  python: comunes({
    comentario: String.raw`#[^\n]*`,
    // Las cadenas triples van primero para que no las parta la comilla simple.
    cadena: String.raw`[rbfu]{0,2}"""[\s\S]*?"""|[rbfu]{0,2}'''[\s\S]*?'''|[rbfu]{0,2}"(?:\\[\s\S]|[^"\\\n])*"?|[rbfu]{0,2}'(?:\\[\s\S]|[^'\\\n])*'?`,
    control: [...CONTROL_COMUN, 'elif', 'except', 'raise', 'yield', 'pass', 'with',
      'async', 'await', 'in', 'assert'],
    clave: ['def', 'class', 'lambda', 'import', 'from', 'as', 'global', 'nonlocal',
      'del', 'and', 'or', 'not', 'is', 'self', 'cls'],
    tipo: ['int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'bool', 'bytes',
      'complex', 'frozenset', 'object', 'type'],
    literal: ['True', 'False', 'None'],
  }),

  java: comunes({
    control: [...CONTROL_COMUN, 'for', 'yield', 'assert'],
    clave: ['package', 'import', 'class', 'interface', 'enum', 'record', 'extends',
      'implements', 'public', 'private', 'protected', 'static', 'final', 'abstract',
      'synchronized', 'native', 'transient', 'volatile', 'strictfp', 'new', 'this',
      'super', 'throws', 'instanceof', 'var'],
    tipo: ['int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double', 'void'],
    literal: ['true', 'false', 'null'],
  }),

  cpp: comunes({
    extra: [['tok-preproc', String.raw`^[ \t]*#[a-z_]+[^\n]*`]],
    control: [...CONTROL_COMUN, 'co_return', 'co_await', 'co_yield'],
    clave: ['using', 'namespace', 'class', 'struct', 'union', 'template', 'typename',
      'public', 'private', 'protected', 'virtual', 'override', 'final', 'const',
      'constexpr', 'consteval', 'static', 'inline', 'mutable', 'extern', 'new',
      'delete', 'this', 'operator', 'friend', 'explicit', 'typedef', 'enum',
      'sizeof', 'decltype', 'noexcept', 'static_cast', 'dynamic_cast',
      'reinterpret_cast', 'const_cast'],
    tipo: ['int', 'long', 'short', 'char', 'bool', 'float', 'double', 'void',
      'unsigned', 'signed', 'auto', 'size_t', 'string', 'vector', 'map', 'set',
      'pair', 'queue', 'stack', 'deque', 'priority_queue', 'wchar_t'],
    literal: ['true', 'false', 'nullptr', 'NULL'],
  }),

  javascript: comunes({
    cadena: String.raw`\`(?:\\[\s\S]|[^\`\\])*\`?|${CADENA_C}`,
    control: [...CONTROL_COMUN, 'of', 'in', 'await', 'yield'],
    clave: ['const', 'let', 'var', 'function', 'class', 'extends', 'new', 'delete',
      'typeof', 'instanceof', 'void', 'this', 'super', 'import', 'export', 'from',
      'as', 'async', 'static', 'get', 'set'],
    tipo: ['Array', 'Object', 'Number', 'String', 'Boolean', 'Math', 'JSON',
      'Map', 'Set', 'Promise', 'BigInt', 'Symbol'],
    literal: ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],
  }),
};

// Una sola expresión por lenguaje, armada una vez y reutilizada.
const CACHE = new Map();

const regexDe = (id) => {
  if (CACHE.has(id)) return CACHE.get(id);
  const reglas = LENGUAJES[id] || LENGUAJES.javascript;
  const regex = new RegExp(reglas.map(([, patron]) => `(${patron})`).join('|'), 'gm');
  const entrada = { regex, clases: reglas.map(([clase]) => clase) };
  CACHE.set(id, entrada);
  return entrada;
};

/**

 */
export const resaltar = (codigo, lenguajeId) => {
  const { regex, clases } = regexDe(lenguajeId);
  let salida = '';
  let ultimo = 0;
  regex.lastIndex = 0;

  let coincidencia = regex.exec(codigo);
  while (coincidencia !== null) {
    // Un patrón que casa con la cadena vacía colgaría el bucle.
    if (coincidencia[0] === '') { regex.lastIndex += 1; coincidencia = regex.exec(codigo); continue; }

    salida += escapar(codigo.slice(ultimo, coincidencia.index));
    // El grupo que casó dice la clase: los grupos van en el mismo orden que las reglas.
    const grupo = coincidencia.findIndex((valor, i) => i > 0 && valor !== undefined);
    salida += `<span class="${clases[grupo - 1]}">${escapar(coincidencia[0])}</span>`;

    ultimo = coincidencia.index + coincidencia[0].length;
    coincidencia = regex.exec(codigo);
  }

  salida += escapar(codigo.slice(ultimo));
 
  return `${salida}\n`;
};

export default resaltar;
