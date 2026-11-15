import { Link } from 'react-router-dom';
import PaginaInfo, { SeccionInfo } from '../components/PaginaInfo';

// Borrador conforme a la Ley 1581 de 2012 y al Decreto 1377 de 2013 (art. 13): lo revisa el equipo.
const CONTACTO = 'afsalasn@ufpso.edu.co';
const VIGENCIA = '15 de noviembre de 2026';

const SECCIONES = [
  { id: 'responsable', titulo: 'Responsable del tratamiento' },
  { id: 'datos', titulo: 'Qué datos recogemos' },
  { id: 'finalidades', titulo: 'Para qué los usamos' },
  { id: 'encargados', titulo: 'Quién nos ayuda a tratarlos' },
  { id: 'conservacion', titulo: 'Cuánto tiempo los guardamos' },
  { id: 'derechos', titulo: 'Tus derechos' },
  { id: 'procedimiento', titulo: 'Cómo ejercerlos' },
  { id: 'cookies', titulo: 'Cookies y almacenamiento local' },
  { id: 'vigencia', titulo: 'Vigencia y cambios' },
];

const PrivacidadPage = () => (
  <PaginaInfo
    kicker="Ley 1581 de 2012"
    titulo="Política de tratamiento de datos personales"
    intro="Cómo recogemos, usamos y protegemos tus datos en CODECOMP, y cómo ejercer tus derechos sobre ellos."
    secciones={SECCIONES}
  >
    <SeccionInfo id="responsable" titulo="Responsable del tratamiento">
      <p>El equipo de CODECOMP, proyecto de grado del programa de Ingeniería de Sistemas de la Universidad Francisco de Paula Santander Ocaña (UFPSO).</p>
      <ul>
        <li><strong>Domicilio:</strong> Sede Algodonal, vía Acolsure, Ocaña, Norte de Santander, Colombia.</li>
        <li><strong>Correo para consultas y reclamos:</strong> <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</li>
        <li><strong>Teléfono:</strong> pendiente.</li>
      </ul>
      <p>CODECOMP es para estudiantes y docentes universitarios mayores de edad. No recogemos a sabiendas datos de menores de 18 años.</p>
    </SeccionInfo>

    <SeccionInfo id="datos" titulo="Qué datos recogemos">
      <ul>
        <li><strong>De tu cuenta:</strong> nombre, apellido, correo, código estudiantil, cómo inicias sesión y cuándo.</li>
        <li><strong>De tu práctica:</strong> el código que envías, los veredictos del juez, las pistas que pides al tutor de IA, tu nivel, tu escalón, tus logros y tu avance en Fundamentos.</li>
        <li><strong>De tu actividad</strong>, solo si lo autorizas en el aviso de cookies: el tiempo activo en la plataforma y en cada ejercicio, cuándo abres cada problema y cuántas veces pegas código (solo la cantidad, nunca el contenido).</li>
        <li><strong>Tu foto de perfil</strong>, solo si decides subirla. Es opcional: no tienes que darla para usar CODECOMP.</li>
        <li><strong>De las competencias:</strong> tu equipo, tus envíos y tus preguntas al jurado.</li>
      </ul>
      <p>No pedimos datos sensibles. Si decides subir una foto, lo haces de forma voluntaria y puedes quitarla cuando quieras.</p>
    </SeccionInfo>

    <SeccionInfo id="finalidades" titulo="Para qué los usamos">
      <ul>
        <li>Darte acceso a la plataforma y calificar tus soluciones.</li>
        <li>Calcular tu nivel, recomendarte ejercicios y mostrarte tu progreso.</li>
        <li>Que tu docente vea el avance de su clase y pueda acompañarte.</li>
        <li>Enviarte avisos en la plataforma y, si lo permites, por correo.</li>
        <li>Organizar competencias y su marcador.</li>
        <li>Fines académicos del proyecto de grado, con datos agregados y sin identificarte.</li>
      </ul>
      <p>No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>
    </SeccionInfo>

    <SeccionInfo id="encargados" titulo="Quién nos ayuda a tratarlos">
      <p>Usamos estos servicios, que tratan datos por cuenta nuestra. Varios tienen servidores fuera de Colombia, principalmente en Estados Unidos, por lo que hay <strong>transmisión internacional de datos</strong>:</p>
      <ul>
        <li><strong>Google Firebase:</strong> inicio de sesión, perfil y alojamiento del sitio.</li>
        <li><strong>Supabase:</strong> base de datos con tus envíos, avance y actividad.</li>
        <li><strong>Amazon Web Services:</strong> el juez de PSeInt y el de competencias.</li>
        <li><strong>DeepInfra:</strong> el tutor de IA; recibe el enunciado, tu código y el veredicto, no tu nombre ni tu correo.</li>
        <li><strong>Resend:</strong> envío de correos; recibe tu correo y el texto del aviso.</li>
        <li><strong>Cloudflare:</strong> la conexión segura con la plataforma.</li>
        <li><strong>Judge0 (RapidAPI):</strong> el juez de Problemas; recibe tu código, no tus datos personales.</li>
      </ul>
    </SeccionInfo>

    <SeccionInfo id="conservacion" titulo="Cuánto tiempo los guardamos">
      <ul>
        <li>Tu cuenta, tus envíos y tu avance, mientras tengas la cuenta o hasta que pidas borrarlos.</li>
        <li>La actividad, 12 meses; si retiras la autorización, se borra de inmediato.</li>
        <li>Los avisos leídos, 90 días; los demás, 180 días.</li>
        <li>Las solicitudes de borrado ya resueltas, 12 meses, como constancia.</li>
      </ul>
    </SeccionInfo>

    <SeccionInfo id="derechos" titulo="Tus derechos">
      <p>Como titular de tus datos puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que nos diste.</li>
        <li>Saber cómo los hemos usado.</li>
        <li>Revocar la autorización y pedir que los borremos, cuando no haya un deber legal de conservarlos.</li>
        <li>Consultar gratis tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) cuando consideres que no respetamos la ley.</li>
      </ul>
    </SeccionInfo>

    <SeccionInfo id="procedimiento" titulo="Cómo ejercerlos">
      <ul>
        <li>En <Link to="/dashboard/cuenta">Mi cuenta</Link> puedes descargar tus datos, corregir tu nombre y tu código, apagar los correos, retirar la autorización de actividad y pedir el borrado de tus datos.</li>
        <li>También puedes escribir a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> desde el correo de tu cuenta, diciendo qué necesitas.</li>
        <li><strong>Consultas:</strong> respondemos en máximo 10 días hábiles; si necesitamos más tiempo te avisamos, sin pasar de 5 días hábiles adicionales.</li>
        <li><strong>Reclamos</strong> (corregir, actualizar, borrar o revocar): respondemos en máximo 15 días hábiles; si necesitamos más tiempo te avisamos, sin pasar de 8 días hábiles adicionales.</li>
      </ul>
    </SeccionInfo>

    <SeccionInfo id="cookies" titulo="Cookies y almacenamiento local">
      <p>Usamos una cookie cifrada para mantener tu sesión y, si lo autorizas, registrar tu actividad. En tu navegador guardamos preferencias como el idioma de los problemas, el tema del editor y el estado del recorrido guiado; esos datos no salen de tu equipo.</p>
    </SeccionInfo>

    <SeccionInfo id="vigencia" titulo="Vigencia y cambios">
      <p>Esta política rige desde el {VIGENCIA}. La base de datos estará vigente mientras dure el proyecto CODECOMP. Si cambiamos algo importante, te lo avisaremos en la plataforma.</p>
    </SeccionInfo>
  </PaginaInfo>
);

export default PrivacidadPage;
