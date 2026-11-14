import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { getDatos, guardarAvisosCorreo, responderDatos } from '../scripts/registroApi';
import { codigoVigente, errorDeCodigo, LARGO_CODIGO } from '../scripts/codigoUfpso';

const Seccion = ({ titulo, sub, children }) => (
  <section className="nb-dash-card nb-dash-pad">
    <h2 className="nb-dash-section-title">{titulo}</h2>
    {sub && <div className="nb-dash-section-sub">{sub}</div>}
    {children}
  </section>
);

/** Perfil, código UFPSO, contraseña y privacidad. Retirar la autorización vive aquí, no a mano. */
const MiCuentaPage = () => {
  const { user, isAdmin, displayName, codigoEstudiante, actualizarCodigoEstudiante } = useAuth();
  const [autorizado, setAutorizado] = useState(undefined);
  const [codigo, setCodigo] = useState('');
  const [mensajeCodigo, setMensajeCodigo] = useState(null);
  const [mensajeDatos, setMensajeDatos] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [avisosCorreo, setAvisosCorreo] = useState(undefined);
  const [mensajeCorreo, setMensajeCorreo] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    getDatos(user).then((d) => {
      if (!vigente) return;
      setAutorizado(d.autorizado);
      setAvisosCorreo(d.avisosCorreo);
    }).catch(() => {});
    return () => { vigente = false; };
  }, [user]);

  if (!user) return null;
  const conContrasena = user.providerData?.some((p) => p.providerId === 'password');

  const guardarCodigo = async (evento) => {
    evento.preventDefault();
    const problema = errorDeCodigo(codigo);
    if (problema) {
      setMensajeCodigo({ ok: false, texto: problema });
      return;
    }
    setOcupado(true);
    try {
      await actualizarCodigoEstudiante(codigo);
      setCodigo('');
      setMensajeCodigo({ ok: true, texto: 'Código actualizado.' });
    } catch {
      setMensajeCodigo({ ok: false, texto: 'No se pudo guardar el código.' });
    } finally {
      setOcupado(false);
    }
  };

  const cambiarCorreo = async (activo) => {
    setOcupado(true);
    setMensajeCorreo(null);
    try {
      const r = await guardarAvisosCorreo(user, activo);
      setAvisosCorreo(r.avisosCorreo);
      setMensajeCorreo({ ok: true, texto: r.avisosCorreo ? 'Avisos por correo activados.' : 'Ya no recibirás avisos por correo.' });
    } catch (e) {
      setMensajeCorreo({ ok: false, texto: e.message });
    } finally {
      setOcupado(false);
    }
  };

  const reenviarVerificacion = async () => {
    setOcupado(true);
    setMensajeCorreo(null);
    try {
      await sendEmailVerification(user);
      setMensajeCorreo({ ok: true, texto: `Te enviamos un enlace a ${user.email}. Ábrelo y vuelve a iniciar sesión.` });
    } catch {
      setMensajeCorreo({ ok: false, texto: 'No se pudo enviar el correo de verificación. Inténtalo más tarde.' });
    } finally {
      setOcupado(false);
    }
  };

  const cambiarAutorizacion = async (acepta) => {
    if (!acepta && !window.confirm('Si retiras la autorización, dejaremos de registrar tu actividad y borraremos la que ya está guardada. ¿Continuar?')) return;
    setOcupado(true);
    setMensajeDatos(null);
    try {
      const r = await responderDatos(user, acepta);
      setAutorizado(r.autorizado);
      setMensajeDatos({ ok: true, texto: r.autorizado ? 'Registro de actividad activado.' : 'Autorización retirada y actividad borrada.' });
    } catch (e) {
      setMensajeDatos({ ok: false, texto: e.message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="nb-dash-inner">
      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">Tu cuenta</div>
          <h1 className="nb-dash-hero-title">Mi cuenta</h1>
          <p className="nb-dash-hero-text">Tus datos, tu código UFPSO y cómo usamos tu información.</p>
        </div>
      </div>

      <div className="nb-doc-stack">
        <Seccion titulo="Perfil">
          <ul className="nb-doc-tabla">
            <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Nombre</small><strong>{displayName}</strong></span></li>
            <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Correo</small><strong>{user.email}</strong></span></li>
            <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Rol</small><strong>{isAdmin ? 'Docente' : 'Estudiante'}</strong></span></li>
            {!isAdmin && (
              <li className="nb-doc-fila is-col">
                <span className="nb-doc-celda is-grande">
                  <small>Código UFPSO</small>
                  <strong>{codigoEstudiante || '—'}{codigoEstudiante && !codigoVigente(codigoEstudiante) ? ' (formato anterior: actualízalo)' : ''}</strong>
                </span>
                <form className="nb-dash-clase-form" onSubmit={guardarCodigo}>
                  <input
                    className="nb-input"
                    aria-label="Código UFPSO nuevo"
                    inputMode="numeric"
                    maxLength={LARGO_CODIGO}
                    placeholder={`Nuevo código de ${LARGO_CODIGO} dígitos`}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  />
                  <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>Cambiar código</button>
                </form>
                {mensajeCodigo && <p className={`nb-dash-clase-msg${mensajeCodigo.ok ? '' : ' is-error'}`} role="status">{mensajeCodigo.texto}</p>}
              </li>
            )}
          </ul>
        </Seccion>

        {conContrasena && (
          <Seccion titulo="Contraseña">
            <p className="nb-doc-nota nb-doc-nota-top">Cámbiala si crees que alguien más la conoce.</p>
            <Link className="nb-doc-filtro" to="/reset">Cambiar contraseña</Link>
          </Seccion>
        )}

        <Seccion titulo="Avisos por correo" sub="Los avisos siempre aparecen en la campana">
          <p className="nb-doc-nota nb-doc-nota-top">
            Te escribimos solo para lo importante: avisos de tu docente, competencias que empiezan mañana y problemas a punto de cerrarse.
          </p>
          {!user.emailVerified && (
            <div className="nb-cuenta-acciones">
              <p className="nb-doc-nota">Tu correo no está verificado: hasta que lo verifiques no te llegarán correos.</p>
              <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={reenviarVerificacion}>
                Enviar correo de verificación
              </button>
            </div>
          )}
          {avisosCorreo !== undefined && (
            <div className="nb-cuenta-acciones">
              <div className="nb-ex-idioma is-bar" role="group" aria-label="Avisos por correo">
                <span className="nb-ex-idioma-label">Correos</span>
                {[[true, 'Activados'], [false, 'Apagados']].map(([valor, nombre]) => (
                  <button
                    key={nombre}
                    type="button"
                    className={`nb-ex-idioma-btn${avisosCorreo === valor ? ' is-active' : ''}`}
                    aria-pressed={avisosCorreo === valor}
                    disabled={ocupado}
                    onClick={() => { if (avisosCorreo !== valor) cambiarCorreo(valor); }}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensajeCorreo && <p className={`nb-dash-clase-msg${mensajeCorreo.ok ? '' : ' is-error'}`} role="status">{mensajeCorreo.texto}</p>}
        </Seccion>

        <Seccion titulo="Privacidad y cookies" sub="Ley 1581 de 2012">
          <p className="nb-doc-nota nb-doc-nota-top">
            {autorizado === true && 'Autorizaste registrar tu tiempo activo, cuándo abres cada problema y cuántas veces pegas código. Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio.'}
            {autorizado === false && 'No registramos tu actividad. Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio.'}
            {autorizado == null && 'Aún no has respondido el aviso de cookies.'}
          </p>
          <p className="nb-doc-nota">
            Los avisos por correo los enviamos con Resend (servidores en EE. UU.), que solo recibe tu correo y el texto del aviso. Puedes apagarlos aquí o con el enlace de cada correo.
          </p>
          {autorizado === true ? (
            <button type="button" className="nb-cuenta-revocar" disabled={ocupado} onClick={() => cambiarAutorizacion(false)}>
              Retirar autorización y borrar mi actividad
            </button>
          ) : (
            <div className="nb-cuenta-acciones">
              <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={() => cambiarAutorizacion(true)}>
                Autorizar registro de actividad
              </button>
            </div>
          )}
          {mensajeDatos && <p className={`nb-dash-clase-msg${mensajeDatos.ok ? '' : ' is-error'}`} role="status">{mensajeDatos.texto}</p>}
        </Seccion>
      </div>
    </div>
  );
};

export default MiCuentaPage;
