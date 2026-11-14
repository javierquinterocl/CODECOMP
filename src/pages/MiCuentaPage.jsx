import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../scripts/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getClases, getDatos, guardarAvisosCorreo, responderDatos } from '../scripts/registroApi';
import {
  cancelarBorrado, cerrarSesiones, ejecutarBorrado, getCuenta, getMisDatos, pedirBorrado,
  prepararFoto, quitarFoto, subirFoto,
} from '../scripts/cuentaApi';
import { borrarPerfilFirestore, getUserSessions } from '../scripts/registerService';
import { codigoVigente, errorDeCodigo, LARGO_CODIGO } from '../scripts/codigoUfpso';
import { useResumenProgreso } from '../scripts/useEscalon';
import { useIdioma } from '../scripts/useIdioma';
import { useTemaEditor } from '../scripts/useTemaEditor';
import { TEXTOS_LOGROS } from '../scripts/logros';
import { NIVELES } from '../scripts/problemsData';
import { IdiomaSwitch } from '../components/ProblemBits';
import FotoPerfil from '../components/FotoPerfil';
import ConfirmarDialogo from '../components/ConfirmarDialogo';
import useConfirmar from '../scripts/useConfirmar';

const PROGRAMA = 'Ingeniería de Sistemas';
const PROVEEDORES = { 'google.com': 'Google', password: 'Correo y contraseña', 'github.com': 'GitHub', 'facebook.com': 'Facebook' };

const fecha = (valor) => (valor ? new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const Seccion = ({ titulo, sub, children }) => (
  <section className="nb-dash-card nb-dash-pad">
    <h2 className="nb-dash-section-title">{titulo}</h2>
    {sub && <div className="nb-dash-section-sub">{sub}</div>}
    {children}
  </section>
);

const Mensaje = ({ m }) => (m ? <p className={`nb-dash-clase-msg${m.ok ? '' : ' is-error'}`} role="status">{m.texto}</p> : null);

/** Conmutador de dos opciones con la pieza del idioma (`.nb-ex-idioma`). */
const DosOpciones = ({ etiqueta, valor, opciones, onCambiar, disabled }) => (
  <div className="nb-ex-idioma is-bar" role="group" aria-label={etiqueta}>
    <span className="nb-ex-idioma-label">{etiqueta}</span>
    {opciones.map(([v, nombre]) => (
      <button key={nombre} type="button" className={`nb-ex-idioma-btn${valor === v ? ' is-active' : ''}`}
        aria-pressed={valor === v} disabled={disabled} onClick={() => { if (valor !== v) onCambiar(v); }}>
        {nombre}
      </button>
    ))}
  </div>
);

/** Mi cuenta: perfil con foto, logros, seguridad, preferencias, Mis datos y, para el docente, su panel. */
const MiCuentaPage = () => {
  const {
    user, isAdmin, displayName, codigoEstudiante, actualizarCodigoEstudiante, storedPhotoURL,
    fotoPropia, refrescarFoto, actualizarNombre, handleLogout,
  } = useAuth();
  const resumen = useResumenProgreso(user);
  const { idioma, cambiar: cambiarIdioma } = useIdioma();
  const [claroProblemas, setClaroProblemas] = useTemaEditor('problemas');
  const [claroPseint, setClaroPseint] = useTemaEditor('pseint');
  const { pedido, confirmar, responder } = useConfirmar();

  const [cuenta, setCuenta] = useState(null);
  const [clases, setClases] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [autorizado, setAutorizado] = useState(undefined);
  const [avisosCorreo, setAvisosCorreo] = useState(undefined);
  const [ocupado, setOcupado] = useState(false);
  const [mensajes, setMensajes] = useState({});
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState({ nombre: '', apellido: '' });
  const [consiente, setConsiente] = useState(false);
  const [correoConfirmado, setCorreoConfirmado] = useState({});
  const avisar = (seccion, ok, texto) => setMensajes((m) => ({ ...m, [seccion]: { ok, texto } }));

  const recargar = useCallback(() => {
    if (!user) return;
    getCuenta(user).then(setCuenta).catch((e) => avisar('cuenta', false, e.message));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    recargar();
    getClases(user).then((d) => { if (vigente) setClases(d); }).catch(() => {});
    getUserSessions(user.uid).then((s) => { if (vigente) setSesiones(s.slice(0, 5)); });
    getDatos(user).then((d) => { if (vigente) { setAutorizado(d.autorizado); setAvisosCorreo(d.avisosCorreo); } }).catch(() => {});
    getDoc(doc(db, 'usuarios_registrados', user.uid)).then((s) => {
      if (vigente && s.exists()) setNombre({ nombre: s.data().nombre ?? '', apellido: s.data().apellido ?? '' });
    }).catch(() => {});
    return () => { vigente = false; };
  }, [user, recargar]);

  if (!user) return null;
  const conContrasena = user.providerData?.some((p) => p.providerId === 'password');
  const proveedores = (user.providerData ?? []).map((p) => PROVEEDORES[p.providerId] ?? p.providerId).join(', ');
  const ejecutar = async (seccion, accion, exito) => {
    setOcupado(true);
    try {
      const r = await accion();
      if (exito) avisar(seccion, true, typeof exito === 'function' ? exito(r) : exito);
      return r;
    } catch (e) {
      avisar(seccion, false, e.message);
      return null;
    } finally {
      setOcupado(false);
    }
  };

  /* ── Foto ── */
  const elegirFoto = async (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    await ejecutar('foto', async () => {
      const r = await subirFoto(user, await prepararFoto(archivo));
      await refrescarFoto(r.fotoVersion);
      setCuenta((c) => (c ? { ...c, fotoVersion: r.fotoVersion } : c));
    }, 'Foto actualizada.');
  };
  const borrarFoto = () => ejecutar('foto', async () => {
    await quitarFoto(user);
    await refrescarFoto(null);
    setCuenta((c) => (c ? { ...c, fotoVersion: null } : c));
  }, 'Foto quitada.');

  /* ── Perfil ── */
  const guardarNombre = (e) => {
    e.preventDefault();
    if (!nombre.nombre.trim()) return avisar('perfil', false, 'Escribe tu nombre.');
    return ejecutar('perfil', () => actualizarNombre(nombre.nombre.trim(), nombre.apellido.trim()), 'Nombre actualizado.');
  };
  const guardarCodigo = (e) => {
    e.preventDefault();
    const problema = errorDeCodigo(codigo);
    if (problema) return avisar('codigo', false, problema);
    return ejecutar('codigo', async () => { await actualizarCodigoEstudiante(codigo); setCodigo(''); }, 'Código actualizado.');
  };

  /* ── Seguridad ── */
  const cerrarTodas = async () => {
    if (!(await confirmar({
      titulo: 'Cerrar sesión en todos los dispositivos',
      mensaje: 'Se cerrará tu sesión en todos los navegadores, también en este. Tendrás que volver a entrar.',
      confirmar: 'Cerrar sesiones',
    }))) return;
    const r = await ejecutar('seguridad', () => cerrarSesiones(user));
    if (r) await handleLogout();
  };

  /* ── Mis datos ── */
  const descargarDatos = () => ejecutar('datos', async () => {
    const datos = await getMisDatos(user);
    const perfil = await getDoc(doc(db, 'usuarios_registrados', user.uid)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
    const archivo = new Blob([JSON.stringify({ ...datos, perfil_firestore: perfil }, null, 2)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `codecomp-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }, 'Descarga lista.');
  const solicitarBorrado = async () => {
    if (!(await confirmar({
      titulo: 'Pedir borrado de mis datos',
      mensaje: 'Un docente revisará tu solicitud y borrará tus envíos, tu avance, tus pistas y tu cuenta. No se puede deshacer una vez ejecutado.',
      confirmar: 'Pedir borrado',
      peligro: true,
    }))) return;
    await ejecutar('datos', async () => { await pedirBorrado(user); recargar(); }, 'Solicitud enviada.');
  };
  const anularBorrado = () => ejecutar('datos', async () => { await cancelarBorrado(user); recargar(); }, 'Solicitud cancelada.');

  /* ── Docente: ejecutar borrado (primero Firestore, después la base) ── */
  const ejecutarSolicitud = (s) => ejecutar('docente', async () => {
    await borrarPerfilFirestore(s.firebase_uid);
    const r = await ejecutarBorrado(user, s.id);
    recargar();
    return r;
  }, (r) => `Datos borrados. Falta borrar la cuenta de acceso en la consola de Firebase (Authentication), uid ${r.firebaseUid}.`);

  const cambiarCorreo = (activo) => ejecutar('correo', async () => {
    const r = await guardarAvisosCorreo(user, activo);
    setAvisosCorreo(r.avisosCorreo);
  }, activo ? 'Avisos por correo activados.' : 'Ya no recibirás avisos por correo.');
  const reenviarVerificacion = () => ejecutar('correo', () => sendEmailVerification(user),
    `Te enviamos un enlace a ${user.email}. Ábrelo y vuelve a iniciar sesión.`);
  const cambiarAutorizacion = async (acepta) => {
    if (!acepta && !(await confirmar({
      titulo: 'Retirar autorización',
      mensaje: 'Dejaremos de registrar tu actividad y borraremos la que ya está guardada.',
      confirmar: 'Retirar',
      peligro: true,
    }))) return;
    await ejecutar('privacidad', async () => { const r = await responderDatos(user, acepta); setAutorizado(r.autorizado); },
      acepta ? 'Registro de actividad activado.' : 'Autorización retirada y actividad borrada.');
  };

  const fundamentosHechos = resumen?.user?.fundamentos_resueltos ?? 0;
  const problemasHechos = resumen?.user?.solved_count ?? 0;
  const logros = cuenta?.logros ?? [];
  const conseguidos = logros.filter((l) => l.conseguido).length;

  return (
    <div className="nb-dash-inner">
      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">Tu cuenta</div>
          <h1 className="nb-dash-hero-title">Mi cuenta</h1>
          <p className="nb-dash-hero-text">Tu perfil, tus logros, la seguridad de tu cuenta y lo que hacemos con tus datos.</p>
        </div>
      </div>

      <div className="nb-doc-stack">
        {/* ── Tarjeta de perfil ── */}
        <section className="nb-dash-card nb-dash-pad nb-cuenta-perfil">
          <div className="nb-cuenta-perfil-foto">
            <FotoPerfil grande src={fotoPropia || storedPhotoURL || user.photoURL} nombre={displayName} />
            <div className="nb-cuenta-foto-acciones">
              {!fotoPropia && (
                <label className="nb-cuenta-consentimiento">
                  <input type="checkbox" checked={consiente} onChange={(e) => setConsiente(e.target.checked)} />
                  Autorizo mostrar mi foto a mis docentes en CODECOMP.
                </label>
              )}
              <label className={`nb-dash-btn-claro${ocupado || (!fotoPropia && !consiente) ? ' is-disabled' : ''}`}>
                {fotoPropia ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" hidden disabled={ocupado || (!fotoPropia && !consiente)} onChange={elegirFoto} />
              </label>
              {fotoPropia && <button type="button" className="nb-cuenta-revocar" disabled={ocupado} onClick={borrarFoto}>Quitar foto</button>}
            </div>
            <Mensaje m={mensajes.foto} />
          </div>
          <div className="nb-cuenta-perfil-datos">
            <h2 className="nb-dash-section-title">{displayName}</h2>
            <div className="nb-dash-section-sub">{isAdmin ? 'Docente' : `Estudiante · ${PROGRAMA}`}</div>
            <ul className="nb-doc-tabla">
              <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Correo</small><strong>{user.email}</strong></span></li>
              {!isAdmin && <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Código UFPSO</small><strong>{codigoEstudiante || '—'}</strong></span></li>}
            </ul>
            {!isAdmin && resumen && (
              <div className="nb-pb-hero-stats nb-cuenta-cifras">
                <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Nivel</div><div className="nb-pb-hstat-value">{Math.round(Number(resumen.user?.global_rating ?? 0))}</div></div>
                <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Escalón</div><div className="nb-pb-hstat-value">{resumen.escalon?.actual ?? '—'}</div><div className="nb-pb-hstat-sub">{NIVELES[resumen.escalon?.actual] ?? ''}</div></div>
                <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Racha</div><div className="nb-pb-hstat-value">{resumen.racha ?? 0}</div><div className="nb-pb-hstat-sub">días seguidos</div></div>
                <div className="nb-pb-hstat"><div className="nb-pb-hstat-label">Resueltos</div><div className="nb-pb-hstat-value">{problemasHechos + fundamentosHechos}</div><div className="nb-pb-hstat-sub">{problemasHechos} problemas · {fundamentosHechos} Fundamentos</div></div>
              </div>
            )}
            {!isAdmin && (
              <div className="nb-cuenta-chips">
                {(clases?.clases ?? []).map((c) => <span key={c.id} className="nb-dash-chip">Clase: {c.nombre}</span>)}
                {cuenta?.competencias?.total > 0 && <span className="nb-dash-chip">{cuenta.competencias.total} {cuenta.competencias.total === 1 ? 'competencia' : 'competencias'}</span>}
                {cuenta?.competencias?.proxima && <span className="nb-dash-chip">Próxima: {cuenta.competencias.proxima.nombre} · {fecha(cuenta.competencias.proxima.inicio)}</span>}
              </div>
            )}
          </div>
        </section>

        {/* ── Editar perfil ── */}
        <Seccion titulo="Editar perfil" sub={isAdmin ? undefined : 'Tu docente sigue viendo tu nombre de usuario de CODECOMP'}>
          <form className="nb-comp-form nb-comp-campos" onSubmit={guardarNombre}>
            <label className="nb-comp-campo"><span className="nb-label">Nombre</span>
              <input className="nb-input" value={nombre.nombre} maxLength={60} onChange={(e) => setNombre((n) => ({ ...n, nombre: e.target.value }))} /></label>
            <label className="nb-comp-campo"><span className="nb-label">Apellido</span>
              <input className="nb-input" value={nombre.apellido} maxLength={60} onChange={(e) => setNombre((n) => ({ ...n, apellido: e.target.value }))} /></label>
            <div className="nb-comp-campo is-boton"><button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>Guardar nombre</button></div>
          </form>
          <Mensaje m={mensajes.perfil} />
          {!isAdmin && (
            <>
              <p className="nb-doc-nota nb-doc-nota-top">
                Código UFPSO: <strong>{codigoEstudiante || '—'}</strong>{codigoEstudiante && !codigoVigente(codigoEstudiante) ? ' (formato anterior: actualízalo)' : ''}
              </p>
              <form className="nb-dash-clase-form" onSubmit={guardarCodigo}>
                <input className="nb-input" aria-label="Código UFPSO nuevo" inputMode="numeric" maxLength={LARGO_CODIGO}
                  placeholder={`Nuevo código de ${LARGO_CODIGO} dígitos`} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
                <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>Cambiar código</button>
              </form>
              <Mensaje m={mensajes.codigo} />
            </>
          )}
        </Seccion>

        {/* ── Logros ── */}
        {!isAdmin && (
          <Seccion titulo="Logros" sub={cuenta ? `${conseguidos} de ${logros.length} conseguidos` : 'Cargando…'}>
            <ul className="nb-cuenta-logros">
              {logros.map((l) => {
                const t = TEXTOS_LOGROS[l.id] ?? { nombre: l.id, descripcion: '' };
                return (
                  <li key={l.id} className={`nb-cuenta-logro${l.conseguido ? ' is-ok' : ''}`}>
                    <strong>{t.nombre}</strong>
                    <small>{t.descripcion}</small>
                    <span className="nb-cuenta-logro-barra" aria-hidden="true"><span style={{ '--avance': `${(l.actual / l.meta) * 100}%` }} /></span>
                    <small className="nb-cuenta-logro-cifra">{l.conseguido ? 'Conseguido' : `${l.actual} de ${l.meta}`}</small>
                  </li>
                );
              })}
            </ul>
          </Seccion>
        )}

        {/* ── Seguridad ── */}
        <Seccion titulo="Seguridad">
          <ul className="nb-doc-tabla">
            <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Entras con</small><strong>{proveedores || '—'}</strong></span></li>
            <li className="nb-doc-fila"><span className="nb-doc-celda is-grande"><small>Último ingreso</small><strong>{fecha(user.metadata?.lastSignInTime)}</strong></span></li>
          </ul>
          {sesiones.length > 0 && (
            <>
              <p className="nb-doc-nota nb-doc-nota-top">Tus últimas sesiones</p>
              <ul className="nb-doc-tabla">
                {sesiones.map((s) => (
                  <li key={s.id} className="nb-doc-fila">
                    <span className="nb-doc-celda is-grande"><small>{PROVEEDORES[`${s.method}.com`] ?? (s.method === 'email' ? 'Correo y contraseña' : s.method)}</small><strong>{fecha(s.entryTime)}</strong></span>
                    <span className={`nb-doc-estado${s.status === 'activo' ? ' is-on' : ''}`}>{s.status === 'activo' ? 'Activa' : 'Cerrada'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="nb-cuenta-acciones">
            {conContrasena && <Link className="nb-dash-btn-claro" to="/reset">Cambiar contraseña</Link>}
            <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={cerrarTodas}>
              Cerrar sesión en todos los dispositivos
            </button>
          </div>
          <Mensaje m={mensajes.seguridad} />
        </Seccion>

        {/* ── Preferencias ── */}
        <Seccion titulo="Preferencias" sub="Se guardan en este navegador">
          <div className="nb-cuenta-acciones">
            <IdiomaSwitch idioma={idioma} onCambiar={cambiarIdioma} conEtiqueta />
            <DosOpciones etiqueta="Editor de Problemas" valor={claroProblemas} onCambiar={setClaroProblemas} opciones={[[false, 'Oscuro'], [true, 'Claro']]} />
            <DosOpciones etiqueta="Editor de PSeInt" valor={claroPseint} onCambiar={setClaroPseint} opciones={[[true, 'Claro'], [false, 'Oscuro']]} />
          </div>
        </Seccion>

        {/* ── Avisos por correo ── */}
        <Seccion titulo="Avisos por correo" sub="Los avisos siempre aparecen en la campana">
          <p className="nb-doc-nota nb-doc-nota-top">
            Te escribimos solo para lo importante: avisos de tu docente, competencias que empiezan mañana y problemas a punto de cerrarse.
          </p>
          {!user.emailVerified && (
            <div className="nb-cuenta-acciones">
              <p className="nb-doc-nota">Tu correo no está verificado: hasta que lo verifiques no te llegarán correos.</p>
              <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={reenviarVerificacion}>Enviar correo de verificación</button>
            </div>
          )}
          {avisosCorreo !== undefined && (
            <div className="nb-cuenta-acciones">
              <DosOpciones etiqueta="Correos" valor={avisosCorreo} onCambiar={cambiarCorreo} disabled={ocupado} opciones={[[true, 'Activados'], [false, 'Apagados']]} />
            </div>
          )}
          <Mensaje m={mensajes.correo} />
        </Seccion>

        {/* ── Mis datos ── */}
        {!isAdmin && (
          <Seccion titulo="Mis datos" sub="Ley 1581 de 2012">
            <p className="nb-doc-nota nb-doc-nota-top">Descarga una copia de todo lo que CODECOMP guarda de ti: envíos con su código, avance, pistas, actividad y avisos.</p>
            <div className="nb-cuenta-acciones">
              <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={descargarDatos}>Descargar mis datos</button>
            </div>
            {cuenta?.solicitudBorrado ? (
              <p className="nb-doc-nota nb-doc-nota-top">
                Pediste borrar tus datos el {fecha(cuenta.solicitudBorrado.creada_en)}. Un docente la revisará pronto.{' '}
                <button type="button" className="nb-dash-aviso-mas" disabled={ocupado} onClick={anularBorrado}>Cancelar solicitud</button>
              </p>
            ) : (
              <button type="button" className="nb-cuenta-revocar" disabled={ocupado || !cuenta} onClick={solicitarBorrado}>Pedir borrado de mis datos</button>
            )}
            <Mensaje m={mensajes.datos} />
          </Seccion>
        )}

        {/* ── Privacidad ── */}
        <Seccion titulo="Privacidad y cookies" sub="Ley 1581 de 2012">
          <p className="nb-doc-nota nb-doc-nota-top">
            {autorizado === true && 'Autorizaste registrar tu tiempo activo, cuándo abres cada problema y cuántas veces pegas código. Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio.'}
            {autorizado === false && 'No registramos tu actividad. Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio.'}
            {autorizado == null && 'Aún no has respondido el aviso de cookies.'}
          </p>
          <p className="nb-doc-nota">
            Tu foto solo la ven tú y tus docentes. Los avisos por correo los enviamos con Resend (servidores en EE. UU.), que solo recibe tu correo y el texto del aviso.
            Si pides el borrado, se eliminan tus datos de CODECOMP; quedan sin tu nombre las ejecuciones de prueba y, si competiste, el nombre del equipo en el juez de competencias. La solicitud se guarda 12 meses como constancia.
          </p>
          {autorizado === true ? (
            <button type="button" className="nb-cuenta-revocar" disabled={ocupado} onClick={() => cambiarAutorizacion(false)}>Retirar autorización y borrar mi actividad</button>
          ) : (
            <div className="nb-cuenta-acciones">
              <button type="button" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado} onClick={() => cambiarAutorizacion(true)}>Autorizar registro de actividad</button>
            </div>
          )}
          <Mensaje m={mensajes.privacidad} />
        </Seccion>

        {/* ── Docente ── */}
        {isAdmin && (
          <Seccion titulo="Panel docente">
            <div className="nb-cuenta-acciones">
              <Link className="nb-dash-btn-claro" to="/historial-usuarios">Panel de estudiantes</Link>
              <Link className="nb-dash-btn-claro" to="/dashboard/competencias/jurado">Panel del jurado</Link>
            </div>
            <p className="nb-doc-nota nb-doc-nota-top">Tus clases</p>
            {clases?.clases?.length ? (
              <ul className="nb-doc-tabla">
                {clases.clases.map((c) => (
                  <li key={c.id} className="nb-doc-fila">
                    <span className="nb-doc-celda is-grande"><small>{c.miembros} {c.miembros === 1 ? 'estudiante' : 'estudiantes'}</small><strong>{c.nombre}</strong></span>
                    <span className="nb-dash-clase-codigo" title="Código para entrar a la clase">{c.codigo}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="nb-doc-vacio">Aún no tienes clases.</p>}
            <p className="nb-doc-nota nb-doc-nota-top">Tus competencias como jurado</p>
            {cuenta?.docente?.competencias?.length ? (
              <ul className="nb-doc-tabla">
                {cuenta.docente.competencias.map((c) => (
                  <li key={c.cid} className="nb-doc-fila">
                    <span className="nb-doc-celda is-grande"><small>{c.archivada ? 'Archivada' : fecha(c.inicio)}</small>
                      <strong><Link to={`/dashboard/competencias/jurado/${c.cid}`}>{c.nombre}</Link></strong></span>
                  </li>
                ))}
              </ul>
            ) : <p className="nb-doc-vacio">No has creado competencias.</p>}
            <p className="nb-doc-nota nb-doc-nota-top">Solicitudes de borrado pendientes</p>
            {cuenta?.docente?.solicitudesBorrado?.length ? (
              <ul className="nb-doc-tabla">
                {cuenta.docente.solicitudesBorrado.map((s) => (
                  <li key={s.id} className="nb-doc-fila is-col">
                    <span className="nb-doc-celda is-grande"><small>Pedida el {fecha(s.creada_en)}</small><strong>{s.email}</strong></span>
                    <form className="nb-dash-clase-form" onSubmit={(e) => { e.preventDefault(); ejecutarSolicitud(s); }}>
                      <input className="nb-input" aria-label={`Escribe ${s.email} para confirmar`} placeholder="Escribe el correo para confirmar"
                        value={correoConfirmado[s.id] ?? ''} onChange={(e) => setCorreoConfirmado((m) => ({ ...m, [s.id]: e.target.value }))} />
                      <button type="submit" className="nb-ex-send" disabled={ocupado || (correoConfirmado[s.id] ?? '').trim().toLowerCase() !== String(s.email).toLowerCase()}>
                        Ejecutar borrado
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p className="nb-doc-vacio">No hay solicitudes pendientes.</p>}
            <Mensaje m={mensajes.docente} />
          </Seccion>
        )}
        <Mensaje m={mensajes.cuenta} />
      </div>
      <ConfirmarDialogo pedido={pedido} onRespuesta={responder} />
    </div>
  );
};

export default MiCuentaPage;
