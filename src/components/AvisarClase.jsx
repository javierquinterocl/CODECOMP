import { useState } from 'react';
import ConfirmarDialogo from './ConfirmarDialogo';
import useConfirmar from '../scripts/useConfirmar';
import { avisarClase } from '../scripts/docenteApi';
import Campo from './Campo';

const MAX_TITULO = 80;
const MAX_TEXTO = 500;

/** Formulario del docente para avisar a toda su clase: llega a la campana y por correo. */
const AvisarClase = ({ user, clase, estudiantes }) => {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [intento, setIntento] = useState(false);
  const { pedido, confirmar, responder } = useConfirmar();

  const enviar = async (e) => {
    e.preventDefault();
    if (ocupado) return;
    setIntento(true);
    if (!titulo.trim()) { document.getElementById('aviso-titulo')?.focus(); return; }
    if (!texto.trim()) { document.getElementById('aviso-texto')?.focus(); return; }
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
      setIntento(false);
      setTexto('');
      setMensaje({ ok: true, texto: `Aviso enviado a ${r.destinatarios} ${r.destinatarios === 1 ? 'estudiante' : 'estudiantes'}. Te quedan ${r.restantes} hoy.` });
    } catch (error) {
      setMensaje({ ok: false, texto: error.message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="nb-dash-card nb-dash-pad nb-comp-form" data-tour="avisar">
      <div className="nb-dash-sechead">
        <div>
          <h2 className="nb-dash-section-title">Avisar a la clase</h2>
          <div className="nb-dash-section-sub">Llega a la campana de cada estudiante y por correo · hasta 3 avisos al día</div>
        </div>
      </div>
      <form className="nb-comp-form" onSubmit={enviar}>
        <Campo id="aviso-titulo" label="Título" className="nb-comp-campo" ayuda="Corto y claro, por ejemplo «Práctica del jueves»."
          error={intento && !titulo.trim() ? 'Escribe un título para el aviso.' : null}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={MAX_TITULO} placeholder="Ej.: Práctica del jueves" />
        </Campo>
        <Campo id="aviso-texto" label={`Mensaje (${texto.length}/${MAX_TEXTO})`} className="nb-comp-campo"
          ayuda="Lo que deben saber: qué, cuándo y dónde."
          error={intento && !texto.trim() ? 'Escribe el mensaje del aviso.' : null}>
          <textarea className="nb-input nb-comp-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX_TEXTO} rows={3} />
        </Campo>
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
