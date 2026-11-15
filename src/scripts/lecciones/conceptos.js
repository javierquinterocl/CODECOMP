// "Lo básico" de cada categoría: lo que hay que entender antes de cualquier ejercicio.
// Cada concepto: texto, código corto y un ejemplo interactivo. Textos borrador del equipo.

import { validarBfs } from './pasos.js';
import {
  PSEUDO_COLLATZ, PSEUDO_DFS, PSEUDO_ESCALERAS, PSEUDO_MCD, PSEUDO_MONEDAS, PSEUDO_TRAZA,
  pasosCollatz, pasosDfs, pasosEscaleras, pasosMcd, pasosMonedas, pasosTraza,
  validarCollatz, validarEscaleras, validarMcd, validarMonedas, validarTraza,
} from './pasosBase.js';

const conValidacion = (validar, pasos) => (...args) => {
  const v = validar(...args);
  return v.error ? v : { pasos: pasos(v.valor) };
};

export const CONCEPTOS = {
  principiante: [
    {
      titulo: 'Leer la entrada como la escribe el juez',
      texto: [
        'Todo problema empieza leyendo datos. El juez escribe la entrada en un formato exacto que dice el enunciado, por ejemplo "un entero n y luego n números". Tu programa debe leer justo eso, en ese orden.',
        'cin en C++ e input().split() en Python leen ficha por ficha: da igual si los números vienen separados por espacios o por saltos de línea. Lo que sí importa es leer la cantidad correcta.',
      ],
      codigo: {
        cpp: 'int n;\ncin >> n;\nvector<long long> a(n);\nfor (int i = 0; i < n; i++) cin >> a[i];',
        python: 'n = int(input())\na = list(map(int, input().split()))',
      },
      widget: 'lector',
    },
    {
      titulo: 'Tipos de datos y desbordamiento',
      texto: [
        'Un int guarda números hasta unos 2 147 483 647 (2³¹ − 1). Si una cuenta se pasa, el valor "da la vuelta" y obtienes un número negativo absurdo: es el error más común en programación competitiva.',
        'Regla práctica: si multiplicas o sumas muchos números grandes, usa long long (hasta 9·10¹⁸). En Python los enteros no tienen límite, pero en C++ y Java hay que pensarlo.',
      ],
      codigo: {
        cpp: 'int a = 100000, b = 100000;\nlong long bien = 1LL * a * b; // 10000000000\nint mal = a * b;              // se desborda',
        python: 'a, b = 100000, 100000\nprint(a * b)  # Python no se desborda',
      },
      widget: 'desbordamiento',
    },
    {
      titulo: 'Seguir un ciclo con una tabla de variables',
      texto: [
        'Antes de enviar, conviene "ser el computador": anotar en una tabla cuánto vale cada variable en cada vuelta del ciclo. Así se encuentran los errores de uno de más o de menos, el clásico off-by-one.',
        'Mira cómo cambia la suma en cada vuelta y cambia n para probar otros casos.',
      ],
      visual: { tipo: 'tabla', pseudo: PSEUDO_TRAZA, campos: [{ id: 'n', label: 'n', inicial: '5', ayuda: 'Entre 1 y 12.' }], generar: ({ n }) => conValidacion(validarTraza, pasosTraza)(n) },
    },
  ],

  'ad-hoc': [
    {
      titulo: '¿Alcanza el tiempo? Leer las restricciones',
      texto: [
        'Las restricciones del enunciado (n ≤ 10⁵, n ≤ 20…) dicen qué tan rápida debe ser tu idea. Un computador hace unas 10⁸ operaciones por segundo: si tu enfoque hace n² operaciones con n = 10⁵, son 10¹⁰ y no alcanza.',
        'Antes de programar, calcula: ¿cuántas operaciones hace mi idea con el n más grande?',
      ],
      widget: 'estimador',
    },
    {
      titulo: 'Simular el proceso tal como lo describe el enunciado',
      texto: [
        'Muchos problemas Ad-Hoc describen un proceso con reglas: repítelas al pie de la letra en el código. Es lo más directo y, si el número de pasos es pequeño, basta.',
        'Ejemplo: la conjetura de Collatz. Si n es par se divide entre 2; si es impar se convierte en 3n + 1. ¿Cuántos pasos hasta llegar a 1?',
      ],
      codigo: {
        cpp: 'int pasos = 0;\nwhile (n != 1) {\n    if (n % 2 == 0) n /= 2;\n    else n = 3 * n + 1;\n    pasos++;\n}',
        python: 'pasos = 0\nwhile n != 1:\n    n = n // 2 if n % 2 == 0 else 3 * n + 1\n    pasos += 1',
      },
      visual: { tipo: 'tabla', pseudo: PSEUDO_COLLATZ, campos: [{ id: 'n', label: 'n', inicial: '6', ayuda: 'Entre 2 y 1000.' }], generar: ({ n }) => conValidacion(validarCollatz, pasosCollatz)(n) },
    },
    {
      titulo: 'Probar casos pequeños a mano',
      texto: [
        'Cuando no ves la idea, resuelve el problema a mano para n = 1, 2, 3, 4… y escribe las respuestas en una tabla. Casi siempre aparece un patrón: crecen de uno en uno, se duplican, se repiten cada k…',
        'Ese patrón suele convertirse en una fórmula que responde al instante, incluso para n enormes. Lo verás completo en la técnica clave de esta lección.',
      ],
    },
  ],

  cadenas: [
    {
      titulo: 'Qué es una cadena: caracteres con índice',
      texto: [
        'Una cadena es una secuencia de caracteres, cada uno en una posición o índice que empieza en 0. En "codecomp", s[0] es «c» y s[7] es «p». La longitud es la cantidad de caracteres.',
        'Una subcadena es un pedazo continuo, de la posición l a la r. Cambia la cadena y el rango para verlo.',
      ],
      codigo: {
        cpp: 'string s = "codecomp";\ncout << s.size() << " " << s[0];   // 8 c\ncout << s.substr(2, 4);            // deco',
        python: 's = "codecomp"\nprint(len(s), s[0])   # 8 c\nprint(s[2:6])         # deco',
      },
      widget: 'cadena',
    },
    {
      titulo: 'Contar letras con un arreglo de frecuencias',
      texto: [
        'Muchas preguntas de cadenas se responden contando: ¿son anagramas?, ¿cuál letra se repite más?, ¿se puede formar un palíndromo? Con un arreglo de 26 casillas, una por letra, se cuenta todo en una sola pasada.',
        'Escribe un texto y mira el conteo.',
      ],
      codigo: {
        cpp: 'int cnt[26] = {0};\nfor (char c : s) cnt[c - \'a\']++;',
        python: 'from collections import Counter\ncnt = Counter(s)',
      },
      widget: 'frecuencias',
    },
    {
      titulo: 'Recorrer y comparar sin copiar',
      texto: [
        'Crear copias de una cadena (invertirla, cortarla) cuesta tiempo y memoria. Comparar posiciones directamente con índices es más rápido. Por ejemplo, para saber si es palíndromo basta comparar s[i] con s[n − 1 − i].',
        'Esa idea de usar dos índices a la vez es la técnica clave de esta lección: dos punteros.',
      ],
    },
  ],

  matematicas: [
    {
      titulo: 'Divisores, primos y el operador módulo',
      texto: [
        'Los divisores de n aparecen en parejas: si d divide a n, también n / d. Por eso basta probar d hasta √n, y así se factoriza un número de 10⁹ con solo 31 623 pruebas.',
        'El módulo (a mod b, en código a % b) es el resto de la división. Sirve para saber si algo es divisible, para ciclos que se repiten y para mantener números pequeños.',
      ],
      codigo: {
        cpp: 'for (long long d = 1; d * d <= n; d++)\n    if (n % d == 0) {\n        // d y n / d son divisores\n    }',
        python: 'd = 1\nwhile d * d <= n:\n    if n % d == 0:\n        pass  # d y n // d son divisores\n    d += 1',
      },
      widget: 'divisores',
    },
    {
      titulo: 'Máximo común divisor con Euclides',
      texto: [
        'El MCD de a y b es el mismo que el de b y a mod b. Repitiendo, los números bajan muy rápido hasta que uno es 0: el otro es el MCD. Es uno de los algoritmos más antiguos y sigue siendo el mejor.',
        'El mínimo común múltiplo sale del MCD: mcm(a, b) = a / mcd(a, b) · b.',
      ],
      codigo: {
        cpp: 'long long mcd(long long a, long long b) {\n    return b == 0 ? a : mcd(b, a % b);\n}',
        python: 'from math import gcd\nprint(gcd(48, 18))  # 6',
      },
      visual: {
        tipo: 'tabla', pseudo: PSEUDO_MCD,
        campos: [{ id: 'a', label: 'a', inicial: '252', ayuda: 'Entre 1 y 1 000 000.' }, { id: 'b', label: 'b', inicial: '105', ayuda: 'Entre 1 y 1 000 000.' }],
        generar: ({ a, b }) => conValidacion(validarMcd, pasosMcd)(a, b),
      },
    },
    {
      titulo: 'Números grandes y módulo 10⁹ + 7',
      texto: [
        'Cuando la respuesta es gigante (formas de hacer algo, factoriales), el enunciado pide imprimirla "módulo 10⁹ + 7". Se aplica el módulo en cada suma o multiplicación para que nada se desborde: (a · b) mod m = ((a mod m) · (b mod m)) mod m.',
        'Ojo: el producto de dos números menores que 10⁹ + 7 ya no cabe en int; hay que usar long long antes de aplicar el módulo.',
      ],
      codigo: {
        cpp: 'const long long MOD = 1e9 + 7;\nlong long f = 1;\nfor (int i = 2; i <= n; i++) f = f * i % MOD;',
        python: 'MOD = 10**9 + 7\nf = 1\nfor i in range(2, n + 1):\n    f = f * i % MOD',
      },
      widget: 'desbordamiento',
    },
  ],

  'estructuras-de-datos': [
    {
      titulo: 'Pila: el último en entrar es el primero en salir',
      texto: [
        'Una pila funciona como una torre de platos: solo se pone o se quita arriba (LIFO). Sirve para todo lo que se "abre y cierra": paréntesis, deshacer, llamadas de funciones, recorrer en profundidad.',
        'Apila y desapila para sentirla.',
      ],
      codigo: { cpp: 'stack<int> p;\np.push(3); p.push(7);\ncout << p.top();  // 7\np.pop();', python: 'p = []\np.append(3); p.append(7)\nprint(p[-1])  # 7\np.pop()' },
      widget: 'pila',
    },
    {
      titulo: 'Cola: el primero en llegar es el primero en salir',
      texto: [
        'Una cola es la fila del banco: se entra por atrás y se sale por adelante (FIFO). Se usa para procesar cosas en el orden en que llegan y es el corazón del recorrido en anchura (BFS) de grafos.',
        'Encola y desencola: compara qué elemento sale con la pila.',
      ],
      codigo: { cpp: 'queue<int> q;\nq.push(3); q.push(7);\ncout << q.front();  // 3\nq.pop();', python: 'from collections import deque\nq = deque([3, 7])\nprint(q.popleft())  # 3' },
      widget: 'cola',
    },
    {
      titulo: 'Mapa: contar y buscar por clave',
      texto: [
        'Un mapa (o diccionario) guarda parejas clave → valor y encuentra una clave muy rápido. Es la herramienta para contar apariciones de palabras o números grandes, donde un arreglo no sirve.',
        'Escribe palabras y mira cómo se cuentan.',
      ],
      codigo: { cpp: 'map<string, int> cnt;\nstring w;\nwhile (cin >> w) cnt[w]++;', python: 'from collections import Counter\ncnt = Counter(input().split())' },
      widget: 'palabras',
    },
  ],

  paradigmas: [
    {
      titulo: 'Elegir el enfoque por la complejidad',
      texto: [
        'Un paradigma es una forma de atacar problemas: fuerza bruta, voraz, búsqueda binaria, programación dinámica… Las restricciones te dicen cuál alcanza. Con n ≤ 20 puedes probar todas las combinaciones (2ⁿ); con n ≤ 10⁵ necesitas O(n log n) o menos.',
        'Prueba distintos n y mira qué complejidades pasan.',
      ],
      widget: 'estimador',
    },
    {
      titulo: 'Voraz: tomar siempre la mejor opción del momento',
      texto: [
        'Un algoritmo voraz decide paso a paso tomando lo que parece mejor ahora, sin volver atrás. Es simple y rápido, pero no siempre da el óptimo: hay que convencerse de que funciona para ese problema.',
        'Ejemplo: dar cambio con la menor cantidad de monedas tomando siempre la más grande que quepa. Prueba con monedas 5 y 3 y monto 7: el voraz falla.',
      ],
      codigo: { cpp: 'sort(m.rbegin(), m.rend());\nfor (int x : m) { usadas += resto / x; resto %= x; }', python: 'for x in sorted(m, reverse=True):\n    usadas += resto // x\n    resto %= x' },
      visual: {
        tipo: 'tabla', pseudo: PSEUDO_MONEDAS,
        campos: [{ id: 'monto', label: 'Monto', inicial: '1850', ayuda: 'Entre 1 y 100 000.' }, { id: 'monedas', label: 'Monedas', inicial: '1000 500 200 100 50', ayuda: 'De 1 a 8 valores.' }],
        generar: ({ monto, monedas }) => conValidacion(validarMonedas, pasosMonedas)(monto, monedas),
      },
    },
    {
      titulo: 'Programación dinámica: guardar para no repetir',
      texto: [
        'Si un problema se puede partir en subproblemas que se repiten, calcula cada uno una sola vez y guárdalo en una tabla. Esa es la programación dinámica: define qué significa dp[i], los casos base y cómo se calcula dp[i] con los anteriores.',
        'Ejemplo: ¿de cuántas formas se sube una escalera de n escalones dando pasos de 1 o de 2? dp[i] = dp[i − 1] + dp[i − 2].',
      ],
      codigo: { cpp: 'vector<long long> dp(n + 1);\ndp[0] = dp[1] = 1;\nfor (int i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];', python: 'dp = [1, 1] + [0] * (n - 1)\nfor i in range(2, n + 1):\n    dp[i] = dp[i-1] + dp[i-2]' },
      visual: { tipo: 'arreglo', pseudo: PSEUDO_ESCALERAS, campos: [{ id: 'n', label: 'Escalones n', inicial: '8', ayuda: 'Entre 2 y 15.' }], generar: ({ n }) => conValidacion(validarEscaleras, pasosEscaleras)(n) },
    },
  ],

  grafos: [
    {
      titulo: 'Nodos, aristas y cómo guardarlos',
      texto: [
        'Un grafo tiene nodos (puntos) y aristas (conexiones entre dos nodos). Puede ser dirigido (la arista va en un solo sentido) o no, y las aristas pueden tener peso (distancia, costo).',
        'En código se guarda casi siempre como lista de adyacencia: para cada nodo, la lista de sus vecinos. La matriz de adyacencia usa una tabla n × n. Escribe aristas y compara las dos.',
      ],
      codigo: { cpp: 'vector<vector<int>> g(n + 1);\nfor (int i = 0; i < m; i++) {\n    int a, b; cin >> a >> b;\n    g[a].push_back(b); g[b].push_back(a);\n}', python: 'g = [[] for _ in range(n + 1)]\nfor _ in range(m):\n    a, b = map(int, input().split())\n    g[a].append(b); g[b].append(a)' },
      widget: 'grafo',
    },
    {
      titulo: 'Recorrer en profundidad (DFS)',
      texto: [
        'DFS explora un camino hasta el fondo antes de regresar a probar otro, como quien recorre un laberinto con la mano en la pared. Usa una pila (o recursión) y marca los nodos visitados para no repetirlos.',
        'Sirve para saber qué se alcanza, contar componentes, detectar ciclos y recorrer árboles. Compara el orden con el de BFS en la técnica clave.',
      ],
      codigo: { cpp: 'void dfs(int u) {\n    vis[u] = true;\n    for (int v : g[u]) if (!vis[v]) dfs(v);\n}', python: 'def dfs(u):\n    vis[u] = True\n    for v in g[u]:\n        if not vis[v]:\n            dfs(v)' },
      visual: {
        tipo: 'grafo', pseudo: PSEUDO_DFS,
        campos: [{ id: 'aristas', label: 'Aristas', inicial: '1-2, 1-3, 2-4, 2-5, 3-6, 5-6', ayuda: 'Nodos del 1 al 8.' }, { id: 'inicio', label: 'Inicio', inicial: '1', ayuda: 'Nodo de partida.' }],
        generar: ({ aristas, inicio }) => conValidacion(validarBfs, pasosDfs)(aristas, inicio),
      },
    },
  ],

  geometria: [
    {
      titulo: 'Puntos, vectores y distancia',
      texto: [
        'Un punto es un par (x, y). El vector de A a B es (B.x − A.x, B.y − A.y) y la distancia entre ellos sale del teorema de Pitágoras: √(dx² + dy²).',
        'Mueve los puntos y mira la distancia. Para comparar distancias no hace falta la raíz: compara dx² + dy² y evitas decimales.',
      ],
      codigo: { cpp: 'long long dx = bx - ax, dy = by - ay;\ndouble d = sqrt(dx * dx + dy * dy);', python: 'from math import hypot\nd = hypot(bx - ax, by - ay)' },
      widget: 'plano',
    },
    {
      titulo: 'Precisión: enteros antes que decimales',
      texto: [
        'Los double guardan aproximaciones: 0.1 + 0.2 no da exactamente 0.3. En geometría eso hace fallar comparaciones como "¿son iguales?" o "¿es cero?".',
        'Por eso, cuando las coordenadas son enteras, se trabaja con enteros (long long) todo lo posible: productos cruz, distancias al cuadrado, áreas al doble. Si hay que usar decimales, se compara con una tolerancia: |a − b| < 1e−9.',
      ],
      codigo: { cpp: 'const double EPS = 1e-9;\nbool iguales(double a, double b) { return fabs(a - b) < EPS; }', python: 'EPS = 1e-9\niguales = abs(a - b) < EPS' },
    },
  ],
};
