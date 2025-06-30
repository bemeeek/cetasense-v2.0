// src/components/RoomForm.tsx
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
  onCancel
}) => {
  // — State as strings so placeholder shows —
  const [nama, setNama] = useState(initial?.nama_ruangan ?? '');
  const [panjang, setPanjang] = useState(initial?.panjang?.toString() ?? '');
  const [lebar, setLebar] = useState(initial?.lebar?.toString() ?? '');
  const [txX, setTxX] = useState(initial?.posisi_x_tx?.toString() ?? '');
  const [txY, setTxY] = useState(initial?.posisi_y_tx?.toString() ?? '');
  const [rxX, setRxX] = useState(initial?.posisi_x_rx?.toString() ?? '');
  const [rxY, setRxY] = useState(initial?.posisi_y_rx?.toString() ?? '');
  const [error, setError] = useState('');

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

    const payload = {
      nama_ruangan: nama,
      panjang: parseFloat(panjang),
      lebar:   parseFloat(lebar),
      posisi_x_tx: parseFloat(txX),
      posisi_y_tx: parseFloat(txY),
      posisi_x_rx: parseFloat(rxX),
      posisi_y_rx: parseFloat(rxY)
    } as RuanganCreate;

    try {
      if (initial) await onUpdate({ id: initial.id, ...payload });
      else         await onCreate(payload);
    } catch {
      setError('Gagal menyimpan ruangan.');
    }
  };

  // — SVG preview calculations —
  const PREVIEW_W = 400;
  const PREVIEW_H = 200;
  const numP = parseFloat(panjang) || 0;
  const numL = parseFloat(lebar)   || 0;
  const scale = numP > 0 && numL > 0
    ? Math.min((PREVIEW_W - 40) / numP, (PREVIEW_H - 40) / numL)
    : 0;
  const rectW = numP * scale;
  const rectH = numL * scale;
  const offX  = (PREVIEW_W - rectW) / 2;
  const offY  = (PREVIEW_H - rectH) / 2;

  return (
    <div className="flex flex-col flex-1 bg-white rounded-lg shadow max-h-fit">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <MapPinIcon className="w-10 h-10 text-gray-700" />
        <div>
          <h2 className="font-bold text-lg text-black">Pengaturan Ruangan</h2>
          <p className="text-sm text-gray-500">
            Atur nama, dimensi, dan posisi antena TX/RX ruangan anda.
            <br />
            {error.startsWith('Koordinat') && (
              <span className="text-red-500 font-semibold">
                Pastikan koordinat antena berada dalam rentang dimensi ruangan.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Nama */}
        <div>
          <label className="block mb-1 font-semibold">Nama Ruangan</label>
          <input
            type="text"
            value={nama}
            onChange={e => setNama(e.target.value)}
            placeholder="Masukkan nama ruangan"
            className="w-full rounded-lg border px-4 py-2 placeholder-gray-400"
          />
        </div>

        {/* Dimensi */}
        <div>
          <label className="block mb-1 font-semibold">Dimensi Ruangan (m)</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={panjang}
              onChange={e => setPanjang(e.target.value)}
              placeholder="Panjang"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
            <span className="font-bold text-lg">×</span>
            <input
              type="number"
              value={lebar}
              onChange={e => setLebar(e.target.value)}
              placeholder="Lebar"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Koordinat TX */}
        <div>
          <label className="block mb-1 font-semibold">Koordinat Posisi Antena TX</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={txX}
              onChange={e => setTxX(e.target.value)}
              placeholder="X"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
            <span className="font-bold text-lg">×</span>
            <input
              type="number"
              value={txY}
              onChange={e => setTxY(e.target.value)}
              placeholder="Y"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Koordinat RX */}
        <div>
          <label className="block mb-1 font-semibold">Koordinat Posisi Antena RX</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={rxX}
              onChange={e => setRxX(e.target.value)}
              placeholder="X"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
            <span className="font-bold text-lg">×</span>
            <input
              type="number"
              value={rxY}
              onChange={e => setRxY(e.target.value)}
              placeholder="Y"
              className="flex-1 rounded-lg border px-4 py-2 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Preview Ruangan */}
        <div>
          <label className="block mb-1 font-semibold">Tampilan Ruangan</label>
          <div
            className="border rounded-lg bg-gray-50 overflow-hidden"
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

        {/* Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            {initial ? 'Update' : 'Submit'}
          </button>
          {initial && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RoomForm;
