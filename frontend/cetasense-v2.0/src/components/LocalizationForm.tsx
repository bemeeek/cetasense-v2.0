import React from 'react';
import { type CSIFileMeta, type Ruangan, type Methods } from '../services/api';

interface Props {
  dataList: CSIFileMeta[];
  ruanganList: Ruangan[];
  methodList: Methods[];
  selectedData: string;
  selectedRuangan: string;
  selectedMethod: string;
  setSelectedData: (v: string) => void;
  setSelectedRuangan: (v: string) => void;
  setSelectedMethod: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export const LocalizationForm: React.FC<Props> = ({
  dataList,
  ruanganList,
  methodList,
  selectedData,
  selectedRuangan,
  selectedMethod,
  setSelectedData,
  setSelectedRuangan,
  setSelectedMethod,
  onSubmit,
  disabled
}) => (
  <div className="flex gap-4 mb-6">
    <select
      value={selectedData}
      onChange={e => setSelectedData(e.target.value)}
      className="border p-2 rounded w-1/4"
      disabled={disabled}
    >
      <option value="">Pilih Data</option>
      {dataList.map(d => <option key={d.id} value={d.id}>{d.file_name}</option>)}
    </select>
    <select
      value={selectedRuangan}
      onChange={e => setSelectedRuangan(e.target.value)}
      className="border p-2 rounded w-1/4"
      disabled={disabled}
    >
      <option value="">Pilih Ruangan</option>
      {ruanganList.map(r => <option key={r.id} value={r.id}>{r.nama_ruangan}</option>)}
    </select>
    <select
      value={selectedMethod}
      onChange={e => setSelectedMethod(e.target.value)}
      className="border p-2 rounded w-1/4"
      disabled={disabled}
    >
      <option value="">Pilih Metode</option>
      {methodList.map(m => <option key={m.method_id} value={m.method_id}>{m.method_name}</option>)}
    </select>
    <button
      onClick={onSubmit}
      className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      disabled={disabled}
    >
      Tampilkan Lokalisasi
    </button>
  </div>
);