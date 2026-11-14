import { useState } from 'react';
import ConfirmarDialogo from './ConfirmarDialogo';
import useConfirmar from '../scripts/useConfirmar';
import { avisarClase } from '../scripts/docenteApi';

const MAX_TITULO = 80;
const MAX_TEXTO = 500;

/** Formulario del docente para avisar a toda su clase: llega a la campana y por correo. */
const AvisarClase = ({ user, clase, estudiantes }) => {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const { pedido, confirmar, responder } = useConfirmar();

  const enviar = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !texto.trim() || ocupado) return;
    const ok = await confirmar({
      titulo: 'Avisar a la clase',
      mensaje: `${estudiantes === 1 ? 'El estudiante' : `Los ${estudiantes} estudiantes`} de ${clase.nombre} lo verán en la campana y, si tienen los correos activos, también por correo.`,
      confirmar: 'Enviar aviso',
    });
    if (!ok) return;
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await avisarClase(user, clase.id, { titulo, texto });
      setTitulo('');
      setTexto('');
      setMensaje({ ok: true, texto: `Aviso enviado a ${r.destinatarios} ${r.destinatarios === 1 ? 'estudiante' : 'estudiantes'}. Te quedan ${r.restantes} hoy.` });
    } catch (error) {
      setMensaje({ ok: false, texto: error.message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="nb-dash-card nb-dash-pad nb-comp-form">
      <div className="nb-dash-sechead">
        <div>
          <h2 className="nb-dash-section-title">Avisar a la clase</h2>
          <div className="nb-dash-section-sub">Llega a la campana de cada estudiante y por correo · hasta 3 avisos al día</div>
        </div>
      </div>
      <form className="nb-comp-form" onSubmit={enviar}>
        <label className="nb-comp-campo">
          <span className="nb-label">Título</span>
          <input className="nb-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={MAX_TITULO} required placeholder="Ej.: Práctica del jueves" />
        </label>
        <label className="nb-comp-campo">
          <span className="nb-label">Mensaje ({texto.length}/{MAX_TEXTO})</span>
          <textarea className="nb-input nb-comp-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX_TEXTO} required rows={3} />
        </label>
        <div className="nb-comp-campo is-boton">
          <button type="submit" className={`nb-ex-send${ocupado ? ' is-busy' : ''}`} disabled={ocupado || !estudiantes}>
            {ocupado ? 'Enviando…' : 'Enviar aviso'}
          </button>
        </div>
      </form>
      {mensaje && (
        <p className={`nb-dash-clase-msg${mensaje.ok ? '' : ' is-error'}`} role={mensaje.ok ? 'status' : 'alert'}>{mensaje.texto}</p>
      )}
      <ConfirmarDialogo pedido={pedido} onRespuesta={responder} />
    </section>
  );
};

export default AvisarClase;
