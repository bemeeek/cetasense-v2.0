// src/pages/DataSettingPage.tsx
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/sidebar/sidebar';
import UploadForm from '../components/UploadForm';
import HistoryDataList from '../components/HistoryDataList';
import aiIcon from '../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg';
import { fetchCSIFileMeta, type CSIFileMeta } from '../services/api';

const DataSettingPage: React.FC = () => {
  // histori uploads di sini
  const [uploads, setUploads] = useState<CSIFileMeta[]>([]);

  // fetch histori awal
  useEffect(() => {
    (async () => {
      const list = await fetchCSIFileMeta();
      setUploads(list || []);
    })();
  }, []);

  // callback yg akan dipanggil oleh UploadForm
  const handleUploadSuccess = (meta: CSIFileMeta) => {
    // tambahkan file baru di depan array
    setUploads(prev => [meta, ...prev]);
  };

     return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* ← Sidebar full‐height */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* ← Konten utama */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <img src={aiIcon} alt="AI Icon" className="w-[52px] h-[52px]" />
          <div className="ml-4">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">Laman Pengaturan</h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
Laman pengaturan memungkinkan anda untuk mengunggah metode lokalisasi dan mengatur ruangan lokalisasi            </p>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="grid grid-cols-1 items-start md:grid-cols-2 gap-8">
            {/* kiri */}
            <UploadForm onUploadSuccess={handleUploadSuccess} />
            {/* kanan */}
            <HistoryDataList uploads={uploads} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DataSettingPage;