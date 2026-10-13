// Módulo Fundamentos: lo que no cambia con el estudiante (temas, niveles, logros).
// Los ejercicios vienen de la API (fundamentosApi.js).

export const PLANTILLA_PSEINT = 'Algoritmo solucion\n    // Escribe tu solución aquí\n    \nFinAlgoritmo\n';

/** Segundos que el botón de enviar pasa bloqueado al abrir un ejercicio. */
export const ESPERA_ENVIO = 120;

// Minutos del temporizador de práctica según la dificultad (1 a 5). El más
// fácil tiene el mínimo, 5 minutos. No bloquea nada: al acabarse solo avisa.
const MINUTOS_TEMPORIZADOR = { 1: 5, 2: 8, 3: 10, 4: 15, 5: 20 };
export const minutosTemporizador = (nivel) => MINUTOS_TEMPORIZADOR[nivel] || 5;

// `conceptos` son los mensajes del gato: aclaran el tema, nunca el ejercicio.
// Van pocos y cortos a propósito: un panel cargado agobia más de lo que ayuda.
export const TEMAS = [
  {
    slug: 'salida-y-variables',
    titulo: 'Salida y variables',
    resumen: 'Mostrar mensajes en pantalla y guardar datos en variables.',
    conceptos: [
      { texto: 'Escribir muestra algo en pantalla. El texto va entre comillas.', codigo: 'Escribir "Buenos dias"' },
      { texto: 'Una variable es una caja con nombre. Se le asigna un valor con la flecha.', codigo: 'puntos <- 10' },
      { texto: 'El juez compara tu salida letra por letra: mayúsculas y espacios cuentan.' },
    ],
  },
  {
    slug: 'entrada-y-operaciones',
    titulo: 'Entrada y operaciones',
    resumen: 'Leer datos del usuario y hacer cuentas con ellos.',
    conceptos: [
      { texto: 'Leer guarda en una variable lo que escribe el usuario.', codigo: 'Leer n' },
      { texto: 'MOD da el residuo de una división y trunc() quita los decimales.', codigo: 'residuo <- 9 MOD 2' },
      { texto: 'Cada dato llega en su propia línea, en el orden del enunciado.' },
    ],
  },
  {
    slug: 'condicionales',
    titulo: 'Condicionales',
    resumen: 'Tomar decisiones con Si, Sino y comparaciones.',
    conceptos: [
      { texto: 'Si ejecuta un bloque solo cuando la condición se cumple. Sino es el otro camino.', codigo: 'Si saldo > 0 Entonces\n    Escribir "Hay saldo"\nSino\n    Escribir "Sin saldo"\nFinSi' },
      { texto: 'Une condiciones con Y (las dos) o con O (basta una).' },
      { texto: 'Prueba los casos del borde: el cero, el empate, el valor límite.' },
    ],
  },
  {
    slug: 'segun',
    titulo: 'Selección múltiple',
    resumen: 'Elegir entre muchas opciones con Segun.',
    conceptos: [
      { texto: 'Segun salta directo al caso que coincide con el valor.', codigo: 'Segun turno Hacer\n    1:\n        Escribir "Manana"\n    De Otro Modo:\n        Escribir "Otro"\nFinSegun' },
      { texto: 'Varios valores pueden compartir un caso si los separas con comas.' },
      { texto: 'Segun compara por igualdad. Para rangos, usa Si.' },
    ],
  },
  {
    slug: 'ciclos-mientras',
    titulo: 'Ciclos Mientras y Repetir',
    resumen: 'Repetir pasos mientras se cumpla una condición.',
    conceptos: [
      { texto: 'Mientras pregunta antes de cada vuelta. Repetir pregunta al final, así que da al menos una.', codigo: 'Mientras energia > 0 Hacer\n    energia <- energia - 1\nFinMientras' },
      { texto: 'Algo debe cambiar dentro del ciclo, o nunca termina.' },
      { texto: 'n MOD 10 es la última cifra; trunc(n / 10) se la quita.' },
    ],
  },
  {
    slug: 'ciclo-para',
    titulo: 'Ciclo Para',
    resumen: 'Repetir una cantidad conocida de veces.',
    conceptos: [
      { texto: 'Para se usa cuando ya sabes cuántas vueltas das. La variable avanza sola.', codigo: 'Para i <- 1 Hasta 5 Hacer\n    Escribir i\nFinPara' },
      { texto: 'Con Paso cambia de cuánto en cuánto avanza.' },
      { texto: 'Un acumulador de sumas empieza en 0; uno de multiplicaciones, en 1.' },
    ],
  },
  {
    slug: 'arreglos',
    titulo: 'Arreglos',
    resumen: 'Guardar muchos datos del mismo tipo bajo un solo nombre.',
    conceptos: [
      { texto: 'Un arreglo es una fila de casillas numeradas. La primera es la 1.', codigo: 'Dimension notas[5]\nnotas[1] <- 40' },
      { texto: 'Se recorre con un Para: la variable del ciclo hace de posición.' },
      { texto: 'Para hallar el mayor, toma el primero como candidato y compara.' },
    ],
  },
  {
    slug: 'matrices',
    titulo: 'Matrices',
    resumen: 'Datos organizados en filas y columnas.',
    conceptos: [
      { texto: 'Una matriz es una tabla. Cada casilla se ubica con fila y columna.', codigo: 'Dimension tabla[3, 4]\ntabla[2, 1] <- 7' },
      { texto: 'Se recorre con dos Para: el de afuera por filas, el de adentro por columnas.' },
      { texto: 'En la diagonal principal, fila y columna tienen el mismo número.' },
    ],
  },
];

// Logros del módulo. Por ahora son solo vitrina: sin juez no hay forma de
// saber qué resolvió cada estudiante, así que todos se muestran bloqueados.
export const LOGROS = [
  { slug: 'primer-algoritmo', titulo: 'Mi primer algoritmo', condicion: 'Resuelve Hola Mundo.' },
  { slug: 'buena-memoria', titulo: 'No se me olvida', condicion: 'Completa Salida y variables.' },
  { slug: 'decisiones', titulo: 'Toma de decisiones', condicion: 'Completa Condicionales.' },
  { slug: 'en-bucle', titulo: 'Dando vueltas', condicion: 'Completa los dos temas de ciclos.' },
  { slug: 'cazador-de-primos', titulo: 'El Primo', condicion: 'Resuelve Número primo.' },
  { slug: 'domador-de-arreglos', titulo: 'Domador de arreglos', condicion: 'Completa Arreglos.' },
  { slug: 'fila-y-columna', titulo: 'Filas y columnas', condicion: 'Completa Matrices.' },
  { slug: 'fundamentos-completos', titulo: 'Lo esencial completado', condicion: 'Resuelve los 50 ejercicios.' },
];

export const LOGROS_PRACTICA = [
  { slug: 'lectura-atenta', titulo: 'Lectura atenta', condicion: 'Resuelve tu primer ejercicio de práctica.' },
  { slug: 'buen-contador', titulo: 'Buen contador', condicion: 'Completa Entrada y operaciones.' },
  { slug: 'caso-por-caso', titulo: 'Caso por caso', condicion: 'Completa Condicionales y Selección múltiple.' },
  { slug: 'vueltas-y-vueltas', titulo: 'Vueltas y vueltas', condicion: 'Completa los dos temas de ciclos.' },
  { slug: 'tres-en-raya', titulo: 'Tres en raya', condicion: 'Resuelve Tres en raya.' },
  { slug: 'practica-completa', titulo: 'Práctica completa', condicion: 'Resuelve los 50 ejercicios.' },
];

// Niveles del módulo, en el orden del slider. El morado del primero lo eligió
// Javier; el rojo es el de Estructuras de Datos del catálogo (problemsData.js)
// y el tercero va en negro.
// `franja` es el tono oscuro de las franjas de arriba y abajo de la tarjeta de nivel.
// `codigo` es el adorno de la tarjeta: un fragmento de PSeInt, sin relación
// con ningún ejercicio.
export const NIVELES_FUNDAMENTOS = [
  {
    slug: 'fundamentos',
    n: 1,
    titulo: 'Fundamentos de programación',
    texto: 'Ejercicios cortos para aprender cada instrucción de PSeInt, de lo más simple a matrices.',
    color: { bg: '#5410F9', ink: '#fff', bgSuave: '#7A45FF', inkSuave: '#fff', franja: '#2b0686' },
    logros: LOGROS,
    codigo: ['Algoritmo saludo\n    Escribir "Hola"\nFinAlgoritmo', 'Si nota >= 30 Entonces\n    Escribir "Bien"\nFinSi'],
  },
  {
    slug: 'practica',
    n: 2,
    titulo: 'Práctica de fundamentos',
    texto: 'Los mismos temas con enunciados más largos: hay que leer con atención y decidir qué hacer con los datos.',
    color: { bg: '#E10E15', ink: '#fff', bgSuave: '#FF4249', inkSuave: '#fff', franja: '#4c0519' },
    logros: LOGROS_PRACTICA,
    codigo: ['Mientras n > 0 Hacer\n    suma <- suma + n MOD 10\n    n <- trunc(n / 10)\nFinMientras', 'Para f <- 1 Hasta 3 Hacer\n    Leer tabla[f, c]\nFinPara'],
  },
  {
    slug: 'avanzado',
    n: 3,
    titulo: 'Programación avanzada',
    texto: '¡Muy pronto!',
    color: { bg: '#000', ink: '#fff', bgSuave: '#000', inkSuave: '#fff', franja: '#000' },
    logros: [],
    codigo: ['Funcion r <- factorial(n)\n    ...\nFinFuncion', '// muy pronto'],
    pronto: true,
    // Sin ejercicios todavía: lo que se piensa cubrir.
    temasFuturos: [
      { titulo: 'Funciones y subprocesos', resumen: 'Dividir un algoritmo en piezas que se reutilizan.' },
      { titulo: 'Cadenas de texto', resumen: 'Recorrer, comparar y transformar palabras.' },
      { titulo: 'Búsqueda y ordenamiento', resumen: 'Encontrar un dato y poner una lista en orden.' },
      { titulo: 'Recursividad', resumen: 'Algoritmos que se llaman a sí mismos.' },
    ],
  },
];

export const buscarNivel = (slug) => NIVELES_FUNDAMENTOS.find((n) => n.slug === slug);

export const buscarTema = (slug) => TEMAS.find((t) => t.slug === slug);

/** Temas con ejercicios en esa lista, cada uno con su cantidad. */
export const temasDe = (ejercicios) => TEMAS
  .map((t) => ({ ...t, total: ejercicios.filter((e) => e.tema === t.slug).length }))
  .filter((t) => t.total > 0);
