import React from "react";
import { uploadMethod, type Methods } from "../services/api";
import { ArrowUpTrayIcon, CpuChipIcon } from "@heroicons/react/24/outline";

interface MethodFormProps {
  className?: string;
  onUploaded: (method: Methods) => void;
  onError: (error: string) => void;
}

const MethodForm: React.FC<MethodFormProps> = ({
  className = '',
  onUploaded,
  onError,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [dragActive, setDragActive] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // 🔑 Counter untuk mencegah flickering
  const dragCounterRef = React.useRef<number>(0);

  const validateFile = (file: File): string | null => {
    if (file.size > 20 * 1024 * 1024) {
      return "File terlalu besar, maksimal 20MB.";
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['py', 'pkl'].includes(ext)) {
      return "Format file tidak didukung, hanya .py dan .pkl yang diperbolehkan.";
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    setError('');
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    } else {
      setFile(null);
    }
  };

  // ✅ OPTIMIZED Drag & Drop Event Handlers - No More Flickering!
  const handleDragEnter = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Increment counter
    dragCounterRef.current++;
    
    // Only set active on first enter
    if (dragCounterRef.current === 1) {
      setDragActive(true);
    }
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Decrement counter
    dragCounterRef.current--;
    
    // Only set inactive when counter reaches 0
    if (dragCounterRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure dataTransfer effect is set
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset counter and state
    dragCounterRef.current = 0;
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  }, []);

  const handleClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Silakan pilih file terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'py' ? 'script' : 'model';
      const response = await uploadMethod(file, "Metode Baru", fileType);
      onUploaded(response);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError("Gagal mengunggah metode. Pastikan format file benar dan tidak ada kesalahan pada server.");
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🎨 Memoized style calculations untuk performa
  const dropZoneStyles = React.useMemo(() => {
    let baseClasses = `
      relative flex flex-col items-center justify-center 
      w-full h-80 border-2 border-dashed rounded-xl 
      cursor-pointer transition-all duration-200 ease-in-out
    `;

    if (loading) {
      baseClasses += ' pointer-events-none opacity-50';
    } else if (dragActive) {
      baseClasses += ' border-blue-400 bg-blue-50 scale-[1.02]';
    } else if (file) {
      baseClasses += ' border-green-400 bg-green-50';
    } else {
      baseClasses += ' border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400';
    }

    return baseClasses;
  }, [dragActive, file, loading]);

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <CpuChipIcon className="logo-card" />
        <div>
          <h2 className="text-card1">Unggah metode-mu!</h2>
          <p className="text-card2">Select and upload the files of your choice</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ✅ OPTIMIZED Drag & Drop Area */}
          <div
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={dropZoneStyles}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,.pkl"
              onChange={handleChange}
              disabled={loading}
              className="hidden"
            />

            {/* Content Container */}
            <div className="flex flex-col items-center text-center pointer-events-none z-10">
              <div className={`
                p-4 rounded-full mb-4 transition-all duration-200
                ${file
                  ? 'bg-green-100'
                  : dragActive
                    ? 'bg-blue-100 scale-110'
                    : 'bg-gray-200'
                }
              `}>
                <ArrowUpTrayIcon
                  className={`w-8 h-8 transition-all duration-200 ${
                    file
                      ? 'text-green-600'
                      : dragActive
                        ? 'text-blue-600 animate-bounce'
                        : 'text-gray-500'
                  }`}
                />
              </div>

              {/* Text Content */}
              {file ? (
                <div className="space-y-2">
                  <p className="font-semibold text-green-700 text-lg">
                    {file.name}
                  </p>
                  <p className="text-sm text-green-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500">
                    Klik untuk mengganti file
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-gray-700 text-lg">
                    {dragActive
                      ? 'Lepaskan file di sini'
                      : 'Drag & drop file algoritma disini'
                    }
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 font-medium">
                      Format yang didukung:
                    </p>
                    <div className="flex flex-col space-y-1 text-sm text-gray-500">
                      <span>• <strong>.py</strong> - Python script files</span>
                      <span>• <strong>.pkl</strong> - Pickle model files</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Ukuran maksimal: <strong>10 MB</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ IMPROVED Drag Active Overlay - No Flickering */}
            {dragActive && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl border-2 border-blue-400 border-dashed pointer-events-none z-20">
                <div className="flex items-center justify-center h-full">
                  <div className="bg-blue-100 px-6 py-3 rounded-lg shadow-lg transform scale-105">
                    <span className="text-blue-700 font-semibold text-lg">
                      Lepaskan file di sini
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
              ${loading || !file
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-[1.02]'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengunggah...</span>
              </div>
            ) : (
              "Unggah Metode"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MethodForm;