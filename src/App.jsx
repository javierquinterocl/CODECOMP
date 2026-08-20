import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from './firebase/firebaseConfig';
import RegisterPage from './loginProject/RegisterPage';
import LoginPage from './loginProject/LoginPage';
import DashboardPage from './loginProject/DashboardPage';
import UserHistoryPage from './loginProject/UserHistoryPage';
import RecoverPage from './loginProject/RecoverPage';
import ResetPage from './loginProject/ResetPage';
import CompleteProfilePage from './loginProject/CompleteProfilePage';
import DailyChallengesPage from './loginProject/DailyChallengesPage';
import TournamentsPage from './loginProject/TournamentsPage';
import GruposPage from './loginProject/GruposPage';
import HomePage from './loginProject/HomePage';
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
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (status === 'incomplete') return <Navigate to="/complete-profile" replace />;
  return element;
};

// Exclusiva para /complete-profile: bloquea si ya completó el perfil
const CompleteProfileRoute = ({ element }) => {
  const status = useAuthAndProfile();
  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
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
        <Route path="/login"    element={<PublicOnlyRoute element={<LoginPage />} />} />
        <Route path="/register" element={<PublicOnlyRoute element={<RegisterPage />} />} />
        <Route path="/recover"  element={<PublicOnlyRoute element={<RecoverPage />} />} />

        {/* Rutas protegidas: redirigen al login si no hay sesión */}
        <Route path="/dashboard"          element={<ProtectedRoute element={<DashboardPage />} />} />
        <Route path="/dashboard/retos"    element={<ProtectedRoute element={<DailyChallengesPage />} />} />
        <Route path="/dashboard/torneos"  element={<ProtectedRoute element={<TournamentsPage />} />} />
        <Route path="/dashboard/grupos"   element={<ProtectedRoute element={<GruposPage />} />} />
        <Route path="/historial-usuarios" element={<ProtectedRoute element={<UserHistoryPage />} />} />
        <Route path="/reset"              element={<ProtectedRoute element={<ResetPage />} />} />
        <Route path="/complete-profile"   element={<CompleteProfileRoute element={<CompleteProfilePage />} />} />
      </Routes>
    </Router>
  );
}

export default App;
