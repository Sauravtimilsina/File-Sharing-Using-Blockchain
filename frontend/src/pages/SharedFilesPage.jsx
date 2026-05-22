import { useEffect, useState } from 'react';
import API from '../api/axios';
import FileTypeIcon from '../components/FileTypeIcon';
import { useToast } from '../components/toastContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Package,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';

const SharedFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('sharedView') || 'grid');
  const toast = useToast();

  useEffect(() => {
    const fetchSharedFiles = async () => {
      try {
        const res = await API.get('/files/shared');
        setFiles(res.data.files);
      } catch {
        toast.error('Failed to load shared files');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedFiles();
  }, [toast]);

  const toggleView = (nextView) => {
    setView(nextView);
    localStorage.setItem('sharedView', nextView);
  };

  const handleDownload = async (file) => {
    const fileId = file.fileId?._id || file.fileId;
    const filename = file.fileId?.filename || file.filename || 'download';
    setDownloading(fileId);
    try {
      const res = await API.get(`/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded "${filename}"`);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const data = JSON.parse(text);
          if (data.tampered) {
            toast.error(`Tampering detected! "${filename}" has been modified or corrupted.`);
            setVerifyResult({ fileId, isValid: false, message: data.message });
          } else {
            toast.error(data.message || 'Download failed');
          }
        } catch {
          toast.error('Download failed');
        }
      } else {
        toast.error(err.response?.data?.message || 'Download failed');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleVerify = async (file) => {
    const fileId = file.fileId?._id || file.fileId;
    const filename = file.fileId?.filename || 'file';
    setVerifying(fileId);
    setVerifyResult(null);
    try {
      const res = await API.get(`/files/verify/${fileId}`);
      setVerifyResult({ fileId, ...res.data });
      if (res.data.isValid) {
        toast.success(`"${filename}" passed its check`);
      } else {
        toast.warning(`"${filename}" needs review`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setVerifyResult({ fileId, isValid: false, message: 'Verification failed' });
    } finally {
      setVerifying(null);
    }
  };

  const getExtension = (filename) => filename?.split('.').pop()?.toUpperCase() || '';

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="surface-glass flex items-center gap-3 rounded-3xl border border-white/80 px-6 py-5 text-slate-500 dark:border-white/10 dark:text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          Loading shared files
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="surface-glass premium-shadow security-grid rounded-[28px] border border-white/80 px-5 py-6 dark:border-white/10 sm:px-7 sm:py-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50/80 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 dark:border-fuchsia-400/15 dark:bg-fuchsia-400/10 dark:text-fuchsia-100">
              <Users className="h-4 w-4" />
              Received file access
            </p>
            <h1 className="text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Shared with me</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
              Review files shared by other users, run a quick check before use, and keep ownership context visible.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Available shares</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">{files.length}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase text-fuchsia-700 dark:text-fuchsia-300">Collaborative access</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Incoming files</h2>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.06]">
            <button
              onClick={() => toggleView('grid')}
              className={`grid h-10 w-10 place-items-center rounded-2xl transition ${view === 'grid' ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleView('list')}
              className={`grid h-10 w-10 place-items-center rounded-2xl transition ${view === 'list' ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </header>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-[24px] bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-400/10 dark:text-fuchsia-200">
              <Package className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Nothing has been shared yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Shared files appear here after another verified user grants access.
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((share) => {
              const fileId = share.fileId?._id || share.fileId;
              const filename = share.fileId?.filename || 'Unknown file';
              const ownerName = share.owner?.username || 'Unknown';
              return (
                <article key={share._id} className="group rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 transition hover:-translate-y-1 hover:border-fuchsia-200 hover:bg-white hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
                  <div className="relative mb-4 flex aspect-[1.25] items-center justify-center rounded-[20px] border border-white bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
                    <FileTypeIcon filename={filename} className="h-14 w-14" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">{getExtension(filename)}</span>
                    {verifyResult?.fileId === fileId && (
                      <div className="absolute left-3 top-3 rounded-full bg-white p-1 shadow-sm dark:bg-slate-900">
                        {verifyResult.isValid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white" title={filename}>{filename}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-400/10 dark:text-fuchsia-200">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{ownerName}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(share.createdAt).toLocaleDateString()}
                  </div>
                  <div className="touch-reveal mt-4 grid grid-cols-2 gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={() => handleDownload(share)} disabled={downloading === fileId} className="grid min-h-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Download">
                      {downloading === fileId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleVerify(share)} disabled={verifying === fileId} className="grid min-h-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200" title="Verify">
                      {verifying === fileId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs font-bold uppercase text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Shared by</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {files.map((share) => {
                  const fileId = share.fileId?._id || share.fileId;
                  const filename = share.fileId?.filename || 'Unknown file';
                  const ownerName = share.owner?.username || 'Unknown';
                  return (
                    <tr key={share._id} className="transition hover:bg-fuchsia-50/50 dark:hover:bg-white/[0.04]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 dark:bg-white/10">
                            <FileTypeIcon filename={filename} className="h-5 w-5" />
                          </span>
                          <span className="max-w-[220px] truncate text-sm font-semibold text-slate-950 dark:text-white">{filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                          <UserRound className="h-4 w-4" />
                          {ownerName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                          <Clock className="h-4 w-4" />
                          {new Date(share.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {verifyResult?.fileId === fileId ? (
                          verifyResult.isValid ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger"><AlertTriangle className="h-3.5 w-3.5" /> Tampered</span>
                          )
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">Ready</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDownload(share)} disabled={downloading === fileId} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Download">
                            {downloading === fileId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleVerify(share)} disabled={verifying === fileId} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Verify">
                            {verifying === fileId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {verifyResult && (
        <div className={`mt-5 flex items-start gap-3 rounded-[24px] border px-5 py-4 animate-[slideIn_0.3s_ease] ${verifyResult.isValid ? 'border-success/20 bg-success/10' : 'border-danger/20 bg-danger/10'}`}>
          {verifyResult.isValid ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
          <p className={`text-sm font-semibold ${verifyResult.isValid ? 'text-success' : 'text-danger'}`}>{verifyResult.message}</p>
        </div>
      )}
    </div>
  );
};

export default SharedFilesPage;
