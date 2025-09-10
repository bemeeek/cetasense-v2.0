import React from 'react';
import { type Ruangan } from '../services/api';

interface Props {
  ruangan: Ruangan;
  result: { x: number; y: number };
  methods: string;
}

export const LocalizationResult: React.FC<Props> = ({ ruangan, result, methods }) => {
  const {
    panjang, lebar, posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx,
    nama_ruangan, mode, anchors = []
  } = ruangan;

  // ukuran kanvas proporsional
  const maxSize = 500;
  const ratio = panjang / lebar;
  const width = ratio >= 1 ? maxSize : maxSize * ratio;
  const height = ratio >= 1 ? maxSize / ratio : maxSize;

  // padding panggung agar marker tidak mepet tepi
  const PAD = 12; // px
  const stageW = Math.max(10, width - PAD * 2);
  const stageH = Math.max(10, height - PAD * 2);

  const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
  const toPct = (x: number, y: number) => {
    const nx = clamp01(x / Math.max(panjang, 1e-6));
    const ny = clamp01(y / Math.max(lebar, 1e-6));
    return { left: `${nx * 100}%`, bottom: `${ny * 100}%` };
  };

  const divX = Math.min(10, Math.ceil(panjang));
  const divY = Math.min(10, Math.ceil(lebar));

  const txPct = toPct(posisi_x_tx, posisi_y_tx);
  const rxPct = toPct(posisi_x_rx, posisi_y_rx);
  const subPct = toPct(result.x, result.y);
  const anchorPct = anchors.map(a => ({ ...toPct(a.x, a.y), name: a.name }));

  // garis SVG di dalam stage (koordinat pixel)
  const line = (
    from: { left: string; bottom: string },
    to: { left: string; bottom: string },
    color: string,
    dash = '8 4',
    widthPx = 2
  ) => {
    const fx = (parseFloat(from.left) / 100) * stageW;
    const fy = stageH - (parseFloat(from.bottom) / 100) * stageH;
    const tx = (parseFloat(to.left) / 100) * stageW;
    const ty = stageH - (parseFloat(to.bottom) / 100) * stageH;
    return <line x1={fx} y1={fy} x2={tx} y2={ty} stroke={color} strokeWidth={widthPx} strokeDasharray={dash} strokeLinecap="round" />;
  };

  const SubjectMarker: React.FC<{ pct: { left: string; bottom: string } }> = ({ pct }) => (
    <div className="absolute" style={{ left: pct.left, bottom: pct.bottom, transform: 'translate(-50%, 50%)' }}>
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-2xl border-4 border-white">
        <div className="absolute inset-1 bg-blue-300 rounded-full animate-pulse opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      </div>
    </div>
  );

  const AntennaMarkers = () => (
    <>
      <div title="Antena TX" className="absolute" style={{ left: txPct.left, bottom: txPct.bottom, transform: 'translate(-50%, 50%)' }}>
        <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full shadow-xl border-3 border-white">
          <div className="absolute inset-0 bg-pink-300 rounded-full animate-ping opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs">TX</span></div>
        </div>
      </div>
      <div title="Antena RX" className="absolute" style={{ left: rxPct.left, bottom: rxPct.bottom, transform: 'translate(-50%, 50%)' }}>
        <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-xl border-3 border-white">
          <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs">RX</span></div>
        </div>
      </div>
    </>
  );

  const AnchorMarkers = () => (
    <>
      {anchorPct.map((a, i) => (
        <div key={i} className="absolute" style={{ left: a.left, bottom: a.bottom, transform: 'translate(-50%, 50%)' }}>
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full shadow-xl border-2 border-white" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700">
            {anchors[i]?.name || `A${i + 1}`}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-indigo-600">Hasil Pemosisian</h2>
        <p className="text-lg text-gray-700">Ruangan: <span className="font-semibold text-blue-500">{nama_ruangan}</span></p>
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
          <span>Panjang (X): <strong>{panjang}m</strong></span>
          <span>Lebar (Y): <strong>{lebar}m</strong></span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Kanvas */}
        <div className="flex-shrink-0">
          <div className="relative bg-white border-2 border-gray-300 shadow-lg rounded-xl overflow-hidden" style={{ width, height }}>
            {/* Stage dengan padding agar marker tidak mepet */}
            <div className="absolute" style={{ left: PAD, right: PAD, top: PAD, bottom: PAD }}>
              {/* Grid kartesian */}
              <div className="absolute inset-0">
                {[...Array(divX + 1)].map((_, i) => (
                  <div key={`v${i}`} className="absolute bg-gray-300" style={{ top: 0, bottom: 0, left: `${(i / divX) * 100}%`, width: 1, opacity: 0.6 }} />
                ))}
                {[...Array(divY + 1)].map((_, i) => (
                  <div key={`h${i}`} className="absolute bg-gray-300" style={{ left: 0, right: 0, bottom: `${(i / divY) * 100}%`, height: 1, opacity: 0.6 }} />
                ))}
                {/* sumbu */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10" />
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-green-600 z-10" />
              </div>

              {/* Garis koneksi */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {mode !== 'anchor' && (
                  <>
                    {line(txPct, subPct, 'rgba(236,72,153,0.6)')}   {/* TX → subjek */}
                    {line(rxPct, subPct, 'rgba(245,158,11,0.6)')}   {/* RX → subjek */}
                  </>
                )}
                {mode === 'anchor' &&
                  anchorPct.map((a, i) => (
                    <React.Fragment key={i}>
                      {line(a, subPct, 'rgba(16,185,129,0.6)')}     {/* Anchor i → subjek */}
                    </React.Fragment>
                  ))
                }
              </svg>

              {/* Marker perangkat */}
              {mode === 'anchor' ? <AnchorMarkers /> : <AntennaMarkers />}
              {/* Marker subjek */}
              <SubjectMarker pct={subPct} />
            </div>

            {/* Label sudut (di tepi luar biar gampang dibaca) */}
            <div className="absolute bottom-2 left-2 text-sm font-bold text-green-600 bg-white/90 px-2 py-1 rounded border">Origin (0,0)</div>
            <div className="absolute top-2 left-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">(0,{lebar})</div>
            <div className="absolute bottom-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">({panjang},0)</div>
            <div className="absolute top-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">({panjang},{lebar})</div>
          </div>
        </div>

        {/* Panel info */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Posisi Subjek</h3>
            <div className="text-sm text-gray-600 mb-4 font-medium bg-green-50 px-3 py-2 rounded-lg">Metode: {methods}</div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span className="font-medium text-gray-700">X:</span><span className="font-bold text-2xl text-blue-600">{result.x.toFixed(2)} m</span></div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg"><span className="font-medium text-gray-700">Y:</span><span className="font-bold text-2xl text-emerald-600">{result.y.toFixed(2)} m</span></div>
          </div>

          {mode === 'anchor' ? (
            <div className="bg-white rounded-xl p-6 shadow-lg h-full border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Anchor Nodes</h3>
              <div className="space-y-2 text-sm">
                {(anchors ?? []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="font-medium">{a.name || `A${i + 1}`}</span>
                    <span className="font-bold text-emerald-700">({a.x}, {a.y})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-lg h-full border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Perangkat</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100"><span className="font-medium">TX Antenna</span><span className="font-bold text-pink-700">({posisi_x_tx}, {posisi_y_tx})</span></div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"><span className="font-medium">RX Antenna</span><span className="font-bold text-orange-700">({posisi_x_rx}, {posisi_y_rx})</span></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Legenda</h3>
            {mode === 'anchor' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-emerald-600 rounded-full" /><span className="text-sm font-medium">Anchor Node</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div><span className="text-sm font-medium">Posisi Subjek</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-4 h-1 bg-emerald-500" /><span className="text-sm font-medium">Garis ke Anchor</span></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-pink-500 rounded-full" /><span className="text-sm font-medium">TX</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-orange-500 rounded-full" /><span className="text-sm font-medium">RX</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div><span className="text-sm font-medium">Posisi Subjek</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalizationResult;
