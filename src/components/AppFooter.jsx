import logoUfps from '../assets/logo-ufps-blanco.png';

const AppFooter = () => (
  <footer className="nb-dash-footer">
    <div className="nb-dash-footer-inner">
      <div>
        <div className="nb-dash-footer-brand">CODECOMP</div>
        <div className="nb-dash-footer-note">Prototipo · 2026</div>
      </div>
      <div className="nb-dash-footer-ufps">
      <img className="nb-footer-ufps" src={logoUfps} alt="UFPS Ocaña" width="500" height="500" loading="lazy" />
      <p className="nb-dash-footer-text">
        Plataforma de programación competitiva con retroalimentación para la{' '}
        <span className="nb-dash-footer-uni">Universidad Francisco de Paula de Santander</span>
      </p>
      </div>
    </div>
  </footer>
);

export default AppFooter;
