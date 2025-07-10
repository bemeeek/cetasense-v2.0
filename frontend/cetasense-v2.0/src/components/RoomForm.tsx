import React, { useEffect, useState, type FormEvent } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import type { Ruangan, RuanganCreate } from '../services/api';

interface RoomFormProps {
  initial?: Ruangan;
  onCreate: (room: RuanganCreate) => Promise<void>;
  onUpdate: (room: Ruangan) => Promise<void>;
  onCancel: () => void;
}

const RoomForm: React.FC<RoomFormProps> = ({
  initial,
  onCreate,
  onUpdate,
  onCancel,
}) => {
  // State management
  const [nama, setNama] = useState(initial?.nama_ruangan ?? '');
  const [panjang, setPanjang] = useState(initial?.panjang?.toString() ?? '');
  const [lebar, setLebar] = useState(initial?.lebar?.toString() ?? '');
  const [txX, setTxX] = useState(initial?.posisi_x_tx?.toString() ?? '');
  const [txY, setTxY] = useState(initial?.posisi_y_tx?.toString() ?? '');
  const [rxX, setRxX] = useState(initial?.posisi_x_rx?.toString() ?? '');
  const [rxY, setRxY] = useState(initial?.posisi_y_rx?.toString() ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNama(initial?.nama_ruangan ?? '');
    setPanjang(initial?.panjang?.toString() ?? '');
    setLebar(initial?.lebar?.toString() ?? '');
    setTxX(initial?.posisi_x_tx?.toString() ?? '');
    setTxY(initial?.posisi_y_tx?.toString() ?? '');
    setRxX(initial?.posisi_x_rx?.toString() ?? '');
    setRxY(initial?.posisi_y_rx?.toString() ?? '');
    setError('');
  }, [initial]);

  const validate = () => {
    const np = parseFloat(panjang),
          nl = parseFloat(lebar),
          ntx = parseFloat(txX),
          nty = parseFloat(txY),
          nrx = parseFloat(rxX),
          nry = parseFloat(rxY);

    if (!nama || nama.length < 3) {
      setError('Nama ruangan minimal 3 karakter.');
      return false;
    }

    if (isNaN(np) || np <= 0) {
      setError('Panjang harus > 0.');
      return false;
    }

    if (isNaN(nl) || nl <= 0) {
      setError('Lebar harus > 0.');
      return false;
    }

    if (isNaN(ntx) || ntx < 0 || ntx > np || isNaN(nty) || nty < 0 || nty > nl) {
      setError('Koordinat TX di luar rentang.');
      return false;
    }

    if (isNaN(nrx) || nrx < 0 || nrx > np || isNaN(nry) || nry < 0 || nry > nl) {
      setError('Koordinat RX di luar rentang.');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = {
      nama_ruangan: nama,
      panjang: parseFloat(panjang),
      lebar: parseFloat(lebar),
      posisi_x_tx: parseFloat(txX),
      posisi_y_tx: parseFloat(txY),
      posisi_x_rx: parseFloat(rxX),
      posisi_y_rx: parseFloat(rxY)
    } as RuanganCreate;

    try {
      if (initial) await onUpdate({ id: initial.id, ...payload });
      else await onCreate(payload);
      onCancel(); // Reset form after submit
    } catch {
      setError('Gagal menyimpan ruangan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SVG preview calculations - sesuai dengan mockup
  const PREVIEW_W = 400;
  const PREVIEW_H = 300;
  const numP = parseFloat(panjang) || 0;
  const numL = parseFloat(lebar) || 0;
  const scale = numP > 0 && numL > 0
    ? Math.min((PREVIEW_W - 40) / numP, (PREVIEW_H - 40) / numL)
    : 0;

  const rectW = numP * scale;
  const rectH = numL * scale;
  const offX = (PREVIEW_W - rectW) / 2;
  const offY = (PREVIEW_H - rectH) / 2;

  return (
    <div className="flex flex-col flex-1 bg-white rounded-lg shadow max-h-fit">
      {/* Header - sesuai mockup */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <MapPinIcon className="w-8 h-8" />
        <div>
          <h2 className="font-bold text-lg text-black">Pengaturan Ruangan</h2>
          <p className="text-sm text-gray-500">
            Tentukan pengaturan untuk ruangan yang akan digunakan
          </p>
        </div>
      </div>

      {/* Body - Layout sesuai mockup */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 overflow-auto">
        
        {/* Left Column - Form Fields */}
        <div className="flex-1 flex flex-col space-y-6">
          
          {/* Error Message */}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Nama Ruangan */}
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

          {/* Dimensi Ruangan */}
          <div>
            <label className="block mb-2 text-lg font-semibold">Dimensi Ruangan</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={panjang}
                onChange={e => setPanjang(e.target.value)}
                placeholder="Panjang ruangan (m)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
              <span className="font-bold text-lg">×</span>
              <input
                type="number"
                value={lebar}
                onChange={e => setLebar(e.target.value)}
                placeholder="Lebar ruangan (m)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Koordinat Posisi Antena TX */}
          <div>
            <label className="block mb-2 text-lg font-semibold">Koordinat Posisi Antena TX</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={txX}
                onChange={e => setTxX(e.target.value)}
                placeholder="Posisi antena (x)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
              <span className="font-bold text-lg">×</span>
              <input
                type="number"
                value={txY}
                onChange={e => setTxY(e.target.value)}
                placeholder="Posisi antena (y)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Koordinat Posisi Antena RX */}
          <div>
            <label className="block mb-2 text-lg font-semibold">Koordinat Posisi Antena RX</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={rxX}
                onChange={e => setRxX(e.target.value)}
                placeholder="Posisi antena (x)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
              <span className="font-bold text-lg">×</span>
              <input
                type="number"
                value={rxY}
                onChange={e => setRxY(e.target.value)}
                placeholder="Posisi antena (y)"
                className="flex-1 rounded-lg border px-4 py-3 placeholder-gray-400 bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Preview dan Submit */}
        <div className="flex-1 flex flex-col items-center justify-center">
          
          {/* Tampilan Ruangan */}
          <div className="w-full flex flex-col items-center">
            <label className="block mb-2 text-lg font-semibold text-center">Tampilan Ruangan</label>
            <div
              className="border rounded-lg bg-gray-50 overflow-hidden mb-6"
              style={{ width: PREVIEW_W, height: PREVIEW_H }}
            >
              <svg width={PREVIEW_W} height={PREVIEW_H}>
                {numP > 0 && numL > 0 && (
                  <g transform={`translate(${offX}, ${offY})`}>
                    <rect
                      width={rectW}
                      height={rectH}
                      fill="#e5e7eb"
                      stroke="#9ca3af"
                      strokeWidth={1}
                    />
                    {/* TX */}
                    <circle
                      cx={(parseFloat(txX) || 0) * scale}
                      cy={(parseFloat(txY) || 0) * scale}
                      r={6}
                      fill="#2563eb"
                    />
                    {/* RX */}
                    <circle
                      cx={(parseFloat(rxX) || 0) * scale}
                      cy={(parseFloat(rxY) || 0) * scale}
                      r={6}
                      fill="#f59e0b"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Submit Button - posisi di bawah */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !nama || !panjang || !lebar || !txX || !txY || !rxX || !rxY}
              className="bg-black text-white py-3 px-8 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Loading...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Loading overlay */}
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