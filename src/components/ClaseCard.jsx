import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { crearClase, unirseAClase } from '../scripts/registroApi';

/**
 * El estudiante entra a su clase con el código; el docente crea clases y ve sus códigos.
 * `estado` es la respuesta de getClases y `onCambio` la vuelve a pedir tras entrar o crear.
 */
const ClaseCard = ({ estado, onCambio, destacada = false, onPorMiCuenta }) => {
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  if (!estado) return null;
  const { docente, clases } = estado;

  const enviar = async (evento) => {
    evento.preventDefault();
    // Sin esto, un campo vacío no hacía nada y no decía por qué.
    const valor = texto.trim();
    if (docente && valor.length < 3) {
      setMensaje({ ok: false, texto: 'Escribe un nombre de al menos 3 letras, por ejemplo «Maratón 2026».' });
      return;
    }
    if (!docente && !/^[A-Za-z0-9]{6}$/.test(valor)) {
      setMensaje({ ok: false, texto: 'El código de la clase tiene 6 letras o números, por ejemplo K7P2QX. Pídeselo a tu docente.' });
      return;
    }
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
    <div className={`nb-dash-card nb-dash-pad${destacada ? ' nb-dash-clase-destacada' : ''}`} data-tour="clase">
      <div className="nb-dash-kicker">{docente ? 'Docente' : 'Tu clase'}</div>
      <h3 className="nb-dash-section-title">
        {docente ? 'Tus clases' : clases.length ? clases.map((c) => c.nombre).join(' · ') : 'Únete a tu clase'}
      </h3>
      {destacada && (
        <p className="nb-dash-body-text nb-dash-clase-intro">
          Si tu docente te dio un código, ponlo aquí: así podrá ver tu avance y acompañarte.
        </p>
      )}

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
          className={`nb-input${mensaje && !mensaje.ok ? ' is-error' : ''}`}
          aria-label={docente ? 'Nombre de la clase nueva' : 'Código de la clase'}
          aria-invalid={Boolean(mensaje && !mensaje.ok)}
          aria-describedby="clase-ayuda"
          value={texto}
          maxLength={docente ? 80 : 6}
          placeholder={docente ? 'Ej.: Maratón 2026' : 'Ej.: K7P2QX'}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado}>
          {docente ? 'Crear clase' : 'Entrar'}
        </button>
      </form>
      <p id="clase-ayuda" className="nb-ayuda">
        {docente ? 'Al crearla verás un código de 6 letras para compartir con tus estudiantes.' : 'Tu docente te da un código de 6 letras o números.'}
      </p>
      {destacada && onPorMiCuenta && (
        <button type="button" className="nb-dash-clase-saltar" onClick={onPorMiCuenta}>
          Practico por mi cuenta
        </button>
      )}
      {mensaje && (
        <p className={`nb-dash-clase-msg${mensaje.ok ? '' : ' is-error'}`} role="status">{mensaje.texto}</p>
      )}
    </div>
  );
};

export default ClaseCard;
