import React, { useState, useRef, useEffect } from 'react';
import vector from './Vector 17.svg'; // pastikan path ini sesuai

interface DropdownProps {
  /** daftar opsi yang akan ditampilkan */
  options: string[];
  /** nilai yang saat ini terpilih */
  selected: string;
  /** dipanggil dengan nilai baru ketika user memilih opsi */
  onSelect: (value: string) => void;
  /** tambahan className untuk container luar (relative + ukuran) */
  className?: string;
  /** className untuk bar yang diklik (flex, padding, dsb) */
  divClassName?: string;
  /** path atau URL icon dropdown (panah) */
  vector?: string;
  /** className untuk icon dropdown */
  vectorClassName?: string;
  /** teks placeholder ketika belum ada yang dipilih */
  placeholder?: string;
}

export const DropdownFilter: React.FC<DropdownProps> = ({
  options,
  selected,
  onSelect,
  className = '',
  divClassName = '',
  vectorClassName = '',
  placeholder = 'Pilih Metode'
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // tutup dropdown kalau klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        className={`flex flex-1 justify-between items-center cursor-pointer ${divClassName}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? '' : 'text-gray-400'}>
          {selected || placeholder}
        </span>
        {vector && (
          <img
            src={vector || vector}
            alt="toggle dropdown"
            className={vectorClassName}
          />
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded">
          {options.map(opt => (
            <div
              key={opt}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
