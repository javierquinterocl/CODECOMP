import { Link } from 'react-router-dom';

/**
 * Marco compartido por RegisterPage, RecoverPage y ResetPage.
 * Replica el lenguaje visual del HomePage: navbar blanco con borde negro,
 * fondo azul plano y tarjeta blanca con sombra sólida.
 */
const AuthShell = ({ title, subtitle, action, maxWidth = 560, children }) => (
  <div className="nb-auth">
    <nav className="nb-authnav">
      <div className="nb-authnav-inner">
        <Link to="/" className="nb-brand">CODECOMP</Link>
        {action && (
          <Link to={action.to} state={action.state} className={action.variant === 'blue' ? 'nb-btn-blue' : 'nb-btn-white'}>
            {action.label}
          </Link>
        )}
      </div>
    </nav>

    <main className="nb-auth-main">
      <div className="nb-panel" style={{ maxWidth }}>
        <div className="nb-panel-head">
          <img src="/cat-pixel.png" alt="" style={{ width: 54, height: 'auto', imageRendering: 'pixelated', animation: 'om-float-b 6s ease-in-out infinite' }} />
          <div style={{ minWidth: 0 }}>
            <h1 className="nb-panel-title">{title}</h1>
            {subtitle && <p className="nb-panel-sub">{subtitle}</p>}
          </div>
        </div>
        <div className="nb-panel-body">{children}</div>
      </div>
    </main>
  </div>
);

/** Diálogo de confirmación / error con el mismo estilo. */
export const AuthDialog = ({ open, isError, title, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="nb-dialog-backdrop" onClick={onClose}>
      <div className="nb-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={`nb-dialog-head ${isError ? 'is-error' : 'is-ok'}`}>
          <h2 className="nb-dialog-title">{title}</h2>
        </div>
        <p className="nb-dialog-body">{message}</p>
        <div className="nb-dialog-foot">
          <button type="button" onClick={onClose} className="nb-submit" style={{ background: isError ? '#B00020' : '#0736FE' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
