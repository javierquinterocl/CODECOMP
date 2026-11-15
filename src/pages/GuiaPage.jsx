import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../scripts/firebaseConfig';
import { iniciarTutorial } from '../scripts/tutorial';
import PaginaInfo, { SeccionInfo } from '../components/PaginaInfo';

// Textos borrador: los decide el equipo.
const SECCIONES = [
  { id: 'que-es', titulo: 'Qué es CODECOMP' },
  { id: 'primeros-pasos', titulo: 'Primeros pasos' },
  { id: 'fundamentos', titulo: 'Fundamentos (PSeInt)' },
  { id: 'problemas', titulo: 'Problemas' },
  { id: 'nivel', titulo: 'Nivel, escalón y racha' },
  { id: 'competencias', titulo: 'Competencias' },
  { id: 'avisos', titulo: 'Avisos' },
  { id: 'cuenta', titulo: 'Mi cuenta y tus datos' },
  { id: 'docentes', titulo: 'Para docentes' },
  { id: 'accesibilidad', titulo: 'Accesibilidad' },
  { id: 'preguntas', titulo: 'Preguntas frecuentes' },
];

const GuiaPage = () => {
  const navigate = useNavigate();
  // El recorrido vive en el tablero: se deja marcado y se va hacia allá.
  const repetir = () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return navigate('/', { state: { openLogin: true } });
    iniciarTutorial(uid);
    return navigate('/dashboard');
  };

  return (
    <PaginaInfo
      kicker="Guía de uso"
      titulo="Cómo usar CODECOMP"
      intro="Todo lo que necesitas para practicar, competir y seguir tu avance. Si prefieres que te mostremos la plataforma paso a paso, haz el recorrido guiado."
      secciones={SECCIONES}
    >
      <div className="nb-info-acciones">
        <button type="button" className="nb-btn-blue" onClick={repetir}>Hacer el recorrido guiado</button>
      </div>

      <SeccionInfo id="que-es" titulo="Qué es CODECOMP">
        <p>Una plataforma de programación competitiva para el grupo de maratón de Ingeniería de Sistemas de la UFPS Ocaña. Practicas con ejercicios que se califican al instante, recibes pistas de un tutor de IA y ves cómo mejora tu nivel.</p>
      </SeccionInfo>

      <SeccionInfo id="primeros-pasos" titulo="Primeros pasos">
        <ol>
          <li><strong>Crea tu cuenta</strong> con tu correo (mejor el institucional) o entra con Google o GitHub.</li>
          <li><strong>Completa tu perfil</strong> con tu nombre y tu código de 7 dígitos de la UFPSO.</li>
          <li><strong>Únete a tu clase</strong> en el tablero, con el código de 6 letras que te da tu docente.</li>
          <li><strong>Empieza por Fundamentos</strong> si estás aprendiendo, o por Problemas si ya programas.</li>
        </ol>
      </SeccionInfo>

      <SeccionInfo id="fundamentos" titulo="Fundamentos (PSeInt)">
        <p>Ejercicios para aprender a programar en PSeInt, ordenados por tema y dificultad. En cada uno lees el enunciado, escribes tu algoritmo en el editor y pulsas <strong>Enviar</strong>.</p>
        <ul>
          <li><strong>Aceptado:</strong> tu algoritmo pasó los ejemplos y los casos ocultos.</li>
          <li><strong>Respuesta incorrecta:</strong> la salida no coincide. Si falla un ejemplo, ves la entrada, lo esperado y lo tuyo; si falla un caso oculto, no se muestra cuál, para que pienses qué entradas no contemplas.</li>
          <li><strong>Error en la línea N:</strong> PSeInt no pudo ejecutar esa línea; el mensaje explica por qué.</li>
          <li><strong>Pedir retroalimentación:</strong> el tutor de IA te da una pista sin darte la solución. Hay que esperar un minuto entre pistas.</li>
        </ul>
        <p>Tu borrador se guarda solo, así que puedes salir y volver.</p>
      </SeccionInfo>

      <SeccionInfo id="problemas" titulo="Problemas">
        <p>Problemas de programación competitiva por categoría y dificultad, en inglés o español (lo eliges con el botón ES / EN). Escribe tu solución en Python, C++, Java u otro lenguaje disponible y envíala: el juez la prueba con todos los casos.</p>
        <p>Veredictos: <strong>Aceptado</strong>, <strong>Respuesta incorrecta</strong>, <strong>Tiempo excedido</strong> (tu solución es lenta), <strong>Error de ejecución</strong> y <strong>Error de compilación</strong>.</p>
      </SeccionInfo>

      <SeccionInfo id="nivel" titulo="Nivel, escalón y racha">
        <ul>
          <li><strong>Nivel:</strong> un número que sube cuando resuelves problemas difíciles para ti y baja poco cuando fallas. Solo cuenta Problemas.</li>
          <li><strong>Escalón:</strong> la dificultad que te recomendamos, de Muy fácil a Muy difícil. Subes al resolver 5 problemas de tu escalón o al alcanzar el nivel.</li>
          <li><strong>Racha:</strong> días seguidos en los que enviaste algo.</li>
        </ul>
        <p>Todo esto lo ves en <Link to="/dashboard/progreso">Mi progreso</Link>.</p>
      </SeccionInfo>

      <SeccionInfo id="competencias" titulo="Competencias">
        <p>Tu docente organiza competencias por equipos, como en la maratón. Durante la competencia ves los problemas, envías soluciones, consultas el marcador y haces preguntas al jurado. Te avisamos un día y una hora antes de que empiece.</p>
      </SeccionInfo>

      <SeccionInfo id="avisos" titulo="Avisos">
        <p>La campana de arriba muestra tus avisos: mensajes de tu docente, competencias por empezar, problemas a punto de cerrarse y logros. Algunos también llegan por correo; puedes apagarlos en Mi cuenta.</p>
      </SeccionInfo>

      <SeccionInfo id="cuenta" titulo="Mi cuenta y tus datos">
        <p>En <Link to="/dashboard/cuenta">Mi cuenta</Link> cambias tu foto, tu nombre y tu código, ves tus logros, cierras sesión en todos tus dispositivos, descargas tus datos o pides que los borremos. Lee cómo los usamos en la <Link to="/privacidad">política de tratamiento de datos</Link>.</p>
      </SeccionInfo>

      <SeccionInfo id="docentes" titulo="Para docentes">
        <ul>
          <li><strong>Crea una clase</strong> en el tablero y comparte el código de 6 letras con tus estudiantes.</li>
          <li><strong>Estudiantes:</strong> el panel muestra quién practica, qué le cuesta y alertas de quien lleva días sin entrar. Toca a un estudiante para ver su ficha.</li>
          <li><strong>Avisar a la clase:</strong> hasta 3 avisos al día, a la campana y por correo.</li>
          <li><strong>Competencias:</strong> desde el panel del jurado creas la competencia, armas los equipos, eliges los problemas y respondes aclaraciones.</li>
        </ul>
      </SeccionInfo>

      <SeccionInfo id="accesibilidad" titulo="Accesibilidad">
        <p>Puedes usar CODECOMP solo con el teclado: <kbd>Tab</kbd> recorre los controles y el foco siempre se ve con un contorno azul. Los formularios dicen qué falta y dan un ejemplo de lo que va en cada campo. Si algo no te funciona, escríbenos a <a href="mailto:afsalasn@ufpso.edu.co">afsalasn@ufpso.edu.co</a>.</p>
      </SeccionInfo>

      <SeccionInfo id="preguntas" titulo="Preguntas frecuentes">
        <p><strong>No me llegó el correo para cambiar la contraseña.</strong> Revisa spam y espera unos minutos. Si entras con Google, no tienes contraseña en CODECOMP.</p>
        <p><strong>Mi código tenía 6 dígitos.</strong> Desde 2026 son 7: actualízalo en Mi cuenta.</p>
        <p><strong>¿Por qué no veo la entrada del caso que falló?</strong> Los casos ocultos se guardan en secreto para que la solución sea general, no hecha a la medida de los ejemplos.</p>
      </SeccionInfo>
    </PaginaInfo>
  );
};

export default GuiaPage;
