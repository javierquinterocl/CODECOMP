import { Link } from 'react-router-dom';

const kw = (txt) => <span className="nb-deco-kw">{txt}</span>;

const DecoCard = ({ filename, style, children }) => (
  <div className="nb-deco-card" style={style}>
    <div className="nb-deco-bar">
      <span className="nb-deco-dot" />
      <span className="nb-deco-dot" style={{ opacity: 0.55 }} />
      <span className="nb-deco-name">{filename}</span>
    </div>
    <pre className="nb-deco-code">{children}</pre>
  </div>
);

const DECO_TEXTS = [
  { t: '#include <bits/stdc++.h>', s: { left: '4%',  top: '4%',     fontSize: 11, animation: 'om-float-c 10s ease-in-out infinite' } },
  { t: 'O(n log n)',              s: { right: '5%',  top: '38%',    fontSize: 15, animation: 'om-float-a 9s ease-in-out infinite' } },
  { t: 'while (true)',            s: { left: '3%',   top: '52%',    fontSize: 12, animation: 'om-float-b 8.4s ease-in-out infinite' } },
  { t: 'git push origin main',    s: { right: '3%',  bottom: '38%', fontSize: 11, animation: 'om-float-c 9.2s ease-in-out infinite' } },
  { t: '{ }',                     s: { left: '9%',   bottom: '4%',  fontSize: 26, animation: 'om-float-a 8.6s ease-in-out infinite' } },
  { t: 'return 0;',               s: { right: '9%',  bottom: '3%',  fontSize: 13, animation: 'om-float-b 7.8s ease-in-out infinite' } },
  { t: '// TODO: optimizar',      s: { left: '6%',   top: '31%',    fontSize: 11, fontWeight: 400, animation: 'om-float-c 9.8s ease-in-out infinite' } },
  { t: 'npm run judge',           s: { right: '6%',  top: '6%',     fontSize: 11, animation: 'om-float-a 10.4s ease-in-out infinite' } },
];

/** Cuadrícula + fragmentos de código flotantes, en versión clara. */
const AuthDecor = () => (
  <div className="nb-auth-deco" aria-hidden="true">
    <DecoCard filename="main.cpp" style={{ right: '2%', top: '7%', width: 'clamp(112px,12vw,180px)', animation: 'om-float-b 8.5s ease-in-out infinite' }}>
      {kw('int')}{' main() {\n  '}{kw('int')}{' n;\n  cin >> n;\n  solve(n);\n  '}{kw('return')}{' 0;\n}'}
    </DecoCard>

    <DecoCard filename="solve.py" style={{ left: '2.5%', top: '12%', width: 'clamp(114px,12.5vw,186px)', animation: 'om-float-a 7.5s ease-in-out infinite' }}>
      {kw('def')}{' solve(n):\n  dp = [0] * (n+1)\n  '}{kw('for')}{' i '}{kw('in')}{' range(n):\n    dp[i+1] = dp[i] + i\n  '}{kw('return')}{' dp[n]'}
    </DecoCard>

    <DecoCard filename="judge.log" style={{ right: '3.5%', bottom: '9%', width: 'clamp(100px,10.5vw,162px)', animation: 'om-float-c 9.5s ease-in-out infinite' }}>
      {kw('AC')}{'  0.42s  12MB\n'}{kw('AC')}{'  0.31s  11MB\nTLE 2.00s  --\n'}{kw('AC')}{'  0.18s  10MB'}
    </DecoCard>

    <DecoCard filename="main.rs" style={{ left: '4%', bottom: '11%', width: 'clamp(94px,10vw,152px)', animation: 'om-float-b 8.8s ease-in-out infinite' }}>
      {kw('fn')}{' main() {\n  '}{kw('let')}{' n = read();\n  println!("{}", n);\n}'}
    </DecoCard>

    {DECO_TEXTS.map(({ t, s }) => (
      <span key={t} className="nb-deco-text" style={s}>{t}</span>
    ))}
  </div>
);

/**
 * Marco compartido por RegisterPage, RecoverPage y ResetPage.
 * Replica el lenguaje visual del HomePage: navbar blanco con borde negro,
 * fondo claro y tarjeta blanca con sombra sólida.
 */
const AuthShell = ({ title, subtitle, action, maxWidth = 560, decorated = false, home = '/', children }) => (
  <div className="nb-auth">
    <nav className="nb-authnav">
      <div className="nb-authnav-inner">
        <Link to={home} className="nb-brand">CODECOMP</Link>
        {action && (
          <Link to={action.to} state={action.state} className={action.variant === 'blue' ? 'nb-btn-blue' : 'nb-btn-white'}>
            {action.label}
          </Link>
        )}
      </div>
    </nav>

    <main className={`nb-auth-main${decorated ? ' is-decorated' : ''}`}>
      {decorated && <AuthDecor />}

      <div className="nb-panel" style={{ maxWidth, position: 'relative', zIndex: 1 }}>
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
