import { Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppNavbar from './components/AppNavbar';
import AppSidebar from './components/AppSidebar';
import AppFooter from './components/AppFooter';

const DashboardLayout = () => (
  <AuthProvider>
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">
      <AppNavbar />
      <AppSidebar />
      <main className="min-h-screen px-4 pb-16 pt-24 md:pl-72 md:pr-8">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  </AuthProvider>
);

export default DashboardLayout;
