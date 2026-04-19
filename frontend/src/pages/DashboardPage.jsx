import { useState, useEffect } from 'react';
import API from '../api/axios';
import ShareModal from '../components/ShareModal';
import FileTypeIcon from '../components/FileTypeIcon';
import { useToast } from '../components/Toast';
import {
  Download, Share2, ShieldCheck, Loader2,
  Clock, Hash, Package, Users, CheckCircle2, AlertTriangle,
  Copy, Check, LayoutGrid, List
} from 'lucide-react';

const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareFile, setShareFile] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('fileView') || 'grid');
  const toast = useToast();

  const fetchFiles = async () => {
    try {
      const res = await API.get('/files/my-files');
      setFiles(res.data.files);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const toggleView = (v) => {
    setView(v);
    localStorage.setItem('fileView', v);
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
      // Handle JSON error responses from blob requests
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const data = JSON.parse(text);
          if (data.tampered) {
            toast.error(`Tampering detected! "${file.filename}" has been modified or corrupted.`);
            setVerifyResult({ fileId: file._id, isValid: false, message: data.message, storedHash: data.storedHash, currentHash: data.currentHash });
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
    setVerifying(file._id);
    setVerifyResult(null);
    try {
      const res = await API.get(`/files/verify/${file._id}`);
      setVerifyResult({ fileId: file._id, ...res.data });
      if (res.data.isValid) {
        toast.success(`"${file.filename}" — integrity verified`);
      } else {
        toast.warning(`"${file.filename}" — tampering detected!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setVerifyResult({ fileId: file._id, isValid: false, message: 'Verification failed' });
    } finally {
      setVerifying(null);
    }
  };

  const copyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    toast.info('Hash copied to clipboard');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const truncateHash = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '';
  const getExtension = (filename) => filename?.split('.').pop()?.toUpperCase() || '';

  const stats = [
    { label: 'Total Files', value: files.length, icon: Package },
    { label: 'Verified', value: files.length, icon: ShieldCheck },
    { label: 'Shared', value: '—', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.4s_ease]">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">{stat.label}</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-400 group-hover:scale-110 transition-transform">
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Files Section */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            My Files
            <span className="text-xs text-neutral-400 font-normal ml-2">{files.length}</span>
          </h2>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => toggleView('grid')} className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'grid' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`} title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => toggleView('list')} className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'list' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`} title="List view">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Package className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm">No files uploaded yet</p>
            <a href="/upload" className="text-neutral-900 dark:text-white text-sm mt-2 hover:underline">Upload your first file →</a>
          </div>
        ) : view === 'grid' ? (
          /* ── Grid View ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {files.map((file) => (
              <div key={file._id} className="group bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all">
                <div className="flex items-center justify-center w-full aspect-square bg-white dark:bg-neutral-900 rounded-lg mb-3 relative">
                  <FileTypeIcon filename={file.filename} className="w-10 h-10" />
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{getExtension(file.filename)}</span>
                  {verifyResult?.fileId === file._id && (
                    <div className="absolute top-2 left-2">
                      {verifyResult.isValid ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-danger" />}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate mb-1" title={file.filename}>{file.filename}</p>
                <p className="text-xs text-neutral-400 mb-3">{new Date(file.createdAt).toLocaleDateString()}</p>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownload(file)} disabled={downloading === file._id} className="flex-1 p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Download">
                    {downloading === file._id ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : <Download className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                  <button onClick={() => setShareFile(file)} className="flex-1 p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer" title="Share">
                    <Share2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <button onClick={() => handleVerify(file)} disabled={verifying === file._id} className="flex-1 p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Verify">
                    {verifying === file._id ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── List View ── */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Hash</th>
                  <th className="px-6 py-3 font-medium">Modified</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <FileTypeIcon filename={file.filename} className="w-5 h-5" />
                        <span className="text-sm text-neutral-900 dark:text-white font-medium truncate max-w-[220px]">{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded">{truncateHash(file.hash)}</code>
                        <button onClick={() => copyHash(file.hash, file._id)} className="p-1 hover:bg-neutral-100 dark:hover:bg-white/5 rounded transition-colors cursor-pointer" title="Copy full hash">
                          {copiedHash === file._id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-neutral-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      {verifyResult?.fileId === file._id ? (
                        verifyResult.isValid ? (
                          <span className="flex items-center gap-1.5 text-xs text-success font-medium"><CheckCircle2 className="w-4 h-4" /> Verified</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-danger font-medium"><AlertTriangle className="w-4 h-4" /> Tampered</span>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-neutral-400"><Hash className="w-3.5 h-3.5" /> Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleDownload(file)} disabled={downloading === file._id} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all disabled:opacity-50 cursor-pointer" title="Download">
                          {downloading === file._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setShareFile(file)} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer" title="Share">
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleVerify(file)} disabled={verifying === file._id} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all disabled:opacity-50 cursor-pointer" title="Verify">
                          {verifying === file._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verify Result Banner */}
      {verifyResult && (
        <div className={`mt-4 px-5 py-4 rounded-xl border flex items-start gap-3 animate-[slideIn_0.3s_ease] ${
          verifyResult.isValid ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'
        }`}>
          {verifyResult.isValid ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${verifyResult.isValid ? 'text-success' : 'text-danger'}`}>{verifyResult.message}</p>
            {verifyResult.storedHash && (
              <div className="mt-2 space-y-1 text-xs font-mono">
                <p className="text-neutral-500">Stored: <span className="text-neutral-700 dark:text-neutral-300">{verifyResult.storedHash}</span></p>
                {verifyResult.currentHash && (
                  <p className="text-neutral-500">Current: <span className={verifyResult.isValid ? 'text-success' : 'text-danger'}>{verifyResult.currentHash}</span></p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} onShared={fetchFiles} />}
    </div>
  );
};

export default DashboardPage;
