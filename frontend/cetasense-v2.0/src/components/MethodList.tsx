import React, { useEffect } from 'react';
import { type Methods, deleteMethod } from '../services/api';

interface MethodListProps {
  methods?: Methods[] | null;               // bisa undefined atau null
  onMethodSelect: (method: Methods) => void;
  onMethodDelete: (methodId: string) => void;
}

const MethodList: React.FC<MethodListProps> = ({
  methods,
  onMethodSelect,
  onMethodDelete
}) => {
  // normalize ke array kosong kalau null/undefined
  const list = methods ?? [];

  useEffect(() => {
    if (list.length === 0) {
      console.warn("No methods available to display.");
    }
  }, [list]);

  return (
    <div className="w-1/3">
      <h2 className="text-xl font-semibold mb-4">Daftar Metode</h2>

      {list.length === 0 ? (
        <p className="text-gray-500">Tidak ada metode yang tersedia.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((method) => (
            <li
              key={method.method_id}
              className="flex justify-between items-center p-2 bg-white rounded shadow hover:bg-gray-50"
            >
              <span>
                {method.method_name}{' '}
                <em className="text-sm text-gray-500">({method.filetype})</em>
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => onMethodSelect(method)}
                  className="text-blue-600 hover:underline"
                >
                  Pilih
                </button>
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Apakah Anda yakin ingin menghapus metode ${method.method_name}?`
                      )
                    ) {
                      try {
                        await deleteMethod(method.method_id);
                        onMethodDelete(method.method_id);
                      } catch (err) {
                        console.error('Gagal menghapus metode:', err);
                      }
                    }
                  }}
                  className="text-red-600 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MethodList;
