const AppFooter = () => (
  <footer className="nb-dash-footer">
    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
      <div>
        <div className="nb-dash-footer-brand">CODECOMP</div>
        <div className="nb-dash-footer-note">Prototipo · 2026</div>
      </div>
      <p className="nb-dash-footer-text">
        Plataforma de programación competitiva con retroalimentación para la{' '}
        <span style={{ color: '#8FA4FF', fontWeight: 700 }}>Universidad Francisco de Paula de Santander</span>
      </p>
    </div>
  </footer>
);

export default AppFooter;
