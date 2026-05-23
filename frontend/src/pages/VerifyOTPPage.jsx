import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useToast } from '../components/toastContext';
import { useAuth } from '../context/authStore';

const VerifyOTPPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const location = useLocation();
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || '');
  const inputRefs = useRef([]);
  const { verifyOTP, resendOTP } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, offset) => {
        if (index + offset < 6) newOtp[index + offset] = digit;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(email, code);
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const data = await resendOTP(email);
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success('New verification code sent!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <AuthShell
      eyebrow="Identity verification"
      title="Confirm your email"
      description={(
        <>
          Enter the six-digit code sent to <span className="font-semibold text-slate-800 dark:text-white">{email}</span>.
        </>
      )}
      footer="Verification codes expire after 5 minutes."
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-800 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-100">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        Complete this step before accessing the secure workspace.
      </div>

      {devOtp && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          Local verification code: <span className="font-mono">{devOtp}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-14 min-w-0 rounded-2xl border border-slate-200 bg-white/90 text-center text-xl font-bold text-slate-950 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:focus:border-sky-300 sm:h-16"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || otp.join('').length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify email'}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Did not receive the code?{' '}
        {countdown > 0 ? (
          <span className="font-medium text-slate-400">Resend in {countdown}s</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1 font-semibold text-sky-700 transition hover:text-sky-900 disabled:opacity-60 dark:text-sky-300 dark:hover:text-white"
          >
            {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Resend
          </button>
        )}
      </div>
    </AuthShell>
  );
};

export default VerifyOTPPage;
