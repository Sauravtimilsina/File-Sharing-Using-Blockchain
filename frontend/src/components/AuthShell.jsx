import { Fingerprint, LockKeyhole, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/themeStore';

const trustSignals = [
  { icon: LockKeyhole, label: 'Private workspace', value: 'Organized access' },
  { icon: Fingerprint, label: 'File checks', value: 'Review ready' },
  { icon: ShieldCheck, label: 'Account entry', value: 'Verified sign in' },
];

const AuthShell = ({ eyebrow, title, description, children, footer }) => {
  const { dark, toggle } = useTheme();

  return (
    <div className="auth-stage security-grid min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:p-8">
      <button
        onClick={toggle}
        className="fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-emerald-300 sm:right-6 sm:top-6"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <main className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-950/70 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="auth-rail relative hidden overflow-hidden px-10 py-11 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 security-grid opacity-30" />
          <div className="relative">
            <Link to="/login" className="inline-flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-xl">
                <img src="/logo.png" className="h-10 w-10 object-contain" alt="SecureTransfer logo" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase text-cyan-100/80">Cyber file vault</span>
                <span className="block text-2xl font-bold">SecureTransfer</span>
              </span>
            </Link>

            <div className="mt-20 max-w-xl animate-[floatUp_0.7s_ease]">
              <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-sky-50">
                SecureTransfer workspace
              </p>
              <h1 className="text-5xl font-semibold leading-[1.08]">
                A focused file workspace for careful sharing.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-200">
                Upload, review, and share files through a calm cyber workspace built for daily work.
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 xl:grid-cols-3">
            {trustSignals.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <signal.icon className="mb-4 h-5 w-5 text-emerald-300" />
                <p className="text-sm font-semibold">{signal.label}</p>
                <p className="mt-1 text-sm text-slate-300">{signal.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-full items-center justify-center px-4 py-16 sm:px-8 lg:px-12">
          <div className="w-full max-w-md animate-[fadeIn_0.5s_ease]">
            <Link to="/login" className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
                <img src="/logo.png" className="h-9 w-9 object-contain" alt="SecureTransfer logo" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-300">Cyber file vault</span>
                <span className="block text-xl font-bold text-slate-950 dark:text-white">SecureTransfer</span>
              </span>
            </Link>

            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold uppercase text-sky-700 dark:text-sky-300">{eyebrow}</p>
              <h2 className="text-3xl font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">{description}</p>
            </div>

            <div className="surface-glass rounded-[24px] border border-white/80 p-5 dark:border-white/10 sm:p-7">
              {children}
            </div>

            {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthShell;
