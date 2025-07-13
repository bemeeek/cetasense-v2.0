import React from 'react';
import { type Ruangan } from '../services/api';

interface Props {
  ruangan: Ruangan;
  result: { x: number; y: number };
}

interface Size {
  width: number;
  height: number;
}

export const LocalizationResult: React.FC<Props> = ({ ruangan, result }) => {
  const {
    panjang,
    lebar,
    posisi_x_tx,
    posisi_y_tx,
    posisi_x_rx,
    posisi_y_rx,
    nama_ruangan,
  } = ruangan;

  // Determine dynamic canvas size based on room aspect ratio
  const maxSize = 500;
  const ratio = panjang / lebar;
  let width: number;
  let height: number;
  if (ratio >= 1) {
    // wider than tall
    width = maxSize;
    height = maxSize / ratio;
  } else {
    // taller than wide
    width = maxSize * ratio;
    height = maxSize;
  }

  const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

  const maxDivisions = 10;
  const divX = Math.min(maxDivisions, Math.ceil(panjang));
  const divY = Math.min(maxDivisions, Math.ceil(lebar));

const toCartesianPct = (x: number, y: number) => {
  // pastikan 0 ≤ x/panjang ≤ 1; 0 ≤ y/lebar ≤ 1
  const cx = clamp01(x / panjang);
  const cy = clamp01(y / lebar);
  return {
    left:  `${cx * 100}%`,
    bottom:`${cy * 100}%`,
  };
};

  const txPct = toCartesianPct(posisi_x_tx, posisi_y_tx);
  const rxPct = toCartesianPct(posisi_x_rx, posisi_y_rx);
  const subPct = toCartesianPct(result.x, result.y);

  // Render grid lines (simplified)
const renderCartesianGrid = (divX: number, divY: number, _panjang: number, _lebar: number) => (
  <div className="absolute inset-0">
    {/* Vertical Grid Lines */}
    {[...Array(divX + 1)].map((_, i) => (
      <div
        key={`v${i}`}
        className="absolute bg-gray-300"
        style={{
          top: 0,
          bottom: 0,
          left: `${(i / divX) * 100}%`,
          width: 1,
          opacity: 0.6,
        }}
      />
    ))}
    {/* Horizontal Grid Lines */}
    {[...Array(divY + 1)].map((_, i) => (
      <div
        key={`h${i}`}
        className="absolute bg-gray-300"
        style={{
          left: 0,
          right: 0,
          bottom: `${(i / divY) * 100}%`,
          height: 1,
          opacity: 0.6,
        }}
      />
    ))}
  </div>
);

// Render axis lines (X & Y)
const renderAxisLines = () => (
  <>
    {/* X-axis */}
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 z-20" />
    {/* Y-axis */}
    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-green-500 to-green-600 z-20" />
  </>
);

// Render the connection lines from TX/RX to subject
const renderConnectionLines = (
  fromPct: { left: string; bottom: string },
  toPct:   { left: string; bottom: string },
  color: 'magenta' | 'orange',
  size: Size
) => {
  // Parse % → angka
  const fx = (parseFloat(fromPct.left) / 100) * size.width;
  const fy = size.height - (parseFloat(fromPct.bottom) / 100) * size.height;
  const tx = (parseFloat(toPct.left)   / 100) * size.width;
  const ty = size.height - (parseFloat(toPct.bottom) / 100) * size.height;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width={size.width}
      height={size.height}
    >
      <line
        x1={fx} y1={fy}
        x2={tx} y2={ty}
        stroke={ color==='magenta'
          ? 'rgba(236,72,153,0.6)'
          : 'rgba(245,158,11,0.6)'
        }
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
      />
    </svg>
  );
};

// Render markers for TX, RX, and Subject
const renderMarkers = (txPct: any, rxPct: any, subPct: any, result: { x: number; y: number }) => (
  <>
    {/* TX Marker */}
    <div
      title="Antena TX"
      className="absolute"
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
      className="absolute"
      style={{ left: rxPct.left, bottom: rxPct.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-xl border-3 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs">RX</span>
        </div>
      </div>
    </div>

    {/* Subject Marker */}
    <div
      title={`Subjek - Koordinat: (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`}
      className="absolute"
      style={{ left: subPct.left, bottom: subPct.bottom, transform: 'translate(-50%, 50%)' }}
    >
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-2xl border-4 border-white transform transition-all duration-300 group-hover:scale-125">
        <div className="absolute inset-1 bg-blue-300 rounded-full animate-pulse opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      </div>
    </div>
  </>
);



// Add other components (CoordinateDisplay, DeviceInfo, Legend, etc.)
const CoordinateDisplay: React.FC<{ result: { x: number; y: number } }> = ({ result }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <span className="w-3 h-3 bg-blue-600 rounded-full mr-2" />
      Posisi Subjek 
    </h3>
    <div className="space-y-3">
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat X :</span>
        <span className="font-bold text-2xl text-blue-600">{result.x.toFixed(2)}m</span>
      </div>
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
        <span className="font-medium text-gray-700">Koordinat T :</span>
        <span className="font-bold text-2xl text-green-600">{result.y.toFixed(2)}m</span>
      </div>
    </div>
  </div>
);

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

const CoordinateSystemInfo = () => (
  <div className="bg-gradient-to-br h-full from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border border-indigo-200">
    <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
      <span className="w-3 h-3 bg-indigo-600 rounded-full mr-2" />
      Sistem Koordinat Kartesian
    </h3>
    <div className="space-y-2 text-sm text-indigo-700">
      <div className="flex items-center">
        <div className="w-3 h-0.5 bg-blue-500 mr-2" />
        <span>X-axis: Horizontal (Panjang ruangan)</span>
      </div>
      <div className="flex items-center">
        <div className="w-0.5 h-3 bg-green-500 mr-2 ml-1" />
        <span>Y-axis: Vertikal (Lebar ruangan)</span>
      </div>
      <div className="flex items-center">
        <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
        <span>Origin (0,0): Pojok kiri bawah</span>
      </div>
    </div>
  </div>
);

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
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        <span className="text-sm font-medium">Posisi Subjek Target</span>
      </div>
    </div>
  </div>
);


  return (
  <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg">
    {/* Header */}
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold mb-2 text-indigo-600">
        Hasil Lokalisasi – Koordinat Kartesian
      </h2>
      <p className="text-lg text-gray-700">
        Ruangan:{' '}
        <span className="font-semibold text-blue-500">
          {nama_ruangan}
        </span>
      </p>
      <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
        <span>
          Panjang (X): <strong>{panjang}m</strong>
        </span>
        <span>
          Lebar (Y): <strong>{lebar}m</strong>
        </span>
      </div>
    </div>

    {/* Main: Canvas + Info Panels */}
    <div className="flex flex-col lg:flex-row items-start gap-8">
      {/* Canvas */}
      <div className="flex-shrink-0">
        <div
          className="relative bg-white border-2 border-gray-300 shadow-lg rounded-xl overflow-hidden"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {renderCartesianGrid(divX, divY, panjang, lebar)}
          {renderAxisLines()}
          {renderConnectionLines(txPct, subPct, 'magenta', { width, height })}
          {renderConnectionLines(rxPct, subPct, 'orange', { width, height })}
          {renderMarkers(txPct, rxPct, subPct, result)}
          {/* Origin & Corners */}
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
        <div>
          <CoordinateDisplay result={result} />
        </div>
        <div>
          <DeviceInfo ruangan={ruangan} />
        </div>
        <div>
          <CoordinateSystemInfo />
        </div>
        <div>
          <Legend />
        </div>
      </div>
    </div>
  </div>
)
}


export default LocalizationResult;