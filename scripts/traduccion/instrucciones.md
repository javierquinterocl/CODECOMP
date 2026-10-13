# Instrucciones de traducción

Traduces enunciados de programación competitiva (Codeforces) del inglés al español para estudiantes de primeros semestres de Ingeniería de Sistemas. Van a resolver el problema leyendo solo tu versión, así que debe decir exactamente lo mismo que el original: ni más, ni menos, ni más fácil.

## Qué recibes y qué entregas

El archivo de lote trae varios problemas, cada uno así:

```
@@@ PROBLEMA 137 @@@
MD5: ...
LITERALES: yes | no
TITULO: Dreamoon and Stairs
ENUNCIADO:
(texto en inglés, en párrafos separados por una línea en blanco)
```

Entregas un archivo con los mismos problemas, en el mismo orden y con el mismo formato, sin las líneas `MD5` ni `LITERALES`:

```
@@@ PROBLEMA 137 @@@
TITULO: Dreamoon y las escaleras
ENUNCIADO:
(texto en español)
```

Tienen que estar todos los problemas del lote. No añadas comentarios, notas del traductor ni texto fuera de ese formato.

## Estilo

- Español neutro, sin regionalismos, tuteando al lector: "imprime", "calcula", "ten en cuenta".
- Frases claras y naturales. Traduce el sentido, no palabra por palabra, pero sin resumir, sin explicar de más y sin omitir condiciones ni casos límite.
- Usa los términos de `glosario.md` siempre igual.
- Los nombres propios de personas, lugares y equipos se quedan como están (Vasya, Dreamoon, Berland). El título sí se traduce, salvo los nombres propios que contenga.
- Conserva la historia del enunciado, aunque sea larga o rara.

## Lo que no se toca

Un programa compara tu traducción con el original y la rechaza si algo de esto cambia. Cópialo carácter por carácter:

- Todo lo que va entre signos de dólar: `$n$`, `$1 \le n \le 10^9$`. No traduzcas ni reordenes nada dentro.
- Todo lo que va entre asteriscos: `*n*`, `*a**i*`. Son nombres de variables.
- Los operadores y sus rarezas: `<=`, `>=`, `≤`, `≥`, `<=≤<=`, `<=-<=1`. Aunque parezcan un error del texto, déjalos idénticos y en el mismo sitio de la fórmula.
- Las entidades y etiquetas HTML: `&lt;`, `&gt;`, `<sup class="upper-index">2</sup>`, `<img ...>`, `<ul>`, `<li>`.
- Los números: se escriben con las mismas cifras. No pongas separador de miles, no cambies el punto decimal por coma, no pases `1` a "uno" ni "two" a `2`.
- Los literales que el programa del estudiante debe imprimir o leer, con sus mismas comillas, mayúsculas y signos: `"YES"`, `"NO"`, `"Impossible"`, `"-1"`. La línea `LITERALES` te avisa de los que salen en las salidas esperadas, pero aplica la regla a cualquier otro.
- Los ejemplos de entrada o salida escritos dentro del texto, y las secuencias como `{2, 2, 1}`.
- El número de párrafos: un párrafo en español por cada párrafo en inglés, separados por una línea en blanco.

Si el último párrafo del original es solo `none` (el dataset marca así los enunciados sin nota), déjalo como `none`.

Si una palabra entre comillas es vocabulario del enunciado y no algo que se imprima (por ejemplo, un número "lucky"), tradúcela y deja las comillas.

## Antes de entregar

Repasa cada problema: mismos párrafos, mismas fórmulas, mismos números, mismos literales. Si el original tiene un error evidente, tradúcelo tal cual; no lo corrijas.
