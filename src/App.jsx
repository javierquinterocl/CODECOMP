import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from './firebase/firebaseConfig';
import RegisterPage from './loginProject/RegisterPage';
import DashboardPage from './loginProject/DashboardPage';
import UserHistoryPage from './loginProject/UserHistoryPage';
import RecoverPage from './loginProject/RecoverPage';
import ResetPage from './loginProject/ResetPage';
import CompleteProfilePage from './loginProject/CompleteProfilePage';
import DailyChallengesPage from './loginProject/DailyChallengesPage';
import TournamentsPage from './loginProject/TournamentsPage';
import GruposPage from './loginProject/GruposPage';
import HomePage from './loginProject/HomePage';
import DashboardLayout from './loginProject/DashboardLayout';
import './App.css';

// 'loading' | 'unauthenticated' | 'incomplete' | 'complete'
const useAuthAndProfile = () => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setStatus('unauthenticated');
      return;
    }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setStatus('unauthenticated'); return; }
      try {
        const snap = await getDoc(doc(db, 'usuarios_registrados', user.uid));
        setStatus(snap.exists() && snap.data().codigo ? 'complete' : 'incomplete');
      } catch {
        setStatus('complete');
      }
    });
  }, []);

  return status;
};

// Rutas que requieren sesión y perfil completo
const ProtectedRoute = ({ element }) => {
  const status = useAuthAndProfile();
  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Navigate to="/" replace state={{ openLogin: true }} />;
  if (status === 'incomplete') return <Navigate to="/complete-profile" replace />;
  return element;
};

// Exclusiva para /complete-profile: bloquea si ya completó el perfil
const CompleteProfileRoute = ({ element }) => {
  const status = useAuthAndProfile();
  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Navigate to="/" replace state={{ openLogin: true }} />;
  if (status === 'complete') return <Navigate to="/dashboard" replace />;
  return element;
};

// Rutas públicas: redirige si ya hay sesión activa
const PublicOnlyRoute = ({ element }) => {
  const status = useAuthAndProfile();
  if (status === 'loading') return null;
  if (status === 'complete') return <Navigate to="/dashboard" replace />;
  if (status === 'incomplete') return <Navigate to="/complete-profile" replace />;
  return element;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Rutas públicas: redirigen al dashboard si ya hay sesión */}
        {/* /login quedo retirado: el inicio de sesion vive en el modal del HomePage.
           Se conserva la ruta para que enlaces y marcadores viejos no se rompan. */}
        <Route path="/login"    element={<Navigate to="/" replace state={{ openLogin: true }} />} />
        <Route path="/register" element={<PublicOnlyRoute element={<RegisterPage />} />} />
        <Route path="/recover"  element={<PublicOnlyRoute element={<RecoverPage />} />} />

        {/* Rutas protegidas con layout compartido */}
        <Route element={<ProtectedRoute element={<DashboardLayout />} />}>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/dashboard/retos"    element={<DailyChallengesPage />} />
          <Route path="/dashboard/torneos"  element={<TournamentsPage />} />
          <Route path="/dashboard/grupos"   element={<GruposPage />} />
          <Route path="/historial-usuarios" element={<UserHistoryPage />} />
        </Route>

        {/* ResetPage tiene su propio layout simple — fuera del DashboardLayout */}
        <Route path="/reset" element={<ProtectedRoute element={<ResetPage />} />} />

        <Route path="/complete-profile" element={<CompleteProfileRoute element={<CompleteProfilePage />} />} />
      </Routes>
    </Router>
  );
}

export default App;
