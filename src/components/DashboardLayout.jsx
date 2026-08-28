import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AppNavbar from './AppNavbar';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';

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
    </div>
  </AuthProvider>
);

export default DashboardLayout;
