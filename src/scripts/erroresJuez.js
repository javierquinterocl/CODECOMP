// Explicaciones de los veredictos del juez de Problemas (Judge0) para el chat de errores y la caja
// del veredicto. Reconoce los errores más comunes de cada lenguaje por su mensaje. Textos borrador.

const TITULOS = {
  WRONG_ANSWER: 'Respuesta incorrecta',
  TIME_LIMIT_EXCEEDED: 'Tiempo excedido',
  RUNTIME_ERROR: 'Error de ejecución',
  COMPILATION_ERROR: 'Error de compilación',
};

const GENERALES = {
  WRONG_ANSWER: 'Tu programa terminó, pero su salida no coincide con la esperada. Revisa el formato (espacios, saltos de línea, mayúsculas), los casos borde (n = 1, ceros, negativos, todos iguales) y que ningún número se desborde.',
  TIME_LIMIT_EXCEEDED: 'Tu programa tardó más del límite. Calcula cuántas operaciones hace tu idea con el n más grande del enunciado: si pasa de unas 10⁸, necesitas un enfoque más rápido. También revisa que ningún ciclo se quede sin terminar.',
  RUNTIME_ERROR: 'Tu programa se detuvo a la mitad. Suele ser un índice fuera del arreglo, una división entre cero, una recursión demasiado profunda o leer la entrada con un formato distinto al del enunciado.',
  COMPILATION_ERROR: 'El compilador no pudo entender tu código, así que no se ejecutó ningún caso. Lee la primera línea del error: dice en qué línea está el problema.',
};

// Patrón del mensaje → explicación concreta. El primero que coincide gana.
const PATRONES = [
  [/expected ['‘]?;['’]? before|';' expected/i, 'Falta un punto y coma (;) al final de una instrucción, normalmente en la línea anterior a la que marca el error.'],
  [/was not declared in this scope|cannot find symbol|is not defined|NameError/i, 'Usas un nombre que no existe: una variable sin declarar, un nombre mal escrito (mayúsculas cuentan) o una librería que no importaste.'],
  [/expected ['‘]?\}['’]?|reached end of file while parsing|expected declaration|Unexpected end of input/i, 'Falta cerrar una llave } o un paréntesis. Cuenta que cada { tenga su }.'],
  [/IndentationError|unexpected indent|unindent does not match/i, 'Error de sangría en Python: las líneas de un mismo bloque deben empezar con los mismos espacios. No mezcles tabuladores con espacios.'],
  [/should be declared in a file named/i, 'En Java la clase pública debe llamarse Main (public class Main) para este juez.'],
  [/SyntaxError/i, 'Hay un error de escritura: revisa paréntesis, comillas, dos puntos al final de if/for/while en Python y que no falte ningún operador.'],
  [/no match for ['‘]?operator|invalid operands|incompatible types|TypeError/i, 'Estás mezclando tipos que no combinan, por ejemplo sumar un texto con un número o comparar un vector con un entero.'],
  [/IndexError|ArrayIndexOutOfBounds|index out of range|out_of_range|StringIndexOutOfBounds/i, 'Accediste a una posición que no existe en un arreglo o cadena. Recuerda que los índices van de 0 a n − 1.'],
  [/ZeroDivisionError|ArithmeticException|division by zero|SIGFPE|Floating point exception/i, 'Hubo una división (o un módulo) entre cero. Revisa qué pasa cuando el divisor puede valer 0.'],
  [/RecursionError|maximum recursion depth|StackOverflowError|SIGSEGV|Segmentation fault/i, 'La memoria de la pila se acabó o se leyó una posición inválida: una recursión demasiado profunda o un arreglo más pequeño de lo necesario.'],
  [/ValueError|NumberFormatException|invalid literal for int/i, 'Intentaste convertir a número algo que no lo es: casi siempre es leer la entrada con un formato distinto (varios números en una línea, líneas vacías).'],
  [/EOFError|NoSuchElementException/i, 'Intentaste leer más datos de los que trae la entrada. Revisa cuántos números lees y en qué orden.'],
  [/NullPointerException|Cannot read propert/i, 'Usaste un objeto que no existe (null o undefined). Inicialízalo antes de usarlo.'],
];

/** Primera línea útil del mensaje del compilador o del error, recortada. */
const primeraLinea = (texto) => {
  const lineas = String(texto ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('^'));
  // La que dice "error" es la que importa; si no hay, la última (en Python el tipo de error va al final).
  return (lineas.find((l) => /error/i.test(l)) ?? lineas.at(-1) ?? '').slice(0, 180);
};

/** El mensaje técnico del juez: salida del compilador o error de ejecución. */
export const mensajeDelJuez = (resultado) => String(resultado?.compile_output || resultado?.stderr || resultado?.errorDetails || '').trim();

/**
 * Explicación de un envío fallido: { titulo, texto, oficial }, o null si se aceptó o el veredicto
 * no es de los que se explican.
 */
export const explicarEnvio = (resultado) => {
  const veredicto = resultado?.verdict;
  if (!TITULOS[veredicto]) return null;
  const mensaje = mensajeDelJuez(resultado);
  const concreto = mensaje && PATRONES.find(([patron]) => patron.test(mensaje))?.[1];
  // Si no compila no se ejecuta ningún caso: no tiene sentido decir en cuál falló.
  const caso = resultado.casoFallido > 0 && veredicto !== 'COMPILATION_ERROR' ? ` en el caso ${resultado.casoFallido}` : '';
  return {
    titulo: `${TITULOS[veredicto]}${caso}`,
    texto: concreto || GENERALES[veredicto],
    oficial: veredicto === 'COMPILATION_ERROR' || veredicto === 'RUNTIME_ERROR' ? primeraLinea(mensaje) : '',
  };
};
