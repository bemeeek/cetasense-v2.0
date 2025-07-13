import React from 'react';
import { type CSIFileMeta, type Ruangan } from '../services/api';

interface Props {
  ruangan: Ruangan;
  data?: CSIFileMeta;
  results: { 
    run1: { x: number; y: number } | null; 
    run2: { x: number; y: number } | null; 
  };
  // Tambahkan props untuk method information
  methods: {
    run1: string;
    run2: string;
  };
}

export const ComparisonResult: React.FC<Props> = ({ ruangan, results, methods }) => {
  const {
    panjang,
    lebar,
    posisi_x_tx,
    posisi_y_tx,
    posisi_x_rx,
    posisi_y_rx,
    nama_ruangan,
  } = ruangan;

  const maxSize = 500;
  const ratio = panjang / lebar;
  let width: number;
  let height: number;
  if (ratio >= 1) {
    width = maxSize;
    height = maxSize / ratio;
  } else {
    width = maxSize * ratio;
    height = maxSize;
  }

  const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

  const toCartesianPct = (x: number, y: number) => {
    const nx = clamp01(x / panjang);
    const ny = clamp01(y / lebar);
    return {
      left: `${nx * 100}%`,
      bottom: `${ny * 100}%`,
    };
  };

  const maxDivisions = 10;
  const divX = Math.min(maxDivisions, Math.ceil(panjang));
  const divY = Math.min(maxDivisions, Math.ceil(lebar));

  const txPct = toCartesianPct(posisi_x_tx, posisi_y_tx);
  const rxPct = toCartesianPct(posisi_x_rx, posisi_y_rx);
  const subPct1 = toCartesianPct(results.run1?.x || 0, results.run1?.y || 0);
  const subPct2 = toCartesianPct(results.run2?.x || 0, results.run2?.y || 0);

  // Hitung jarak antara dua hasil
  const calculateDistance = () => {
    if (!results.run1 || !results.run2) return null;
    const dx = results.run1.x - results.run2.x;
    const dy = results.run1.y - results.run2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const distance = calculateDistance();

  // const renderSubjectMarker = (x: number, y: number, label: string) => {
  //   const { left, bottom } = toCartesianPct(x, y);
  //   return (
  //     <div
  //       key={label}
  //       className="absolute"
  //       style={{
  //         left,
  //         bottom,
  //         transform: 'translate(-50%,-50%)'
  //       }}
  //     >
  //       <div className={`w-10 h-10 bg-gradient-to-br ${label === 'A' ? 'from-red-400 to-red-600' : 'from-green-400 to-green-600'} rounded-full shadow-2xl border-4 border-white flex items-center justify-center`}>
  //         <span className="text-white font-bold text-lg">{label}</span>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-indigo-600">Perbandingan Hasil Lokalisasi</h2>
        <p className="text-lg text-gray-700">
          Ruangan: <span className="font-semibold text-blue-500">{nama_ruangan}</span>
        </p>
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
          <span>Panjang (X): <strong>{panjang}m</strong></span>
          <span>Lebar (Y): <strong>{lebar}m</strong></span>
          {distance && (
            <span className="text-purple-600">
              Jarak Antar Hasil: <strong>{distance.toFixed(2)}m</strong>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Canvas */}
        <div className="flex-shrink-0">
          <div 
            style={{ width: `${width}px`, height: `${height}px` }} 
            className="relative bg-white border-2 border-gray-300 shadow-lg rounded-xl overflow-hidden"
          >
            {renderCartesianGrid(divX, divY)}
            {renderAxisLines()}
            
            {/* Render connection lines - REVISI: Line yang lebih lengkap */}
            {results.run1 && (
              <>
                {renderConnectionLines(txPct, subPct1, 'red', 'TX → A')}
                {renderConnectionLines(rxPct, subPct1, 'orange', 'RX → A')}
              </>
            )}
            {results.run2 && (
              <>
                {renderConnectionLines(txPct, subPct2, 'green', 'TX → B')}
                {renderConnectionLines(rxPct, subPct2, 'blue', 'RX → B')}
              </>
            )}
            
            {/* Connection line between results */}
            {results.run1 && results.run2 && (
              renderConnectionLines(subPct1, subPct2, 'purple', 'A ↔ B')
            )}

            {/* Render markers */}
            {renderMarkers(txPct, rxPct, subPct1, subPct2, results.run1 ?? { x: 0, y: 0 }, results.run2 ?? { x: 0, y: 0 })}
            
            {/* Corner labels */}
            <div className="absolute bottom-2 left-2 text-sm font-bold text-green-600 bg-white/90 px-2 py-1 rounded border">
              Origin (0,0)
            </div>
            <div className="absolute top-2 left-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">
              (0,{lebar})
            </div>
            <div className="absolute bottom-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">
              ({panjang},0)
            </div>
            <div className="absolute top-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">
              ({panjang},{lebar})
            </div>
          </div>
        </div>

        {/* Information Panels */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {results.run1 && <CoordinateDisplay1 result={results.run1} method={methods.run1} />}
          {results.run2 && <CoordinateDisplay2 result={results.run2} method={methods.run2} />}
          <DeviceInfo ruangan={ruangan} />
          {/* <CoordinateSystemInfo /> */}
          <Legend />
          {/* {distance && <DistanceInfo distance={distance} />} */}
        </div>
      </div>
    </div>
  );
};

// REVISI 1: Tambahkan method info pada coordinate display
const CoordinateDisplay1: React.FC<{ result: { x: number; y: number }; method: string }> = ({ result, method }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
      <span className="w-3 h-3 bg-red-600 rounded-full mr-2" />
      Posisi Subjek Algoritma 1
    </h3>
    <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-4 font-medium bg-red-50 px-3 py-2 rounded-lg">
      Metode: {method}
    </div>
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat X:</span>
        <span className="font-bold text-2xl text-blue-600">{result.x.toFixed(2)}m</span>
      </div>
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat Y:</span>
        <span className="font-bold text-2xl text-green-600">{result.y.toFixed(2)}m</span>
      </div>
    </div>
  </div>
);

const CoordinateDisplay2: React.FC<{ result: { x: number; y: number }; method: string }> = ({ result, method }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
      <span className="w-3 h-3 bg-green-600 rounded-full mr-2" />
      Posisi Subjek Algoritma 2
    </h3>
    <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-4 font-medium bg-green-50 px-3 py-2 rounded-lg">
      Metode: {method}
    </div>
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat X:</span>
        <span className="font-bold text-2xl text-blue-600">{result.x.toFixed(2)}m</span>
      </div>
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat Y:</span>
        <span className="font-bold text-2xl text-green-600">{result.y.toFixed(2)}m</span>
      </div>
    </div>
  </div>
);

// // Komponen baru untuk menampilkan informasi jarak
// const DistanceInfo: React.FC<{ distance: number }> = ({ distance }) => (
//   <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border border-purple-200 h-full">
//     <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
//       <span className="w-3 h-3 bg-purple-600 rounded-full mr-2" />
//       Analisis Jarak
//     </h3>
//     <div className="space-y-3">
//       <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
//         <span className="font-medium text-gray-700">Jarak Euclidean:</span>
//         <span className="font-bold text-2xl text-purple-600">{distance.toFixed(2)}m</span>
//       </div>
//       <div className="text-sm text-purple-700">
//         {distance < 1 ? 
//           "Hasil sangat dekat - akurasi tinggi" : 
//           distance < 3 ? 
//           "Hasil cukup dekat - akurasi baik" : 
//           "Hasil berjauhan - perlu evaluasi"
//         }
//       </div>
//     </div>
//   </div>
// );

const DeviceInfo: React.FC<{ ruangan: Ruangan }> = ({ ruangan }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg h-full border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Perangkat</h3>
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-pink-500 rounded-full mr-3 flex items-center justify-center">
            <span className="text-white text-xs font-bold">TX</span>
          </div>
          <span className="font-medium">TX Antenna</span>
        </div>
        <span className="font-bold text-pink-700">({ruangan.posisi_x_tx}, {ruangan.posisi_y_tx})</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded-full mr-3 flex items-center justify-center">
            <span className="text-white text-xs font-bold">RX</span>
          </div>
          <span className="font-medium">RX Antenna</span>
        </div>
        <span className="font-bold text-orange-700">({ruangan.posisi_x_rx}, {ruangan.posisi_y_rx})</span>
      </div>
    </div>
  </div>
);

// const CoordinateSystemInfo = () => (
//   <div className="bg-gradient-to-br h-full from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border border-indigo-200">
//     <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
//       <span className="w-3 h-3 bg-indigo-600 rounded-full mr-2" />
//       Sistem Koordinat Kartesian
//     </h3>
//     <div className="space-y-2 text-sm text-indigo-700">
//       <div className="flex items-center">
//         <div className="w-3 h-0.5 bg-blue-500 mr-2" />
//         <span>X-axis: Horizontal (Panjang ruangan)</span>
//       </div>
//       <div className="flex items-center">
//         <div className="w-0.5 h-3 bg-green-500 mr-2 ml-1" />
//         <span>Y-axis: Vertikal (Lebar ruangan)</span>
//       </div>
//       <div className="flex items-center">
//         <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
//         <span>Origin (0,0): Pojok kiri bawah</span>
//       </div>
//     </div>
//   </div>
// );

const Legend = () => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Legenda</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-2 hover:bg-pink-50 rounded-lg transition-colors">
        <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">TX</span>
        </div>
        <span className="text-sm font-medium">Antena Transmitter</span>
      </div>
      <div className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg transition-colors">
        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">RX</span>
        </div>
        <span className="text-sm font-medium">Antena Receiver</span>
      </div>
      <div className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition-colors">
        <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-700 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        <span className="text-sm font-medium">Posisi Subjek 1</span>
      </div>
      <div className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition-colors">
        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-700 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        <span className="text-sm font-medium">Posisi Subjek 2</span>
      </div>
      <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-400" style={{background: 'linear-gradient(to right, red, orange, green, blue, purple)'}} />
          <span>Garis koneksi menunjukkan hubungan antar perangkat</span>
        </div>
      </div>
    </div>
  </div>
);

// Helper functions
const renderMarkers = (
  txPct: any, 
  rxPct: any, 
  subPct1: any, 
  subPct2: any, 
  results1: { x: number; y: number }, 
  results2: { x: number; y: number }
) => (
  <>
    {/* TX Marker */}
    <div
      title="Antena TX"
      className="absolute z-30"
      style={{ left: txPct.left, bottom: txPct.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full shadow-xl border-3 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-0 bg-pink-300 rounded-full animate-ping opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs">TX</span>
        </div>
      </div>
    </div>

    {/* RX Marker */}
    <div
      title="Antena RX"
      className="absolute z-30"
      style={{ left: rxPct.left, bottom: rxPct.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-xl border-3 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs">RX</span>
        </div>
      </div>
    </div>

    {/* Subject Marker 1 - For Run1 */}
    <div
      title={`Subjek Run 1 - Koordinat: (${results1.x.toFixed(2)}, ${results1.y.toFixed(2)})`}
      className="absolute z-30"
      style={{ left: subPct1.left, bottom: subPct1.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-2xl border-4 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-1 bg-red-300 rounded-full animate-pulse opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg"></span>
        </div>
      </div>
    </div>

    {/* Subject Marker 2 - For Run2 */}
    <div
      title={`Subjek Run 2 - Koordinat: (${results2.x.toFixed(2)}, ${results2.y.toFixed(2)})`}
      className="absolute z-30"
      style={{ left: subPct2.left, bottom: subPct2.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-2xl border-4 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-1 bg-green-300 rounded-full animate-pulse opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg"></span>
        </div>
      </div>
    </div>
  </>
);

const renderCartesianGrid = (divX: number, divY: number) => (
  <div className="absolute inset-0">
    {[...Array(divX + 1)].map((_, i) => (
      <div
        key={`v${i}`}
        className="absolute bg-gray-300"
        style={{ top: 0, bottom: 0, left: `${(i / divX) * 100}%`, width: 1, opacity: 0.6 }}
      />
    ))}
    {[...Array(divY + 1)].map((_, i) => (
      <div
        key={`h${i}`}
        className="absolute bg-gray-300"
        style={{ left: 0, right: 0, bottom: `${(i / divY) * 100}%`, height: 1, opacity: 0.6 }}
      />
    ))}
  </div>
);

const renderAxisLines = () => (
  <>
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 z-20" />
    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-green-500 to-green-600 z-20" />
  </>
);

// REVISI 2: Connection lines yang lebih lengkap dengan warna berbeda
const renderConnectionLines = (
  fromPct: { left: string; bottom: string },
  toPct: { left: string; bottom: string },
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple',
  label: string
) => {
  const colorMap = {
    red: 'rgba(239, 68, 68, 0.6)',
    orange: 'rgba(249, 115, 22, 0.6)',
    green: 'rgba(34, 197, 94, 0.6)',
    blue: 'rgba(59, 130, 246, 0.6)',
    purple: 'rgba(147, 51, 234, 0.6)'
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <line
        x1={fromPct.left}
        y1={`${100 - parseFloat(fromPct.bottom)}%`} 
        x2={toPct.left}
        y2={`${100 - parseFloat(toPct.bottom)}%`} 
        stroke={colorMap[color]}
        strokeWidth={2}
        strokeDasharray={color === 'purple' ? '4,2' : '8,4'}
      >
        <title>{label}</title>
      </line>
    </svg>
  );
};

export default ComparisonResult;