// src/pages/LandingPage.tsx
import React from 'react';
import Sidebar from '../components/sidebar/sidebar';
// import overviewIllustration from '../assets/overview-illustration.svg';\
import { CircleStackIcon } from '@heroicons/react/16/solid';
import { WifiIcon } from '@heroicons/react/24/outline';
import TimelineItem from '../components/TimelineItem';

const LandingPage: React.FC = () => {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* ← Sidebar full‐height */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* ← Konten utama */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 overflow-auto space-y-8">
          {/* Seksi 1: Apa itu Cetasense v2.0? */}
          <section className="bg-white p-8 rounded-xl shadow">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Teks */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">Apa itu Cetasense v2.0?</h1>
                <p className="text-gray-700 mb-4">
                  Cetasense v2.0 merupakan versi pembaharuan dari Cetasense yang memungkinkan pemantauan posisi
                  dalam ruang dengan akurasi tinggi menggunakan data Wi-Fi CSI. Beberapa pembaharuan lain yang
                  ditawarkan oleh Cetasense v2.0 ini antara lain:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Fitur unggah metode untuk membandingkan hasil lokalisasi dengan beberapa metode.</li>
                  <li>Fitur pengaturan ruangan untuk membandingkan hasil lokalisasi untuk beberapa ruangan berbeda.</li>
                  <li>Fitur lokalisasi dalam ruang dengan menggunakan metode berbeda untuk ruangan berbeda.</li>
                </ul>
              </div>
              {/* Ilustrasi */}
              <div className="w-full md:w-1/2">
                {/* <img
                  src={overviewIllustration}
                  alt="Overview Cetasense"
                  className="w-full h-auto"
                /> */}
              </div>
            </div>
          </section>

          {/* Seksi 2: Bagaimana Cara Menggunakan */}
          <section className="bg-white p-8 rounded-xl shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center">
              {/* Timeline kiri */}
              <div className="relative">
                {/* Garis vertikal */}
                <div className="absolute left-4 top-0 h-full border-l-2 border-gray-300" />
                <div className="space-y-12">
                    <TimelineItem
                    icon={<CircleStackIcon className="w-6 h-6" />}
                    title="Lakukan Pengaturan"
                    description="Unggah dan atur metode yang sesuai untuk menentukan posisi objek dengan akurat di dalam ruang."
                    linkText="Lakukan Pengaturan"
                    to="/settings/data"
                    />
                  <TimelineItem
                    icon={<WifiIcon className="w-6 h-6" />}
                    title="Lihat Hasil Pemosisian"
                    description="Tinjau hasil pemantauan posisi objek di dalam ruang dengan menggunakan metode tertentu."
                    linkText="Lihat Hasil Pemosisian"
                    to="/data-stream/lokalisasi"
                  />
                  <TimelineItem
                    icon={<WifiIcon className="w-6 h-6" />}
                    title="Bandingkan Hasil Pemosisian"
                    description="Tinjau hasil pemosisian posisi objek di dalam ruang dengan membandingkan beberapa metode."
                    linkText="Bandingkan Hasil Pemosisian"
                    to="/data-stream/perbandingan"
                  />
                </div>
              </div>
              {/* Judul kanan */}
              <div className="mt-8 md:mt-0 text-center md:text-left px-4">
                <h2 className="text-3xl font-bold">
                  Bagaimana Cara<br />Menggunakan Cetasense v2.0?
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
