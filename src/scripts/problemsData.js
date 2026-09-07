// Catálogo del módulo de Problemas, en memoria. Único punto a cambiar
// cuando exista la colección en Firestore.


/** Etiqueta de complejidad; la barra del listado usa el mismo número. */
export const NIVELES = {
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Medio',
  4: 'Difícil',
  5: 'Muy difícil',
};

export const normalizarTexto = (texto) =>
  String(texto).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Nivel 1-5 a partir del rating de Codeforces (800 → 1, 2300+ → 5). */
export const nivelDeRating = (rating) =>
  Math.min(5, Math.max(1, Math.ceil(((Number(rating) || 1200) - 700) / 400)));


// Ejercicios. `nivel` va de 1 a 5: alimenta la etiqueta y la barra del listado.
export const EJERCICIOS = [
  {
    numero: 1000,
    categoria: 'principiante',
    titulo: 'Hola Mundo!',
    nivel: 1,
    puntos: 1,
    tiempoLimite: 1,
    memoriaLimite: 200,
    resumen: 'Tu primer programa: imprimir un mensaje en pantalla.',
    descripcion: [
      'Escriba un programa que imprima el mensaje "Hello World!" en la salida estándar.',
      'No olvide imprimir el fin de línea después del resultado, de lo contrario recibirá "Presentation Error".',
    ],
    entrada: 'Este problema no tiene ninguna entrada.',
    salida: 'Imprima el mensaje "Hello World!" seguido de un fin de línea.',
    ejemplos: [
      { entrada: '', salida: 'Hello World!' },
    ],
  },
  {
    numero: 1001,
    categoria: 'principiante',
    titulo: 'Suma Simple',
    nivel: 1,
    puntos: 1,
    tiempoLimite: 1,
    memoriaLimite: 200,
    resumen: 'Leer dos enteros y mostrar su suma con un formato exacto.',
    descripcion: [
      'Lea dos valores enteros, en este caso las variables A y B. Calcule la suma entre ellas y asígnela a la variable X.',
      'Imprima X como se muestra en el ejemplo, con un espacio antes y después del signo igual.',
    ],
    entrada: 'La entrada contiene dos valores enteros, uno por línea.',
    salida: 'Imprima la variable X según el ejemplo, con un fin de línea al final.',
    ejemplos: [
      { entrada: '10\n9', salida: 'X = 19' },
      { entrada: '-10\n4', salida: 'X = -6' },
      { entrada: '15\n-7', salida: 'X = 8' },
    ],
  },
  {
    numero: 1002,
    categoria: 'principiante',
    titulo: 'Área del Círculo',
    nivel: 2,
    puntos: 1,
    tiempoLimite: 1,
    memoriaLimite: 200,
    resumen: 'Punto flotante y salida con cuatro decimales.',
    descripcion: [
      'La fórmula para calcular el área de una circunferencia es: area = π · radio².',
      'Considerando para este problema que π = 3.14159, lea el radio y calcule el área.',
      'Imprima el resultado con cuatro dígitos después del punto decimal.',
    ],
    entrada: 'La entrada contiene un valor de punto flotante: el radio de la circunferencia.',
    salida: 'Imprima "A=" seguido del valor del área, con cuatro dígitos después del punto decimal.',
    ejemplos: [
      { entrada: '2.00', salida: 'A=12.5664' },
      { entrada: '100.64', salida: 'A=31819.3103' },
      { entrada: '150.00', salida: 'A=70685.7750' },
    ],
  },
  {
    numero: 1008,
    categoria: 'principiante',
    titulo: 'Salario',
    nivel: 2,
    puntos: 2,
    tiempoLimite: 1,
    memoriaLimite: 200,
    resumen: 'Mezclar enteros y flotantes en una salida de dos líneas.',
    descripcion: [
      'Escriba un programa que lea el número de un empleado, la cantidad de horas que trabajó en el mes y el valor que recibe por hora.',
      'Imprima el número del empleado y el salario que recibirá al final del mes, con dos decimales.',
      'No olvide el espacio antes y después del signo igual, y también después del U$.',
    ],
    entrada: 'La entrada contiene 2 números enteros y 1 valor de punto flotante: el número, la cantidad de horas trabajadas y el valor que recibe por hora.',
    salida: 'Imprima el número y el salario del empleado según el ejemplo, con un espacio en blanco antes y después del signo igual.',
    ejemplos: [
      { entrada: '25\n100\n5.50', salida: 'NUMBER = 25\nSALARY = U$ 550.00' },
      { entrada: '1\n200\n20.50', salida: 'NUMBER = 1\nSALARY = U$ 4100.00' },
      { entrada: '6\n145\n15.55', salida: 'NUMBER = 6\nSALARY = U$ 2254.75' },
    ],
  },
  {
    numero: 1010,
    categoria: 'principiante',
    titulo: 'Cálculo Simple',
    nivel: 3,
    puntos: 2,
    tiempoLimite: 1,
    memoriaLimite: 200,
    resumen: 'Varias lecturas por línea y un total acumulado.',
    descripcion: [
      'En este problema debe leer el código de una pieza 1, el número de piezas 1, el valor unitario de cada pieza 1, el código de una pieza 2, el número de piezas 2 y el valor unitario de cada pieza 2.',
      'Después calcule e imprima el valor a pagar.',
    ],
    entrada: 'La entrada contiene dos líneas de datos. En cada una habrá 3 valores: dos enteros y un valor de punto flotante con 2 decimales.',
    salida: 'Imprima el valor a pagar con 2 decimales, según el ejemplo.',
    ejemplos: [
      { entrada: '12 1 5.30\n16 2 5.10', salida: 'VALOR A PAGAR: R$ 15.50' },
      { entrada: '13 2 15.30\n161 4 5.20', salida: 'VALOR A PAGAR: R$ 51.40' },
      { entrada: '1 1 15.10\n2 1 15.10', salida: 'VALOR A PAGAR: R$ 30.20' },
    ],
  },
];

// Categorías
const CATALOGO = [
  {
    n: 1, slug: 'principiante', titulo: 'Principiante',
    temas: 'Problemas básicos para quien apenas empieza a programar.',
    etiquetas: ['Entrada/Salida', 'Condicionales', 'Ciclos'],
    tags: ['input-output', 'basic', 'beginner'],
    bg: '#09AE40', ink: '#fff', bgSuave: '#0DEF58BF', inkSuave: '#000',
  },
  {
    n: 2, slug: 'ad-hoc', titulo: 'Ad-Hoc',
    temas: 'Simulación, fechas, juegos y problemas ad-hoc en general.',
    etiquetas: ['Simulación', 'Fechas', 'Juegos'],
    tags: ['adhoc', 'ad-hoc', 'simulation', 'games', 'brute force'],
    bg: '#F97110', ink: '#fff', bgSuave: '#FF8936', inkSuave: '#000',
  },
  {
    n: 3, slug: 'cadenas', titulo: 'Cadenas',
    temas: 'Palíndromos, frecuencias, LCS y manipulación de texto.',
    etiquetas: ['Palíndromos', 'Frecuencia', 'LCS'],
    tags: ['strings', 'string', 'string matching', 'hashing', 'text'],
    bg: '#09AACE', ink: '#fff', bgSuave: '#78D0E4', inkSuave: '#000',
  },
  {
    n: 4, slug: 'estructuras-de-datos', titulo: 'Estructuras de Datos',
    temas: 'Colas, pilas, ordenamiento y las librerías estándar.',
    etiquetas: ['Cola', 'Pila', 'Map', 'Set'],
    tags: ['data structures', 'data-structures', 'stack', 'queue', 'heap', 'sorting'],
    bg: '#E10E15', ink: '#fff', bgSuave: '#FF4249', inkSuave: '#fff',
  },
  {
    n: 5, slug: 'matematicas', titulo: 'Matemáticas',
    temas: 'Teoría de números, primos, combinatoria y BigInteger.',
    etiquetas: ['Primos', 'Combinatoria', 'BigInteger'],
    tags: ['math', 'number theory', 'combinatorics', 'prime numbers', 'probabilities'],
    bg: '#F72194', ink: '#fff', bgSuave: '#FF5FB4', inkSuave: '#000',
  },
  {
    n: 6, slug: 'paradigmas', titulo: 'Paradigmas',
    temas: 'Programación dinámica, búsqueda binaria, voraces y backtracking.',
    etiquetas: ['DP', 'Búsqueda binaria', 'Voraces'],
    tags: ['dp', 'dynamic programming', 'greedy', 'binary search', 'backtracking', 'divide and conquer'],
    bg: '#C115C1', ink: '#fff', bgSuave: '#EC62EC', inkSuave: '#000',
  },
  {
    n: 7, slug: 'grafos', titulo: 'Grafos',
    temas: 'Flood fill, MST, SSSP, DAG, flujo máximo y árboles.',
    etiquetas: ['MST', 'SSSP', 'Flujo máximo'],
    tags: ['graphs', 'graph', 'dfs', 'bfs', 'shortest paths', 'mst', 'trees', 'flows'],
    bg: '#0A0AE6', ink: '#fff', bgSuave: '#7878F1', inkSuave: '#fff',
  },
  {
    n: 8, slug: 'geometria', titulo: 'Geometría Computacional',
    temas: 'Puntos, rectas, polígonos y envolvente convexa.',
    etiquetas: ['Puntos', 'Rectas', 'Polígonos'],
    tags: ['geometry', 'computational geometry', 'points', 'lines', 'polygons'],
    bg: '#8B041A', ink: '#fff', bgSuave: '#EF4A65', inkSuave: '#fff',
  },
  {
    n: 9, slug: 'sql', titulo: 'SQL',
    temas: 'Lenguajes de consulta: select, insert, update y create.',
    etiquetas: ['Select', 'Insert', 'Update'],
    tags: ['sql', 'database', 'databases'],
    bg: '#A01DED', ink: '#fff', bgSuave: '#CB83F5', inkSuave: '#000',
  },
  {
    n: 10, slug: 'otros', titulo: 'Otros',
    temas: 'Problemas que todavía no tienen una categoría temática específica.',
    etiquetas: ['Clasificación pendiente'],
    tags: [],
    bg: '#111', ink: '#fff', bgSuave: '#7C7C7C', inkSuave: '#fff',
  },
];

const normalizarTag = (tag) =>
  String(tag?.name || tag || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

// Principiante se decide por dificultad, no por tema: el banco no trae una
// etiqueta de "nivel de entrada", asi que por tags la categoria quedaba vacia
// y la rejilla la escondia.
const RATING_PRINCIPIANTE = 1000;

const categoriaCoincidente = (problema) => {
  const rating = Number(problema.dificultadRating);
  if (rating > 0 && rating <= RATING_PRINCIPIANTE) {
    return CATALOGO.find((categoria) => categoria.slug === 'principiante');
  }
  const tags = (problema.tags || []).map(normalizarTag);
  return CATALOGO.find((categoria) => categoria.slug !== 'principiante'
      && categoria.tags.some((tag) => tags.includes(normalizarTag(tag))))
    || CATALOGO.find((categoria) => categoria.slug === 'otros');
};

export const problemaPerteneceCategoria = (problema, slug) =>
  categoriaCoincidente(problema)?.slug === slug;

export const categoriaDeProblema = (problema) =>
  categoriaCoincidente(problema)?.slug || 'principiante';

/** El conteo sale de los ejercicios cargados, no de un número escrito a mano. */
export const CATEGORIAS = CATALOGO.map((c) => ({
  ...c,
  total: EJERCICIOS.filter((e) => e.categoria === c.slug).length,
}));

export const TOTAL_PROBLEMAS = EJERCICIOS.length;

export const buscarCategoria = (slug) => CATEGORIAS.find((c) => c.slug === slug);

/** `todos` no es una categoría real: devuelve el repositorio completo. */
export const ejerciciosDeCategoria = (slug) =>
  slug === 'todos' ? EJERCICIOS : EJERCICIOS.filter((e) => e.categoria === slug);

export const buscarEjercicio = (numero) =>
  EJERCICIOS.find((e) => String(e.numero) === String(numero));

// Lenguajes del editor, con su plantilla inicial.
export const LENGUAJES = [
  {
    id: 'csharp', nombre: 'C#',
    plantilla: 'using System;\n\nclass Solucion {\n\n    static void Main(string[] args) {\n\n        // Escribe tu solución aquí\n\n    }\n}\n',
  },
  {
    id: 'python', nombre: 'Python 3',
    plantilla: '# Escribe tu solución aquí\n\ndef main():\n    pass\n\n\nmain()\n',
  },
  {
    id: 'java', nombre: 'Java',
    plantilla: 'import java.util.Scanner;\n\npublic class Main {\n\n    public static void main(String[] args) {\n\n        // Escribe tu solución aquí\n\n    }\n}\n',
  },
  {
    id: 'cpp', nombre: 'C++',
    plantilla: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\n    // Escribe tu solución aquí\n\n    return 0;\n}\n',
  },
  {
    id: 'javascript', nombre: 'JavaScript',
    plantilla: "const lineas = require('fs').readFileSync(0, 'utf8').split('\\n');\n\n// Escribe tu solución aquí\n",
  },
];
