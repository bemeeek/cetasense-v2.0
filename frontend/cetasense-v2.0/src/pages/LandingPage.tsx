// src/pages/LandingPage.tsx
import React from 'react';
import Sidebar from '../components/sidebar/sidebar';
// import overviewIllustration from '../assets/overview-illustration.svg';\
import { Cog6ToothIcon } from '@heroicons/react/16/solid';
import { WifiIcon } from '@heroicons/react/24/outline';
import TimelineItem from '../components/TimelineItem';

const LandingPage: React.FC = () => {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

           <div className="flex-1 flex flex-col">
        <main className="flex-1 space-y-12 py-12">
          {/* ===== Seksi 1: Apa itu Cetasense ===== */}
          <section className="container mx-auto px-6">
            <div className="bg-white p-12 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Apa itu Cetasense v2.0?
                </h1>
                <p className="text-lg md:text-xl text-gray-700 mb-6">
                  Cetasense v2.0 adalah versi terbaru dengan akurasi tinggi untuk
                  pelacakan indoor menggunakan data Wi-Fi CSI. Fitur unggulan:
                </p>
                <ul className="list-disc list-inside space-y-3 text-base text-gray-700">
                  <li>Upload & compare beberapa algoritma pemosisian.</li>
                  <li>Pengaturan multi-ruang untuk skenario berbeda.</li>
                  <li>Dashboard real-time hasil pemosisian.</li>
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                {/* <img
                  src={overviewIllustration}
                  alt="Overview Cetasense"
                  className="w-full h-auto"
                /> */}
              </div>
            </div>
          </section>

          {/* ===== Seksi 2: Cara Menggunakan ===== */}
          <section className="container mx-auto px-6">
            <div className="bg-white p-10 rounded-2xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Timeline kiri */}
              <div className="relative pl-12">
                {/* Garis vertikal */}
                <div className="absolute left-6 top-0 h-full border-l-2 border-gray-200" />
                <div className="space-y-12">
                  <TimelineItem
                    icon={<Cog6ToothIcon className="w-6 h-6 text-blue-600" />}
                    title="Lakukan Pengaturan"
                    description="Unggah & atur metode untuk menentukan posisi objek dengan tepat."
                    linkText="Mulai Pengaturan"
                    to="/settings/data"
                  />
                  <TimelineItem
                    icon={<WifiIcon className="w-6 h-6 text-blue-600" />}
                    title="Lihat Hasil Pemosisian"
                    description="Tinjau hasil pemosisian subjek menggunakan algoritma yang dipilih."
                    linkText="Buka Hasil Pemosisian"
                    to="/data-stream/lokalisasi"
                  />
                  <TimelineItem
                    icon={<WifiIcon className="w-6 h-6 text-blue-600" />}
                    title="Bandingkan Hasil"
                    description="Analisis & bandingkan akurasi dari beberapa algoritma berbeda."
                    linkText="Bandingkan Hasil Pemosisian Sekarang"
                    to="/data-stream/perbandingan"
                  />
                </div>
              </div>
              {/* Judul kanan */}
              <div className="flex items-center justify-center md:justify-end">
                <h2 className="text-3xl md:text-4xl font-bold leading-snug text-gray-800">
                  Bagaimana Cara<br />
                  Menggunakan Cetasense v2.0?
                </h2>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;