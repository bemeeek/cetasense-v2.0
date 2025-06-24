// src/components/Checkbox.tsx
import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** lebar/tinggi atau override class */
  className?: string;
}

/**
 * Styled checkbox yang menggunakan Tailwind.
 * - Kotak border 1px #888888, size 18×18.
 * - Saat checked: border & background hitam, menampilkan icon centang.
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  className = '',
  ...rest
}) => {
  return (
    <label className={`inline-block ${className}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        {...rest}
      />
      <div
        className={`
          w-[18px] h-[18px]
          border border-[#888888]
          rounded
          flex items-center justify-center
          peer-checked:border-black
          peer-checked:bg-black
          transition
        `}
      >
        {/* centang */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="hidden peer-checked:block w-[10px] h-[8px]"
          viewBox="0 0 10 8"
          fill="none"
        >
          <path
            d="M1 4L4 7L9 1"
            stroke="#FFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </label>
  );
};

export default Checkbox;
