import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlagIcon } from '../components/AppIcons';
import NbSelect from '../components/NbSelect';
import { crearCompetencia, getCompetenciasJurado } from '../scripts/juradoApi';
import { ESTADOS, fechaCorta, isoDesdeLocal } from '../scripts/competenciasData';

const DURACIONES = [60, 90, 120, 180, 240, 300].map((m) => ({ value: String(m), label: `${m / 60} h`.replace('.5', ',5') }));
const CONGELADOS = [0, 15, 30, 60].map((m) => ({ value: String(m), label: m ? `${m} min` : 'Sin congelar' }));

/** Formulario para programar una competencia nueva en DOMjudge. */
const NuevaCompetencia = ({ user, onCreada }) => {
  const [nombre, setNombre] = useState('');
  const [inicio, setInicio] = useState('');
  const [duracion, setDuracion] = useState('180');
  const [congelado, setCongelado] = useState('60');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      const { cid } = await crearCompetencia(user, {
        nombre,
        inicio: isoDesdeLocal(inicio),
        duracionMin: Number(duracion),
        congeladoMin: Math.min(Number(congelado), Number(duracion) - 1),
      });
      onCreada(cid);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form className="nb-dash-card nb-comp-panel nb-comp-form" onSubmit={enviar}>
      <div className="nb-dash-kicker">Nueva competencia</div>
      <div className="nb-comp-campos">
        <label className="nb-comp-campo is-ancho">
          <span className="nb-label">Nombre</span>
          <input className="nb-input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} placeholder="Maratón interna de noviembre" required />
        </label>
        <label className="nb-comp-campo">
          <span className="nb-label">Inicio (hora de Colombia)</span>
          <input className="nb-input" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <div className="nb-comp-campo">
          <NbSelect label="Duración" value={duracion} onChange={setDuracion} options={DURACIONES} />
        </div>
        <div className="nb-comp-campo">
          <NbSelect label="Congelar marcador" value={congelado} onChange={setCongelado} options={CONGELADOS} />
        </div>
      </div>
      <div className="nb-comp-acciones">
        <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>
          {ocupado ? 'Creando…' : 'Crear competencia'}
        </button>
      </div>
      {error && <p className="nb-comp-aviso is-fail" role="alert">{error}</p>}
    </form>
  );
};

/** Panel del jurado: competencias organizadas desde CODECOMP. */
const JuradoCompetenciasPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [verArchivadas, setVerArchivadas] = useState(false);

  const cargar = useCallback(() => {
    if (!user) return;
    getCompetenciasJurado(user)
      .then((d) => { setLista(d.competencias); setError(''); })
      .catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!isAdmin) {
    return (
      <div className="nb-dash-inner nb-comp">
        <div className="nb-pb-empty"><div className="nb-pb-empty-title">Esta vista es solo para el jurado</div></div>
      </div>
    );
  }

  const visibles = (lista || []).filter((c) => c.archivada === verArchivadas);

  return (
    <div className="nb-dash-inner nb-comp">
      <Link to="/dashboard/competencias" className="nb-pb-back">← Volver a Competencias</Link>
      <div className="nb-dash-card nb-comp-head">
        <span className="nb-comp-icono" aria-hidden="true"><FlagIcon /></span>
        <div className="nb-comp-texto">
          <div className="nb-dash-kicker">Jurado</div>
          <h1 className="nb-comp-titulo">Competencias</h1>
          <p className="nb-comp-sub">Programa competencias, arma los equipos y elige los problemas. DOMjudge juzga por debajo.</p>
        </div>
      </div>

      <NuevaCompetencia user={user} onCreada={(cid) => navigate(`/dashboard/competencias/jurado/${cid}`)} />

      <div className="nb-dash-card nb-comp-panel">
        <div className="nb-comp-panel-head">
          <div className="nb-dash-kicker is-ink">{verArchivadas ? 'Archivadas' : 'Competencias'}</div>
          <button type="button" className={`nb-doc-filtro${verArchivadas ? ' is-active' : ''}`} onClick={() => setVerArchivadas((v) => !v)}>
            {verArchivadas ? 'Ver activas' : 'Ver archivadas'}
          </button>
        </div>
        {!lista && <p className="nb-doc-vacio">{error || 'Cargando…'}</p>}
        {lista && !visibles.length && (
          <p className="nb-doc-vacio">{verArchivadas ? 'No hay competencias archivadas.' : 'Aún no hay competencias. Crea la primera arriba.'}</p>
        )}
        {visibles.length > 0 && (
          <ul className="nb-doc-tabla">
            {visibles.map((c) => (
              <li key={c.cid} className="nb-doc-fila">
                <div className="nb-doc-celda is-grande">
                  <Link className="nb-comp-enlace" to={`/dashboard/competencias/jurado/${c.cid}`}>{c.nombre}</Link>
                  <small className="nb-comp-hora">{c.cid}</small>
                </div>
                <span className={`nb-doc-estado${c.estado === 'en-curso' ? ' is-on' : ''}`}>{ESTADOS[c.estado] || c.estado}</span>
                <div className="nb-doc-dato"><small>Inicio</small><strong>{fechaCorta(c.inicio)}</strong></div>
                <div className="nb-doc-dato"><small>Equipos</small><strong>{c.equipos}</strong></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JuradoCompetenciasPage;
