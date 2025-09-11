import React, { useEffect, useState } from 'react';
import { type CSIFileMeta, type Ruangan } from '../services/api';

interface Props {
  ruangan: Ruangan;
  data?: CSIFileMeta;
  results: { run1: { x: number; y: number } | null; run2: { x: number; y: number } | null; };
  methods: { run1: string; run2: string; };
  groundTruth?: { x: number|null; y: number|null };
}

export const ComparisonResult: React.FC<Props> = ({ ruangan, results, methods, groundTruth }) => {
  const { panjang, lebar, posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx, nama_ruangan, mode, anchors = [] } = ruangan;

   // Toggle garis ke anchor (persist)
  const [showAnchorLines, setShowAnchorLines] = useState<boolean>(() => {
    try { const v = localStorage.getItem('cmp_showAnchorLines'); return v == null ? true : JSON.parse(v); }
    catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem('cmp_showAnchorLines', JSON.stringify(showAnchorLines)); } catch {} }, [showAnchorLines]);

  const maxSize = 500;
  const ratio = panjang / lebar;
  const width = ratio >= 1 ? maxSize : maxSize * ratio;
  const height = ratio >= 1 ? maxSize / ratio : maxSize;

  const PAD = 12;
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
  const r1Pct = toPct(results.run1?.x || 0, results.run1?.y || 0);
  const r2Pct = toPct(results.run2?.x || 0, results.run2?.y || 0);
  const gtPct = groundTruth?.x != null && groundTruth?.y != null ? toPct(groundTruth.x, groundTruth.y) : null;
  const anchorPct = anchors.map(a => ({ ...toPct(a.x, a.y), name: a.name }));

  const distance = (() => {
    if (!results.run1 || !results.run2) return null;
    const dx = results.run1.x - results.run2.x;
    const dy = results.run1.y - results.run2.y;
    return Math.sqrt(dx * dx + dy * dy);
  })();

  // SVG lines inside stage
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

  const ResultMarker: React.FC<{ pct: any; color: 'red' | 'green'; }> = ({ pct, color }) => (
    <div className="absolute z-30" style={{ left: pct.left, bottom: pct.bottom, transform: 'translate(-50%, 50%)' }}>
      <div className={`w-10 h-10 rounded-full shadow-2xl border-4 border-white ${color === 'red' ? 'bg-red-600' : 'bg-green-600'}`}>
        <div className={`absolute inset-1 rounded-full animate-pulse opacity-60 ${color === 'red' ? 'bg-red-300' : 'bg-green-300'}`} />
      </div>
    </div>
  );

  const AntennaMarkers = () => (
    <>
      <div title="Antena TX" className="absolute z-30" style={{ left: txPct.left, bottom: txPct.bottom, transform: 'translate(-50%, 50%)' }}>
        <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full shadow-xl border-3 border-white"><div className="absolute inset-0 bg-pink-300 rounded-full animate-ping opacity-40" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs">TX</span></div></div>
      </div>
      <div title="Antena RX" className="absolute z-30" style={{ left: rxPct.left, bottom: rxPct.bottom, transform: 'translate(-50%, 50%)' }}>
        <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-xl border-3 border-white"><div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-40" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs">RX</span></div></div>
      </div>
    </>
  );

  const AnchorMarkers = () => (
    <>
      {anchorPct.map((a, i) => (
        <div key={i} className="absolute z-30" style={{ left: a.left, bottom: a.bottom, transform: 'translate(-50%, 50%)' }}>
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full shadow-xl border-2 border-white" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700">
            {anchors[i]?.name || `A${i + 1}`}
          </div>
        </div>
      ))}
    </>
  );

  // error vs GT
  const calcError = (pt: { x: number; y: number } | null) => {
    if (!pt || groundTruth?.x == null || groundTruth?.y == null) return null;
    const dx = pt.x - groundTruth.x;
    const dy = pt.y - groundTruth.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const error1 = calcError(results.run1);
  const error2 = calcError(results.run2);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-indigo-600">Perbandingan Hasil Penentuan Posisi</h2>
        <p className="text-lg text-gray-700">Ruangan: <span className="font-semibold text-blue-500">{nama_ruangan}</span></p>
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
          <span>Panjang (X): <strong>{panjang}m</strong></span>
          <span>Lebar (Y): <strong>{lebar}m</strong></span>
          {distance && <span className="text-purple-600">Jarak Antar Hasil: <strong>{distance.toFixed(2)}m</strong></span>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Kanvas */}
        <div className="flex-shrink-0">
          {/* Toggle garis ke anchor */}
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={showAnchorLines}
              onChange={(e) => setShowAnchorLines(e.target.checked)}
              disabled={mode !== 'anchor'}
           />
           <span className={`text-sm ${mode !== 'anchor' ? 'opacity-50' : ''}`}>
              Tampilkan garis ke anchor
            </span>
          </div>
          <div className="relative bg-white border-2 border-gray-300 shadow-lg rounded-xl overflow-hidden" style={{ width, height }}>
            {/* Stage berpadding */}
            <div className="absolute" style={{ left: PAD, right: PAD, top: PAD, bottom: PAD }}>
              {/* Grid */}
              <div className="absolute inset-0">
                {[...Array(divX + 1)].map((_, i) => (
                  <div key={`v${i}`} className="absolute bg-gray-300" style={{ top: 0, bottom: 0, left: `${(i / divX) * 100}%`, width: 1, opacity: 0.6 }} />
                ))}
                {[...Array(divY + 1)].map((_, i) => (
                  <div key={`h${i}`} className="absolute bg-gray-300" style={{ left: 0, right: 0, bottom: `${(i / divY) * 100}%`, height: 1, opacity: 0.6 }} />
                ))}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10" />
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-green-600 z-10" />
              </div>

              {/* Garis koneksi */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* run1 → anchors (MERAH) */}
                {mode === 'anchor' && showAnchorLines && results.run1 && anchorPct.map((a, i) => (
                  <React.Fragment key={`r1-${i}`}>
                    {line(toPct(results.run1!.x, results.run1!.y), a, 'rgba(239, 68, 68, 0.6)')}
                  </React.Fragment>
                ))}
                {/* run2 → anchors (HIJAU) */}
                {mode === 'anchor' && showAnchorLines && results.run2 && anchorPct.map((a, i) => (
                  <React.Fragment key={`r2-${i}`}>
                    {line(toPct(results.run2!.x, results.run2!.y), a, 'rgba(34, 197, 94, 0.6)')}
                  </React.Fragment>
                ))}
                {/* garis antar hasil dan ke GT (seperti sebelumnya) */}
                {results.run1 && results.run2 && line(r1Pct, r2Pct, 'rgba(147, 51, 234, 0.6)', '4 2')}
                {gtPct && results.run1 && line(gtPct, r1Pct, 'rgba(30, 64, 175, 0.8)')}
                {gtPct && results.run2 && line(gtPct, r2Pct, 'rgba(30, 64, 175, 0.8)')}
                {/* mode antenna: sambung ke TX/RX */}
                {mode !== 'anchor' && results.run1 && line(txPct, r1Pct, 'rgba(236,72,153,0.6)')}
                {mode !== 'anchor' && results.run1 && line(rxPct, r1Pct, 'rgba(245,158,11,0.6)')}
                {mode !== 'anchor' && results.run2 && line(txPct, r2Pct, 'rgba(236,72,153,0.3)')}
                {mode !== 'anchor' && results.run2 && line(rxPct, r2Pct, 'rgba(245,158,11,0.3)')}
              </svg>

              {/* Marker perangkat */}
              {mode === 'anchor' ? <AnchorMarkers /> : <AntennaMarkers />}

              {/* Marker hasil */}
              {results.run1 && <ResultMarker pct={r1Pct} color="red" />}
              {results.run2 && <ResultMarker pct={r2Pct} color="green" />}

              {/* GT */}
              {gtPct && groundTruth?.x != null && groundTruth?.y != null && (
                <div className="absolute z-30" style={{ left: gtPct.left, bottom: gtPct.bottom, transform: 'translate(-50%, 50%)' }}>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-2xl border-4 border-white flex items-center justify-center">
                    <span className="text-white font-bold text-xs">GT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Label sudut (luar stage) */}
            <div className="absolute bottom-2 left-2 text-sm font-bold text-green-600 bg-white/90 px-2 py-1 rounded border">Origin (0,0)</div>
            <div className="absolute top-2 left-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">(0,{lebar})</div>
            <div className="absolute bottom-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">({panjang},0)</div>
            <div className="absolute top-2 right-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">({panjang},{lebar})</div>
          </div>
        </div>

        {/* Panel kanan */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {results.run1 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center"><span className="w-3 h-3 bg-red-600 rounded-full mr-2" />Posisi Subjek Algoritma 1</h3>
              <div className="text-sm text-gray-600 mb-4 font-medium bg-red-50 px-3 py-2 rounded-lg">Metode: {methods.run1}</div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span className="font-medium text-gray-700">X:</span><span className="font-bold text-2xl text-blue-600">{results.run1.x.toFixed(2)} m</span></div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg"><span className="font-medium text-gray-700">Y:</span><span className="font-bold text-2xl text-emerald-600">{results.run1.y.toFixed(2)} m</span></div>
              {error1 != null && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Error vs GT: <b>{error1.toFixed(2)} m</b></div>}
            </div>
          )}

          {results.run2 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 h-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center"><span className="w-3 h-3 bg-green-600 rounded-full mr-2" />Posisi Subjek Algoritma 2</h3>
              <div className="text-sm text-gray-600 mb-4 font-medium bg-green-50 px-3 py-2 rounded-lg">Metode: {methods.run2}</div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span className="font-medium text-gray-700">X:</span><span className="font-bold text-2xl text-blue-600">{results.run2.x.toFixed(2)} m</span></div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg"><span className="font-medium text-gray-700">Y:</span><span className="font-bold text-2xl text-emerald-600">{results.run2.y.toFixed(2)} m</span></div>
              {error2 != null && <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Error vs GT: <b>{error2.toFixed(2)} m</b></div>}
            </div>
          )}

          {/* Info perangkat */}
          <div className="bg-white rounded-xl p-6 shadow-lg h-full border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{mode === 'anchor' ? 'Anchor Nodes' : 'Informasi Perangkat'}</h3>
            {mode === 'anchor' ? (
              <div className="space-y-2 text-sm">
                {(anchors ?? []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="font-medium">{a.name || `A${i + 1}`}</span>
                    <span className="font-bold text-emerald-700">({a.x}, {a.y})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100"><span className="font-medium">TX Antenna</span><span className="font-bold text-pink-700">({posisi_x_tx}, {posisi_y_tx})</span></div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"><span className="font-medium">RX Antenna</span><span className="font-bold text-orange-700">({posisi_x_rx}, {posisi_y_rx})</span></div>
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Legenda</h3>
            {mode === 'anchor' ? (
              <>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-emerald-600 rounded-full" /><span className="text-sm font-medium">Anchor</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-red-600 rounded-full" /><span className="text-sm font-medium">Posisi Subjek 1</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-green-600 rounded-full" /><span className="text-sm font-medium">Posisi Subjek 2</span></div>
                {showAnchorLines && (
                 <>
                    <div className="flex items-center gap-3 p-2"><div className="w-8 h-1 bg-red-500" /><span className="text-sm font-medium">Garis ke Anchor (Run 1)</span></div>
                   <div className="flex items-center gap-3 p-2"><div className="w-8 h-1 bg-green-500" /><span className="text-sm font-medium">Garis ke Anchor (Run 2)</span></div>
                 </>
               )}
                <div className="flex items-center gap-3 p-2"><div className="w-8 h-1 bg-indigo-700" /><span className="text-sm font-medium">Garis ke GT</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-pink-500 rounded-full" /><span className="text-sm font-medium">TX</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-orange-500 rounded-full" /><span className="text-sm font-medium">RX</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-red-600 rounded-full" /><span className="text-sm font-medium">Posisi Subjek 1</span></div>
                <div className="flex items-center gap-3 p-2"><div className="w-6 h-6 bg-green-600 rounded-full" /><span className="text-sm font-medium">Posisi Subjek 2</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonResult;
