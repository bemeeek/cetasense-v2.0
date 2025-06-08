// src/components/RoomForm.tsx
import React, { useState, useEffect } from 'react';
import type { Ruangan, RuanganCreate } from '../services/api';

interface RoomFormProps {
  initial?: Ruangan;
  onCreate: (room: RuanganCreate) => Promise<void>;
  onUpdate: (room: Ruangan) => Promise<void>;
  onCancel: () => void;
}

const RoomForm: React.FC<RoomFormProps> = ({ initial, onCreate, onUpdate, onCancel }) => {
  const [namaRuangan, setNamaRuangan] = useState<string>(initial?.nama_ruangan || '');
  const [panjang, setPanjang] = useState<number>(initial?.panjang || 0);
  const [lebar, setLebar] = useState<number>(initial?.lebar || 0);
  const [posisiTx, setPosisiTx] = useState<number>(initial?.posisi_tx || 0);
  const [posisiRx, setPosisiRx] = useState<number>(initial?.posisi_rx || 0);
  const [error, setError] = useState<string>('');

  // Reset form when editing a different room or clearing
  useEffect(() => {
    setNamaRuangan(initial?.nama_ruangan || '');
    setPanjang(initial?.panjang || 0);
    setLebar(initial?.lebar || 0);
    setPosisiTx(initial?.posisi_tx || 0);
    setPosisiRx(initial?.posisi_rx || 0);
    setError('');
  }, [initial]);

  const validate = () => {
    if (!namaRuangan || namaRuangan.length < 3) {
      setError('Nama ruangan minimal 3 karakter.');
      return false;
    }
    if (panjang <= 0) {
      setError('Panjang harus lebih besar dari 0.');
      return false;
    }
    if (panjang >= 99) {
      setError('Panjang maksimal 100 meter.');
      return false;
    }
    if (lebar <= 0) {
      setError('Lebar harus lebih besar dari 0.');
      return false;
    }
    if (lebar >= 99) {
      setError('Lebar maksimal 100 meter.');
      return false;
    }
    if (posisiTx < 0 || posisiTx > panjang) {
      setError('Posisi TX di luar rentang.');
      return false;
    }
    if (posisiRx < 0 || posisiRx > lebar) {
      setError('Posisi RX di luar rentang.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    try {
      if (initial) {
        // Update existing room
        const updated: Ruangan = {
          id: initial.id,
          nama_ruangan: namaRuangan,
          panjang,
          lebar,
          posisi_tx: posisiTx,
          posisi_rx: posisiRx,
        };
        await onUpdate(updated);
      } else {
        // Create new room
        const payload: RuanganCreate = {
          nama_ruangan: namaRuangan,
          panjang,
          lebar,
          posisi_tx: posisiTx,
          posisi_rx: posisiRx,
        };
        await onCreate(payload);
      }
    } catch (err) {
      setError('Gagal menyimpan ruangan.');
    }
  };

    return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow">
      <div>
        <label className="block text-sm font-medium">Nama Ruangan</label>
        <input
          type="text"
          className="mt-1 block w-full border rounded p-2"
          value={namaRuangan}
          onChange={e => setNamaRuangan(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Panjang (m)</label>
          <input
            type="number"
            className="mt-1 block w-full border rounded p-2"
            value={panjang}
            onChange={e => setPanjang(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Lebar (m)</label>
          <input
            type="number"
            className="mt-1 block w-full border rounded p-2"
            value={lebar}
            onChange={e => setLebar(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Posisi TX (x)</label>
          <input
            type="number"
            className="mt-1 block w-full border rounded p-2"
            value={posisiTx}
            onChange={e => setPosisiTx(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Posisi RX (y)</label>
          <input
            type="number"
            className="mt-1 block w-full border rounded p-2"
            value={posisiRx}
            onChange={e => setPosisiRx(Number(e.target.value))}
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex space-x-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {initial ? 'Update' : 'Create'}
        </button>
        {initial && (
          <button
            type="button"
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default RoomForm;