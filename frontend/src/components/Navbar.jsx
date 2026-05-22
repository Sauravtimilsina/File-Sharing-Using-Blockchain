import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authStore';
import { useTheme } from '../context/themeStore';
import { Activity, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, Upload, Users } from 'lucide-react';

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
    { to: '/shared', label: 'Shared Files', icon: Users },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 items-center justify-between gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <img src="/logo.png" className="h-9 w-9 object-contain" alt="SecureTransfer logo" />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                SecureTransfer
              </span>
              <span className="hidden text-xs font-medium text-cyan-700 dark:text-cyan-300 sm:block">
                Workspace ready
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-[20px] border border-cyan-200/80 bg-cyan-950/[0.03] p-1 shadow-sm dark:border-cyan-300/15 dark:bg-cyan-300/[0.06] md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/upload"
              className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 sm:flex md:hidden lg:flex"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden lg:inline">Upload</span>
            </Link>

            <button
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-white"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-emerald-500 text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block">
                <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300"><Activity className="h-3 w-3" /> Signed in</p>
                <p className="max-w-28 truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{user?.username}</p>
              </div>
              <ShieldCheck className="hidden h-4 w-4 text-emerald-500 lg:block" />
            </div>

            <button
              onClick={handleLogout}
              className="flex h-10 items-center gap-2 rounded-2xl border border-transparent px-3 text-sm font-semibold text-slate-500 transition hover:border-danger/20 hover:bg-danger/10 hover:text-danger"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">Logout</span>
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
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                  : 'border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300'
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
