import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useToast } from '../components/toastContext';
import {
  ArrowRight,
  CheckCircle2,
  File as FileIcon,
  FileUp,
  Fingerprint,
  Image as ImageIcon,
  Info,
  Loader2,
  RotateCcw,
  ScanLine,
  ScanSearch,
  Upload,
  X,
} from 'lucide-react';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const nextFile = e.dataTransfer.files[0];
      if (nextFile.size <= 0) {
        setError('Choose a non-empty file.');
        return;
      }
      setSelectedFile(nextFile);
      setResult(null);
      setError('');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      const nextFile = e.target.files[0];
      if (nextFile.size <= 0) {
        setError('Choose a non-empty file.');
        return;
      }
      setSelectedFile(nextFile);
      setResult(null);
      setError('');
    }
  };

  useEffect(() => {
    if (!selectedFile || !selectedFile.type?.startsWith('image/')) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await API.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });
      setResult(res.data);
      setSelectedFile(null);
      toast.success(`"${selectedFile.name}" uploaded.`);
    } catch (err) {
      const message = err.response?.data?.message || 'Upload failed';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const fileExtension = selectedFile?.name?.split('.').pop()?.toUpperCase() || 'FILE';
  const selectedType = selectedFile?.type || 'Unknown type';
  const selectedSize = selectedFile ? formatSize(selectedFile.size) : 'No file';
  const uploadReadiness = selectedFile ? 100 : 0;

  const uploadSteps = [
    { icon: FileUp, title: 'Add', text: 'Select a file from desktop, tablet, or mobile.' },
    { icon: ScanLine, title: 'Prepare', text: 'The workspace prepares it for your file library.' },
    { icon: ScanSearch, title: 'Review', text: 'Run a quick file check before using it later.' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="surface-glass premium-shadow security-grid overflow-hidden rounded-xl border border-white/80 px-5 py-6 dark:border-white/10 sm:px-7 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-100">
              <Fingerprint className="h-4 w-4" />
              File upload
            </p>
            <h1 className="text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Add a file to your workspace</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
              Drag in a document, watch the transfer progress, and return to your library when it is ready.
            </p>
          </div>
          <div className="rounded-lg border border-white/80 bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">Upload limit</p>
            <p className="mt-1">Up to 1 GB per file</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
          {!result ? (
            <>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`security-grid flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-10 text-center transition ${
                  dragActive
                    ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-inner dark:border-sky-300 dark:bg-sky-400/10 dark:text-white'
                    : 'border-slate-300 bg-slate-50/70 text-slate-950 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-sky-300/50 dark:hover:bg-white/[0.07]'
                }`}
              >
                <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" />
                <span className={`mb-5 grid h-24 w-24 place-items-center rounded-xl transition ${dragActive ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-sky-600 shadow-sm dark:bg-slate-950 dark:text-sky-200'}`}>
                  <FileUp className="h-11 w-11" />
                </span>
                <h2 className="text-2xl font-semibold">{dragActive ? 'Drop file to upload it' : 'Drag and drop your file'}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Browse from desktop or tap from mobile to start the upload.
                </p>
                <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 font-semibold text-white dark:bg-white dark:text-slate-950">
                  Choose file
                </span>
              </div>

              {selectedFile && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
                      {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : <FileIcon className="h-7 w-7" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950 dark:text-white">{selectedFile.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedSize} / {selectedType}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      title="Remove selected file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Type" value={fileExtension} />
                    <MiniStat label="Readiness" value={`${uploadReadiness}%`} />
                    <MiniStat label="Preview" value={previewUrl ? 'Available' : 'Not image'} />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-5 font-semibold text-white shadow-sm shadow-sky-900/15 transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload file
                  </>
                )}
              </button>

              {uploading && (
                <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/80 p-4 dark:border-cyan-300/15 dark:bg-cyan-300/10">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                    <span>Transfer progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cyan-950/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 transition-[width] duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="animate-[scaleIn_0.3s_ease]">
              <div className="flex flex-col gap-4 rounded-lg border border-success/25 bg-success/10 p-5 sm:flex-row sm:items-center">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-success shadow-sm dark:bg-slate-950">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Upload successful</h2>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{result.file.filename}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white p-3 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-400">File size</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{formatSize(result.file.fileSize || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-400">File type</p>
                    <p className="mt-1 truncate font-semibold text-slate-950 dark:text-white">{result.file.mimeType || 'application/octet-stream'}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-400">Library receipt</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">#{result.receipt?.index}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-400">Added</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      {result.receipt?.timestamp ? new Date(result.receipt.timestamp).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
              >
                Return to dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setResult(null); setSelectedFile(null); setError(''); }}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Upload another file
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-white/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-200">
                {previewUrl ? <ImageIcon className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Selected file</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{selectedFile?.name || result?.file?.filename || 'Waiting for file'}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width]" style={{ width: `${result ? 100 : uploadReadiness}%` }} />
            </div>
          </div>
          {uploadSteps.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-white/80 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-sky-700 dark:text-sky-300">Step 0{index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{step.text}</p>
                </div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/45">
    <p className="text-xs font-semibold text-slate-400">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
  </div>
);

export default UploadPage;
