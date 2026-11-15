// Lecciones de Principiante, Ad-Hoc, Estructuras de datos y Geometría (misma forma que contenido.js).
// Textos borrador: los decide el equipo.

import {
  PSEUDO_PARENTESIS, PSEUDO_PATRON, PSEUDO_RECORRIDO,
  pasosParentesis, pasosPatron, pasosRecorrido,
  validarParentesis, validarPatron, validarRecorrido,
} from './pasosBase.js';

export const NUEVAS = {
  principiante: {
    tecnica: 'Recorrer acumulando',
    resumen: 'Leer n datos y, en una sola pasada, calcular lo que pide el problema: suma, máximo, conteos.',
    teoria: [
      'La mayoría de los primeros problemas tienen la misma forma: leer una lista de datos y responder algo sobre ella. La técnica es recorrerla una sola vez llevando "acumuladores": variables que resumen lo visto hasta ahora.',
      'Para la suma, el acumulador empieza en 0 y se le suma cada dato. Para el máximo, empieza con el primer dato y se reemplaza cuando aparece uno mayor. Para contar, empieza en 0 y sube cuando el dato cumple una condición.',
      'Cuidado con dos detalles: el valor inicial (el máximo no puede empezar en 0 si hay negativos) y el tipo (la suma de 10⁵ números de 10⁹ necesita long long).',
    ],
    cuando: [
      'Te piden suma, promedio, máximo, mínimo o cuántos cumplen algo.',
      'Basta mirar cada dato una vez, sin compararlo con todos los demás.',
      'n puede ser grande: una sola pasada es O(n).',
    ],
    complejidad: { tiempo: 'O(n)', espacio: 'O(1)', nota: 'Ni siquiera hace falta guardar los datos: se procesan al leerlos.' },
    ejemplo: {
      titulo: 'Suma y mayor',
      enunciado: 'Se te da n (1 ≤ n ≤ 10⁵) y luego n enteros entre −10⁹ y 10⁹. Imprime su suma y el mayor de ellos.',
      pasos: [
        'Leemos n y el primer número; la suma empieza en ese número y el mayor también.',
        'Por cada número que sigue, lo sumamos y, si es mayor que el mayor actual, lo reemplazamos.',
        'Usamos long long para la suma: puede llegar a 10¹⁴.',
        'Al final imprimimos los dos acumuladores.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long suma = 0, mayor = LLONG_MIN;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        suma += x;
        mayor = max(mayor, x);
    }
    cout << suma << " " << mayor << endl;
    return 0;
}`,
      python: `n = int(input())
a = list(map(int, input().split()))
print(sum(a), max(a))`,
    },
    visual: {
      tipo: 'arreglo', pseudo: PSEUDO_RECORRIDO,
      campos: [{ id: 'datos', label: 'Números', inicial: '4 -2 9 7 -5 9 3', ayuda: 'Entre 1 y 12 enteros.' }],
      generar: ({ datos }) => {
        const v = validarRecorrido(datos);
        return v.error ? v : { pasos: pasosRecorrido(v.valor) };
      },
    },
    preguntas: [
      { pregunta: 'Si todos los números son negativos, ¿qué pasa si el máximo empieza en 0?', opciones: ['Funciona igual', 'Imprime 0, que no está en la lista', 'Da error de compilación', 'Imprime el menor'], correcta: 1, explicacion: 'Ningún negativo supera a 0, así que el máximo nunca cambia. Por eso empieza con el primer dato o con el menor valor posible.' },
      { pregunta: 'Con n = 10⁵ números de hasta 10⁹, ¿qué tipo necesita la suma en C++?', opciones: ['int', 'long long', 'char', 'bool'], correcta: 1, explicacion: 'La suma puede llegar a 10¹⁴, mucho más que el límite de int (unos 2·10⁹).' },
      { pregunta: '¿Cuántas veces se mira cada número?', opciones: ['Una', 'n veces', 'Dos', 'log n'], correcta: 0, explicacion: 'Cada número se usa una sola vez para actualizar los acumuladores: por eso es O(n).' },
    ],
  },

  'ad-hoc': {
    tecnica: 'Encontrar el patrón con casos pequeños',
    resumen: 'Resolver a mano los casos chicos, ver cómo crecen las respuestas y convertirlo en fórmula.',
    teoria: [
      'Un problema Ad-Hoc no se parece a ningún algoritmo conocido: hay que inventar la idea. La forma más confiable de encontrarla es experimentar con casos pequeños, como haría un científico.',
      'Resuelve a mano para n = 1, 2, 3, 4, 5 y pon las respuestas en una tabla. Luego mira la columna de diferencias entre una respuesta y la siguiente: si las diferencias crecen de uno en uno, hay un n²; si se duplican, hay un 2ⁿ; si se repiten, hay un ciclo.',
      'Con la fórmula en la mano, compruébala con un caso que no usaste para adivinarla. Ahora respondes en O(1) aunque n sea 10¹⁸, donde simular sería imposible.',
    ],
    cuando: [
      'n es enorme (10⁹ o 10¹⁸) y simular no alcanza.',
      'El enunciado describe un proceso o un conteo que crece con n.',
      'No reconoces ningún algoritmo: experimenta primero.',
    ],
    complejidad: { tiempo: 'O(1)', espacio: 'O(1)', nota: 'Una vez hallada la fórmula, la respuesta sale de una cuenta.' },
    ejemplo: {
      titulo: 'Apretones de mano',
      enunciado: 'En una reunión hay n personas (1 ≤ n ≤ 10⁹) y cada una le da la mano exactamente una vez a cada otra. ¿Cuántos apretones hay?',
      pasos: [
        'Casos chicos: con 1 persona, 0; con 2, 1; con 3, 3; con 4, 6; con 5, 10.',
        'Las diferencias son 1, 2, 3, 4: la persona número n saluda a las n − 1 que ya estaban.',
        'Entonces la respuesta es 0 + 1 + … + (n − 1) = n·(n − 1)/2.',
        'Con n = 10⁹ el resultado pasa de int: usamos long long.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;
    cout << n * (n - 1) / 2 << endl;
    return 0;
}`,
      python: `n = int(input())
print(n * (n - 1) // 2)`,
    },
    visual: {
      tipo: 'tabla', pseudo: PSEUDO_PATRON,
      campos: [{ id: 'N', label: 'Hasta N personas', inicial: '6', ayuda: 'Entre 3 y 10.' }],
      generar: ({ N }) => {
        const v = validarPatron(N);
        return v.error ? v : { pasos: pasosPatron(v.valor) };
      },
    },
    preguntas: [
      { pregunta: 'Si las diferencias entre respuestas consecutivas son 2, 4, 8, 16…, ¿qué tipo de fórmula sospechas?', opciones: ['Lineal (n)', 'Cuadrática (n²)', 'Exponencial (2ⁿ)', 'Constante'], correcta: 2, explicacion: 'Cuando las diferencias se duplican, la respuesta misma crece como una potencia de 2.' },
      { pregunta: '¿Por qué hay que comprobar la fórmula con un caso extra?', opciones: ['Porque el juez lo exige', 'Porque varios patrones distintos coinciden en los primeros casos', 'Porque así es más rápida', 'No hace falta'], correcta: 1, explicacion: 'Con pocos datos se pueden ajustar fórmulas equivocadas; un caso nuevo confirma o descarta la idea.' },
      { pregunta: 'Con n = 10⁹ personas, ¿por qué no se simulan los apretones?', opciones: ['Porque serían unos 5·10¹⁷ pasos', 'Porque no cabe en memoria', 'Sí se puede simular', 'Porque n es negativo'], correcta: 0, explicacion: 'Contar uno por uno haría unos 5·10¹⁷ operaciones; la fórmula da la respuesta al instante.' },
    ],
  },

  'estructuras-de-datos': {
    tecnica: 'Paréntesis balanceados con una pila',
    resumen: 'Usar una pila para emparejar lo que se abre con lo que se cierra.',
    teoria: [
      'Una expresión como "([]{})" está bien balanceada si cada símbolo que abre se cierra con su pareja y en el orden correcto. Contar no basta: "([)]" tiene la misma cantidad de cada uno y está mal.',
      'La pila resuelve el orden: cada símbolo que abre se apila; cada símbolo que cierra debe emparejar con el que está arriba de la pila, que es el último que se abrió. Si empareja, se desapila; si no, o si la pila está vacía, está mal.',
      'Al terminar, la pila debe quedar vacía: si sobra algo, quedaron símbolos sin cerrar. Esta misma idea sirve para evaluar expresiones, validar etiquetas HTML o encontrar el siguiente elemento mayor.',
    ],
    cuando: [
      'Hay cosas que se abren y se cierran en orden (paréntesis, etiquetas, bloques).',
      'Necesitas recordar "lo último que quedó pendiente".',
      'El problema pide procesar de izquierda a derecha deshaciendo pasos.',
    ],
    complejidad: { tiempo: 'O(n)', espacio: 'O(n)', nota: 'Cada símbolo se apila y desapila como mucho una vez.' },
    ejemplo: {
      titulo: '¿Está balanceado?',
      enunciado: 'Dada una cadena de hasta 10⁵ caracteres formada solo por ( ) [ ] { }, imprime SI si está bien balanceada y NO en otro caso.',
      pasos: [
        'Recorremos la cadena con una pila vacía.',
        'Si el carácter abre, lo apilamos.',
        'Si cierra: si la pila está vacía o el de arriba no es su pareja, respondemos NO; si es su pareja, desapilamos.',
        'Al final respondemos SI solo si la pila quedó vacía.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    map<char, char> pareja = {{')', '('}, {']', '['}, {'}', '{'}};
    stack<char> pila;
    for (char c : s) {
        if (!pareja.count(c)) pila.push(c);
        else if (pila.empty() || pila.top() != pareja[c]) {
            cout << "NO" << endl;
            return 0;
        } else pila.pop();
    }
    cout << (pila.empty() ? "SI" : "NO") << endl;
    return 0;
}`,
      python: `s = input().strip()
pareja = {')': '(', ']': '[', '}': '{'}
pila = []
ok = True
for c in s:
    if c not in pareja:
        pila.append(c)
    elif not pila or pila[-1] != pareja[c]:
        ok = False
        break
    else:
        pila.pop()
print("SI" if ok and not pila else "NO")`,
    },
    visual: {
      tipo: 'pila', pseudo: PSEUDO_PARENTESIS,
      campos: [{ id: 's', label: 'Símbolos', inicial: '{[()()]}', ayuda: 'Solo ( ) [ ] { }, hasta 16. Prueba también ([)].' }],
      generar: ({ s }) => {
        const v = validarParentesis(s);
        return v.error ? v : { pasos: pasosParentesis(v.valor) };
      },
    },
    preguntas: [
      { pregunta: '¿Por qué contar aperturas y cierres no basta?', opciones: ['Sí basta', 'Porque "([)]" tiene los mismos conteos y está mal', 'Porque es lento', 'Porque hay negativos'], correcta: 1, explicacion: 'El orden importa: la pila verifica que cada cierre corresponda al último que se abrió.' },
      { pregunta: 'Al leer «]», arriba de la pila hay «(». ¿Qué hacemos?', opciones: ['Desapilar', 'Apilar «]»', 'Responder NO', 'Ignorarlo'], correcta: 2, explicacion: '«]» debería cerrar un «[»; el último abierto fue «(», así que no emparejan.' },
      { pregunta: 'Si recorremos todo sin errores pero la pila queda con «((», la respuesta es…', opciones: ['SI', 'NO', 'Depende de n', 'Error'], correcta: 1, explicacion: 'Quedaron dos aperturas sin cerrar.' },
    ],
  },

  geometria: {
    tecnica: 'Orientación con el producto cruz',
    resumen: 'Saber si tres puntos giran a la izquierda, a la derecha o están alineados, solo con enteros.',
    teoria: [
      'Casi toda la geometría computacional se apoya en una sola pregunta: si voy de A a B y luego hacia C, ¿giro a la izquierda, a la derecha o sigo derecho? Con ella se decide si dos segmentos se cruzan, si un punto está dentro de un polígono o cuál es la envolvente convexa.',
      'La respuesta la da el producto cruz de los vectores AB y AC: (B.x − A.x)·(C.y − A.y) − (B.y − A.y)·(C.x − A.x). Si es positivo, el giro es a la izquierda; si es negativo, a la derecha; si es cero, los tres puntos están alineados.',
      'Con coordenadas enteras es una cuenta exacta, sin raíces ni decimales. Además, su valor absoluto es el doble del área del triángulo ABC, otro dato que piden mucho.',
    ],
    cuando: [
      '¿Se cruzan dos segmentos? ¿Un punto está a qué lado de una recta?',
      'Área de triángulos y polígonos (fórmula del zapatero).',
      'Ordenar puntos alrededor de otro o construir la envolvente convexa.',
    ],
    complejidad: { tiempo: 'O(1)', espacio: 'O(1)', nota: 'Una multiplicación y una resta por consulta: con enteros, exacto.' },
    ejemplo: {
      titulo: '¿Hacia dónde gira?',
      enunciado: 'Se dan tres puntos A, B y C con coordenadas enteras entre −10⁹ y 10⁹. Imprime IZQUIERDA, DERECHA o COLINEALES según el giro de A → B → C.',
      pasos: [
        'Calculamos los vectores AB = (B.x − A.x, B.y − A.y) y AC = (C.x − A.x, C.y − A.y).',
        'El producto cruz es AB.x · AC.y − AB.y · AC.x. Puede llegar a 8·10¹⁸: usamos long long.',
        'Si es mayor que 0, IZQUIERDA; si es menor, DERECHA; si es 0, COLINEALES.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    long long ax, ay, bx, by, cx, cy;
    cin >> ax >> ay >> bx >> by >> cx >> cy;
    long long cruz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (cruz > 0) cout << "IZQUIERDA";
    else if (cruz < 0) cout << "DERECHA";
    else cout << "COLINEALES";
    return 0;
}`,
      python: `ax, ay, bx, by, cx, cy = map(int, input().split())
cruz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
print("IZQUIERDA" if cruz > 0 else "DERECHA" if cruz < 0 else "COLINEALES")`,
    },
    visual: { tipo: 'widget', widget: 'plano', texto: 'Mueve los tres puntos: el producto cruz cambia de signo cuando C pasa al otro lado de la recta AB.' },
    preguntas: [
      { pregunta: 'Si el producto cruz de A → B → C es 0, los puntos…', opciones: ['Giran a la izquierda', 'Giran a la derecha', 'Están alineados', 'Forman un triángulo rectángulo'], correcta: 2, explicacion: 'Cero significa que AC no se separa de la dirección de AB: los tres están sobre la misma recta.' },
      { pregunta: '¿Por qué conviene long long con coordenadas de hasta 10⁹?', opciones: ['Porque el producto puede llegar a unos 8·10¹⁸', 'Porque hay decimales', 'Por costumbre', 'No conviene'], correcta: 0, explicacion: 'Las diferencias llegan a 2·10⁹ y su producto a 4·10¹⁸ por término: no cabe en int.' },
      { pregunta: 'El valor absoluto del producto cruz es…', opciones: ['La distancia AB', 'El doble del área del triángulo ABC', 'El perímetro', 'El ángulo en grados'], correcta: 1, explicacion: 'Es el área del paralelogramo formado por AB y AC, que es el doble del área del triángulo.' },
    ],
  },
};
