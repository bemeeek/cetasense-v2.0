import React, { useState, useEffect } from 'react';
import { FaUpload } from 'react-icons/fa';
import { uploadCSV, fetchRuangan, fetchFilter, fetchCSIFileMeta, type Ruangan, type Filter, type CSIFileMeta } from '../services/api';

const UploadForm: React.FC = () => {
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [filterList, setFilterList] = useState<Filter[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [uploads, setUploads] = useState<CSIFileMeta[]>([]);

 useEffect(() => {
    (async () => {
      try {
        const [ruang, filt, prev] = await Promise.all([
          fetchRuangan(),
          fetchFilter(),
          fetchCSIFileMeta(),
        ]);
        setRuanganList(ruang);
        setFilterList(filt);
        setUploads(prev);

        if (ruang.length) setSelectedRuangan(ruang[0].nama_ruangan);
        if (filt.length) setSelectedFilter(filt[0].nama_filter);
      } catch (err) {
        console.error(err);
        setMessage('Failed to load data.');
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage('Please select a CSV file');

    setIsUploading(true);
    setMessage('Uploading...');

    try {
      const resp = await uploadCSV(file, selectedRuangan, selectedFilter);
      setMessage(`Upload successful: ${resp.data.rows_processed} rows`);
      setIsSuccess(true);
      setFile(null);

      // reload uploads list
      const list = await fetchCSIFileMeta();
      setUploads(list);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Upload failed');
      setIsSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };
return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Upload CSI Data</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Ruangan</label>
            <select
              value={selectedRuangan}
              onChange={e => setSelectedRuangan(e.target.value)}
              disabled={isUploading}
              className="mt-1 block w-full border rounded p-2"
            >
              {ruanganList.map(r => (
                <option key={r.id} value={r.nama_ruangan}>{r.nama_ruangan}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Filter</label>
            <select
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value)}
              disabled={isUploading}
              className="mt-1 block w-full border rounded p-2"
            >
              {filterList.map(f => (
                <option key={f.id} value={f.nama_filter}>{f.nama_filter}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CSV File</label>
          <label className="flex items-center justify-center border-2 border-dashed rounded h-40 cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
            {file ? file.name : <FaUpload className="text-gray-400 text-3xl" />}
          </label>
        </div>
        <button
          type="submit"
          disabled={isUploading || !file}
          className={`w-full py-2 rounded text-white font-medium ${
            isUploading || !file ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Processing…' : 'Upload'}
        </button>
        {message && (
          <div className={`p-2 rounded mt-2 ${
            isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </form>

      {/* Daftar Uploads */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Uploaded CSV Files</h3>
        {uploads.length === 0 ? (
          <p className="text-gray-500">No files uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {uploads.map(u => (
              <li key={u.id} className="flex justify-between items-center p-2 border rounded">
                <a
                  href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${u.object_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {u.file_name}
                </a>
                <span className="text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UploadForm;
