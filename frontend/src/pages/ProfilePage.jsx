import { useEffect, useState } from 'react';
import { useAuth } from '../context/authStore';
import { useToast } from '../components/toastContext';
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user?.username]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const data = await updateProfile(username.trim());
      toast.success(data.message || 'Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    try {
      const data = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      toast.success(data.message || 'Password updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password update failed');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="surface-glass premium-shadow security-grid rounded-[28px] border border-white/80 px-5 py-6 dark:border-white/10 sm:px-7 sm:py-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5 text-sm font-semibold text-sky-800 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-100">
              <Fingerprint className="h-4 w-4" />
              Profile
            </p>
            <h1 className="text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Account settings</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
              Keep your identity current and update your password from one protected place.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Account status</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
              Verified
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-sky-600 to-emerald-500 text-2xl font-bold text-white shadow-lg">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{user?.username}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
            <Mail className="h-4 w-4" />
            {user?.email}
          </p>
          <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100">
            <CheckCircle2 className="mb-2 h-5 w-5" />
            Profile changes are saved on the backend and refreshed in your session.
          </div>
        </aside>

        <div className="space-y-5">
          <form onSubmit={handleProfileSubmit} className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-300/10 dark:text-sky-200">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Profile details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update the username shown across the workspace.</p>
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
                placeholder="Your username"
              />
            </label>
            <button
              type="submit"
              disabled={savingProfile || username.trim() === user?.username}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
            >
              {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save profile
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Change password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use your current password before setting a new one.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 px-5 font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
              Update password
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
