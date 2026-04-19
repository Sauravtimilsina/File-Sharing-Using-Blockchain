import { useState } from 'react';
import { X, Send, Loader2, UserPlus } from 'lucide-react';
import API from '../api/axios';
import { useToast } from './Toast';

const ShareModal = ({ file, onClose, onShared }) => {
  const [email, setEmail] = useState('');
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
      await API.post('/share/file', { fileId: file._id, sharedWithEmail: email });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-[scaleIn_0.2s_ease] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 dark:bg-white/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Share File</h3>
              <p className="text-xs text-neutral-500 truncate max-w-[200px]">{file?.filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              required
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Share</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
