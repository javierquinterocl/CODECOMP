// Lecciones de la Ruta: teoría, ejemplo resuelto, código, visualización y preguntas.
// Textos borrador: los decide el equipo. El código es fijo (nunca texto del estudiante).

import {
  PSEUDO_BFS, PSEUDO_BINARIA, PSEUDO_CRIBA, PSEUDO_PALINDROMO,
  pasosBfs, pasosBinaria, pasosCriba, pasosPalindromo,
  validarBfs, validarBinaria, validarCriba, validarPalindromo,
} from './pasos.js';

export const LECCIONES = {
  cadenas: {
    tecnica: 'Dos punteros',
    resumen: 'Recorrer un texto desde los dos extremos a la vez para compararlo en una sola pasada.',
    teoria: [
      'Muchos problemas de cadenas preguntan algo sobre la relación entre el principio y el final de un texto: si se lee igual al revés, si dos mitades coinciden o si se puede emparejar cada letra con otra. La forma ingenua es construir una copia invertida y compararla, o comparar todas las parejas posibles. La técnica de dos punteros lo hace mejor.',
      'Ponemos un índice i en el primer carácter y otro j en el último. En cada paso comparamos s[i] con s[j]: si algo no cuadra ya tenemos la respuesta; si cuadra, movemos i a la derecha y j a la izquierda. Cuando los punteros se cruzan, ya revisamos todo el texto.',
      'Cada carácter se mira una sola vez, así que el costo es lineal y no usamos memoria extra. La misma idea sirve para invertir un arreglo en su lugar, para buscar dos números que sumen un valor en un arreglo ordenado o para quitar espacios sin crear otra cadena.',
    ],
    cuando: [
      'El problema compara el inicio con el final de una cadena o arreglo.',
      'El arreglo está ordenado y buscas una pareja que cumpla algo (suma, diferencia).',
      'Te piden hacerlo "en su lugar", sin memoria extra.',
    ],
    complejidad: { tiempo: 'O(n)', espacio: 'O(1)', nota: 'Con n hasta 10⁵ o 10⁶ responde de inmediato.' },
    ejemplo: {
      titulo: '¿Es palíndromo?',
      enunciado: 'Dada una palabra de hasta 10⁵ letras minúsculas, imprime SI si se lee igual de izquierda a derecha que de derecha a izquierda, y NO en otro caso.',
      pasos: [
        'Leemos la palabra s y ponemos i = 0 y j = n − 1.',
        'Mientras i < j comparamos s[i] con s[j]. Si son distintas, imprimimos NO y terminamos.',
        'Si son iguales avanzamos los dos punteros hacia el centro.',
        'Si los punteros se cruzan sin encontrar diferencias, imprimimos SI.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    int i = 0, j = s.size() - 1;
    while (i < j) {
        if (s[i] != s[j]) {
            cout << "NO" << endl;
            return 0;
        }
        i++;
        j--;
    }
    cout << "SI" << endl;
    return 0;
}`,
      python: `s = input().strip()
i, j = 0, len(s) - 1
while i < j:
    if s[i] != s[j]:
        print("NO")
        break
    i += 1
    j -= 1
else:
    print("SI")`,
    },
    visual: {
      tipo: 'arreglo',
      pseudo: PSEUDO_PALINDROMO,
      campos: [{ id: 'texto', label: 'Palabra o frase', inicial: 'reconocer', ayuda: 'Ejemplos: anilina, codecomp, Anita lava la tina.' }],
      generar: ({ texto }) => {
        const v = validarPalindromo(texto);
        return v.error ? v : { pasos: pasosPalindromo(v.valor) };
      },
    },
    preguntas: [
      {
        pregunta: '¿Cuántas comparaciones hace el algoritmo con una palabra de 10 letras que sí es palíndromo?',
        opciones: ['10', '5', '9', '100'],
        correcta: 1,
        explicacion: 'Cada comparación revisa una pareja (inicio y final). Con 10 letras hay 5 parejas, y los punteros se cruzan después de la quinta.',
      },
      {
        pregunta: 'Si en el primer paso s[0] ≠ s[n − 1], ¿qué hace el algoritmo?',
        opciones: ['Sigue revisando el resto', 'Responde NO de inmediato', 'Invierte la cadena', 'Mueve solo el puntero i'],
        correcta: 1,
        explicacion: 'Basta una pareja distinta para saber que no es palíndromo: no hace falta mirar más.',
      },
      {
        pregunta: '¿Por qué esta técnica usa O(1) de memoria extra?',
        opciones: ['Porque copia la cadena', 'Porque solo guarda dos índices', 'Porque ordena la cadena', 'Porque usa recursión'],
        correcta: 1,
        explicacion: 'Solo necesitamos los dos índices i y j, sin importar qué tan larga sea la cadena.',
      },
    ],
  },

  matematicas: {
    tecnica: 'Criba de Eratóstenes',
    resumen: 'Encontrar todos los primos hasta n tachando múltiplos, sin dividir ni una sola vez.',
    teoria: [
      'Saber si un número es primo dividiéndolo entre todos los anteriores es lento, y en programación competitiva casi siempre necesitamos muchos primos a la vez: contarlos, sumarlos o responder miles de preguntas "¿es primo x?". La criba resuelve todo de una vez.',
      'La idea es al revés: en lugar de probar si cada número es primo, tachamos los que seguro no lo son. Empezamos con todos los números de 2 a n como candidatos. El primero sin tachar, 2, es primo, y tachamos todos sus múltiplos. El siguiente sin tachar, 3, también es primo, y tachamos los suyos. Seguimos así.',
      'Dos detalles la hacen rápida. Primero, los múltiplos de p se tachan desde p·p, porque los menores (2p, 3p…) ya los tachó un primo más pequeño. Segundo, basta con llegar hasta p·p ≤ n: si un número no tiene un divisor menor o igual a su raíz, es primo. Al final, lo que quedó sin tachar son exactamente los primos.',
    ],
    cuando: [
      'Necesitas muchos primos o responder muchas preguntas de primalidad.',
      'Hay que factorizar muchos números pequeños (variante: guardar el menor divisor).',
      'n es como mucho 10⁶ o 10⁷: cabe un arreglo de ese tamaño.',
    ],
    complejidad: { tiempo: 'O(n log log n)', espacio: 'O(n)', nota: 'Prácticamente lineal: con n = 10⁶ tarda milisegundos.' },
    ejemplo: {
      titulo: 'Contar primos',
      enunciado: 'Dado n (2 ≤ n ≤ 10⁶), imprime cuántos números primos hay entre 1 y n.',
      pasos: [
        'Creamos un arreglo primo[0..n] lleno de verdadero y marcamos 0 y 1 como no primos.',
        'Para cada p desde 2 mientras p·p ≤ n: si primo[p] sigue verdadero, tachamos p·p, p·p + p, … hasta n.',
        'Recorremos el arreglo y contamos los que quedaron en verdadero.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<bool> primo(n + 1, true);
    primo[0] = primo[1] = false;
    for (long long p = 2; p * p <= n; p++) {
        if (!primo[p]) continue;
        for (long long m = p * p; m <= n; m += p)
            primo[m] = false;
    }
    int total = count(primo.begin(), primo.end(), true);
    cout << total << endl;
    return 0;
}`,
      python: `n = int(input())
primo = [True] * (n + 1)
primo[0] = primo[1] = False
p = 2
while p * p <= n:
    if primo[p]:
        for m in range(p * p, n + 1, p):
            primo[m] = False
    p += 1
print(sum(primo))`,
    },
    visual: {
      tipo: 'cuadricula',
      pseudo: PSEUDO_CRIBA,
      campos: [{ id: 'n', label: 'Hasta n', inicial: '50', ayuda: 'Un número entre 10 y 100.' }],
      generar: ({ n }) => {
        const v = validarCriba(n);
        return v.error ? v : { pasos: pasosCriba(v.valor) };
      },
    },
    preguntas: [
      {
        pregunta: 'Al procesar p = 5, ¿desde qué número empezamos a tachar?',
        opciones: ['5', '10', '25', '15'],
        correcta: 2,
        explicacion: '10, 15 y 20 ya los tacharon el 2 y el 3. El primer múltiplo de 5 que nadie tachó antes es 5 · 5 = 25.',
      },
      {
        pregunta: 'Para n = 100, ¿hasta qué p necesitamos revisar?',
        opciones: ['Hasta 100', 'Hasta 50', 'Hasta 10', 'Hasta 7'],
        correcta: 2,
        explicacion: 'Basta p · p ≤ 100, o sea p ≤ 10. Cualquier compuesto menor que 100 tiene un divisor menor o igual que 10.',
      },
      {
        pregunta: '¿Qué conviene si te preguntan 10⁵ veces "¿es primo x?" con x ≤ 10⁶?',
        opciones: ['Dividir x entre todos los menores cada vez', 'Hacer la criba una vez y responder mirando el arreglo', 'Usar recursión', 'Ordenar las preguntas'],
        correcta: 1,
        explicacion: 'La criba cuesta casi O(n) una sola vez; después cada pregunta se responde en O(1).',
      },
    ],
  },

  paradigmas: {
    tecnica: 'Búsqueda binaria',
    resumen: 'Encontrar un valor en datos ordenados partiendo el rango a la mitad en cada paso.',
    teoria: [
      'Si buscas una palabra en un diccionario no lo lees página por página: lo abres por la mitad, ves si la palabra va antes o después y descartas la mitad que no sirve. La búsqueda binaria hace exactamente eso con un arreglo ordenado.',
      'Mantenemos un rango [lo, hi] donde todavía puede estar el valor buscado x. Miramos el centro mid. Si a[mid] es x, terminamos. Si a[mid] < x, como el arreglo está ordenado, todo lo que está a la izquierda de mid también es menor, así que lo descartamos con lo = mid + 1. Si a[mid] > x, descartamos la derecha con hi = mid − 1. Si el rango queda vacío, x no está.',
      'Como el rango se reduce a la mitad en cada vuelta, con un millón de elementos bastan unas 20 vueltas. Y la idea va más allá de los arreglos: sirve para "buscar la respuesta" cuando puedes comprobar si un valor es suficiente (el mínimo tiempo, la máxima distancia), aunque no tengas el arreglo escrito.',
    ],
    cuando: [
      'Los datos están ordenados y haces muchas búsquedas.',
      'Te piden el mínimo o el máximo valor que cumple una condición que es monótona.',
      'Una búsqueda lineal O(n) por consulta no alcanza en el tiempo límite.',
    ],
    complejidad: { tiempo: 'O(log n)', espacio: 'O(1)', nota: 'Con n = 10⁶ son unas 20 comparaciones por búsqueda.' },
    ejemplo: {
      titulo: '¿Está el número?',
      enunciado: 'Te dan n números ordenados (n ≤ 10⁵) y q preguntas (q ≤ 10⁵). Para cada pregunta x, imprime la posición de x o −1 si no aparece.',
      pasos: [
        'Para cada x empezamos con lo = 0 y hi = n − 1.',
        'Mientras lo ≤ hi calculamos mid = (lo + hi) / 2 y comparamos a[mid] con x.',
        'Si es igual respondemos mid; si es menor, lo = mid + 1; si es mayor, hi = mid − 1.',
        'Si el ciclo termina, respondemos −1. En total son q · log n comparaciones, no q · n.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int buscar(const vector<int>& a, int x) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    int n, q;
    cin >> n >> q;
    vector<int> a(n);
    for (int& v : a) cin >> v;
    while (q--) {
        int x;
        cin >> x;
        cout << buscar(a, x) << "\\n";
    }
    return 0;
}`,
      python: `def buscar(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

n, q = map(int, input().split())
a = list(map(int, input().split()))
for _ in range(q):
    print(buscar(a, int(input())))`,
    },
    visual: {
      tipo: 'arreglo',
      pseudo: PSEUDO_BINARIA,
      campos: [
        { id: 'arreglo', label: 'Arreglo', inicial: '2 5 8 12 16 23 38 56 72 91', ayuda: 'Entre 2 y 16 enteros; si no están ordenados, los ordenamos.' },
        { id: 'objetivo', label: 'Buscar', inicial: '23', ayuda: 'El número que quieres encontrar.' },
      ],
      generar: ({ arreglo, objetivo }) => {
        const v = validarBinaria(arreglo, objetivo);
        if (v.error) return v;
        return { pasos: pasosBinaria(v.valor), aviso: v.valor.reordenado ? 'Ordenamos el arreglo: la búsqueda binaria solo funciona con datos ordenados.' : '' };
      },
    },
    preguntas: [
      {
        pregunta: 'Con 1.000.000 de números ordenados, ¿cuántas vueltas hace como mucho la búsqueda binaria?',
        opciones: ['Unas 20', 'Unas 1.000', 'Unas 500.000', '1.000.000'],
        correcta: 0,
        explicacion: 'Cada vuelta parte el rango a la mitad: 2²⁰ ≈ 1.000.000, así que bastan unas 20.',
      },
      {
        pregunta: 'Si a[mid] < x, ¿qué hacemos?',
        opciones: ['hi = mid − 1', 'lo = mid + 1', 'Terminamos: x no está', 'Volvemos a empezar'],
        correcta: 1,
        explicacion: 'Todo lo que está a la izquierda de mid es todavía más pequeño que a[mid], así que x solo puede estar a la derecha.',
      },
      {
        pregunta: '¿Qué pasa si aplicas búsqueda binaria a un arreglo desordenado?',
        opciones: ['Funciona igual', 'Es más rápida', 'Puede decir que x no está aunque sí esté', 'Ordena el arreglo sola'],
        correcta: 2,
        explicacion: 'Al descartar una mitad suponemos que todo allí es menor (o mayor). Sin orden esa suposición falla.',
      },
    ],
  },

  grafos: {
    tecnica: 'Recorrido en anchura (BFS)',
    resumen: 'Recorrer un grafo por niveles para encontrar el camino más corto en pasos.',
    teoria: [
      'Un grafo modela cosas conectadas: ciudades y carreteras, personas y amistades, casillas de un laberinto. Muchas preguntas se reducen a "¿cuál es el camino con menos pasos de A a B?". Si todas las conexiones cuestan lo mismo, la respuesta es BFS.',
      'BFS recorre el grafo por capas, como una onda en el agua. Primero el nodo inicial (distancia 0), luego todos sus vecinos (distancia 1), luego los vecinos de esos que aún no visitamos (distancia 2), y así. Para respetar ese orden usa una cola: el primero que entra es el primero que sale.',
      'Cada vez que sacamos un nodo u de la cola, revisamos sus vecinos. Si un vecino v todavía no tiene distancia, le ponemos dist[u] + 1 y lo metemos a la cola. Como cada nodo entra una sola vez y cada arista se revisa una vez por extremo, el costo es O(V + E). Los nodos que nunca reciben distancia no están conectados con el inicio.',
    ],
    cuando: [
      'Camino más corto en número de pasos (todas las aristas valen lo mismo).',
      'Laberintos en cuadrículas: cada casilla es un nodo y sus vecinas son las aristas.',
      'Saber qué se puede alcanzar desde un punto o contar componentes conectadas.',
    ],
    complejidad: { tiempo: 'O(V + E)', espacio: 'O(V)', nota: 'V nodos y E aristas: con 10⁵ de cada uno es instantáneo.' },
    ejemplo: {
      titulo: 'Menor número de saltos',
      enunciado: 'Hay n ciudades y m carreteras de doble sentido. Imprime el menor número de carreteras que hay que recorrer para ir de la ciudad 1 a cada ciudad, o −1 si no se puede llegar.',
      pasos: [
        'Guardamos el grafo como lista de vecinos: para cada ciudad, las ciudades a las que llega.',
        'dist[1] = 0 y metemos la ciudad 1 a la cola; el resto empieza en −1.',
        'Mientras la cola no esté vacía sacamos u y, para cada vecino v con dist[v] = −1, ponemos dist[v] = dist[u] + 1 y lo metemos a la cola.',
        'Imprimimos dist: los que siguen en −1 no son alcanzables.',
      ],
    },
    codigo: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> vecinos(n + 1);
    for (int k = 0; k < m; k++) {
        int a, b;
        cin >> a >> b;
        vecinos[a].push_back(b);
        vecinos[b].push_back(a);
    }
    vector<int> dist(n + 1, -1);
    queue<int> cola;
    dist[1] = 0;
    cola.push(1);
    while (!cola.empty()) {
        int u = cola.front();
        cola.pop();
        for (int v : vecinos[u]) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                cola.push(v);
            }
        }
    }
    for (int c = 1; c <= n; c++) cout << dist[c] << " ";
    return 0;
}`,
      python: `from collections import deque

n, m = map(int, input().split())
vecinos = [[] for _ in range(n + 1)]
for _ in range(m):
    a, b = map(int, input().split())
    vecinos[a].append(b)
    vecinos[b].append(a)

dist = [-1] * (n + 1)
dist[1] = 0
cola = deque([1])
while cola:
    u = cola.popleft()
    for v in vecinos[u]:
        if dist[v] == -1:
            dist[v] = dist[u] + 1
            cola.append(v)
print(*dist[1:])`,
    },
    visual: {
      tipo: 'grafo',
      pseudo: PSEUDO_BFS,
      campos: [
        { id: 'aristas', label: 'Aristas', inicial: '1-2, 1-3, 2-4, 3-4, 3-5, 4-6, 5-6, 6-7', ayuda: 'Hasta 14, con nodos del 1 al 8. Ejemplo: 1-2, 2-3.' },
        { id: 'inicio', label: 'Inicio', inicial: '1', ayuda: 'El nodo desde el que se mide.' },
      ],
      generar: ({ aristas, inicio }) => {
        const v = validarBfs(aristas, inicio);
        return v.error ? v : { pasos: pasosBfs(v.valor) };
      },
    },
    preguntas: [
      {
        pregunta: '¿Qué estructura usa BFS para visitar los nodos por niveles?',
        opciones: ['Una pila', 'Una cola', 'Un arreglo ordenado', 'Un mapa'],
        correcta: 1,
        explicacion: 'La cola saca primero lo que entró primero: así todos los nodos a distancia d salen antes que los de distancia d + 1.',
      },
      {
        pregunta: 'Si un vecino ya tiene distancia, ¿por qué no lo volvemos a meter a la cola?',
        opciones: ['Porque gastaría memoria sin cambiar nada: su distancia ya es la mínima', 'Porque daría error', 'Porque BFS solo visita hojas', 'Sí se vuelve a meter'],
        correcta: 0,
        explicacion: 'Por recorrer por niveles, la primera vez que un nodo recibe distancia esa ya es la menor posible.',
      },
      {
        pregunta: '¿Cuándo BFS NO da el camino más corto?',
        opciones: ['Cuando el grafo tiene ciclos', 'Cuando las aristas tienen pesos distintos', 'Cuando hay más de 100 nodos', 'Siempre lo da'],
        correcta: 1,
        explicacion: 'BFS cuenta pasos. Si las aristas tienen pesos distintos (kilómetros, minutos) se necesita otro algoritmo, como Dijkstra.',
      },
    ],
  },
};
