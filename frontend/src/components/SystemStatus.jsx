import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import API from '../api/axios';

const SystemStatus = ({ compact = false }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let ignore = false;

    const checkStatus = async () => {
      try {
        const res = await API.get('/health/ready', { timeout: 8000 });
        if (!ignore) setStatus(res.data?.supabase?.ok ? 'ready' : 'degraded');
      } catch {
        if (!ignore) setStatus('degraded');
      }
    };

    checkStatus();
    const timer = window.setInterval(checkStatus, 60000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const state = {
    checking: {
      label: compact ? 'Checking' : 'Checking system',
      icon: Loader2,
      className: 'border-slate-200 bg-white/80 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300',
      iconClassName: 'animate-spin text-sky-500',
    },
    ready: {
      label: compact ? 'Ready' : 'System ready',
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-200',
      iconClassName: 'text-emerald-500',
    },
    degraded: {
      label: compact ? 'Review' : 'Needs review',
      icon: AlertTriangle,
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-200',
      iconClassName: 'text-amber-500',
    },
  }[status];

  const Icon = state.icon;

  return (
    <span
      className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold shadow-sm ${state.className}`}
      title="Backend and Supabase readiness"
    >
      <Icon className={`h-4 w-4 ${state.iconClassName}`} />
      <span className={compact ? 'hidden lg:inline' : ''}>{state.label}</span>
    </span>
  );
};

export default SystemStatus;
