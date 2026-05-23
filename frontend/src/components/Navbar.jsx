import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authStore';
import { useTheme } from '../context/themeStore';
import { LayoutDashboard, LogOut, Moon, Settings, ShieldCheck, Sun, Upload, Users } from 'lucide-react';

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
    <nav className="nav-luxe sticky top-0 z-50 border-b border-white/70 bg-white/86 backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/82">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-18 items-center justify-between gap-3 py-2">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/70 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
              <img src="/logo.png" className="h-7 w-7 object-contain" alt="SecureTransfer logo" />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                SecureTransfer
              </span>
              <span className="hidden text-xs font-semibold text-sky-700 dark:text-sky-300 sm:block">
                Encrypted workspace
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-white/80 bg-white/72 p-1 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.07] md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-item relative flex items-center gap-2 overflow-hidden rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-300 ${
                  isActive(link.to)
                    ? 'is-active bg-slate-950 text-white shadow-lg shadow-sky-950/15 dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
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
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/80 bg-white/78 text-slate-500 shadow-lg shadow-slate-950/5 transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:text-white"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link to="/profile" className="hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/78 px-2.5 py-2 shadow-lg shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-sky-200 dark:border-white/10 dark:bg-white/[0.07] sm:flex" title="Profile">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-sky-600 via-cyan-500 to-emerald-500 text-xs font-bold text-white shadow-md">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <ShieldCheck className="hidden h-4 w-4 text-emerald-500 lg:block" />
            </Link>

            <button
              onClick={handleLogout}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-transparent text-slate-500 transition hover:-translate-y-0.5 hover:border-danger/20 hover:bg-danger/10 hover:text-danger"
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
              className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                isActive(link.to)
                  ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-sky-950/15 dark:border-white dark:bg-white dark:text-slate-950'
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
