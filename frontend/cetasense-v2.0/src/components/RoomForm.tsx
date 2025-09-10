import React, { useEffect, useState, type FormEvent } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import type { Ruangan, RuanganCreate } from '../services/api';

type Mode = 'antenna' | 'anchor';

interface AnchorFormRow {
  name: string;
  x: string; // string di form, di-submit jadi number
  y: string;
}

interface RoomFormProps {
  initial?: Ruangan;
  onCreate: (room: RuanganCreate) => Promise<void>;
  onUpdate: (room: Ruangan) => Promise<void>;
  onCancel: () => void;
}

const RoomForm: React.FC<RoomFormProps> = ({ initial, onCreate, onUpdate, onCancel }) => {
  // base state
  const [nama, setNama] = useState(initial?.nama_ruangan ?? '');
  const [panjang, setPanjang] = useState(initial?.panjang?.toString() ?? '');
  const [lebar, setLebar] = useState(initial?.lebar?.toString() ?? '');

  // mode
  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'antenna');

  // antenna state
  const [txX, setTxX] = useState(initial?.posisi_x_tx?.toString() ?? '');
  const [txY, setTxY] = useState(initial?.posisi_y_tx?.toString() ?? '');
  const [rxX, setRxX] = useState(initial?.posisi_x_rx?.toString() ?? '');
  const [rxY, setRxY] = useState(initial?.posisi_y_rx?.toString() ?? '');

  // anchors state
  const [anchors, setAnchors] = useState<AnchorFormRow[]>(
    initial?.anchors?.length
      ? initial.anchors.map(a => ({ name: a.name ?? '', x: String(a.x ?? ''), y: String(a.y ?? '') }))
      : [{ name: '', x: '', y: '' }]
  );

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setNama(initial.nama_ruangan ?? '');
    setPanjang(initial.panjang?.toString() ?? '');
    setLebar(initial.lebar?.toString() ?? '');
    setMode(initial.mode ?? 'antenna');
    setTxX(initial.posisi_x_tx?.toString() ?? '');
    setTxY(initial.posisi_y_tx?.toString() ?? '');
    setRxX(initial.posisi_x_rx?.toString() ?? '');
    setRxY(initial.posisi_y_rx?.toString() ?? '');
    setAnchors(
      initial.anchors?.length
        ? initial.anchors.map(a => ({ name: a.name ?? '', x: String(a.x ?? ''), y: String(a.y ?? '') }))
        : [{ name: '', x: '', y: '' }]
    );
    setError('');
  }, [initial]);

  // helpers
  const numP = parseFloat(panjang) || 0;
  const numL = parseFloat(lebar) || 0;

  const validateBase = () => {
    if (!nama || nama.trim().length < 3) return 'Nama ruangan minimal 3 karakter.';
    if (!(numP > 0)) return 'Panjang harus > 0.';
    if (!(numL > 0)) return 'Lebar harus > 0.';
    return '';
  };

  const validateAntenna = () => {
    const ntx = parseFloat(txX), nty = parseFloat(txY), nrx = parseFloat(rxX), nry = parseFloat(rxY);
    if ([ntx, nty, nrx, nry].some(v => Number.isNaN(v))) return 'Koordinat TX/RX harus angka.';
    if (ntx < 0 || ntx > numP || nty < 0 || nty > numL) return 'Koordinat TX di luar rentang ruangan.';
    if (nrx < 0 || nrx > numP || nry < 0 || nry > numL) return 'Koordinat RX di luar rentang ruangan.';
    return '';
  };

  const validateAnchors = () => {
    if (!anchors.length) return 'Minimal 1 anchor.';
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      if (!a.name.trim()) return `Nama anchor #${i + 1} wajib diisi.`;
      const ax = parseFloat(a.x), ay = parseFloat(a.y);
      if (Number.isNaN(ax) || Number.isNaN(ay)) return `Koordinat anchor #${i + 1} harus angka.`;
      if (ax < 0 || ax > numP || ay < 0 || ay > numL) return `Koordinat anchor #${i + 1} di luar rentang ruangan.`;
    }
    return '';
  };

  const validate = () => {
    const base = validateBase();
    if (base) { setError(base); return false; }
    const spec = mode === 'antenna' ? validateAntenna() : validateAnchors();
    if (spec) { setError(spec); return false; }
    setError('');
    return true;
  };

  const isComplete =
    !!nama && !!panjang && !!lebar &&
    (mode === 'antenna'
      ? !!txX && !!txY && !!rxX && !!rxY
      : anchors.every(a => a.name && a.x && a.y));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload: any = {
      nama_ruangan: nama.trim(),
      panjang: parseFloat(panjang),
      lebar: parseFloat(lebar),
      mode
    };

    if (mode === 'antenna') {
      payload.posisi_x_tx = parseFloat(txX);
      payload.posisi_y_tx = parseFloat(txY);
      payload.posisi_x_rx = parseFloat(rxX);
      payload.posisi_y_rx = parseFloat(rxY);
    } else {
      payload.anchors = anchors.map(a => ({
        name: a.name.trim(),
        x: parseFloat(a.x),
        y: parseFloat(a.y)
      }));
    }

    try {
      if (initial) {
        await onUpdate({ id: initial.id, ...payload });
      } else {
        await onCreate(payload);
      }
      onCancel();
    } catch {
      setError('Gagal menyimpan ruangan.');
    } finally {
      setIsSubmitting(false);
    }
  };

const PREVIEW_W = 400, PREVIEW_H = 300;
const scale = numP > 0 && numL > 0 ? Math.min((PREVIEW_W - 40) / numP, (PREVIEW_H - 40) / numL) : 0;
const rectW = numP * scale, rectH = numL * scale;
const offX = (PREVIEW_W - rectW) / 2, offY = (PREVIEW_H - rectH) / 2;

// Konversi koordinat kartesian (0,0 di kiri-bawah) ke koordinat SVG
const toX = (x: number) => x * scale;
const toY = (y: number) => rectH - (y * scale);

  // anchors handlers
  const addAnchor = () => setAnchors(prev => [...prev, { name: '', x: '', y: '' }]);
  const removeAnchor = (idx: number) => setAnchors(prev => prev.filter((_, i) => i !== idx));
  const updateAnchor = (idx: number, key: keyof AnchorFormRow, val: string) =>
    setAnchors(prev => prev.map((row, i) => i === idx ? { ...row, [key]: val } : row));

  return (
    <div className="flex flex-col flex-1 bg-white rounded-lg shadow max-h-fit">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <MapPinIcon className="w-8 h-8" />
        <div>
          <h2 className="font-bold text-lg text-black">Pengaturan Ruangan</h2>
          <p className="text-sm text-gray-500">Tentukan pengaturan untuk ruangan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 overflow-auto">
        {/* left column */}
        <div className="flex-1 flex flex-col space-y-6">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Nama */}
          <div>
            <label className="block mb-2 text-lg font-semibold">Nama Ruangan</label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama ruangan"
              className="w-full rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
            />
          </div>

          {/* Dimensi */}
          <div>
            <label className="block mb-2 text-lg font-semibold">Dimensi Ruangan</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={panjang}
                onChange={e => setPanjang(e.target.value)}
                placeholder="Panjang (m)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
              <span className="font-bold text-lg">×</span>
              <input
                type="number"
                value={lebar}
                onChange={e => setLebar(e.target.value)}
                placeholder="Lebar (m)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Mode switcher */}
          <div className="w-full">
            <label className="block mb-2 text-lg font-semibold">Metode Perangkat</label>

            <div className="grid grid-cols-2 w-full rounded-lg border bg-gray-50 p-1 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setMode('antenna')}
                className={`w-full py-2 rounded-l-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black
                  ${mode === 'antenna' ? 'bg-white shadow' : 'bg-transparent'}`}
              >
                Antena TX–RX
              </button>
              <button
                type="button"
                onClick={() => setMode('anchor')}
                className={`w-full py-2 rounded-r-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black
                  ${mode === 'anchor' ? 'bg-white shadow' : 'bg-transparent'}`}
              >
                Anchor Nodes
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">Pilih konfigurasi perangkat untuk pemrosesan RSSI.</p>
          </div>

          {/* Conditional fields */}
          {mode === 'antenna' ? (
            <>
              <div>
                <label className="block mb-2 text-lg font-semibold">Koordinat Antena TX</label>
                <div className="flex items-center space-x-2">
                  <input type="number" value={txX} onChange={e => setTxX(e.target.value)} placeholder="x"
                         className="flex-1 rounded-lg border px-4 py-3 bg-gray-50" />
                  <span className="font-bold text-lg">×</span>
                  <input type="number" value={txY} onChange={e => setTxY(e.target.value)} placeholder="y"
                         className="flex-1 rounded-lg border px-4 py-3 bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-lg font-semibold">Koordinat Antena RX</label>
                <div className="flex items-center space-x-2">
                  <input type="number" value={rxX} onChange={e => setRxX(e.target.value)} placeholder="x"
                         className="flex-1 rounded-lg border px-4 py-3 bg-gray-50" />
                  <span className="font-bold text-lg">×</span>
                  <input type="number" value={rxY} onChange={e => setRxY(e.target.value)} placeholder="y"
                         className="flex-1 rounded-lg border px-4 py-3 bg-gray-50" />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block mb-2 text-lg font-semibold">Daftar Anchor</label>
              <div className="space-y-3">
                {anchors.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={a.name}
                      onChange={e => updateAnchor(idx, 'name', e.target.value)}
                      placeholder={`Nama anchor #${idx + 1}`}
                      className="w-40 rounded-lg border px-3 py-2 bg-gray-50"
                    />
                    <input
                      type="number"
                      value={a.x}
                      onChange={e => updateAnchor(idx, 'x', e.target.value)}
                      placeholder="x"
                      className="flex-1 rounded-lg border px-3 py-2 bg-gray-50"
                    />
                    <input
                      type="number"
                      value={a.y}
                      onChange={e => updateAnchor(idx, 'y', e.target.value)}
                      placeholder="y"
                      className="flex-1 rounded-lg border px-3 py-2 bg-gray-50"
                    />
                    <button type="button" onClick={() => removeAnchor(idx)} className="text-red-600 text-sm px-2 py-2 hover:underline">
                      Hapus
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addAnchor} className="text-sm px-3 py-2 border rounded-lg hover:bg-gray-50">
                  + Tambah Anchor
                </button>
              </div>
            </div>
          )}
        </div>

        {/* right column: preview + submit */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full flex flex-col items-center">
            <label className="block mb-2 text-lg font-semibold text-center">Tampilan Ruangan</label>
            <div className="border rounded-lg bg-gray-50 overflow-hidden mb-6" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
              <svg width={PREVIEW_W} height={PREVIEW_H}>
  {numP > 0 && numL > 0 && (
    <g transform={`translate(${offX}, ${offY})`}>
      {/* boundary ruangan */}
      <rect width={rectW} height={rectH} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />

      {/* sumbu kartesian */}
      <line x1={0} y1={rectH} x2={rectW} y2={rectH} stroke="#6b7280" strokeWidth={1} />
      <line x1={0} y1={rectH} x2={0} y2={0} stroke="#6b7280" strokeWidth={1} />
      <text x={4} y={rectH - 4} fontSize={10} fill="#111827">0,0</text>
      <text x={rectW - 12} y={rectH - 4} fontSize={10} fill="#111827">x</text>
      <text x={4} y={10} fontSize={10} fill="#111827">y</text>

      {/* titik-titik sesuai mode */}
      {mode === 'antenna' ? (
        <>
          {/* TX */}
          <circle
            cx={toX(parseFloat(txX) || 0)}
            cy={toY(parseFloat(txY) || 0)}
            r={6}
            fill="#2563eb"
          />
          {/* RX */}
          <circle
            cx={toX(parseFloat(rxX) || 0)}
            cy={toY(parseFloat(rxY) || 0)}
            r={6}
            fill="#f59e0b"
          />
        </>
      ) : (
        anchors.map((a, i) => {
          const ax = toX(parseFloat(a.x) || 0);
          const ay = toY(parseFloat(a.y) || 0);
          return (
            <g key={i}>
              <circle cx={ax} cy={ay} r={5} fill="#10b981" />
              {/* label teks tidak dibalik, jadi pakai ay apa adanya */}
              <text x={ax + 8} y={ay - 8} fontSize={10} fill="#111827">
                {a.name || `A${i + 1}`}
              </text>
            </g>
          );
        })
      )}
    </g>
  )}
</svg>

            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !isComplete}
              className="bg-black text-white py-3 px-8 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Loading...' : 'Submit'}
            </button>
          </div>
        </div>

        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600" />
          </div>
        )}
      </form>
    </div>
  );
};

export default RoomForm;
