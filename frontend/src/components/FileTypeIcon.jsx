import {
  FileText, FileImage, FileVideo, FileAudio, FileCode, FileSpreadsheet,
  FileArchive, File, Presentation
} from 'lucide-react';

const extensionMap = {
  
  jpg: { icon: FileImage, color: 'text-rose-500' },
  jpeg: { icon: FileImage, color: 'text-rose-500' },
  png: { icon: FileImage, color: 'text-rose-500' },
  gif: { icon: FileImage, color: 'text-rose-500' },
  svg: { icon: FileImage, color: 'text-rose-500' },
  webp: { icon: FileImage, color: 'text-rose-500' },
  bmp: { icon: FileImage, color: 'text-rose-500' },

  
  mp4: { icon: FileVideo, color: 'text-purple-500' },
  avi: { icon: FileVideo, color: 'text-purple-500' },
  mov: { icon: FileVideo, color: 'text-purple-500' },
  mkv: { icon: FileVideo, color: 'text-purple-500' },
  webm: { icon: FileVideo, color: 'text-purple-500' },

  
  mp3: { icon: FileAudio, color: 'text-amber-500' },
  wav: { icon: FileAudio, color: 'text-amber-500' },
  flac: { icon: FileAudio, color: 'text-amber-500' },
  ogg: { icon: FileAudio, color: 'text-amber-500' },
  aac: { icon: FileAudio, color: 'text-amber-500' },

  
  pdf: { icon: FileText, color: 'text-red-500' },
  doc: { icon: FileText, color: 'text-blue-500' },
  docx: { icon: FileText, color: 'text-blue-500' },
  txt: { icon: FileText, color: 'text-neutral-500' },
  rtf: { icon: FileText, color: 'text-blue-500' },
  md: { icon: FileText, color: 'text-neutral-500' },

  
  xls: { icon: FileSpreadsheet, color: 'text-green-600' },
  xlsx: { icon: FileSpreadsheet, color: 'text-green-600' },
  csv: { icon: FileSpreadsheet, color: 'text-green-600' },

  
  ppt: { icon: Presentation, color: 'text-orange-500' },
  pptx: { icon: Presentation, color: 'text-orange-500' },

  
  js: { icon: FileCode, color: 'text-yellow-500' },
  jsx: { icon: FileCode, color: 'text-yellow-500' },
  ts: { icon: FileCode, color: 'text-blue-500' },
  tsx: { icon: FileCode, color: 'text-blue-500' },
  py: { icon: FileCode, color: 'text-green-500' },
  java: { icon: FileCode, color: 'text-red-500' },
  html: { icon: FileCode, color: 'text-orange-500' },
  css: { icon: FileCode, color: 'text-blue-400' },
  json: { icon: FileCode, color: 'text-neutral-500' },

  
  zip: { icon: FileArchive, color: 'text-amber-600' },
  rar: { icon: FileArchive, color: 'text-amber-600' },
  '7z': { icon: FileArchive, color: 'text-amber-600' },
  tar: { icon: FileArchive, color: 'text-amber-600' },
  gz: { icon: FileArchive, color: 'text-amber-600' },
};

const getFileInfo = (filename) => {
  if (!filename) return { icon: File, color: 'text-neutral-400' };
  const ext = filename.split('.').pop()?.toLowerCase();
  return extensionMap[ext] || { icon: File, color: 'text-neutral-400' };
};

const FileTypeIcon = ({ filename, className = 'w-5 h-5' }) => {
  const { icon: Icon, color } = getFileInfo(filename);
  return <Icon className={`${className} ${color}`} />;
};

export default FileTypeIcon;
