// Explicación corta para cada número de error del PSeInt oficial (borrador: textos por aprobar).

const CIERRES = 'Cada bloque que abres se cierra con su Fin: FinSi, FinMientras, FinPara, FinSegun, Hasta Que o FinAlgoritmo.';
const TIPOS = 'Estás operando un texto como si fuera un número, o al revés. Revisa qué guarda cada variable.';
const OPERANDO = 'Falta un valor o un signo en la expresión. Si usaste y, o, no o mod como nombre de variable, cámbialo: son palabras de PSeInt.';

const EXPLICACIONES = {
  33: 'Cada opción del Segun termina en dos puntos, por ejemplo 1: Escribir "Lunes".',
  36: 'Cada «(» o «[» necesita su pareja de cierre.',
  37: 'Cada texto va entre dos comillas: "así".',
  43: 'Todo el código va entre Algoritmo y FinAlgoritmo.',
  106: 'PSeInt no reconoce esa instrucción. Revisa cómo está escrita: Escribir, Leer, Si, Mientras, Para…',
  114: CIERRES,
  115: CIERRES,
  116: CIERRES,
  117: CIERRES,
  118: CIERRES,
  119: CIERRES,
  207: 'Solo se pueden comparar valores del mismo tipo: números con números, textos con textos.',
  213: TIPOS,
  293: TIPOS,
  294: TIPOS,
  295: TIPOS,
  230: OPERANDO,
  234: OPERANDO,
  239: OPERANDO,
  304: OPERANDO,
  305: OPERANDO,
  296: 'Estás dividiendo entre cero. Revisa con qué valor divides antes de hacerlo.',
  298: 'MOD solo funciona con números enteros.',
  303: 'Esa casilla no existe: la primera es la 1 y la última es el tamaño del arreglo.',
};

export const explicarError = (numero) =>
  EXPLICACIONES[numero] ?? 'Revisa esa línea con calma: compárala con los ejemplos del panel del gato.';
