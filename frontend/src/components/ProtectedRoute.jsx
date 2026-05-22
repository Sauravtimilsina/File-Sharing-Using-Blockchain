import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authStore';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell flex h-screen items-center justify-center transition-colors duration-300">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600 dark:border-white/10 dark:border-t-emerald-300" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
