import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import FileTypeIcon from '../components/FileTypeIcon';
import ShareModal from '../components/ShareModal';
import { useToast } from '../components/toastContext';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  Filter,
  Fingerprint,
  LayoutGrid,
  List,
  LockKeyhole,
  Loader2,
  Package,
  RefreshCcw,
  Search,
  Share2,
  ShieldCheck,
  Signal,
  SquarePen,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';

const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareFile, setShareFile] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [myShares, setMyShares] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState(() => localStorage.getItem('fileView') || 'grid');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [chainStatus, setChainStatus] = useState(null);
  const toast = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      const res = await API.get('/files/my-files');
      setFiles(res.data.files);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const fetchExtras = useCallback(async () => {
    try {
      const sharesRes = await API.get('/share/my-shares');
      setMyShares(sharesRes.data.shares || []);
    } catch {
      toast.error('Failed to load sharing details');
    }
  }, [toast]);

  useEffect(() => { fetchExtras(); }, [fetchExtras]);

  const fetchBlockchainStatus = useCallback(async () => {
    try {
      const res = await API.get('/files/blockchain/status');
      setChainStatus(res.data);
    } catch {
      toast.error('Failed to load blockchain status');
    }
  }, [toast]);

  useEffect(() => { fetchBlockchainStatus(); }, [fetchBlockchainStatus]);

  const toggleView = (nextView) => {
    setView(nextView);
    localStorage.setItem('fileView', nextView);
  };

  const readErrorData = async (err) => {
    if (err.response?.data instanceof Blob) {
      try {
        return JSON.parse(await err.response.data.text());
      } catch {
        return null;
      }
    }
    return err.response?.data || null;
  };

  const handleDownload = async (file) => {
    setDownloading(file._id);
    try {
      const res = await API.get(`/files/download/${file._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded "${file.filename}"`);
    } catch (err) {
      const data = await readErrorData(err);
      if (data?.tampered) {
        toast.error(data.removed ? `"${file.filename}" failed its check and was removed.` : `Tampering detected! "${file.filename}" has been modified or corrupted.`);
        setVerifyResult({ fileId: file._id, isValid: false, message: data.message });
        if (data.removed) {
          fetchFiles();
          fetchExtras();
        }
      } else {
        toast.error(data?.message || 'Download failed');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleVerify = async (file) => {
    setVerifying(file._id);
    setVerifyResult(null);
    try {
      const res = await API.get(`/files/verify/${file._id}`);
      setVerifyResult({ fileId: file._id, ...res.data });
      if (res.data.isValid) {
        toast.success(`"${file.filename}" passed its check`);
      } else {
        toast.warning(res.data.removed ? `"${file.filename}" failed its check and was removed.` : `"${file.filename}" needs review`);
        if (res.data.removed) {
          fetchFiles();
          fetchExtras();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setVerifyResult({ fileId: file._id, isValid: false, message: 'Verification failed' });
    } finally {
      setVerifying(null);
    }
  };

  const getExtension = (filename) => filename?.split('.').pop()?.toUpperCase() || '';
  const formatSize = (bytes = 0) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleRename = async (file) => {
    const filename = window.prompt('Rename file', file.filename);
    if (!filename || filename.trim() === file.filename) return;
    setRenaming(file._id);
    try {
      await API.put(`/files/${file._id}/rename`, { filename });
      toast.success('File renamed');
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    } finally {
      setRenaming(null);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Archive and remove "${file.filename}"? Shared access will stop.`)) return;
    setDeleting(file._id);
    try {
      await API.delete(`/files/${file._id}`);
      toast.success('File archived');
      fetchFiles();
      fetchExtras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = async (file) => {
    setPreviewing(file._id);
    try {
      const res = await API.get(`/files/preview/${file._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (err) {
      const data = await readErrorData(err);
      toast.error(data?.removed ? `"${file.filename}" failed its check and was removed.` : data?.message || 'Preview failed');
      if (data?.removed) {
        fetchFiles();
        fetchExtras();
      }
    } finally {
      setPreviewing(null);
    }
  };

  const handleRevokeShare = async (share) => {
    setDeleting(share._id);
    try {
      await API.delete(`/share/${share._id}`);
      toast.success('Share revoked');
      fetchExtras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Revoke failed');
    } finally {
      setDeleting(null);
    }
  };
  const recentFiles = [...files]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  const extensionCounts = files.reduce((counts, file) => {
    const extension = getExtension(file.filename) || 'FILE';
    counts[extension] = (counts[extension] || 0) + 1;
    return counts;
  }, {});
  const extensionSignals = Object.entries(extensionCounts)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .slice(0, 4);
  const fileTypes = Object.keys(extensionCounts).sort();
  const filteredFiles = files
    .filter((file) => file.filename?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .filter((file) => typeFilter === 'all' || getExtension(file.filename) === typeFilter)
    .sort((a, b) => {
      if (sortBy === 'name') return (a.filename || '').localeCompare(b.filename || '');
      if (sortBy === 'size') return Number(b.fileSize || 0) - Number(a.fileSize || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  const lastUpload = recentFiles[0];
  const stats = [
    { label: 'My files', value: files.length, icon: Package, tone: 'from-sky-500 to-cyan-400' },
    { label: 'Stored data', value: formatSize(files.reduce((total, file) => total + Number(file.fileSize || 0), 0)), icon: ShieldCheck, tone: 'from-emerald-500 to-lime-400' },
    { label: 'File formats', value: Object.keys(extensionCounts).length, icon: Signal, tone: 'from-cyan-500 to-blue-500' },
    { label: 'Sharing', value: 'Ready', icon: Users, tone: 'from-fuchsia-500 to-rose-400' },
  ];
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="surface-glass flex items-center gap-3 rounded-xl border border-white/80 px-6 py-5 text-slate-500 dark:border-white/10 dark:text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          Loading dashboard
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="surface-glass premium-shadow security-grid relative overflow-hidden rounded-xl border border-white/80 px-5 py-6 dark:border-white/10 sm:px-7 sm:py-8">
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-3 py-1.5 text-sm font-semibold text-cyan-900 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-100">
              <Fingerprint className="h-4 w-4" />
              Dashboard
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              A clean workspace for your files.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
              See recent activity, run quick file checks, and move into sharing without extra clutter.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              to="/upload"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-5 font-semibold text-white shadow-sm shadow-sky-900/15 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <UploadCloud className="h-5 w-5" />
              Upload file
            </Link>
            <Link
              to="/shared"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-5 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:text-sky-200"
            >
              Shared files
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => { setLoading(true); fetchFiles(); fetchBlockchainStatus(); fetchExtras(); }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-5 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:text-emerald-200"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-white/80 bg-white/86 shadow-sm shadow-slate-950/8 dark:border-white/10 dark:bg-slate-900/82">
        <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
          <div className="bg-slate-950 p-6 text-white sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-300">Integrity Channel</p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">File Check Center</h2>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Live verification
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-cyan-200/10 bg-white/[0.06] p-4 sm:p-5">
              <div className="relative h-56 overflow-hidden rounded-lg bg-slate-900/70">
                <div className="absolute inset-x-0 bottom-0 top-6 grid grid-rows-4">
                  {[0, 1, 2, 3].map((line) => (
                    <span key={line} className="border-t border-white/8" />
                  ))}
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 224" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="integrityLine" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="55%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#f8fafc" />
                    </linearGradient>
                    <linearGradient id="integrityFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 168 C58 132 88 152 132 112 C178 70 220 94 262 78 C306 60 338 120 382 96 C430 70 454 42 506 62 C560 82 592 50 640 28 L640 224 L0 224 Z" fill="url(#integrityFill)" />
                  <path d="M0 168 C58 132 88 152 132 112 C178 70 220 94 262 78 C306 60 338 120 382 96 C430 70 454 42 506 62 C560 82 592 50 640 28" fill="none" stroke="url(#integrityLine)" strokeWidth="5" strokeLinecap="round" />
                </svg>
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2 backdrop-blur">
                    <p className="text-[11px] text-slate-400">Latest file</p>
                    <p className="truncate text-sm font-semibold">{lastUpload?.filename || 'No file selected'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2 backdrop-blur">
                    <p className="text-[11px] text-slate-400">Ledger</p>
                    <p className="text-sm font-semibold">{chainStatus?.status === 'valid' ? 'Verified' : 'Checking'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2 backdrop-blur">
                    <p className="text-[11px] text-slate-400">Issues</p>
                    <p className="text-sm font-semibold">{chainStatus?.issues?.length ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => lastUpload && handleVerify(lastUpload)}
                disabled={!lastUpload || verifying === lastUpload?._id}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying === lastUpload?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Check latest file
              </button>
              <Link to="/shared" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14]">
                Shared files
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="p-5 sm:p-6">
            <div className="grid gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{stat.value}</p>
                  </div>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${stat.tone} text-white shadow-sm`}>
                    <stat.icon className="h-5 w-5" />
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/45">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Workspace Signals</p>
                <LockKeyhole className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                {(extensionSignals.length ? extensionSignals : [['NONE', 0]]).map(([extension, count]) => (
                  <span key={extension} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100">
                    {extension} / {count}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {(myShares.length ? myShares.slice(0, 2) : [{ _id: 'empty-share', fileId: { filename: 'No active shares' } }]).map((share) => (
                  <div key={share._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 dark:border-white/10 dark:bg-slate-950/45">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{share.fileId?.filename || 'Shared file'}</p>
                      <p className="text-xs text-slate-400">{share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : 'No expiry'}</p>
                    </div>
                    {share._id !== 'empty-share' && (
                      <button onClick={() => handleRevokeShare(share)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-danger transition hover:bg-danger/10" title="Revoke share">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-white/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700 dark:text-sky-300">File Management</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">My Files</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{filteredFiles.length}/{files.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 sm:w-72">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files"
                className="h-12 w-full rounded-lg border border-slate-200 bg-white/80 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
              />
            </label>
            <label className="relative block sm:w-44">
              <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white/80 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
                title="Filter by file type"
              >
                <option value="all">All types</option>
                {fileTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-12 rounded-lg border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/55 dark:text-white"
              title="Sort files"
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest first</option>
            </select>
            <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.06]">
              <button
                onClick={() => toggleView('grid')}
                className={`grid h-10 w-10 place-items-center rounded-lg transition ${view === 'grid' ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleView('list')}
                className={`grid h-10 w-10 place-items-center rounded-lg transition ${view === 'list' ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-200">
              <Package className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No files yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Upload the first document to start building your file library.
            </p>
            <Link to="/upload" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              Upload first file
            </Link>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Search className="mx-auto h-9 w-9 text-cyan-500" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">No file matches that search</h3>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <article key={file._id} className="group rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-sky-300/20 dark:hover:bg-white/[0.07]">
                <div className="relative mb-4 flex aspect-[1.25] items-center justify-center overflow-hidden rounded-lg border border-white bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
                  <FileTypeIcon filename={file.filename} className="h-14 w-14" />
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">
                    {getExtension(file.filename)}
                  </span>
                  {verifyResult?.fileId === file._id && (
                    <div className="absolute left-3 top-3 rounded-full bg-white p-1 shadow-sm dark:bg-slate-900">
                      {verifyResult.isValid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
                    </div>
                  )}
                </div>

                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white" title={file.filename}>{file.filename}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatSize(file.fileSize)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                    <ShieldCheck className="h-3 w-3" />
                    Ready
                  </span>
                </div>

                <div className="touch-reveal mt-4 grid grid-cols-6 gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <button onClick={() => handleDownload(file)} disabled={downloading === file._id} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Download">
                    {downloading === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handlePreview(file)} disabled={previewing === file._id} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Preview">
                    {previewing === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setShareFile(file)} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Share">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleVerify(file)} disabled={verifying === file._id} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Verify">
                    {verifying === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleRename(file)} disabled={renaming === file._id} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-200 hover:text-amber-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Rename">
                    {renaming === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SquarePen className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(file)} disabled={deleting === file._id} className="grid min-h-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-danger/20 hover:text-danger disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Archive file">
                    {deleting === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs font-bold uppercase text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {filteredFiles.map((file) => (
                  <tr key={file._id} className="transition hover:bg-sky-50/60 dark:hover:bg-white/[0.04]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 dark:bg-white/10">
                          <FileTypeIcon filename={file.filename} className="h-5 w-5" />
                        </span>
                        <span className="max-w-[240px] truncate text-sm font-semibold text-slate-950 dark:text-white">{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{getExtension(file.filename) || 'FILE'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatSize(file.fileSize)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {verifyResult?.fileId === file._id ? (
                        verifyResult.isValid ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger"><AlertTriangle className="h-3.5 w-3.5" /> Tampered</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300"><ShieldCheck className="h-3.5 w-3.5" /> Ready</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleDownload(file)} disabled={downloading === file._id} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Download">
                          {downloading === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handlePreview(file)} disabled={previewing === file._id} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Preview">
                          {previewing === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setShareFile(file)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Share">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleVerify(file)} disabled={verifying === file._id} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Verify">
                          {verifying === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleRename(file)} disabled={renaming === file._id} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Rename">
                          {renaming === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SquarePen className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDelete(file)} disabled={deleting === file._id} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-danger/20 hover:bg-danger/10 hover:text-danger disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Archive file">
                          {deleting === file._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {verifyResult && (
        <div className={`mt-5 rounded-lg border px-5 py-4 animate-[slideIn_0.3s_ease] ${verifyResult.isValid ? 'border-success/20 bg-success/10' : 'border-danger/20 bg-danger/10'}`}>
          <div className="flex items-start gap-3">
            {verifyResult.isValid ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${verifyResult.isValid ? 'text-success' : 'text-danger'}`}>{verifyResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} onShared={fetchFiles} />}
    </div>
  );
};

export default DashboardPage;
