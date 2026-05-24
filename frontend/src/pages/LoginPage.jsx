import { ArrowRight, CheckCircle2, Eye, EyeOff, Info, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/authStore';

const LoginPage = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(localStorage.getItem('rememberedEmail')));
  const [capsLock, setCapsLock] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (rememberEmail && email.trim()) {
      localStorage.setItem('rememberedEmail', email.trim());
    } else if (!rememberEmail) {
      localStorage.removeItem('rememberedEmail');
    }
  }, [email, rememberEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        navigate('/verify-otp', { state: { email: err.response.data.email } });
        return;
      }
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Client access"
      title="Welcome back"
      description="Sign in to manage files, review activity, and share documents with the people you trust."
      footer={(
        <>
          New to SecureTransfer?{' '}
          <Link to="/register" className="font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-white">
            Create an account
          </Link>
        </>
      )}
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-200">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        Your workspace is ready after a quick sign in.
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {['Encrypted files', 'OTP verified', 'Integrity checks'].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {item}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger animate-[slideIn_0.3s_ease]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:focus:border-sky-300"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
            <Link to="/forgot-password" className="text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-white">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
              placeholder="Enter your password"
              required
              maxLength={128}
              className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-12 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:focus:border-sky-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLock && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Info className="h-3.5 w-3.5" />
              Caps Lock is on
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          Remember this email
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
            className="h-4 w-4 accent-sky-600"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
