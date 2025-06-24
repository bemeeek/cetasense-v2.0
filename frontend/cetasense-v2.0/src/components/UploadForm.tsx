import React, {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FormEvent
} from 'react';
import { useDropzone } from 'react-dropzone';
import { DropdownFilter } from '../components/dropdowns/DropdownFilter';
import { DropdownRuangan } from '../components/dropdowns/DropDownRuangan';
import { Submit } from '../components/button/submit';
import unionIcon from '../assets/Union.svg';
import uploadIcon from '../assets/Union2.svg';
import {
  fetchRuangan,
  fetchFilter,
  uploadCSV,
  type Ruangan,
  type Filter,
  type CSIFileMeta
} from '../services/api';

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

  // hanya fetch dropdown, tidak fetch histori lagi
  useEffect(() => {
    (async () => {
      const [ruang, filt] = await Promise.all([
        fetchRuangan(),
        fetchFilter()
      ]);
      setRuanganList(ruang || []);
      setFilterList(filt || []);
      if (ruang?.length) setSelectedRuangan(ruang[0].nama_ruangan);
      if (filt?.length) setSelectedFilter(filt[0].nama_filter);
    })();
  }, []);

  // dropzone
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) {
      setFile(accepted[0]);
      setMessage('');
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    maxSize: 10 * 1024 * 1024
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Pilih file CSV terlebih dahulu');
      return;
    }
    setIsUploading(true);
    setMessage('Uploading…');

    try {
      const resp = await uploadCSV(file, selectedRuangan, selectedFilter);
      setIsSuccess(true);
      setMessage('Upload berhasil');

      // bangun metadata untuk callback
      const meta: CSIFileMeta = {
        id: resp.data.id,
        file_name: resp.data.file_name,
        object_path: resp.data.object_path,
        created_at: resp.data.created_at,
        ruangan_id: '',
        filter_id: '',
        nama_ruangan: '',
        nama_filter: ''
      };
      onUploadSuccess(meta);
      setLastUploaded(meta);
      setFile(null);
      setFile(null);
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || 'Upload gagal');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex flex-col flex-1 bg-white rounded-lg shadow max-h-fit ${className}`}>      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <img src={unionIcon} alt="Pengaturan Data" className="w-8 h-8" />
        <div>
          <h2 className="font-bold text-lg text-black">Pengaturan Data</h2>
          <p className="text-sm text-gray-500">
            Select and upload the files of your choice
          </p>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="flex gap-6 p-6 overflow-auto">
        {/* Drag & drop */}
        <div className="flex-1 flex flex-col">
          <label className="block mb-2 text-lg font-semibold">Unggah Data</label>
          <div
            {...getRootProps()}
            className={
              `flex-1 flex flex-col items-center max-h-full justify-center border-2 border-dashed rounded-lg cursor-pointer ` +
              (isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300')
            }
          >
            <input {...getInputProps()} />
            <img src={uploadIcon} alt="Upload" className="w-14 h-14 mb-2" />
            <span className="font-semibold text-gray-700">
              {file?.name || 'Unggah data-mu!'}
            </span>
            <span className="text-gray-400 text-sm">
              .csv formats, up to 10 MB.
            </span>
          </div>
        </div>

        {/* Pilihan & Submit */}
        <div className="flex-1 flex flex-col space-y-6">
          <div className="">
            <label className="block mb-2 text-lg font-semibold">Pilih Metode</label>
            <DropdownFilter
              options={filterList.map(f => f.nama_filter)}
              selected={selectedFilter}
              onSelect={setSelectedFilter}
              className="w-full h-12 border rounded-lg px-4 flex"
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-semibold">Pilih Ruangan</label>
            <DropdownRuangan
              options={ruanganList.map(r => r.nama_ruangan)}
              selected={selectedRuangan}
              onSelect={setSelectedRuangan}
              className="w-full h-12 border rounded-lg flex px-4"
            />
          </div>

          <div className="">
            <Submit
              type="submit"
              disabled={!file || isUploading}
              className="disabled:opacity-50, enabled:opacity-100"
              property1="default"
            />
          </div>
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600" />
          </div>
        )}
      </form>

      {/* Status message */}
      <div className='px-6 py-4 border-t'>
        {message && (
          <div className={`text-sm ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </div>
        )}
        {lastUploaded && (
          <div className="mt-3 bg-gray-50 p-3 rounded">
            <div className="font-semibold">Detail Upload Terakhir:</div>
            <ul className="text-sm mt-1 space-y-1">
              <li><strong>Nama file:</strong> {lastUploaded.file_name}</li>
              <li><strong>Waktu:</strong> {new Date(lastUploaded.created_at).toLocaleString()}</li>
              <li>
                <a
                  href={`${import.meta.env.VITE_API_BASE_URL || ''}${lastUploaded.object_path}`}
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
      </div>
  )}

export default UploadForm;
