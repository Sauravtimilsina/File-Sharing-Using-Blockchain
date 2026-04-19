import { useState, useEffect } from 'react';
import API from '../api/axios';
import FileTypeIcon from '../components/FileTypeIcon';
import { useToast } from '../components/Toast';
import {
  Users, Download, ShieldCheck, Loader2,
  Clock, User, AlertTriangle, CheckCircle2, Package,
  LayoutGrid, List
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
      } catch (err) {
        toast.error('Failed to load shared files');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedFiles();
  }, []);

  const toggleView = (v) => {
    setView(v);
    localStorage.setItem('sharedView', v);
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
        toast.success(`"${filename}" — integrity verified`);
      } else {
        toast.warning(`"${filename}" — tampering detected!`);
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
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.4s_ease]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 dark:bg-white rounded-xl">
            <Users className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          Shared With Me
        </h1>
        <p className="text-neutral-500 text-sm mt-2 ml-[52px]">Files other users have shared with your account</p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-sm text-neutral-500">{files.length} shared files</span>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => toggleView('grid')} className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'grid' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => toggleView('list')} className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'list' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Package className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm">No files have been shared with you yet</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {files.map((share) => {
              const fileId = share.fileId?._id || share.fileId;
              const filename = share.fileId?.filename || 'Unknown file';
              const ownerName = share.owner?.username || 'Unknown';
              return (
                <div key={share._id} className="group bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-center w-full aspect-square bg-white dark:bg-neutral-900 rounded-lg mb-3 relative">
                    <FileTypeIcon filename={filename} className="w-10 h-10" />
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{getExtension(filename)}</span>
                    {verifyResult?.fileId === fileId && (
                      <div className="absolute top-2 left-2">
                        {verifyResult.isValid ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-danger" />}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate mb-0.5" title={filename}>{filename}</p>
                  <p className="text-xs text-neutral-400 mb-3 flex items-center gap-1"><User className="w-3 h-3" /> {ownerName}</p>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(share)} disabled={downloading === fileId} className="flex-1 p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Download">
                      {downloading === fileId ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : <Download className="w-3.5 h-3.5 mx-auto" />}
                    </button>
                    <button onClick={() => handleVerify(share)} disabled={verifying === fileId} className="flex-1 p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Verify">
                      {verifying === fileId ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mx-auto" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Shared By</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {files.map((share) => {
                  const fileId = share.fileId?._id || share.fileId;
                  const filename = share.fileId?.filename || 'Unknown file';
                  const ownerName = share.owner?.username || 'Unknown';
                  return (
                    <tr key={share._id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <FileTypeIcon filename={filename} className="w-5 h-5" />
                          <span className="text-sm text-neutral-900 dark:text-white font-medium truncate max-w-[200px]">{filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5"><div className="flex items-center gap-2 text-sm text-neutral-500"><User className="w-3.5 h-3.5" />{ownerName}</div></td>
                      <td className="px-6 py-3.5"><div className="flex items-center gap-1.5 text-sm text-neutral-500"><Clock className="w-3.5 h-3.5" />{new Date(share.createdAt).toLocaleDateString()}</div></td>
                      <td className="px-6 py-3.5">
                        {verifyResult?.fileId === fileId ? (
                          verifyResult.isValid ? <span className="flex items-center gap-1.5 text-xs text-success font-medium"><CheckCircle2 className="w-4 h-4" /> Verified</span>
                            : <span className="flex items-center gap-1.5 text-xs text-danger font-medium"><AlertTriangle className="w-4 h-4" /> Tampered</span>
                        ) : <span className="text-xs text-neutral-400">—</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDownload(share)} disabled={downloading === fileId} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Download">
                            {downloading === fileId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleVerify(share)} disabled={verifying === fileId} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer" title="Verify">
                            {verifying === fileId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
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
      </div>

      {verifyResult && (
        <div className={`mt-4 px-5 py-4 rounded-xl border flex items-start gap-3 animate-[slideIn_0.3s_ease] ${verifyResult.isValid ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
          {verifyResult.isValid ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />}
          <p className={`text-sm font-medium ${verifyResult.isValid ? 'text-success' : 'text-danger'}`}>{verifyResult.message}</p>
        </div>
      )}
    </div>
  );
};

export default SharedFilesPage;
