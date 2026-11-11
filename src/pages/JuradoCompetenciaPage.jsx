import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlagIcon } from '../components/AppIcons';
import NbSelect from '../components/NbSelect';
import MarcadorTabla from '../components/competencias/MarcadorTabla';
import Aclaraciones from '../components/competencias/Aclaraciones';
import { JUEZ_URL } from '../scripts/config';
import {
  agregarDelBanco, agregarMiembro, archivarCompetencia, buscarBanco, buscarEstudiantes, cambiarInicio,
  crearEquipo, descongelarMarcador, editarEquipo, getAclaracionesJurado, getCodigoEnvio, getCompetenciaJurado,
  getEnviosJurado, getGlobos, getMarcadorJurado, liberarProblemas, marcarGlobo, nuevaClaveEquipo, quitarMiembro,
  quitarProblema, responderAclaracion, subirPaquete,
} from '../scripts/juradoApi';
import {
  claseVeredicto, ESTADOS, fechaCorta, isoDesdeLocal, LETRAS, localDesdeIso, VEREDICTOS,
} from '../scripts/competenciasData';

const PESTANAS = [
  ['datos', 'Datos'], ['equipos', 'Equipos'], ['problemas', 'Problemas'],
  ['envios', 'Envíos'], ['aclaraciones', 'Aclaraciones'], ['globos', 'Globos'], ['marcador', 'Marcador'],
];

/** Carga periódica para las pestañas en vivo; devuelve los datos, el error y cómo recargar. */
const useEnVivo = (cargar, cadaMs) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => cargar()
    .then((d) => { setDatos(d); setError(''); })
    .catch((e) => setError(e.message)), [cargar]);
  useEffect(() => {
    recargar();
    const t = setInterval(recargar, cadaMs);
    return () => clearInterval(t);
  }, [recargar, cadaMs]);
  return { datos, error, recargar };
};

/** Ejecuta una acción del jurado mostrando su error; devuelve el resultado o null. */
const useAccion = () => {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const ejecutar = async (fn) => {
    setOcupado(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setOcupado(false);
    }
  };
  return { ocupado, error, ejecutar };
};

const Credencial = ({ datos, onCerrar }) => (
  <div className="nb-comp-credencial" role="status">
    <div>
      <div className="nb-dash-kicker">Cuenta de respaldo del equipo</div>
      <p className="nb-comp-sub">Sirve para entrar directo al juez si CODECOMP falla. Anótala ahora: no se vuelve a mostrar.</p>
      <p className="nb-comp-cred-datos">Usuario <code>{datos.usuario}</code> · Clave <code>{datos.clave}</code></p>
    </div>
    <button type="button" className="nb-dash-btn-claro" onClick={onCerrar}>Listo</button>
  </div>
);

// ── Datos ──

const Datos = ({ user, comp, recargar }) => {
  const [inicio, setInicio] = useState(localDesdeIso(comp.inicio));
  const { ocupado, error, ejecutar } = useAccion();
  const [hecho, setHecho] = useState('');

  const guardarInicio = async (e) => {
    e.preventDefault();
    if (await ejecutar(() => cambiarInicio(user, comp.cid, isoDesdeLocal(inicio)))) { setHecho('Hora actualizada.'); recargar(); }
  };
  const archivar = async () => {
    if (!comp.archivada && !window.confirm('¿Archivar esta competencia? Dejará de verse para los estudiantes.')) return;
    if (await ejecutar(() => archivarCompetencia(user, comp.cid, !comp.archivada))) recargar();
  };
  const liberar = async () => {
    const r = await ejecutar(() => liberarProblemas(user, comp.cid));
    if (r) { setHecho(`${r.liberados} problema(s) devueltos al banco de práctica.`); recargar(); }
  };

  return (
    <div className="nb-dash-card nb-comp-panel nb-comp-form">
      <div className="nb-comp-datos">
        <div className="nb-doc-dato"><small>Estado</small><strong>{ESTADOS[comp.estado] || comp.estado}</strong></div>
        <div className="nb-doc-dato"><small>Inicio</small><strong>{fechaCorta(comp.inicio)}</strong></div>
        <div className="nb-doc-dato"><small>Fin</small><strong>{fechaCorta(comp.fin)}</strong></div>
        <div className="nb-doc-dato"><small>Congelado</small><strong>{comp.congeladoSegundos ? `${comp.congeladoSegundos / 60} min` : 'No'}</strong></div>
      </div>

      {comp.estado === 'antes' && (
        <form className="nb-comp-campos" onSubmit={guardarInicio}>
          <label className="nb-comp-campo">
            <span className="nb-label">Cambiar hora de inicio</span>
            <input className="nb-input" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
          </label>
          <div className="nb-comp-campo is-boton">
            <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>Guardar hora</button>
          </div>
        </form>
      )}
      <p className="nb-comp-sub">El nombre y la duración no se pueden cambiar después de crearla (límite de DOMjudge).</p>

      <div className="nb-comp-acciones">
        {comp.estado === 'terminado' && (
          <button type="button" className="nb-dash-btn-claro" onClick={liberar} disabled={ocupado}>Liberar problemas al banco</button>
        )}
        <button type="button" className="nb-dash-btn-claro" onClick={archivar} disabled={ocupado}>
          {comp.archivada ? 'Desarchivar' : 'Archivar'}
        </button>
        <a className="nb-dash-aviso-mas" href={`${JUEZ_URL}/jury`} target="_blank" rel="noopener noreferrer">Abrir la interfaz de jurado de DOMjudge</a>
      </div>
      {hecho && <p className="nb-comp-aviso" role="status">{hecho}</p>}
      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
    </div>
  );
};

// ── Equipos ──

const BuscarEstudiante = ({ user, onElegir, ocupado }) => {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState('');

  const buscar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setResultados((await buscarEstudiantes(user, q)).estudiantes);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="nb-comp-buscar">
      <form className="nb-dash-clase-form" onSubmit={buscar}>
        <input className="nb-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Correo o usuario del estudiante" minLength={2} required />
        <button type="submit" className="nb-dash-btn-claro">Buscar</button>
      </form>
      {error && <p className="nb-comp-aviso is-fail">{error}</p>}
      {resultados.length > 0 && (
        <ul className="nb-comp-resultados">
          {resultados.map((r) => (
            <li key={r.userId}>
              <span>{r.correo} <small className="nb-comp-hora">{r.usuario}</small></span>
              <button type="button" className="nb-doc-filtro" disabled={ocupado} onClick={() => { onElegir(r.userId); setResultados([]); setQ(''); }}>Agregar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const EquipoTarjeta = ({ user, cid, equipo, editable, recargar, onCredencial }) => {
  const { ocupado, error, ejecutar } = useAccion();
  const [nombre, setNombre] = useState(equipo.nombre);
  const [agregando, setAgregando] = useState(false);

  const guardarNombre = async (e) => {
    e.preventDefault();
    if (nombre.trim() === equipo.nombre) return;
    if (await ejecutar(() => editarEquipo(user, cid, equipo.teamId, { nombre }))) recargar();
  };
  const retirar = async () => {
    if (!equipo.retirado && !window.confirm(`¿Retirar a ${equipo.nombre}? Sale del marcador y no podrá enviar.`)) return;
    if (await ejecutar(() => editarEquipo(user, cid, equipo.teamId, { retirado: !equipo.retirado }))) recargar();
  };
  const agregar = async (userId) => {
    if (await ejecutar(() => agregarMiembro(user, cid, equipo.teamId, userId))) { setAgregando(false); recargar(); }
  };
  const quitar = async (m) => {
    if (!window.confirm(`¿Quitar a ${m.correo} del equipo?`)) return;
    if (await ejecutar(() => quitarMiembro(user, cid, equipo.teamId, m.userId))) recargar();
  };
  const clave = async () => {
    const r = await ejecutar(() => nuevaClaveEquipo(user, cid, equipo.teamId));
    if (r) onCredencial(r);
  };

  return (
    <li className={`nb-comp-equipo${equipo.retirado ? ' is-retirado' : ''}`}>
      <form className="nb-dash-clase-form" onSubmit={guardarNombre}>
        <input className="nb-input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} aria-label="Nombre del equipo" />
        <button type="submit" className="nb-dash-btn-claro" disabled={ocupado || nombre.trim() === equipo.nombre}>Renombrar</button>
      </form>
      {equipo.retirado && <span className="nb-doc-alerta">Retirado</span>}
      {!equipo.retirado && !equipo.miembros.length && (
        <span className="nb-doc-alerta">Sin integrantes: nadie podrá competir</span>
      )}
      <ul className="nb-comp-miembros">
        {equipo.miembros.map((m) => (
          <li key={m.userId}>
            <span>{m.correo}</span>
            {editable && (
              <button type="button" className="nb-dash-aviso-mas" onClick={() => quitar(m)} disabled={ocupado}>Quitar</button>
            )}
          </li>
        ))}
        {!equipo.miembros.length && <li className="nb-doc-vacio">Sin integrantes todavía.</li>}
      </ul>
      {editable && (agregando
        ? <BuscarEstudiante user={user} onElegir={agregar} ocupado={ocupado} />
        : equipo.miembros.length < 3 && (
          <button type="button" className="nb-doc-filtro" onClick={() => setAgregando(true)}>Agregar integrante</button>
        ))}
      <div className="nb-comp-acciones">
        <button type="button" className="nb-dash-aviso-mas" onClick={clave} disabled={ocupado}>Nueva clave de respaldo</button>
        <button type="button" className="nb-dash-aviso-mas" onClick={retirar} disabled={ocupado}>{equipo.retirado ? 'Volver a inscribir' : 'Retirar equipo'}</button>
      </div>
      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
    </li>
  );
};

const Equipos = ({ user, cid, equipos, editable, recargar }) => {
  const [nombre, setNombre] = useState('');
  const [credencial, setCredencial] = useState(null);
  const { ocupado, error, ejecutar } = useAccion();

  const crear = async (e) => {
    e.preventDefault();
    const r = await ejecutar(() => crearEquipo(user, cid, nombre));
    if (r) { setCredencial(r); setNombre(''); recargar(); }
  };

  return (
    <div className="nb-dash-card nb-comp-panel nb-comp-form">
      <form className="nb-dash-clase-form" onSubmit={crear}>
        <input className="nb-input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Nombre del equipo nuevo" minLength={2} required />
        <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>Crear equipo</button>
      </form>
      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
      {credencial && <Credencial datos={credencial} onCerrar={() => setCredencial(null)} />}
      <p className="nb-comp-sub">
        {editable
          ? 'Equipos de 1 a 3 integrantes con cuenta en CODECOMP. Cada estudiante puede estar en un solo equipo por competencia. Los integrantes quedan fijos cuando empieza.'
          : 'La competencia ya empezó: los integrantes quedan fijos. Si hace falta, retira al equipo.'}
      </p>
      {equipos.length ? (
        <ul className="nb-comp-equipos">
          {equipos.map((eq) => (
            <EquipoTarjeta key={eq.teamId} user={user} cid={cid} equipo={eq} editable={editable} recargar={recargar} onCredencial={setCredencial} />
          ))}
        </ul>
      ) : <p className="nb-doc-vacio">Aún no hay equipos.</p>}
    </div>
  );
};

// ── Problemas ──

const Problemas = ({ user, cid, problemas, recargar }) => {
  const usadas = new Set(problemas.map((p) => p.letra));
  const libres = LETRAS.filter((l) => !usadas.has(l));
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [letra, setLetra] = useState(libres[0] || 'A');
  const [archivo, setArchivo] = useState(null);
  const { ocupado, error, ejecutar } = useAccion();
  const letraActual = libres.includes(letra) ? letra : libres[0];

  const buscar = async (e) => {
    e.preventDefault();
    const r = await ejecutar(() => buscarBanco(user, q));
    if (r) setResultados(r.problemas);
  };
  const agregar = async (numero) => {
    if (await ejecutar(() => agregarDelBanco(user, cid, numero, letraActual))) { setResultados([]); setQ(''); recargar(); }
  };
  const subir = async (e) => {
    e.preventDefault();
    if (!archivo) return;
    if (await ejecutar(() => subirPaquete(user, cid, archivo, letraActual))) { setArchivo(null); e.target.reset(); recargar(); }
  };
  const quitar = async (p) => {
    if (!window.confirm(`¿Quitar el problema ${p.letra} (${p.nombre}) de la competencia?`)) return;
    if (await ejecutar(() => quitarProblema(user, cid, p.djId))) recargar();
  };

  return (
    <div className="nb-dash-card nb-comp-panel nb-comp-form">
      {problemas.length ? (
        <ul className="nb-doc-tabla">
          {problemas.map((p) => (
            <li key={p.djId} className="nb-doc-fila">
              <span className="nb-comp-letra is-active is-chica">{p.letra}</span>
              <div className="nb-doc-celda is-grande">
                <strong>{p.nombre}</strong>
                <small className="nb-comp-hora">
                  {p.banco ? `Banco #${p.banco.numero}${p.liberado ? ' · liberado' : ' · reservado'}` : 'Paquete subido'}
                </small>
              </div>
              <div className="nb-doc-dato"><small>Casos</small><strong>{p.casos ?? '—'}</strong></div>
              <div className="nb-doc-dato"><small>Tiempo</small><strong>{p.limiteSegundos ? `${p.limiteSegundos} s` : '—'}</strong></div>
              <button type="button" className="nb-dash-aviso-mas" onClick={() => quitar(p)} disabled={ocupado}>Quitar</button>
            </li>
          ))}
        </ul>
      ) : <p className="nb-doc-vacio">Aún no hay problemas.</p>}

      {libres.length > 0 && (
        <>
          <div className="nb-comp-letra-sel">
            <NbSelect label="Letra del próximo problema" value={letraActual} onChange={setLetra} options={libres.map((l) => ({ value: l, label: l }))} />
          </div>
          <div className="nb-dash-kicker">Del banco de CODECOMP</div>
          <form className="nb-dash-clase-form" onSubmit={buscar}>
            <input className="nb-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o número del problema" minLength={2} required />
            <button type="submit" className="nb-dash-btn-claro" disabled={ocupado}>Buscar</button>
          </form>
          {resultados.length > 0 && (
            <ul className="nb-comp-resultados">
              {resultados.map((r) => (
                <li key={r.numero}>
                  <span>#{r.numero} · {r.titulo} <small className="nb-comp-hora">{r.rating} · {r.casos} casos{r.reservado ? ' · en otra competencia' : ''}</small></span>
                  <button type="button" className="nb-doc-filtro" disabled={ocupado} onClick={() => agregar(r.numero)}>Agregar como {letraActual}</button>
                </li>
              ))}
            </ul>
          )}
          <p className="nb-comp-sub">Al agregarlo se oculta del banco de práctica hasta que liberes los problemas al terminar.</p>
          <div className="nb-dash-kicker">Paquete propio (.zip de DOMjudge o Kattis)</div>
          <form className="nb-dash-clase-form" onSubmit={subir}>
            <input className="nb-input" type="file" accept=".zip" onChange={(e) => setArchivo(e.target.files?.[0] || null)} required />
            <button type="submit" className={`nb-dash-btn-claro${ocupado ? ' is-busy' : ''}`} disabled={ocupado || !archivo}>Subir como {letraActual}</button>
          </form>
        </>
      )}
      {ocupado && <p className="nb-comp-sub">Trabajando con el juez…</p>}
      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
    </div>
  );
};

// ── Durante la competencia ──

const CodigoEnvio = ({ user, cid, id }) => {
  const [archivos, setArchivos] = useState(null);
  const [error, setError] = useState('');
  const abrir = (e) => {
    if (!e.currentTarget.open || archivos) return;
    getCodigoEnvio(user, cid, id).then((d) => setArchivos(d.archivos)).catch((err) => setError(err.message));
  };
  return (
    <details className="nb-doc-codigo" onToggle={abrir}>
      <summary>Ver código</summary>
      {error && <p className="nb-comp-aviso is-fail">{error}</p>}
      {!archivos && !error && <p className="nb-doc-vacio">Cargando…</p>}
      {archivos?.map((a) => <pre key={a.nombre}>{`// ${a.nombre}\n${a.codigo}`}</pre>)}
    </details>
  );
};

const EnviosJurado = ({ user, cid }) => {
  const cargar = useCallback(() => getEnviosJurado(user, cid), [user, cid]);
  const { datos, error } = useEnVivo(cargar, 10_000);
  if (!datos) return <p className="nb-doc-vacio">{error || 'Cargando envíos…'}</p>;
  if (!datos.envios.length) return <div className="nb-pb-empty"><div className="nb-pb-empty-title">Aún no hay envíos</div></div>;
  return (
    <div className="nb-dash-card nb-comp-panel">
      <p className="nb-comp-sub">Para rejuzgar un envío usa la <a className="nb-dash-aviso-mas" href={`${JUEZ_URL}/jury/submissions`} target="_blank" rel="noopener noreferrer">interfaz de jurado de DOMjudge</a>.</p>
      <ul className="nb-comp-envios is-jurado">
        {datos.envios.map((e) => (
          <li key={e.id}>
            <span className="nb-comp-hora">{e.tiempo.split('.')[0]}</span>
            <span><strong>{e.equipo}</strong> · {e.problema} · {e.lenguaje} <small className="nb-comp-hora">#{e.id}</small></span>
            <span className={`nb-comp-veredicto ${claseVeredicto(e.veredicto)}`}>{VEREDICTOS[e.veredicto] || e.veredicto}</span>
            <CodigoEnvio user={user} cid={cid} id={e.id} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const AclaracionesJurado = ({ user, cid, equipos }) => {
  const cargar = useCallback(() => getAclaracionesJurado(user, cid), [user, cid]);
  const { datos, error, recargar } = useEnVivo(cargar, 15_000);
  if (!datos) return <p className="nb-doc-vacio">{error || 'Cargando aclaraciones…'}</p>;
  return (
    <Aclaraciones
      jurado
      lista={datos.aclaraciones}
      equipos={equipos.filter((e) => !e.retirado)}
      onEnviar={async (d) => { await responderAclaracion(user, cid, d); await recargar(); }}
    />
  );
};

const Globos = ({ user, cid }) => {
  const cargar = useCallback(() => getGlobos(user, cid), [user, cid]);
  const { datos, error, recargar } = useEnVivo(cargar, 15_000);
  const { ocupado, error: errorAccion, ejecutar } = useAccion();
  if (!datos) return <p className="nb-doc-vacio">{error || 'Cargando globos…'}</p>;
  if (!datos.globos.length) {
    return <div className="nb-pb-empty"><div className="nb-pb-empty-title">Sin globos todavía</div><p>Cada problema aceptado genera un globo para entregar al equipo.</p></div>;
  }
  return (
    <div className="nb-dash-card nb-comp-panel">
      <ul className="nb-doc-tabla">
        {datos.globos.map((g) => (
          <li key={g.id} className="nb-doc-fila">
            <span className={`nb-comp-letra is-chica${g.hecho ? '' : ' is-active'}`}>{g.problema}</span>
            <div className="nb-doc-celda is-grande"><strong>{g.equipo}</strong></div>
            {g.hecho
              ? <span className="nb-doc-estado is-on">Entregado</span>
              : <button type="button" className="nb-doc-filtro" disabled={ocupado} onClick={async () => { if (await ejecutar(() => marcarGlobo(user, cid, g.id))) recargar(); }}>Marcar entregado</button>}
          </li>
        ))}
      </ul>
      {errorAccion && <p className="nb-comp-aviso is-fail" role="alert">{errorAccion}</p>}
    </div>
  );
};

const MarcadorJurado = ({ user, cid, comp, recargarComp }) => {
  const cargar = useCallback(() => getMarcadorJurado(user, cid), [user, cid]);
  const { datos, error, recargar } = useEnVivo(cargar, 20_000);
  const { ocupado, error: errorAccion, ejecutar } = useAccion();
  const descongelar = async () => {
    if (!window.confirm('¿Descongelar el marcador? Todos verán los resultados finales.')) return;
    if (await ejecutar(() => descongelarMarcador(user, cid))) { recargar(); recargarComp(); }
  };
  if (!datos) return <p className="nb-doc-vacio">{error || 'Cargando marcador…'}</p>;
  return (
    <div className="nb-comp">
      {datos.congelado && (
        <div className="nb-comp-acciones">
          <span className="nb-comp-sub">Los estudiantes ven el marcador congelado; aquí ves el completo.</span>
          {comp.estado === 'terminado' && (
            <button type="button" className="nb-dash-btn-claro" onClick={descongelar} disabled={ocupado}>Descongelar marcador</button>
          )}
        </div>
      )}
      {errorAccion && <p className="nb-comp-aviso is-fail" role="alert">{errorAccion}</p>}
      {datos.filas.length
        ? <MarcadorTabla tabla={datos} />
        : <div className="nb-pb-empty"><div className="nb-pb-empty-title">Sin equipos en el marcador</div></div>}
    </div>
  );
};

/** Una competencia vista por el jurado. */
const JuradoCompetenciaPage = () => {
  const { cid } = useParams();
  const { user, isAdmin } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('datos');

  const cargar = useCallback(() => {
    if (!user) return;
    getCompetenciaJurado(user, cid)
      .then((d) => { setDatos(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [user, cid]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!isAdmin) {
    return <div className="nb-dash-inner nb-comp"><div className="nb-pb-empty"><div className="nb-pb-empty-title">Esta vista es solo para el jurado</div></div></div>;
  }
  if (!datos) {
    return (
      <div className="nb-dash-inner nb-comp">
        <Link to="/dashboard/competencias/jurado" className="nb-pb-back">← Volver al panel del jurado</Link>
        <p className="nb-doc-vacio">{error || 'Cargando competencia…'}</p>
      </div>
    );
  }
  const comp = datos.competencia;

  return (
    <div className="nb-dash-inner nb-comp">
      <Link to="/dashboard/competencias/jurado" className="nb-pb-back">← Volver al panel del jurado</Link>
      <div className="nb-dash-card nb-comp-head">
        <span className="nb-comp-icono" aria-hidden="true"><FlagIcon /></span>
        <div className="nb-comp-texto">
          <div className="nb-dash-kicker">Jurado · {ESTADOS[comp.estado] || comp.estado}{comp.archivada ? ' · archivada' : ''}</div>
          <h1 className="nb-comp-titulo">{comp.nombre}</h1>
          <p className="nb-comp-sub">{fechaCorta(comp.inicio)} — {fechaCorta(comp.fin)} · {datos.equipos.filter((e) => !e.retirado).length} equipos · {datos.problemas.length} problemas</p>
        </div>
      </div>

      <div className="nb-doc-filtros nb-comp-pestanas" role="tablist">
        {PESTANAS.map(([id, texto]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={`nb-doc-filtro${pestana === id ? ' is-active' : ''}`} onClick={() => setPestana(id)}>
            {texto}
          </button>
        ))}
      </div>

      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
      {pestana === 'datos' && <Datos key={comp.inicio} user={user} comp={comp} recargar={cargar} />}
      {pestana === 'equipos' && (
        <Equipos user={user} cid={cid} equipos={datos.equipos} editable={comp.estado === 'antes'} recargar={cargar} />
      )}
      {pestana === 'problemas' && <Problemas user={user} cid={cid} problemas={datos.problemas} recargar={cargar} />}
      {pestana === 'envios' && <EnviosJurado user={user} cid={cid} />}
      {pestana === 'aclaraciones' && <AclaracionesJurado user={user} cid={cid} equipos={datos.equipos} />}
      {pestana === 'globos' && <Globos user={user} cid={cid} />}
      {pestana === 'marcador' && <MarcadorJurado user={user} cid={cid} comp={comp} recargarComp={cargar} />}
    </div>
  );
};

export default JuradoCompetenciaPage;
