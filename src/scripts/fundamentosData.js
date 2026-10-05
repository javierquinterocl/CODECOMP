import { EJERCICIOS_PRACTICA } from './fundamentosPracticaData.js';

// Módulo Fundamentos: ejercicios básicos en español, pensados para PSeInt.
// Vive en memoria mientras no exista su tabla; los nombres de los campos son
// los mismos que entrega mapProblem (problemsApi.js) para que el cambio a la
// base de datos sea solo cambiar de dónde salen.

export const PLANTILLA_PSEINT = 'Algoritmo solucion\n    // Escribe tu solución aquí\n    \nFinAlgoritmo\n';

/** Segundos que el botón de enviar pasa bloqueado al abrir un ejercicio. */
export const ESPERA_ENVIO = 120;

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

// `nivel` va de 1 a 5, igual que en el catálogo de problemas.
export const EJERCICIOS = [
  /* ── Salida y variables ── */
  {
    numero: 1, tema: 'salida-y-variables', nivel: 1,
    titulo: 'Hola Mundo',
    resumen: 'Tu primer algoritmo: mostrar un mensaje en pantalla.',
    descripcion: ['Escribe un algoritmo que muestre en pantalla el mensaje Hola Mundo.'],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Una línea con el texto Hola Mundo, tal como aparece en el ejemplo.',
    ejemplos: [{ entrada: '', salida: 'Hola Mundo' }],
  },
  {
    numero: 2, tema: 'salida-y-variables', nivel: 1,
    titulo: 'Dos líneas',
    resumen: 'Cada Escribir ocupa una línea nueva.',
    descripcion: ['Muestra dos mensajes, cada uno en su propia línea y en el orden indicado.'],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Primera línea: Bienvenido a CODECOMP. Segunda línea: Vamos a programar.',
    ejemplos: [{ entrada: '', salida: 'Bienvenido a CODECOMP\nVamos a programar' }],
  },
  {
    numero: 3, tema: 'salida-y-variables', nivel: 1,
    titulo: 'Mi primera variable',
    resumen: 'Guardar un número y mostrarlo junto a un texto.',
    descripcion: [
      'Define una variable entera llamada edad, asígnale el valor 18 y muéstrala con el formato del ejemplo.',
      'El número debe salir de la variable, no escrito dentro del texto.',
    ],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Una línea con el texto "Mi edad es " seguido del valor de la variable.',
    ejemplos: [{ entrada: '', salida: 'Mi edad es 18' }],
  },
  {
    numero: 4, tema: 'salida-y-variables', nivel: 1,
    titulo: 'Suma de dos variables',
    resumen: 'Operar con variables y guardar el resultado en otra.',
    descripcion: ['Guarda el 8 en una variable y el 5 en otra. Calcula su suma en una tercera variable y muéstrala.'],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Una línea con el resultado de la suma.',
    ejemplos: [{ entrada: '', salida: '13' }],
  },
  {
    numero: 5, tema: 'salida-y-variables', nivel: 2,
    titulo: 'Intercambio',
    resumen: 'Cambiar el contenido de dos variables entre sí.',
    descripcion: [
      'La variable a empieza con el valor 3 y la variable b con el valor 7.',
      'Intercambia sus contenidos, de modo que a termine con lo que tenía b y b con lo que tenía a. Luego muestra a y después b.',
    ],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Dos líneas: el valor final de a y el valor final de b.',
    ejemplos: [{ entrada: '', salida: '7\n3' }],
    pistaConcepto: 'Si copias b encima de a, el valor original de a se pierde. Piensa dónde podrías guardarlo mientras tanto.',
  },
  {
    numero: 6, tema: 'salida-y-variables', nivel: 1,
    titulo: 'Área de un rectángulo',
    resumen: 'Una fórmula sencilla con dos variables.',
    descripcion: ['Un rectángulo tiene base 6 y altura 4. Guarda ambos valores en variables, calcula el área (base por altura) y muéstrala.'],
    entrada: 'Este ejercicio no tiene entrada.',
    salida: 'Una línea con el área del rectángulo.',
    ejemplos: [{ entrada: '', salida: '24' }],
  },

  /* ── Entrada y operaciones ── */
  {
    numero: 7, tema: 'entrada-y-operaciones', nivel: 1,
    titulo: 'Eco',
    resumen: 'Leer un dato y devolverlo tal cual.',
    descripcion: ['Lee un número entero y muéstralo en pantalla.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Una línea con el mismo número.',
    ejemplos: [{ entrada: '42', salida: '42' }, { entrada: '-7', salida: '-7' }],
  },
  {
    numero: 8, tema: 'entrada-y-operaciones', nivel: 1,
    titulo: 'Suma de dos números',
    resumen: 'Leer dos enteros y mostrar su suma.',
    descripcion: ['Lee dos números enteros y muestra el resultado de sumarlos.'],
    entrada: 'Dos líneas, cada una con un número entero.',
    salida: 'Una línea con la suma.',
    ejemplos: [{ entrada: '3\n4', salida: '7' }, { entrada: '-5\n5', salida: '0' }],
  },
  {
    numero: 9, tema: 'entrada-y-operaciones', nivel: 1,
    titulo: 'Tres operaciones',
    resumen: 'Suma, resta y multiplicación de dos enteros.',
    descripcion: ['Lee dos números enteros a y b. Muestra su suma, su resta (a menos b) y su multiplicación, en ese orden.'],
    entrada: 'Dos líneas: el entero a y el entero b.',
    salida: 'Tres líneas: a + b, a - b y a * b.',
    ejemplos: [{ entrada: '10\n3', salida: '13\n7\n30' }, { entrada: '2\n8', salida: '10\n-6\n16' }],
  },
  {
    numero: 10, tema: 'entrada-y-operaciones', nivel: 1,
    titulo: 'Doble y triple',
    resumen: 'Dos resultados a partir de un mismo dato.',
    descripcion: ['Lee un número entero y muestra su doble y su triple.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Dos líneas: primero el doble y luego el triple.',
    ejemplos: [{ entrada: '5', salida: '10\n15' }, { entrada: '0', salida: '0\n0' }],
  },
  {
    numero: 11, tema: 'entrada-y-operaciones', nivel: 2,
    titulo: 'Cociente y residuo',
    resumen: 'División entera con trunc y MOD.',
    descripcion: [
      'Lee dos enteros positivos a y b. Muestra cuántas veces cabe b completo dentro de a (el cociente entero) y cuánto sobra (el residuo).',
    ],
    entrada: 'Dos líneas: el entero a y el entero b, ambos mayores que cero.',
    salida: 'Dos líneas: el cociente entero y el residuo.',
    ejemplos: [{ entrada: '17\n5', salida: '3\n2' }, { entrada: '20\n4', salida: '5\n0' }],
  },
  {
    numero: 12, tema: 'entrada-y-operaciones', nivel: 1,
    titulo: 'Perímetro y área',
    resumen: 'Dos fórmulas con los mismos datos de entrada.',
    descripcion: ['Lee la base y la altura de un rectángulo. Calcula su perímetro (la suma de sus cuatro lados) y su área.'],
    entrada: 'Dos líneas: la base y la altura, enteros positivos.',
    salida: 'Dos líneas: el perímetro y el área.',
    ejemplos: [{ entrada: '6\n4', salida: '20\n24' }, { entrada: '1\n1', salida: '4\n1' }],
  },
  {
    numero: 13, tema: 'entrada-y-operaciones', nivel: 2,
    titulo: 'De minutos a horas',
    resumen: 'Descomponer una cantidad en dos unidades.',
    descripcion: ['Lee una cantidad de minutos y exprésala en horas completas y minutos restantes.'],
    entrada: 'Una línea con un entero mayor o igual que cero: la cantidad de minutos.',
    salida: 'Dos líneas: las horas completas y los minutos que sobran.',
    ejemplos: [{ entrada: '135', salida: '2\n15' }, { entrada: '59', salida: '0\n59' }],
  },

  /* ── Condicionales ── */
  {
    numero: 14, tema: 'condicionales', nivel: 2,
    titulo: 'Positivo, negativo o cero',
    resumen: 'Tres caminos posibles según el signo.',
    descripcion: ['Lee un número entero e indica si es positivo, negativo o cero.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Una línea con la palabra Positivo, Negativo o Cero.',
    ejemplos: [{ entrada: '5', salida: 'Positivo' }, { entrada: '-3', salida: 'Negativo' }, { entrada: '0', salida: 'Cero' }],
  },
  {
    numero: 15, tema: 'condicionales', nivel: 2,
    titulo: 'Par o impar',
    resumen: 'Usar el residuo para clasificar un número.',
    descripcion: ['Lee un número entero mayor o igual que cero e indica si es par o impar.'],
    entrada: 'Una línea con un entero mayor o igual que cero.',
    salida: 'Una línea con la palabra Par o Impar.',
    ejemplos: [{ entrada: '8', salida: 'Par' }, { entrada: '7', salida: 'Impar' }],
  },
  {
    numero: 16, tema: 'condicionales', nivel: 2,
    titulo: 'El mayor de dos',
    resumen: 'Comparar dos valores, con el empate como caso aparte.',
    descripcion: ['Lee dos números enteros y muestra el mayor. Si los dos son iguales, muestra la palabra Iguales.'],
    entrada: 'Dos líneas, cada una con un número entero.',
    salida: 'Una línea con el mayor de los dos, o con la palabra Iguales.',
    ejemplos: [{ entrada: '4\n9', salida: '9' }, { entrada: '6\n6', salida: 'Iguales' }],
  },
  {
    numero: 17, tema: 'condicionales', nivel: 2,
    titulo: 'Mayor de edad',
    resumen: 'Una decisión con un valor límite.',
    descripcion: ['Lee la edad de una persona. Se considera mayor de edad a partir de los 18 años cumplidos.'],
    entrada: 'Una línea con un entero mayor o igual que cero: la edad.',
    salida: 'Una línea con el texto Mayor de edad o Menor de edad.',
    ejemplos: [{ entrada: '18', salida: 'Mayor de edad' }, { entrada: '15', salida: 'Menor de edad' }],
  },
  {
    numero: 18, tema: 'condicionales', nivel: 2,
    titulo: 'Aprobado o reprobado',
    resumen: 'Decidir con una nota mínima.',
    descripcion: ['Lee la nota de un examen, entre 0 y 100. El examen se aprueba con 60 o más.'],
    entrada: 'Una línea con un entero entre 0 y 100.',
    salida: 'Una línea con la palabra Aprobado o Reprobado.',
    ejemplos: [{ entrada: '60', salida: 'Aprobado' }, { entrada: '59', salida: 'Reprobado' }],
  },
  {
    numero: 19, tema: 'condicionales', nivel: 3,
    titulo: 'El mayor de tres',
    resumen: 'Comparaciones encadenadas.',
    descripcion: ['Lee tres números enteros y muestra el mayor de ellos. Si el mayor se repite, se muestra una sola vez.'],
    entrada: 'Tres líneas, cada una con un número entero.',
    salida: 'Una línea con el mayor de los tres.',
    ejemplos: [{ entrada: '3\n9\n5', salida: '9' }, { entrada: '7\n7\n2', salida: '7' }],
  },
  {
    numero: 20, tema: 'condicionales', nivel: 3,
    titulo: 'Año bisiesto',
    resumen: 'Combinar condiciones con Y y con O.',
    descripcion: [
      'Lee un año y determina si es bisiesto.',
      'Un año es bisiesto si es divisible entre 4, salvo los que son divisibles entre 100. Esos solo son bisiestos si además son divisibles entre 400.',
    ],
    entrada: 'Una línea con un entero positivo: el año.',
    salida: 'Una línea con el texto Bisiesto o No bisiesto.',
    ejemplos: [{ entrada: '2024', salida: 'Bisiesto' }, { entrada: '1900', salida: 'No bisiesto' }, { entrada: '2000', salida: 'Bisiesto' }],
  },
  {
    numero: 21, tema: 'condicionales', nivel: 3,
    titulo: 'Tipo de triángulo',
    resumen: 'Clasificar según cuántos lados son iguales.',
    descripcion: [
      'Lee las longitudes de los tres lados de un triángulo y clasifícalo.',
      'Es equilátero si sus tres lados son iguales, isósceles si tiene exactamente dos iguales y escaleno si los tres son distintos.',
    ],
    entrada: 'Tres líneas, cada una con un entero positivo. Siempre forman un triángulo válido.',
    salida: 'Una línea con la palabra Equilatero, Isosceles o Escaleno, sin tildes.',
    ejemplos: [{ entrada: '5\n5\n5', salida: 'Equilatero' }, { entrada: '5\n5\n3', salida: 'Isosceles' }, { entrada: '3\n4\n5', salida: 'Escaleno' }],
  },

  /* ── Selección múltiple ── */
  {
    numero: 22, tema: 'segun', nivel: 2,
    titulo: 'Día de la semana',
    resumen: 'Traducir un número a un nombre.',
    descripcion: ['Lee un número. Si está entre 1 y 7, muestra el día de la semana que le corresponde, empezando por el lunes. Con cualquier otro número, avisa que no es válido.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Una línea con Lunes, Martes, Miercoles, Jueves, Viernes, Sabado o Domingo (sin tildes), o con el texto Dia invalido.',
    ejemplos: [{ entrada: '1', salida: 'Lunes' }, { entrada: '7', salida: 'Domingo' }, { entrada: '9', salida: 'Dia invalido' }],
  },
  {
    numero: 23, tema: 'segun', nivel: 2,
    titulo: 'Calculadora por opciones',
    resumen: 'Un menú que decide qué operación hacer.',
    descripcion: [
      'Lee dos enteros a y b, y después una opción.',
      'Con la opción 1 se suman, con la 2 se resta b de a y con la 3 se multiplican. Cualquier otra opción no es válida.',
    ],
    entrada: 'Tres líneas: el entero a, el entero b y la opción.',
    salida: 'Una línea con el resultado, o con el texto Opcion invalida.',
    ejemplos: [{ entrada: '6\n3\n1', salida: '9' }, { entrada: '6\n3\n2', salida: '3' }, { entrada: '6\n3\n3', salida: '18' }, { entrada: '6\n3\n7', salida: 'Opcion invalida' }],
  },
  {
    numero: 24, tema: 'segun', nivel: 3,
    titulo: 'Días del mes',
    resumen: 'Varios valores que comparten la misma respuesta.',
    descripcion: ['Lee el número de un mes (1 es enero, 12 es diciembre) y muestra cuántos días tiene. Febrero se toma con 28 días.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Una línea con la cantidad de días, o con el texto Mes invalido si el número no está entre 1 y 12.',
    ejemplos: [{ entrada: '2', salida: '28' }, { entrada: '4', salida: '30' }, { entrada: '12', salida: '31' }, { entrada: '13', salida: 'Mes invalido' }],
  },
  {
    numero: 25, tema: 'segun', nivel: 2,
    titulo: 'Vocal o consonante',
    resumen: 'Segun también funciona con letras.',
    descripcion: ['Lee una letra minúscula del alfabeto, sin tilde, e indica si es vocal o consonante.'],
    entrada: 'Una línea con una sola letra minúscula.',
    salida: 'Una línea con la palabra Vocal o Consonante.',
    ejemplos: [{ entrada: 'a', salida: 'Vocal' }, { entrada: 'm', salida: 'Consonante' }],
  },
  {
    numero: 26, tema: 'segun', nivel: 2,
    titulo: 'La nota en palabras',
    resumen: 'Cinco casos y uno por defecto.',
    descripcion: ['Lee una nota entera de 1 a 5 y muestra su equivalente en palabras: 5 es Excelente, 4 es Bueno, 3 es Aceptable, 2 es Insuficiente y 1 es Deficiente.'],
    entrada: 'Una línea con un número entero.',
    salida: 'Una línea con la palabra que corresponde, o con el texto Nota invalida si el número no está entre 1 y 5.',
    ejemplos: [{ entrada: '5', salida: 'Excelente' }, { entrada: '3', salida: 'Aceptable' }, { entrada: '0', salida: 'Nota invalida' }],
  },

  /* ── Ciclos Mientras y Repetir ── */
  {
    numero: 27, tema: 'ciclos-mientras', nivel: 2,
    titulo: 'Contar hasta N',
    resumen: 'Tu primer ciclo con un contador.',
    descripcion: ['Lee un entero N y muestra los números del 1 al N, uno por línea.'],
    entrada: 'Una línea con un entero N mayor o igual que 1.',
    salida: 'N líneas con los números del 1 al N en orden.',
    ejemplos: [{ entrada: '3', salida: '1\n2\n3' }, { entrada: '1', salida: '1' }],
  },
  {
    numero: 28, tema: 'ciclos-mientras', nivel: 2,
    titulo: 'Cuenta regresiva',
    resumen: 'Un contador que baja en lugar de subir.',
    descripcion: ['Lee un entero N y cuenta hacia atrás desde N hasta 1, un número por línea. Al terminar, muestra la palabra Despegue.'],
    entrada: 'Una línea con un entero N mayor o igual que 1.',
    salida: 'N líneas con la cuenta regresiva y una última línea con la palabra Despegue.',
    ejemplos: [{ entrada: '3', salida: '3\n2\n1\nDespegue' }],
  },
  {
    numero: 29, tema: 'ciclos-mientras', nivel: 3,
    titulo: 'Sumar hasta el cero',
    resumen: 'Un ciclo que no sabe cuántos datos vienen.',
    descripcion: ['Lee números enteros, uno tras otro, hasta que llegue un 0. Muestra la suma de todos los que se leyeron. El 0 solo marca el final.'],
    entrada: 'Varias líneas, cada una con un entero. La última línea siempre es 0.',
    salida: 'Una línea con la suma.',
    ejemplos: [{ entrada: '4\n6\n-2\n0', salida: '8' }, { entrada: '0', salida: '0' }],
  },
  {
    numero: 30, tema: 'ciclos-mientras', nivel: 3,
    titulo: 'Cuántas cifras tiene',
    resumen: 'Quitarle cifras a un número hasta que no quede nada.',
    descripcion: ['Lee un entero positivo y muestra cuántas cifras tiene.'],
    entrada: 'Una línea con un entero mayor o igual que 1.',
    salida: 'Una línea con la cantidad de cifras.',
    ejemplos: [{ entrada: '12345', salida: '5' }, { entrada: '7', salida: '1' }],
  },
  {
    numero: 31, tema: 'ciclos-mientras', nivel: 3,
    titulo: 'Suma de cifras',
    resumen: 'Separar las cifras de un número y acumularlas.',
    descripcion: ['Lee un entero positivo y muestra la suma de sus cifras.'],
    entrada: 'Una línea con un entero mayor o igual que 1.',
    salida: 'Una línea con la suma de las cifras.',
    ejemplos: [{ entrada: '123', salida: '6' }, { entrada: '9', salida: '9' }, { entrada: '505', salida: '10' }],
  },
  {
    numero: 32, tema: 'ciclos-mientras', nivel: 4,
    titulo: 'Número al revés',
    resumen: 'Armar un número nuevo cifra por cifra.',
    descripcion: ['Lee un entero positivo y muestra el número que resulta de escribir sus cifras en orden contrario. El número leído nunca termina en 0.'],
    entrada: 'Una línea con un entero mayor o igual que 1 que no termina en 0.',
    salida: 'Una línea con el número invertido.',
    ejemplos: [{ entrada: '123', salida: '321' }, { entrada: '4', salida: '4' }, { entrada: '9051', salida: '1509' }],
    pistaConcepto: 'Si a un número lo multiplicas por 10 le queda un espacio libre al final para sumarle una cifra nueva.',
  },
  {
    numero: 33, tema: 'ciclos-mientras', nivel: 3,
    titulo: 'Clave correcta',
    resumen: 'Repetir hasta que el dato sea el esperado.',
    descripcion: ['La clave de una caja fuerte es 1234. Lee intentos, uno por línea, hasta que llegue la clave correcta. Muestra cuántos intentos se hicieron en total, contando el acertado.'],
    entrada: 'Varias líneas, cada una con un entero. La última línea siempre es 1234.',
    salida: 'Una línea con el texto "Intentos: " seguido de la cantidad.',
    ejemplos: [{ entrada: '1111\n2222\n1234', salida: 'Intentos: 3' }, { entrada: '1234', salida: 'Intentos: 1' }],
  },

  /* ── Ciclo Para ── */
  {
    numero: 34, tema: 'ciclo-para', nivel: 2,
    titulo: 'Tabla de multiplicar',
    resumen: 'Diez vueltas con un formato exacto.',
    descripcion: ['Lee un entero N y muestra su tabla de multiplicar del 1 al 10 con el formato del ejemplo.'],
    entrada: 'Una línea con un entero N.',
    salida: 'Diez líneas con la forma "N x i = resultado", con un espacio a cada lado de la x y del signo igual.',
    ejemplos: [{ entrada: '3', salida: '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30' }],
  },
  {
    numero: 35, tema: 'ciclo-para', nivel: 2,
    titulo: 'Suma del 1 al N',
    resumen: 'Un acumulador dentro de un ciclo.',
    descripcion: ['Lee un entero N y muestra la suma de todos los enteros desde 1 hasta N.'],
    entrada: 'Una línea con un entero N mayor o igual que 1.',
    salida: 'Una línea con la suma.',
    ejemplos: [{ entrada: '5', salida: '15' }, { entrada: '1', salida: '1' }, { entrada: '100', salida: '5050' }],
  },
  {
    numero: 36, tema: 'ciclo-para', nivel: 3,
    titulo: 'Factorial',
    resumen: 'Acumular multiplicaciones.',
    descripcion: ['El factorial de N es el producto de todos los enteros desde 1 hasta N. El factorial de 0 es 1. Lee N y muestra su factorial.'],
    entrada: 'Una línea con un entero N entre 0 y 12.',
    salida: 'Una línea con el factorial de N.',
    ejemplos: [{ entrada: '5', salida: '120' }, { entrada: '0', salida: '1' }, { entrada: '10', salida: '3628800' }],
  },
  {
    numero: 37, tema: 'ciclo-para', nivel: 2,
    titulo: 'Pares hasta N',
    resumen: 'Avanzar de dos en dos.',
    descripcion: ['Lee un entero N y muestra todos los números pares desde 2 hasta N, uno por línea.'],
    entrada: 'Una línea con un entero N mayor o igual que 2.',
    salida: 'Los números pares desde 2 hasta N, en orden y uno por línea.',
    ejemplos: [{ entrada: '7', salida: '2\n4\n6' }, { entrada: '2', salida: '2' }],
  },
  {
    numero: 38, tema: 'ciclo-para', nivel: 3,
    titulo: 'Potencia',
    resumen: 'Multiplicar la base tantas veces como diga el exponente.',
    descripcion: ['Lee una base y un exponente. Calcula la base elevada al exponente usando un ciclo, sin el operador de potencia. Todo número elevado a 0 da 1.'],
    entrada: 'Dos líneas: la base (entero entre 1 y 10) y el exponente (entero entre 0 y 9).',
    salida: 'Una línea con el resultado.',
    ejemplos: [{ entrada: '2\n10', salida: '1024' }, { entrada: '5\n0', salida: '1' }, { entrada: '3\n3', salida: '27' }],
  },
  {
    numero: 39, tema: 'ciclo-para', nivel: 3,
    titulo: 'Múltiplos de tres',
    resumen: 'Contar solo los valores que cumplen una condición.',
    descripcion: ['Lee un entero N y muestra cuántos números entre 1 y N, ambos incluidos, son múltiplos de 3.'],
    entrada: 'Una línea con un entero N mayor o igual que 1.',
    salida: 'Una línea con la cantidad de múltiplos de 3.',
    ejemplos: [{ entrada: '10', salida: '3' }, { entrada: '2', salida: '0' }, { entrada: '30', salida: '10' }],
  },
  {
    numero: 40, tema: 'ciclo-para', nivel: 4,
    titulo: 'Número primo',
    resumen: 'Buscar divisores con un ciclo.',
    descripcion: ['Un número es primo si es mayor que 1 y solo se puede dividir exactamente entre 1 y entre sí mismo. Lee un entero N e indica si es primo.'],
    entrada: 'Una línea con un entero N entre 1 y 10000.',
    salida: 'Una línea con el texto Primo o No primo.',
    ejemplos: [{ entrada: '7', salida: 'Primo' }, { entrada: '9', salida: 'No primo' }, { entrada: '1', salida: 'No primo' }, { entrada: '2', salida: 'Primo' }],
  },

  /* ── Arreglos ── */
  {
    numero: 41, tema: 'arreglos', nivel: 3,
    titulo: 'Al revés',
    resumen: 'Guardar los datos para mostrarlos en otro orden.',
    descripcion: ['Lee N números y muéstralos en el orden contrario al que llegaron.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas, cada una con un entero.',
    salida: 'N líneas con los números en orden inverso.',
    ejemplos: [{ entrada: '3\n1\n2\n3', salida: '3\n2\n1' }, { entrada: '1\n8', salida: '8' }],
  },
  {
    numero: 42, tema: 'arreglos', nivel: 3,
    titulo: 'Suma de un arreglo',
    resumen: 'Recorrer todas las casillas acumulando.',
    descripcion: ['Lee N números, guárdalos en un arreglo y muestra la suma de todos.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas, cada una con un entero.',
    salida: 'Una línea con la suma.',
    ejemplos: [{ entrada: '4\n5\n-2\n7\n10', salida: '20' }, { entrada: '1\n9', salida: '9' }],
  },
  {
    numero: 43, tema: 'arreglos', nivel: 4,
    titulo: 'Mayor y menor',
    resumen: 'Encontrar los dos extremos de una lista.',
    descripcion: ['Lee N números y muestra el mayor y el menor de ellos.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas, cada una con un entero.',
    salida: 'Dos líneas: primero el mayor y luego el menor.',
    ejemplos: [{ entrada: '5\n3\n9\n-1\n4\n9', salida: '9\n-1' }, { entrada: '1\n6', salida: '6\n6' }],
  },
  {
    numero: 44, tema: 'arreglos', nivel: 4,
    titulo: 'Cuántas veces aparece',
    resumen: 'Contar coincidencias dentro de un arreglo.',
    descripcion: ['Lee N números y después un número X. Muestra cuántas veces aparece X entre los N números.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas con un entero cada una, y una última línea con X.',
    salida: 'Una línea con la cantidad de apariciones de X.',
    ejemplos: [{ entrada: '5\n2\n7\n2\n2\n9\n2', salida: '3' }, { entrada: '3\n1\n1\n1\n5', salida: '0' }],
  },
  {
    numero: 45, tema: 'arreglos', nivel: 4,
    titulo: 'Buscar la posición',
    resumen: 'Recorrer hasta dar con el primer acierto.',
    descripcion: ['Lee N números y después un número X. Muestra la posición de la primera vez que aparece X, contando desde 1. Si X no está, muestra -1.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas con un entero cada una, y una última línea con X.',
    salida: 'Una línea con la posición de la primera aparición, o -1.',
    ejemplos: [{ entrada: '4\n8\n3\n5\n3\n3', salida: '2' }, { entrada: '4\n8\n3\n5\n3\n6', salida: '-1' }],
  },
  {
    numero: 46, tema: 'arreglos', nivel: 5,
    titulo: 'Por encima del promedio',
    resumen: 'Dos recorridos: uno para calcular y otro para comparar.',
    descripcion: ['Lee N números y muestra cuántos de ellos son estrictamente mayores que el promedio de todos.'],
    entrada: 'La primera línea trae N (entre 1 y 100). Siguen N líneas, cada una con un entero.',
    salida: 'Una línea con la cantidad de números mayores que el promedio.',
    ejemplos: [{ entrada: '4\n1\n2\n3\n10', salida: '1' }, { entrada: '3\n5\n5\n5', salida: '0' }, { entrada: '5\n1\n2\n3\n4\n5', salida: '2' }],
  },

  /* ── Matrices ── */
  {
    numero: 47, tema: 'matrices', nivel: 4,
    titulo: 'Suma de una matriz',
    resumen: 'Dos ciclos anidados y un acumulador.',
    descripcion: ['Lee una matriz de F filas y C columnas y muestra la suma de todos sus elementos.'],
    entrada: 'Las dos primeras líneas traen F y C (entre 1 y 10). Siguen F por C líneas con un entero cada una: los elementos fila por fila, de izquierda a derecha.',
    salida: 'Una línea con la suma.',
    ejemplos: [{ entrada: '2\n3\n1\n2\n3\n4\n5\n6', salida: '21' }, { entrada: '1\n1\n-4', salida: '-4' }],
  },
  {
    numero: 48, tema: 'matrices', nivel: 5,
    titulo: 'Suma por filas',
    resumen: 'Un resultado por cada fila.',
    descripcion: ['Lee una matriz de F filas y C columnas y muestra la suma de cada fila, empezando por la primera.'],
    entrada: 'Las dos primeras líneas traen F y C (entre 1 y 10). Siguen F por C líneas con un entero cada una: los elementos fila por fila, de izquierda a derecha.',
    salida: 'F líneas: la suma de cada fila, en orden.',
    ejemplos: [{ entrada: '2\n3\n1\n2\n3\n4\n5\n6', salida: '6\n15' }, { entrada: '2\n1\n7\n-7', salida: '7\n-7' }],
  },
  {
    numero: 49, tema: 'matrices', nivel: 5,
    titulo: 'Diagonal principal',
    resumen: 'Las casillas donde la fila y la columna coinciden.',
    descripcion: ['Lee una matriz cuadrada de N filas y N columnas y muestra la suma de los elementos de su diagonal principal.'],
    entrada: 'La primera línea trae N (entre 1 y 10). Siguen N por N líneas con un entero cada una: los elementos fila por fila, de izquierda a derecha.',
    salida: 'Una línea con la suma de la diagonal principal.',
    ejemplos: [{ entrada: '3\n1\n2\n3\n4\n5\n6\n7\n8\n9', salida: '15' }, { entrada: '2\n4\n0\n0\n-1', salida: '3' }],
  },
  {
    numero: 50, tema: 'matrices', nivel: 5,
    titulo: 'El mayor y dónde está',
    resumen: 'Recordar el valor y también su ubicación.',
    descripcion: ['Lee una matriz de F filas y C columnas. Muestra su elemento mayor, y la fila y la columna donde está, contando desde 1. Si el mayor se repite, se toma el primero que aparece al leer la matriz.'],
    entrada: 'Las dos primeras líneas traen F y C (entre 1 y 10). Siguen F por C líneas con un entero cada una: los elementos fila por fila, de izquierda a derecha.',
    salida: 'Tres líneas: el elemento mayor, su fila y su columna.',
    ejemplos: [{ entrada: '2\n3\n3\n8\n1\n8\n2\n5', salida: '8\n1\n2' }, { entrada: '2\n2\n-4\n-9\n-1\n-7', salida: '-1\n2\n1' }],
  },
];

// Niveles del módulo, en el orden del slider. Los colores son los de Ad-Hoc
// y Estructuras de Datos del catálogo (problemsData.js); el tercero va en negro.
// `codigo` es el adorno de la tarjeta: un fragmento de PSeInt, sin relación
// con ningún ejercicio.
export const NIVELES_FUNDAMENTOS = [
  {
    slug: 'fundamentos',
    n: 1,
    titulo: 'Fundamentos de programación',
    texto: 'Ejercicios cortos para aprender cada instrucción de PSeInt, de lo más simple a matrices.',
    color: { bg: '#F97110', ink: '#fff', bgSuave: '#FF8936', inkSuave: '#000' },
    ejercicios: EJERCICIOS,
    logros: LOGROS,
    codigo: ['Algoritmo saludo\n    Escribir "Hola"\nFinAlgoritmo', 'Si nota >= 30 Entonces\n    Escribir "Bien"\nFinSi'],
  },
  {
    slug: 'practica',
    n: 2,
    titulo: 'Práctica de fundamentos',
    texto: 'Los mismos temas con enunciados más largos: hay que leer con atención y decidir qué hacer con los datos.',
    color: { bg: '#E10E15', ink: '#fff', bgSuave: '#FF4249', inkSuave: '#fff' },
    ejercicios: EJERCICIOS_PRACTICA,
    logros: LOGROS_PRACTICA,
    codigo: ['Mientras n > 0 Hacer\n    suma <- suma + n MOD 10\n    n <- trunc(n / 10)\nFinMientras', 'Para f <- 1 Hasta 3 Hacer\n    Leer tabla[f, c]\nFinPara'],
  },
  {
    slug: 'avanzado',
    n: 3,
    titulo: 'Programación avanzada',
    texto: '¡Muy pronto!',
    color: { bg: '#000', ink: '#fff', bgSuave: '#000', inkSuave: '#fff' },
    ejercicios: [],
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

/** Temas con ejercicios en ese nivel, cada uno con su cantidad. */
export const temasDeNivel = (nivel) => TEMAS
  .map((t) => ({ ...t, total: nivel.ejercicios.filter((e) => e.tema === t.slug).length }))
  .filter((t) => t.total > 0);

/** Un ejercicio se identifica por su nivel y su número dentro de ese nivel. */
export const buscarEjercicioDe = (nivelSlug, numero) =>
  buscarNivel(nivelSlug)?.ejercicios.find((e) => String(e.numero) === String(numero));
