import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { crearClase, unirseAClase } from '../scripts/registroApi';

/**
 * El estudiante entra a su clase con el código; el docente crea clases y ve sus códigos.
 * `estado` es la respuesta de getClases y `onCambio` la vuelve a pedir tras entrar o crear.
 */
const ClaseCard = ({ estado, onCambio }) => {
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  if (!estado) return null;
  const { docente, clases } = estado;

  const enviar = async (evento) => {
    evento.preventDefault();
    if (!texto.trim()) return;
    setOcupado(true);
    setMensaje(null);
    try {
      if (docente) {
        const data = await crearClase(user, texto);
        setMensaje({ ok: true, texto: `Clase creada. Código: ${data.clase.codigo}` });
      } else {
        const data = await unirseAClase(user, texto);
        setMensaje({ ok: true, texto: `Entraste a ${data.clase.nombre}.` });
      }
      setTexto('');
      onCambio();
    } catch (error) {
      setMensaje({ ok: false, texto: error.message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="nb-dash-card nb-dash-pad">
      <div className="nb-dash-kicker">{docente ? 'Docente' : 'Tu clase'}</div>
      <h3 className="nb-dash-section-title">
        {docente ? 'Tus clases' : clases.length ? clases.map((c) => c.nombre).join(' · ') : 'Únete a tu clase'}
      </h3>

      {docente && clases.length > 0 && (
        <ul className="nb-dash-clases">
          {clases.map((c) => (
            <li key={c.id}>
              <span>{c.nombre}</span>
              <span className="nb-dash-clase-codigo">{c.codigo}</span>
              <span>{c.miembros} estudiantes</span>
            </li>
          ))}
        </ul>
      )}

      <form className="nb-dash-clase-form" onSubmit={enviar}>
        <input
          className="nb-input"
          aria-label={docente ? 'Nombre de la clase nueva' : 'Código de la clase'}
          value={texto}
          maxLength={docente ? 80 : 6}
          placeholder={docente ? 'Nombre de la clase nueva' : 'Código de 6 letras'}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>
          {docente ? 'Crear clase' : 'Entrar'}
        </button>
      </form>
      {mensaje && (
        <p className={`nb-dash-clase-msg${mensaje.ok ? '' : ' is-error'}`} role="status">{mensaje.texto}</p>
      )}
    </div>
  );
};

export default ClaseCard;
