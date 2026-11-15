import { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AppNavbar from './AppNavbar';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';
import RegistroEstudiante from './RegistroEstudiante';
import ActualizarCodigo from './ActualizarCodigo';
import Tutorial from './Tutorial';

/* Avisos fijos abajo a la derecha, apilados. En Mi cuenta (ahí están los mismos controles) y en
   Competencias (taparían el juez) no se muestran. RegistroEstudiante se monta igual: registra la actividad. */
const SIN_AVISOS = ['/dashboard/cuenta', '/dashboard/competencias'];
const Avisos = () => {
  const oculto = SIN_AVISOS.includes(useLocation().pathname);
  const { user } = useAuth();
  // El recorrido se ofrece cuando ya se respondió el aviso de cookies: una pregunta a la vez.
  const [cookiesRespondidas, setCookiesRespondidas] = useState(false);
  const alSaber = useCallback((autorizado) => setCookiesRespondidas(autorizado === true || autorizado === false), []);
  return (
    <div className={`nb-dash-avisos${oculto ? ' is-oculto' : ''}`}>
      <ActualizarCodigo />
      <RegistroEstudiante alSaber={alSaber} />
      {user && <Tutorial key={user.uid} listo={cookiesRespondidas} />}
    </div>
  );
};

const DashboardLayout = () => (
  <AuthProvider>
    <div className="nb-dash">
      <AppNavbar />
      <div className="nb-dash-body">
        <AppSidebar />
        <main className="nb-dash-main">
          <Outlet />
        </main>
      </div>
      <AppFooter />
      <Avisos />
    </div>
  </AuthProvider>
);

export default DashboardLayout;
