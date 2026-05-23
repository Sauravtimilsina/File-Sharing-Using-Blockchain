import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/authStore';
import { useToast } from '../components/toastContext';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

const initialProfile = (user) => ({
  username: user?.username || '',
  fullName: user?.fullName || '',
  jobTitle: user?.jobTitle || '',
  department: user?.department || '',
  phone: user?.phone || '',
  bio: user?.bio || '',
});

const ProfilePage = () => {
  const { user, updateProfile, updateAvatar, changePassword } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [profile, setProfile] = useState(() => initialProfile(user));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfile(initialProfile(user));
  }, [user]);

  const profileComplete = useMemo(() => {
    const fields = ['fullName', 'jobTitle', 'department', 'phone', 'bio'];
    const complete = fields.filter((field) => profile[field]?.trim()).length;
    return Math.round((complete / fields.length) * 100);
  }, [profile]);

  const handleChange = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const data = await updateProfile({
        ...profile,
        username: profile.username.trim(),
      });
      toast.success(data.message || 'Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPG, PNG, or WEBP profile image');
      return;
    }
    if (file.size > 750 * 1024) {
      toast.error('Profile image must be under 750 KB');
      return;
    }
    setSavingAvatar(true);
    try {
      const data = await updateAvatar(file);
      toast.success(data.message || 'Profile picture updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile picture update failed');
    } finally {
      setSavingAvatar(false);
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
      <section className="profile-aurora premium-shadow relative overflow-hidden rounded-[32px] border border-white/80 px-5 py-7 text-white dark:border-white/10 sm:px-7 sm:py-8">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-sm font-semibold text-sky-50 backdrop-blur">
              <Fingerprint className="h-4 w-4" />
              Identity console
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
              Build a sharper secure identity.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-sky-50/82">
              Add your profile picture, role details, contact context, and security credentials in one polished control center.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/12 p-5 shadow-2xl shadow-sky-950/20 backdrop-blur">
            <p className="text-sm font-medium text-sky-50/75">Profile strength</p>
            <p className="mt-2 text-4xl font-semibold">{profileComplete}%</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/16">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-200 via-emerald-200 to-amber-200 transition-[width] duration-700" style={{ width: `${profileComplete}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="profile-card-luxe rounded-[32px] border border-white/80 bg-white/84 p-5 shadow-xl shadow-slate-950/8 dark:border-white/10 dark:bg-slate-900/78">
          <div className="relative mx-auto h-36 w-36">
            <div className="avatar-ring absolute inset-0 rounded-[34px]" />
            {user?.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="Profile" className="relative h-36 w-36 rounded-[34px] object-cover shadow-2xl" />
            ) : (
              <div className="relative grid h-36 w-36 place-items-center rounded-[34px] bg-gradient-to-br from-sky-600 via-cyan-500 to-emerald-500 text-5xl font-bold text-white shadow-2xl">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={savingAvatar}
              className="absolute -bottom-2 -right-2 grid h-12 w-12 place-items-center rounded-2xl border border-white bg-slate-950 text-white shadow-xl transition hover:-translate-y-0.5 disabled:opacity-60"
              title="Upload profile picture"
            >
              {savingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarSelect} className="hidden" />
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">{profile.fullName || user?.username}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{profile.jobTitle || 'Secure workspace member'}</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100">
              <BadgeCheck className="h-4 w-4" />
              Verified account
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><Mail className="h-4 w-4 text-sky-500" /> Email</p>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">{user?.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><BriefcaseBusiness className="h-4 w-4 text-emerald-500" /> Department</p>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">{profile.department || 'Not set'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><Phone className="h-4 w-4 text-amber-500" /> Phone</p>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">{profile.phone || 'Not set'}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <form onSubmit={handleProfileSubmit} className="rounded-[32px] border border-white/80 bg-white/84 p-5 shadow-xl shadow-slate-950/8 dark:border-white/10 dark:bg-slate-900/78 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-300/10 dark:text-sky-200">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Profile details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Complete the identity shown in your secure workspace.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" value={profile.username} onChange={(value) => handleChange('username', value)} />
              <Field label="Full name" value={profile.fullName} onChange={(value) => handleChange('fullName', value)} />
              <Field label="Job title" value={profile.jobTitle} onChange={(value) => handleChange('jobTitle', value)} />
              <Field label="Department" value={profile.department} onChange={(value) => handleChange('department', value)} />
              <Field label="Phone" value={profile.phone} onChange={(value) => handleChange('phone', value)} />
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Bio</span>
                <textarea
                  value={profile.bio}
                  onChange={(event) => handleChange('bio', event.target.value)}
                  maxLength={240}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
                  placeholder="Short professional note"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-700 via-cyan-600 to-emerald-600 px-5 font-semibold text-white shadow-lg shadow-sky-950/18 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save profile
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="rounded-[32px] border border-white/80 bg-white/84 p-5 shadow-xl shadow-slate-950/8 dark:border-white/10 dark:bg-slate-900/78 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Security controls</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your password without changing lock status.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} />
              <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} />
            </div>
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100 sm:flex-row sm:items-center">
              <Sparkles className="h-5 w-5 shrink-0" />
              Extra account protection is active for unusual sign-in activity.
            </div>
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {savingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              Update password
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
    />
  </label>
);

export default ProfilePage;
