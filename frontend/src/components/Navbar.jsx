import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authStore';
import { useTheme } from '../context/themeStore';
import { LayoutDashboard, LogOut, Moon, Settings, Sun, Upload, Users } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/shared', label: 'Shared', icon: Users },
    { to: '/profile', label: 'Profile', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/88">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <img src="/logo.png" className="h-7 w-7 object-contain" alt="SecureTransfer logo" />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-slate-950 dark:text-white">
                SecureTransfer
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/[0.06] md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-white"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link to="/profile" className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-sky-200 dark:border-white/10 dark:bg-white/[0.06] sm:flex" title="Profile">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-600 text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="grid h-10 w-10 place-items-center rounded-xl border border-transparent text-slate-500 transition hover:border-danger/20 hover:bg-danger/10 hover:text-danger"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                isActive(link.to)
                  ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-300 dark:bg-sky-300 dark:text-slate-950'
                  : 'border-slate-200 bg-white/75 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300'
              }`}
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
