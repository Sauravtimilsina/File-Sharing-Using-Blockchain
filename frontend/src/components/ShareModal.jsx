import { useState } from 'react';
import { X, Send, Loader2, Mail, Share2, UserPlus } from 'lucide-react';
import API from '../api/axios';
import { useToast } from './toastContext';

const ShareModal = ({ file, onClose, onShared }) => {
  const [email, setEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/share/file', { fileId: file._id, sharedWithEmail: email, expiresIn: expiresIn || undefined });
      setSuccess(`File shared with ${email} successfully!`);
      toast.success(`File shared with ${email}`);
      setEmail('');
      if (onShared) onShared();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to share file';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-[fadeIn_0.2s_ease]">
      <div className="surface-glass premium-shadow w-full max-w-md rounded-[28px] border border-white/80 p-5 animate-[scaleIn_0.2s_ease] dark:border-white/10 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Controlled sharing</p>
              <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Share file</h3>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{file?.filename}</p>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Access expiry</label>
            <select
              value={expiresIn}
              onChange={(event) => setExpiresIn(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:focus:border-cyan-300"
            >
              <option value="">No expiry</option>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
            </select>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" title="Close share dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {success}
          </div>
        )}

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Recipient email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:focus:border-cyan-300"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Share2 className="h-4 w-4" /><Send className="h-4 w-4" /> Share</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
