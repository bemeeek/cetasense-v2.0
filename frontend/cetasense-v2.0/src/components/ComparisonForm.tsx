import React from 'react';
import { type CSIFileMeta, type Ruangan,type Methods } from '../services/api';


interface Props {
  dataList: CSIFileMeta[];
  ruanganList: Ruangan[];
  methodList: Methods[];
  selectedData: string;
  selectedRuangan: string;
  selectedAlgA: string;
  selectedAlgB: string;
  onChangeData: (v: string) => void;
  onChangeRuangan: (v: string) => void;
  onChangeAlgA: (v: string) => void;
  onChangeAlgB: (v: string) => void;
  onChangeDataRun2: (v: string) => void;
  onChangeRuanganRun2: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}


export const ComparisonForm: React.FC<Props> = ({
  dataList,
  ruanganList,
  methodList,
  selectedData,
  selectedRuangan,
  selectedAlgA,
  selectedAlgB,
  onChangeData,
  onChangeRuangan,
  onChangeAlgA,
  onChangeAlgB,
    onSubmit: onsubmit,
  disabled,
}) => (
  <div className="space-y-4">
    {/* Baris 1: Data, Ruangan, Tombol */}
    <div className="flex flex-row h-10 gap-4">
      <Select
        value={selectedData}
        onChange={onChangeData}
        options={dataList.map(d => ({ value: d.id, label: d.file_name }))}
        placeholder="Pilih Data"
        disabled={disabled}
      />
      <Select
        value={selectedRuangan}
        onChange={onChangeRuangan}
        options={ruanganList.map(r => ({ value: r.id, label: r.nama_ruangan }))}
        placeholder="Pilih Ruangan"
        disabled={disabled}
      />
            <button 
        onClick={onsubmit}
        className={`col-span-2 w-[200px]
           bg-blue-600
            text-white 
            px-4 py-2 rounded-lg 
            transition duration-200 
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50`}
        disabled={disabled || !selectedData || !selectedRuangan || !selectedAlgA || !selectedAlgB}
      >
        Bandingkan
      </button>
    </div>

    {/* Baris 2: Dua Algorithm Dropdown */}
    <div className="flex flex-row h-10 gap-4">
      <Select
        value={selectedAlgA}
        onChange={onChangeAlgA}
        options={methodList.map(m => ({ value: m.method_id, label: m.method_name }))}
        placeholder="Pilih Algoritma A"
        disabled={disabled}
      />
      <Select
        value={selectedAlgB}
        onChange={onChangeAlgB}
        options={methodList.map(m => ({ value: m.method_id, label: m.method_name }))}
        placeholder="Pilih Algoritma B"
        disabled={disabled}
      />
    </div>
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