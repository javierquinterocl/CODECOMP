// Pasos del recorrido guiado. `ruta`: dónde se muestra (expresión regular). `ancla`: el
// `data-tour` del elemento a resaltar. `avanza`: 'boton', 'ruta' (al llegar a la ruta del paso
// siguiente) o el nombre de un evento. `ir`: a dónde lleva "Volver al paso" si se sale.
// `boton`: texto del botón que hace la acción por el usuario (lleva a la ruta o pulsa el ancla).
// Textos borrador: los decide el equipo.

const TABLERO = /^\/dashboard\/?$/;

export const PASOS_ESTUDIANTE = [
  {
    ruta: TABLERO, ir: '/dashboard', avanza: 'boton',
    titulo: '¡Bienvenido a CODECOMP!',
    texto: 'Te mostramos cómo hacer tu primer envío en unos pocos pasos. Puedes salir cuando quieras y repetirlo desde la Guía.',
  },
  {
    ruta: TABLERO, ir: '/dashboard', ancla: 'menu-dashboard-fundamentos', avanza: 'ruta', boton: 'Ir a Fundamentos',
    titulo: 'Abre Fundamentos',
    texto: 'En el menú, entra a Fundamentos: ejercicios para aprender a programar en PSeInt.',
    respaldo: 'Abre el menú y entra a Fundamentos.',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/?$/, ir: '/dashboard/fundamentos', ancla: 'nivel-fundamentos', avanza: 'ruta', boton: 'Ver los ejercicios',
    titulo: 'Elige el primer nivel',
    texto: 'Pulsa «Ver los ejercicios» en la tarjeta del nivel Fundamentos.',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/?$/, ir: '/dashboard/fundamentos/fundamentos', ancla: 'ejercicio-1', avanza: 'ruta', boton: 'Abrir el ejercicio 1',
    titulo: 'Abre el ejercicio 1',
    texto: 'Cada fila es un ejercicio, con su tema y su dificultad. Abre el primero: «Hola Mundo».',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/1$/, ir: '/dashboard/fundamentos/fundamentos/1', ancla: 'enunciado', avanza: 'boton',
    titulo: 'Lee el enunciado',
    texto: 'Aquí está lo que debe hacer tu algoritmo, qué recibe, qué debe escribir y algunos ejemplos.',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/1$/, ir: '/dashboard/fundamentos/fundamentos/1', ancla: 'editor', avanza: 'boton',
    titulo: 'Escribe tu algoritmo',
    texto: 'En el editor, dentro de Algoritmo, escribe la instrucción que muestra el saludo, por ejemplo: Escribir "Hola Mundo". Si ya había código, revísalo.',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/1$/, ir: '/dashboard/fundamentos/fundamentos/1', ancla: 'enviar', avanza: 'codecomp:veredicto', boton: 'Enviar al juez',
    titulo: 'Envíalo al juez',
    texto: 'Pulsa «Enviar». El juez prueba tu algoritmo con los ejemplos y con casos ocultos.',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/1$/, ir: '/dashboard/fundamentos/fundamentos/1', ancla: 'veredicto', avanza: 'boton',
    titulo: 'Mira el veredicto',
    texto: 'Aquí ves si quedó Aceptado o qué falló. Si algo sale mal, «Pedir retroalimentación» te da una pista del tutor de IA (hay que esperar un minuto entre pistas). ¡Ya hiciste tu primer envío!',
  },
  {
    ruta: /^\/dashboard\/fundamentos\/fundamentos\/1$/, ir: '/dashboard/fundamentos/fundamentos/1', ancla: 'menu-dashboard-ruta', avanza: 'ruta', boton: 'Ir a la Ruta',
    titulo: 'Tu ruta de entrenamiento',
    texto: 'Cuando pases a Problemas, la Ruta te guía tema por tema, de lo básico a grafos: cada tema tiene una lección con ejemplos interactivos y problemas a tu altura.',
    respaldo: 'Abre el menú y entra a Ruta.',
  },
  {
    ruta: /^\/dashboard\/ruta\/?$/, ir: '/dashboard/ruta', ancla: 'ruta-hero', avanza: 'fin',
    titulo: '¡Listo para entrenar!',
    texto: 'Arriba ves cuántos temas dominas y cuántos problemas resolviste sin pistas. Toca un tema para abrir su lección: lo básico, la técnica clave, una visualización paso a paso, preguntas y práctica. Tu repaso de hoy aparece en el Inicio.',
  },
];

export const PASOS_DOCENTE = [
  {
    ruta: TABLERO, ir: '/dashboard', avanza: 'boton',
    titulo: '¡Bienvenido, docente!',
    texto: 'Te mostramos cómo acompañar a tu clase en CODECOMP. Puedes salir cuando quieras y repetirlo desde la Guía.',
  },
  {
    ruta: TABLERO, ir: '/dashboard', ancla: 'clase', avanza: 'boton',
    titulo: 'Crea tu clase',
    texto: 'Escribe un nombre y pulsa «Crear clase». Verás un código de 6 letras: compártelo con tus estudiantes para que entren.',
    respaldo: 'En el tablero tienes la tarjeta de clases: ahí creas una y obtienes su código para compartir.',
  },
  {
    ruta: TABLERO, ir: '/dashboard', ancla: 'menu-historial-usuarios', avanza: 'ruta', boton: 'Ir a Estudiantes',
    titulo: 'Mira a tus estudiantes',
    texto: 'En el menú, entra a Estudiantes: verás quién practica, qué le cuesta y quién lleva días sin entrar.',
    respaldo: 'Abre el menú y entra a Estudiantes.',
  },
  {
    ruta: /^\/historial-usuarios\/?$/, ir: '/historial-usuarios', ancla: 'avisar', avanza: 'boton',
    titulo: 'Avisa a tu clase',
    texto: 'Desde aquí envías un aviso a todos tus estudiantes: les llega a la campana y por correo. Hasta 3 al día.',
    respaldo: 'Cuando tu clase tenga estudiantes, aquí verás su avance y el formulario para enviarles avisos.',
  },
  {
    ruta: /^\/historial-usuarios\/?$/, ir: '/historial-usuarios', ancla: 'panel-clase', avanza: 'fin',
    titulo: '¡Listo!',
    texto: 'Toca a un estudiante para ver su ficha. Para organizar competencias usa el panel del jurado en Competencias. Todo está explicado en la Guía.',
  },
];
