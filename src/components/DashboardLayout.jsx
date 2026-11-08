import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AppNavbar from './AppNavbar';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';
import RegistroEstudiante from './RegistroEstudiante';
import ActualizarCodigo from './ActualizarCodigo';

/* Avisos fijos abajo a la derecha, apilados. En Mi cuenta no se muestran: ahí están los mismos
   controles. RegistroEstudiante se monta igual porque además registra la actividad. */
const Avisos = () => {
  const enCuenta = useLocation().pathname === '/dashboard/cuenta';
  return (
    <div className={`nb-dash-avisos${enCuenta ? ' is-oculto' : ''}`}>
      <ActualizarCodigo />
      <RegistroEstudiante />
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
