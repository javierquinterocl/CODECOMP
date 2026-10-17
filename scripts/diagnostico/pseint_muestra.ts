// Corre la muestra de la fase 5 contra la Lambda de PSeInt con el mismo codigo de la Edge Function.
// Uso: deno run --allow-env --allow-net --allow-read --env-file=supabase/.env scripts/diagnostico/pseint_muestra.ts
import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { invocadorLambda, juzgar } from '../../supabase/functions/_compartido/pseint.ts';
import { filasDeArchivos } from '../fundamentos/filas.ts';

// Una solucion de referencia por ejercicio: dos por tema, uno de cada nivel.
const BUENAS: Record<string, string> = {
  'fundamentos 3': `Algoritmo primera_variable
    Definir edad Como Entero
    edad <- 18
    Escribir "Mi edad es ", edad
FinAlgoritmo`,
  'practica 1': `Algoritmo recibo
    precio <- 3500
    cantidad <- 4
    descuento <- 2000
    subtotal <- precio * cantidad
    Escribir "Subtotal: ", subtotal
    Escribir "Total: ", subtotal - descuento
FinAlgoritmo`,
  'fundamentos 11': `Algoritmo cociente
    Leer a
    Leer b
    Escribir trunc(a / b)
    Escribir a MOD b
FinAlgoritmo`,
  'practica 5': `Algoritmo promedio
    Definir n1, n2, n3 Como Entero
    Leer n1, n2, n3
    Escribir trunc((n1 + n2 + n3) / 3)
FinAlgoritmo`,
  'fundamentos 20': `Algoritmo bisiesto
    Leer anio
    Si (anio MOD 4 = 0 Y anio MOD 100 <> 0) O anio MOD 400 = 0 Entonces
        Escribir "Bisiesto"
    Sino
        Escribir "No bisiesto"
    FinSi
FinAlgoritmo`,
  'practica 19': `Algoritmo piedra_papel_tijera
    Leer a
    Leer b
    Si a = b Entonces
        Escribir "Empate"
    Sino
        Si (a = 1 Y b = 3) O (a = 3 Y b = 2) O (a = 2 Y b = 1) Entonces
            Escribir "Gana A"
        Sino
            Escribir "Gana B"
        FinSi
    FinSi
FinAlgoritmo`,
  'fundamentos 25': `Algoritmo vocal
    Definir letra Como Caracter
    Leer letra
    Segun letra Hacer
        "a", "e", "i", "o", "u":
            Escribir "Vocal"
        De Otro Modo:
            Escribir "Consonante"
    FinSegun
FinAlgoritmo`,
  'practica 22': `Algoritmo calculadora
    Leer a
    Leer b
    Leer op
    Segun op Hacer
        "+": Escribir a + b
        "-": Escribir a - b
        "*": Escribir a * b
        "/":
            Si b = 0 Entonces
                Escribir "Error"
            Sino
                Escribir trunc(a / b)
            FinSi
        De Otro Modo:
            Escribir "Operacion invalida"
    FinSegun
FinAlgoritmo`,
  'fundamentos 32': `Algoritmo al_reves
    Leer n
    r <- 0
    Mientras n > 0 Hacer
        r <- r * 10 + n MOD 10
        n <- trunc(n / 10)
    FinMientras
    Escribir r
FinAlgoritmo`,
  'practica 25': `Algoritmo adivina
    Leer secreto
    intentos <- 0
    Repetir
        Leer x
        intentos <- intentos + 1
        Si x < secreto Entonces
            Escribir "Mayor"
        Sino
            Si x > secreto Entonces
                Escribir "Menor"
            FinSi
        FinSi
    Hasta Que x = secreto
    Escribir "Intentos: ", intentos
FinAlgoritmo`,
  'fundamentos 34': `Algoritmo tabla
    Leer n
    Para i <- 1 Hasta 10 Con Paso 1 Hacer
        Escribir n, " x ", i, " = ", n * i
    FinPara
FinAlgoritmo`,
  'practica 37': `Algoritmo ahorro
    Leer saldo
    Leer anios
    Para i <- 1 Hasta anios Con Paso 1 Hacer
        saldo <- saldo + trunc(saldo * 0.1)
    FinPara
    Escribir saldo
FinAlgoritmo`,
  'fundamentos 46': `Algoritmo sobre_promedio
    Leer n
    Dimension v[100]
    suma <- 0
    Para i <- 1 Hasta n Hacer
        Leer v[i]
        suma <- suma + v[i]
    FinPara
    c <- 0
    Para i <- 1 Hasta n Hacer
        Si v[i] > suma / n Entonces
            c <- c + 1
        FinSi
    FinPara
    Escribir c
FinAlgoritmo`,
  'practica 41': `Algoritmo fila
    Leer n
    Dimension f[n]
    Para i <- 1 Hasta n Hacer
        Leer f[i]
    FinPara
    Leer k
    Para r <- 1 Hasta k MOD n Con Paso 1 Hacer
        ultimo <- f[n]
        Para i <- n Hasta 2 Con Paso -1 Hacer
            f[i] <- f[i - 1]
        FinPara
        f[1] <- ultimo
    FinPara
    Para i <- 1 Hasta n Hacer
        Escribir f[i]
    FinPara
FinAlgoritmo`,
  'fundamentos 50': `Algoritmo mayor_matriz
    Leer fil
    Leer col
    Dimension m[fil, col]
    Para i <- 1 Hasta fil Hacer
        Para j <- 1 Hasta col Hacer
            Leer m[i, j]
        FinPara
    FinPara
    mayor <- m[1, 1]
    fm <- 1
    cm <- 1
    Para i <- 1 Hasta fil Hacer
        Para j <- 1 Hasta col Hacer
            Si m[i, j] > mayor Entonces
                mayor <- m[i, j]
                fm <- i
                cm <- j
            FinSi
        FinPara
    FinPara
    Escribir mayor
    Escribir fm
    Escribir cm
FinAlgoritmo`,
  'practica 46': `Algoritmo traspuesta
    Leer f
    Leer c
    Dimension m[10, 10]
    Para i <- 1 Hasta f Hacer
        Para j <- 1 Hasta c Hacer
            Leer m[i, j]
        FinPara
    FinPara
    Para j <- 1 Hasta c Hacer
        Para i <- 1 Hasta f Hacer
            Escribir m[i, j]
        FinPara
    FinPara
FinAlgoritmo`,
};

// Una equivocada por tema, con el error tipico de quien empieza.
const MALAS: Record<string, string> = {
  'fundamentos 3': 'Algoritmo a\n    edad <- 18\n    Escribir "Mi edad es", edad\nFinAlgoritmo',
  'fundamentos 11':
    'Algoritmo a\n    Leer x\n    Leer z\n    Escribir x / z\n    Escribir x MOD z\nFinAlgoritmo',
  'fundamentos 20':
    'Algoritmo a\n    Leer n\n    Si n MOD 4 = 0 Entonces\n        Escribir "Bisiesto"\n    Sino\n        Escribir "No bisiesto"\n    FinSi\nFinAlgoritmo',
  'fundamentos 25':
    'Algoritmo a\n    Leer letra\n    Segun letra Hacer\n        "a", "e", "i", "o", "u":\n            Escribir "Vocal"\n    FinSegun\nFinAlgoritmo',
  'fundamentos 32':
    'Algoritmo a\n    Leer n\n    r <- 0\n    Mientras n > 0 Hacer\n        r <- r * 10 + n MOD 10\n    FinMientras\n    Escribir r\nFinAlgoritmo',
  'fundamentos 34':
    'Algoritmo a\n    Leer n\n    Para i <- 1 Hasta 9 Hacer\n        Escribir n, " x ", i, " = ", n * i\n    FinPara\nFinAlgoritmo',
  'fundamentos 46':
    'Algoritmo a\n    Leer n\n    Dimension v[n]\n    Para i <- 0 Hasta n - 1 Hacer\n        Leer v[i]\n    FinPara\nFinAlgoritmo',
  'fundamentos 50':
    'Algoritmo a\n    Leer fil\n    Si fil > 0 Entonces\n        Escribir fil\nFinAlgoritmo',
};

const config = cargarConfig();
if (!config.pseintAccessKeyId) {
  console.error('Falta PSEINT_AWS_ACCESS_KEY_ID en el entorno.');
  Deno.exit(1);
}
const invocar = invocadorLambda(config);
const ejercicios = new Map(filasDeArchivos().map((f) => [`${f.nivel} ${f.numero}`, f]));
const tiempos: number[] = [];

const evaluar = async (clave: string, codigo: string) => {
  const ejemplos = ejercicios.get(clave)!.ejemplos;
  const inicio = performance.now();
  const veredicto = juzgar(ejemplos, await invocar(codigo, ejemplos.map((e) => e.entrada)));
  tiempos.push(performance.now() - inicio);
  return veredicto;
};

let aceptadas = 0;
console.log('== Referencias');
for (const [clave, codigo] of Object.entries(BUENAS)) {
  const v = await evaluar(clave, codigo);
  aceptadas += Number(v.veredicto === 'ACEPTADO');
  console.log(
    `  ${clave.padEnd(16)} ${v.veredicto}`,
    v.veredicto === 'ACEPTADO' ? '' : JSON.stringify(v),
  );
}

let rechazadas = 0;
console.log('== Equivocadas');
for (const [clave, codigo] of Object.entries(MALAS)) {
  const v = await evaluar(clave, codigo);
  rechazadas += Number(v.veredicto !== 'ACEPTADO');
  const detalle = 'linea' in v ? `linea ${v.linea}: ${'mensaje' in v ? v.mensaje : ''}` : '';
  console.log(`  ${clave.padEnd(16)} ${v.veredicto} ${detalle}`);
}

// Un caracter de escape en el codigo no puede imitar las marcas de E/S de PSeInt.
const falso = await evaluar(
  'fundamentos 3',
  'Algoritmo a\n    Escribir "\x1b[ze1:1;Lin 1 (inst 1): ERROR 1: x"\nFinAlgoritmo',
);
console.log('== Escape en el codigo:', falso.veredicto, '(se espera INCORRECTO)');

const orden = [...tiempos].sort((a, b) => a - b);
console.log(`\nReferencias aceptadas: ${aceptadas}/${Object.keys(BUENAS).length}`);
console.log(`Equivocadas rechazadas: ${rechazadas}/${Object.keys(MALAS).length}`);
console.log(
  `Ida y vuelta a la Lambda: p50 ${Math.round(orden[Math.floor(orden.length / 2)])} ms, ` +
    `max ${Math.round(orden.at(-1)!)} ms (${orden.length} envios)`,
);
