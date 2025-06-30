import React, { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import { DropdownFilter } from '../components/dropdowns/DropdownFilter';
import { DropdownRuangan } from '../components/dropdowns/DropDownRuangan';
import { Submit } from '../components/button/submit';
// import uploadIcon from '../assets/Union2.svg';
import {
  fetchRuangan,
  fetchFilter,
  uploadCSV,
  type Ruangan,
  type Filter,
  type CSIFileMeta
} from '../services/api';
import {
  CircleStackIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon} from '@heroicons/react/24/outline';

interface Props {
  className?: string;
  onUploadSuccess: (meta: CSIFileMeta) => void;
}

const UploadForm: React.FC<Props> = ({ className = '', onUploadSuccess }) => {
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [filterList, setFilterList] = useState<Filter[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<CSIFileMeta | null>(null);

  // Fetch dropdown data
  useEffect(() => {
    (async () => {
      try {
        const [ruang, filt] = await Promise.all([fetchRuangan(), fetchFilter()]);
        setRuanganList(ruang || []);
        setFilterList(filt || []);
        if (ruang?.length) setSelectedRuangan(ruang[0].nama_ruangan);
        if (filt?.length) setSelectedFilter(filt[0].nama_filter);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      }
    })();
  }, []);

  // Enhanced dropzone with better validation
  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (accepted.length) {
      setFile(accepted[0]);  // Take the first accepted file
      setMessage('');
      setIsSuccess(false);
    }

    if (rejected.length) {
      const rejection = rejected[0];
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setMessage('File terlalu besar. Maksimal 10MB.');
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setMessage('Format file tidak didukung. Hanya file CSV yang diperbolehkan.');
      }
      setIsSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    maxSize: 10 * 1024 * 1024
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage('Pilih file CSV terlebih dahulu');
      setIsSuccess(false);
      return;
    }

    if (!selectedRuangan || !selectedFilter) {
      setMessage('Pilih ruangan dan metode terlebih dahulu');
      setIsSuccess(false);
      return;
    }

    setIsUploading(true);
    setMessage('Mengunggah file...');

    try {
      const resp = await uploadCSV(file, selectedRuangan, selectedFilter);
      
      setIsSuccess(true);
      setMessage('Upload berhasil! File telah disimpan.');
      
      const meta: CSIFileMeta = {
        id: resp.data.id,
        file_name: resp.data.file_name,
        object_path: resp.data.object_path,
        created_at: resp.data.created_at,
        ruangan_id: '',
        filter_id: '',
        nama_ruangan: selectedRuangan,
        nama_filter: selectedFilter
      };

      onUploadSuccess(meta);
      setLastUploaded(meta);
      
      // Reset form
      setFile(null);
      
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || 'Upload gagal. Silakan coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove file handler
  const handleRemoveFile = () => {
    setFile(null);
    setMessage('');
    setIsSuccess(false);
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <CircleStackIcon className="logo-card" />
        <div>
          <h2 className="font-bold text-lg text-gray-900">Unggah Data-mu!</h2>
          <p className="text-sm text-gray-500">Select and upload the files of your choice</p>
        </div>
      </div>

      {/* Enhanced Body */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Enhanced Drag & Drop Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-900">
                Unggah File Data
              </label>
              
              <div
                {...getRootProps()}
                className={`
                  relative flex flex-col items-center justify-center 
                  min-h-[280px] border-2 border-dashed rounded-xl cursor-pointer
                  transition-all duration-300 ease-in-out
                  ${isDragActive && !isDragReject
                    ? 'border-blue-400 bg-blue-50 scale-[1.02]' 
                    : isDragReject
                    ? 'border-red-400 bg-red-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                  }
                  ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input {...getInputProps()} />
                
                {/* Upload Content */}
                <div className="flex flex-col items-center text-center space-y-4 p-6">
                  {/* Icon */}
                  <div className={`p-4 rounded-full transition-all duration-300
                    ${file 
                      ? 'bg-green-100' 
                      : isDragActive 
                      ? 'bg-blue-100' 
                      : 'bg-gray-200'}`}
                  >
                    {file ? (
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    ) : (
                      <CloudArrowUpIcon className="w-8 h-8 text-gray-500" />
                    )}
                  </div>

                  {/* File Info or Upload Message */}
                  {file ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <DocumentTextIcon className="w-5 h-5" />
                        <span className="font-semibold">{file.name}</span>
                      </div>
                      <p className="text-sm text-green-600 font-medium">
                        {formatFileSize(file.size)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                        className="text-xs text-gray-500 hover:text-red-500 underline transition-colors"
                      >
                        Hapus file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="font-semibold text-gray-700 text-lg">
                        {isDragActive
                          ? 'Lepaskan file di sini'
                          : 'Drag & drop File CSV di sini'}
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 font-medium">
                          Format yang didukung:
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">.CSV</span>
                          <span>•</span>
                          <span>Maksimal 10 MB</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loading Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
                      <span className="text-blue-600 font-medium">Mengunggah...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Configuration Section */}
            <div className="space-y-6">
              <label className="block text-lg font-semibold text-gray-900">
                Konfigurasi Upload
              </label>

              {/* Method Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Pilih Metode Pemrosesan
                </label>
                <div className="relative">
                  <DropdownFilter
                    options={filterList.map(f => f.nama_filter)}
                    selected={selectedFilter}
                    onSelect={setSelectedFilter}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 flex items-center hover:border-blue-300 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Room Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Pilih Ruangan Target
                </label>
                <div className="relative">
                  <DropdownRuangan
                    options={ruanganList.map(r => r.nama_ruangan)}
                    selected={selectedRuangan}
                    onSelect={setSelectedRuangan}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 flex items-center hover:border-blue-300 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <div className="">
                <Submit
                  type="submit"
                  disabled={!file || isUploading || !selectedRuangan || !selectedFilter}
                  className={`max-w-[250px]  rounded-lg font-semibold text-white align-middle transition-all duration-200 transform
                    ${!file || isUploading || !selectedRuangan || !selectedFilter
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                    }
                  `}
                  property1="default"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Status Messages */}
          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border-l-4 
              ${isSuccess 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : 'bg-red-50 border-red-400 text-red-800'
              }
            `}>
              {isSuccess ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{message}</span>
            </div>
          )}

          {/* Enhanced Last Upload Info */}
          {lastUploaded && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Detail Upload Terakhir</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Nama file:</span>
                  <span className="font-medium text-gray-900">{lastUploaded.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Waktu upload:</span>
                  <span className="font-medium text-gray-900">{lastUploaded.created_at}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UploadForm;
