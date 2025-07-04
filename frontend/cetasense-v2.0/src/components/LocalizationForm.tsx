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
  disabled,
}) => (
  <div className="flex flex-row h-10 gap-4">
    <Select
      value={selectedData}
      onChange={setSelectedData}
      options={dataList.map(d => ({ value: d.id, label: d.file_name }))}
      placeholder="Pilih Data"
      disabled={disabled}
    />
    <Select
      value={selectedRuangan}
      onChange={setSelectedRuangan}
      options={ruanganList.map(r => ({ value: r.id, label: r.nama_ruangan }))}
      placeholder="Pilih Ruangan"
      disabled={disabled}
    />
    <Select
      value={selectedMethod}
      onChange={setSelectedMethod}
      options={methodList.map(m => ({ value: m.method_id, label: m.method_name }))}
      placeholder="Pilih Metode"
      disabled={disabled}
    />
    <button
      onClick={onSubmit}
      className={`bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50`}
      disabled={disabled}
    >
      Tampilkan Lokalisasi
    </button>
  </div>
);

// Select Component
const Select: React.FC<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string; disabled: boolean; }> = ({ value, options, onChange, placeholder, disabled }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-[250px] h-full px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md disabled:opacity-50"
    disabled={disabled}
  >
    <option value="" disabled>{placeholder}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);