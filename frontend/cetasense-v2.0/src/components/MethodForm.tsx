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
  onError 
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [fileType, setFileType] = React.useState<'py' | 'pkl'>('py');
  const [dragActive, setDragActive] = React.useState<boolean>(false);

  // File input ref for programmatic access
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return "File terlalu besar, maksimal 10MB.";
    }

    // Check file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== fileType) {
      return `Format file tidak didukung, hanya .${fileType} yang diperbolehkan.`;
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    setError("");
    
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setError("Silakan pilih file terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await uploadMethod(
        file, 
        "Metode Baru", 
        fileType === 'py' ? 'script' : 'model'
      );
      
      onUploaded(response);
      setFile(null);
      
      // Reset form
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

  const handleFileTypeChange = (newType: 'py' | 'pkl') => {
    setFileType(newType);
    setFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col flex-1 bg-white rounded-lg shadow max-h-fit ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <CpuChipIcon className="w-8 h-8"  />
        <div>
          <h2 className="font-bold text-lg text-black">Pengaturan Data</h2>
          <p className="text-sm text-gray-500">
            Select and upload the files of your choice
          </p>
        </div>
      </div>


      {/* Body */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-6 space-y-6">
        {/* File Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipe File
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => handleFileTypeChange('py')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                fileType === 'py'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Python (.py)
            </button>
            <button
              type="button"
              onClick={() => handleFileTypeChange('pkl')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                fileType === 'pkl'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pickle (.pkl)
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div className="flex-1 min-h-[200px]">
          <div
            onClick={handleClick}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              flex flex-col items-center justify-center w-full h-full
              border-2 border-dashed rounded-lg p-8 cursor-pointer
              transition-all duration-200
              ${dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : file 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }
              ${loading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={fileType === 'py' ? '.py' : '.pkl'}
              onChange={handleChange}
              disabled={loading}
              className="hidden"
            />
            
            <div className="text-center">
              <ArrowUpTrayIcon 
                className={`w-12 h-12 mb-4 mx-auto ${
                  file ? 'text-green-500' : 'text-gray-400'
                }`} 
              />
              
              {file ? (
                <div className="space-y-2">
                  <p className="font-semibold text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500">
                    Klik untuk mengganti file
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-700">
                    {dragActive ? 'Lepaskan file di sini' : 'Unggah metode-mu!'}
                  </p>
                  <p className="text-sm text-gray-500">
                    .{fileType} formats, up to 10 MB
                  </p>
                  <p className="text-xs text-gray-400">
                    Drag & drop atau klik untuk memilih file
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            ${loading || !file
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
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
  );
};

export default MethodForm;