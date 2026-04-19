import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useToast } from '../components/Toast';
import {
  Upload, FileUp, X, CheckCircle2, Hash, Boxes,
  ArrowRight, Loader2, File as FileIcon
} from 'lucide-react';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
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
      setSelectedFile(e.dataTransfer.files[0]);
      setResult(null);
      setError('');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError('');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await API.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setSelectedFile(null);
      toast.success(`"${selectedFile.name}" uploaded and secured!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-[fadeIn_0.4s_ease]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 dark:bg-white rounded-xl">
            <Upload className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          Upload File
        </h1>
        <p className="text-neutral-500 text-sm mt-2 ml-[52px]">
          Files are encrypted (AES-256) and verified with SHA-256 hashing
        </p>
      </div>

      {!result && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 transition-colors duration-300">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
              dragActive
                ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/5'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-white/[0.02]'
            }`}
          >
            <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <FileUp className={`w-12 h-12 mx-auto mb-4 transition-colors ${dragActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-300 dark:text-neutral-600'}`} />
            <p className="text-neutral-900 dark:text-white font-medium mb-1">
              {dragActive ? 'Drop file here' : 'Drag & drop your file here'}
            </p>
            <p className="text-sm text-neutral-500">or click to browse · Max 10 MB</p>
          </div>

          {selectedFile && (
            <div className="mt-5 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="p-3 bg-neutral-200 dark:bg-white/10 rounded-lg">
                <FileIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 dark:text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-neutral-500">{formatSize(selectedFile.size)} · {selectedFile.type || 'Unknown type'}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="mt-6 w-full py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Encrypting & Uploading...</>
            ) : (
              <><Upload className="w-5 h-5" /> Upload & Secure</>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-neutral-900 border border-success/30 rounded-2xl p-8 animate-[scaleIn_0.3s_ease] transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-success/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Upload Successful</h3>
              <p className="text-sm text-neutral-500">{result.file.filename}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">SHA-256 File Hash</span>
              </div>
              <code className="text-xs font-mono text-neutral-700 dark:text-neutral-300 break-all leading-5">{result.file.hash}</code>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Blockchain Block</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-500">Block Index</p>
                  <p className="text-neutral-900 dark:text-white font-mono font-medium">#{result.block.index}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Timestamp</p>
                  <p className="text-neutral-900 dark:text-white text-xs">{new Date(result.block.timestamp).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-neutral-500 mb-1">Previous Hash</p>
                  <code className="text-xs font-mono text-neutral-500 break-all">{result.block.previousHash}</code>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 w-full py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
