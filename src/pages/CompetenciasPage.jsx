import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FlagIcon } from '../components/AppIcons';
import NbSelect from '../components/NbSelect';
import { Link } from 'react-router-dom';
import { Editor, Ejemplo } from '../components/ExerciseBits';
import { Enunciado } from '../components/ProblemBits';
import { JUEZ_URL } from '../scripts/config';
import MarcadorTabla from '../components/competencias/MarcadorTabla';
import Aclaraciones from '../components/competencias/Aclaraciones';
import {
  enviarSolucion, getAclaraciones, getCompetencia, getEnunciado, getMarcador, getMisEnvios,
  getProblemaCompetencia, preguntarAlJurado,
} from '../scripts/competenciasApi';
import { claseVeredicto, VEREDICTOS } from '../scripts/competenciasData';

// Lenguaje de DOMjudge -> resaltado del editor y plantilla inicial.
const LENGUAJES = {
  c: { resaltado: 'cpp', plantilla: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n' },
  cpp: { resaltado: 'cpp', plantilla: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    \n    return 0;\n}\n' },
  java: { resaltado: 'java', plantilla: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        \n    }\n}\n' },
  python3: { resaltado: 'python', plantilla: 'import sys\n\n\ndef main():\n    pass\n\n\nmain()\n' },
};

const PESTANAS = [['problemas', 'Problemas'], ['envios', 'Mis envíos'], ['marcador', 'Marcador'], ['aclaraciones', 'Aclaraciones']];

const BORRADORES = 'codecomp:competencia:borradores';
const leerBorradores = () => {
  try { return JSON.parse(localStorage.getItem(BORRADORES) || '{}'); } catch { return {}; }
};
const guardarBorradores = (b) => {
  try { localStorage.setItem(BORRADORES, JSON.stringify(b)); } catch { /* sin almacenamiento: solo en memoria */ }
};

const reloj = (segundos) => {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Reloj del concurso con la hora del servidor, para no depender del reloj del computador. */
const useReloj = (concurso, desfase) => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!concurso) return null;
  const hora = ahora + desfase;
  const inicio = Date.parse(concurso.inicio);
  const fin = Date.parse(concurso.fin);
  if (hora < inicio) return { fase: 'antes', texto: `Empieza en ${reloj((inicio - hora) / 1000)}` };
  if (hora < fin) {
    const congelado = concurso.congeladoSegundos > 0 && hora >= fin - concurso.congeladoSegundos * 1000;
    return { fase: 'en-curso', texto: `Quedan ${reloj((fin - hora) / 1000)}`, congelado };
  }
  return { fase: 'terminado', texto: 'Terminó' };
};

const Cabecera = ({ datos, tiempo }) => (
  <div className="nb-dash-card nb-comp-head">
    <span className="nb-comp-icono" aria-hidden="true"><FlagIcon /></span>
    <div className="nb-comp-texto">
      <div className="nb-dash-kicker">Competencias</div>
      <h1 className="nb-comp-titulo">{datos.concurso.nombre}</h1>
      <p className="nb-comp-sub">
        {datos.equipo.retirado
          ? <>Tu equipo <strong>{datos.equipo.nombre}</strong> fue retirado de esta competencia: no puede enviar.</>
          : <>Tu equipo: <strong>{datos.equipo.nombre}</strong>. Juez oficial de maratón, sin ayudas de IA.</>}
      </p>
    </div>
    {tiempo && (
      <div className={`nb-comp-reloj${tiempo.congelado ? ' is-congelado' : ''}`} aria-live="off">
        <strong>{tiempo.texto}</strong>
        {tiempo.congelado && <small>Marcador congelado</small>}
      </div>
    )}
  </div>
);

const Problemas = ({ user, datos, tiempo, onEnviado, envios }) => {
  // Sin elección, el primero: los problemas pueden llegar después (al empezar el concurso).
  const [elegidoManual, setElegido] = useState(null);
  const elegido = datos.problemas.some((p) => p.id === elegidoManual) ? elegidoManual : datos.problemas[0]?.id ?? null;
  const [lenguaje, setLenguaje] = useState(datos.lenguajes[0]?.id ?? 'cpp');
  const [borradores, setBorradores] = useState(leerBorradores);
  // Enunciado del problema elegido: del banco (texto de CODECOMP) o PDF de un paquete propio.
  const [pdf, setPdf] = useState({ id: null, url: null, banco: null, error: '' });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [claro, setClaro] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const problema = datos.problemas.find((p) => p.id === elegido) ?? null;
  const llave = `${datos.concurso.id}:${elegido}:${lenguaje}`;
  const codigo = borradores[llave] ?? LENGUAJES[lenguaje]?.plantilla ?? '';

  // El enunciado se pide al elegir un problema; la URL local del PDF se libera al cambiar.
  const esBanco = Boolean(problema?.banco);
  useEffect(() => {
    if (!elegido) return undefined;
    let vivo = true;
    let url = null;
    const fallo = (e) => { if (vivo) setPdf({ id: elegido, url: null, banco: null, error: e.message }); };
    if (esBanco) {
      getProblemaCompetencia(user, elegido)
        .then((p) => { if (vivo) setPdf({ id: elegido, url: null, banco: p, error: '' }); })
        .catch(fallo);
    } else {
      getEnunciado(user, elegido)
        .then((u) => { url = u; if (vivo) setPdf({ id: elegido, url: u, banco: null, error: '' }); else URL.revokeObjectURL(u); })
        .catch(fallo);
    }
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [user, elegido, esBanco]);

  const cambiarCodigo = (v) => {
    setBorradores((previos) => {
      const nuevos = { ...previos, [llave]: v };
      guardarBorradores(nuevos);
      return nuevos;
    });
  };

  const enviar = async () => {
    if (!problema || enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      await enviarSolucion(user, problema.id, lenguaje, codigo);
      setAviso({ ok: true, texto: `Envío del problema ${problema.letra} recibido. El veredicto aparece abajo y en Mis envíos.` });
      onEnviado();
    } catch (e) {
      setAviso({ ok: false, texto: e.message });
    } finally {
      setEnviando(false);
    }
  };

  if (!datos.problemas.length) {
    return (
      <div className="nb-pb-empty">
        <div className="nb-pb-empty-title">{tiempo?.fase === 'antes' ? 'Los problemas aparecen cuando empiece' : 'Sin problemas'}</div>
        <p>{tiempo?.fase === 'antes' ? 'Ten listo tu editor: el reloj de arriba marca cuánto falta.' : 'Este concurso no tiene problemas cargados.'}</p>
      </div>
    );
  }

  const ultimos = envios.filter((e) => e.problema === problema?.letra).slice(0, 3);
  const puedeEnviar = Boolean(datos.equipo) && !datos.equipo.retirado && tiempo?.fase === 'en-curso';
  const pdfActual = pdf.id === elegido ? pdf : { url: null, banco: null, error: '' };
  const textoBanco = pdfActual.banco && (pdfActual.banco.textos.es || pdfActual.banco.textos.en);

  return (
    <div className={`nb-ex nb-comp-ex${expandido ? ' is-expanded' : ''}`}>
      <div className="nb-ex-left">
        <div className="nb-comp-letras" role="tablist" aria-label="Problemas">
          {datos.problemas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === elegido}
              className={`nb-comp-letra${p.id === elegido ? ' is-active' : ''}`}
              onClick={() => setElegido(p.id)}
              title={p.nombre}
            >
              {p.letra}
            </button>
          ))}
        </div>

        <div className="nb-ex-card nb-comp-enunciado">
          <div className="nb-comp-enunciado-head">
            <div>
              <div className="nb-dash-kicker">Problema {problema.letra}</div>
              <h2 className="nb-comp-problema">{problema.nombre}</h2>
            </div>
            {problema.limiteSegundos && <span className="nb-pb-tag">{problema.limiteSegundos} s</span>}
          </div>
          {textoBanco ? (
            <div className="nb-comp-texto-enunciado">
              <Enunciado bloques={textoBanco.descripcion} lang={pdfActual.banco.textos.es ? 'es' : 'en'} />
              {pdfActual.banco.ejemplos.length > 0 && (
                <div className="nb-ex-samples">
                  {pdfActual.banco.ejemplos.map((ej, i) => (
                    <Ejemplo key={i} n={i + 1} entrada={ej.entrada} salida={ej.salida} />
                  ))}
                </div>
              )}
            </div>
          ) : pdfActual.url ? (
            <>
              <object className="nb-comp-pdf" data={pdfActual.url} type="application/pdf" aria-label={`Enunciado de ${problema.nombre}`}>
                <p className="nb-doc-vacio">Tu navegador no muestra PDF aquí.</p>
              </object>
              <a className="nb-dash-aviso-mas" href={pdfActual.url} target="_blank" rel="noopener noreferrer">Abrir el enunciado en otra pestaña</a>
            </>
          ) : (
            <p className="nb-doc-vacio">{pdfActual.error || 'Cargando enunciado…'}</p>
          )}
        </div>
      </div>

      <div className="nb-ex-right">
        <div className="nb-ex-toolbar">
          <NbSelect
            label="Lenguaje"
            value={lenguaje}
            onChange={setLenguaje}
            options={datos.lenguajes.map((l) => ({ value: l.id, label: l.nombre }))}
          />
          <button type="button" className={`nb-ex-send${enviando ? ' is-busy' : ''}`} onClick={enviar} disabled={!puedeEnviar || enviando}>
            {enviando ? 'Enviando…' : `Enviar ${problema.letra}`}
          </button>
        </div>

        <Editor
          codigo={codigo}
          lenguajeId={LENGUAJES[lenguaje]?.resaltado ?? 'cpp'}
          onChange={cambiarCodigo}
          expandido={expandido}
          onExpandir={() => setExpandido((v) => !v)}
          claro={claro}
          onTema={() => setClaro((v) => !v)}
          onReiniciar={() => cambiarCodigo(LENGUAJES[lenguaje]?.plantilla ?? '')}
          tabulador
        />

        {aviso && <p className={`nb-comp-aviso${aviso.ok ? '' : ' is-fail'}`} role="status">{aviso.texto}</p>}

        {ultimos.length > 0 && (
          <ul className="nb-comp-envios is-corto">
            {ultimos.map((e) => (
              <li key={e.id}>
                <span className="nb-comp-hora">{e.tiempo.split('.')[0]}</span>
                <span>{e.problema} · {e.lenguaje}</span>
                <span className={`nb-comp-veredicto ${claseVeredicto(e.veredicto)}`}>{VEREDICTOS[e.veredicto] || e.veredicto}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const MisEnvios = ({ envios }) => (
  envios.length ? (
    <div className="nb-dash-card nb-comp-panel">
      <ul className="nb-comp-envios">
        {envios.map((e) => (
          <li key={e.id}>
            <span className="nb-comp-hora">{e.tiempo.split('.')[0]}</span>
            <span><strong>{e.problema}</strong> · {e.lenguaje}</span>
            <span className={`nb-comp-veredicto ${claseVeredicto(e.veredicto)}`}>{VEREDICTOS[e.veredicto] || e.veredicto}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="nb-pb-empty">
      <div className="nb-pb-empty-title">Aún no hay envíos</div>
      <p>Cuando tu equipo envíe una solución, su veredicto aparecerá aquí.</p>
    </div>
  )
);

const Marcador = ({ user }) => {
  const [tabla, setTabla] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivo = true;
    const cargar = () => getMarcador(user)
      .then((t) => { if (vivo) { setTabla(t); setError(''); } })
      .catch((e) => { if (vivo) setError(e.message); });
    cargar();
    const t = setInterval(cargar, 30_000);
    return () => { vivo = false; clearInterval(t); };
  }, [user]);

  if (!tabla) return <p className="nb-doc-vacio">{error || 'Cargando marcador…'}</p>;
  if (!tabla.filas.length) {
    return <div className="nb-pb-empty"><div className="nb-pb-empty-title">El marcador aparece cuando empiece</div></div>;
  }
  return (
    <MarcadorTabla
      tabla={tabla}
      aviso={tabla.congelado ? 'Marcador congelado: los envíos de la última hora se revelan al final.' : ''}
    />
  );
};

const AclaracionesEstudiante = ({ user, datos, tiempo }) => {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(() => getAclaraciones(user)
    .then((d) => { setLista(d.aclaraciones); setError(''); })
    .catch((e) => setError(e.message)), [user]);
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  if (!lista) return <p className="nb-doc-vacio">{error || 'Cargando aclaraciones…'}</p>;
  return (
    <Aclaraciones
      lista={lista}
      problemas={datos.problemas}
      puedeEnviar={tiempo?.fase === 'en-curso' && !datos.equipo.retirado}
      onEnviar={async ({ texto, problema }) => { await preguntarAlJurado(user, texto, problema); await cargar(); }}
    />
  );
};

/** Competencias: concurso en vivo con el juez DOMjudge por debajo. */
const CompetenciasPage = () => {
  const { user, isAdmin } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('problemas');
  const [envios, setEnvios] = useState([]);
  const [desfase, setDesfase] = useState(0);
  const pendientes = useRef(false);

  const cargar = useCallback(() => {
    if (!user) return;
    getCompetencia(user)
      .then((d) => { setDatos(d); setError(''); if (d.servidor) setDesfase(d.servidor - Date.now()); })
      .catch((e) => setError(e.message));
  }, [user]);

  const cargarEnvios = useCallback(() => {
    if (!user) return;
    getMisEnvios(user)
      .then(({ envios: lista }) => { setEnvios(lista); pendientes.current = lista.some((e) => e.veredicto === 'pendiente'); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  // Mis envíos: cada 4 s mientras haya alguno juzgándose; si no, cada 20 s.
  useEffect(() => {
    cargarEnvios();
    let espera = 0;
    const t = setInterval(() => {
      espera += 4;
      if (pendientes.current || espera >= 20) { espera = 0; cargarEnvios(); }
    }, 4000);
    return () => clearInterval(t);
  }, [cargarEnvios]);

  const tiempo = useReloj(datos?.concurso, desfase);

  // Al empezar el concurso se vuelven a pedir los problemas.
  const fase = tiempo?.fase;
  const faseVista = useRef(fase);
  useEffect(() => {
    if (faseVista.current === 'antes' && fase === 'en-curso') cargar();
    faseVista.current = fase;
  }, [fase, cargar]);

  const respaldo = useMemo(() => (
    <a className="nb-dash-aviso-mas" href={JUEZ_URL} target="_blank" rel="noopener noreferrer">Abrir el juez directamente</a>
  ), []);

  if (error && !datos) {
    return (
      <div className="nb-dash-inner is-wide nb-comp">
        <div className="nb-pb-empty">
          <div className="nb-pb-empty-title">No se pudo abrir la competencia</div>
          <p>{error}</p>
          {respaldo}
        </div>
      </div>
    );
  }
  const panelJurado = isAdmin && (
    <Link className="nb-dash-btn-claro nb-comp-boton nb-comp-jurado" to="/dashboard/competencias/jurado">Panel del jurado</Link>
  );

  if (!datos) return <div className="nb-dash-inner is-wide nb-comp"><p className="nb-doc-vacio">Cargando competencia…</p></div>;
  if (!datos.concurso) {
    return (
      <div className="nb-dash-inner is-wide nb-comp">
        {isAdmin ? (
          <div className="nb-dash-card nb-comp-head">
            <span className="nb-comp-icono" aria-hidden="true"><FlagIcon /></span>
            <div className="nb-comp-texto">
              <div className="nb-dash-kicker">Jurado</div>
              <h1 className="nb-comp-titulo">Organiza una competencia</h1>
              <p className="nb-comp-sub">Desde el panel del jurado creas la competencia, armas los equipos y eliges los problemas. DOMjudge juzga por debajo.</p>
            </div>
            <Link className="nb-ex-send nb-comp-boton" to="/dashboard/competencias/jurado">Abrir panel del jurado</Link>
          </div>
        ) : (
          <div className="nb-pb-empty">
            <div className="nb-pb-empty-title">No estás inscrito en ninguna competencia</div>
            <p>Cuando tu docente te agregue a un equipo, la competencia aparecerá aquí.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nb-dash-inner is-wide nb-comp">
      {panelJurado}
      <Cabecera datos={datos} tiempo={tiempo} />

      <div className="nb-doc-filtros nb-comp-pestanas" role="tablist">
        {PESTANAS.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            className={`nb-doc-filtro${pestana === id ? ' is-active' : ''}`}
            onClick={() => setPestana(id)}
          >
            {texto}
          </button>
        ))}
        <span className="nb-comp-respaldo">{respaldo}</span>
      </div>

      {pestana === 'problemas' && (
        <Problemas key={datos.concurso.id} user={user} datos={datos} tiempo={tiempo} envios={envios} onEnviado={cargarEnvios} />
      )}
      {pestana === 'envios' && <MisEnvios envios={envios} />}
      {pestana === 'marcador' && <Marcador user={user} />}
      {pestana === 'aclaraciones' && <AclaracionesEstudiante user={user} datos={datos} tiempo={tiempo} />}
    </div>
  );
};

export default CompetenciasPage;
