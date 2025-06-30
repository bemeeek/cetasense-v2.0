// src/components/RoomList.tsx
import React, { useState } from 'react';
import deleteIcon from '../assets/delete.svg';
import editIcon   from '../assets/edit.svg'; // icon database/kartu
import type { Ruangan } from '../services/api';
import { FolderOpenIcon } from '@heroicons/react/16/solid';

interface RoomListProps {
  rooms: Ruangan[];
  onSelect: (room: Ruangan) => void;               // untuk edit
  onDelete: (id: string) => Promise<void>;          // untuk hapus
}

const RoomList: React.FC<RoomListProps> = ({ rooms, onSelect, onDelete }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toggle single checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select all helper
  const allSelected = rooms.length > 0 && rooms.every(r => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rooms.map(r => r.id)));
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <FolderOpenIcon className="logo-card" />
        <div>
          <h2 className="text-card1">Histori Ruang Tersimpan</h2>
          <p className="text-card2">Select and manage saved rooms</p>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center bg-gray-100 h-14 px-4 border-b">
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded"
          />
        </div>
        <div className="flex-1 font-semibold">Nama</div>
        <div className="w-28 text-center font-semibold">Opsi</div>
      </div>

      {/* List items */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {rooms.map(r => {
          const isSelected = selectedIds.has(r.id);
          return (
            <div
              key={r.id}
              className="flex items-center h-14 border rounded-lg px-4"
            >
              <div className="w-16 flex justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(r.id)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="flex-1 text-gray-800">{r.nama_ruangan}</div>
              <div className="w-28 flex justify-center gap-2">
                {isSelected && (
                  <>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-2 border rounded hover:bg-red-50"
                      title="Hapus"
                    >
                      <img src={deleteIcon} alt="Delete" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onSelect(r)}
                      className="p-2 border rounded hover:bg-blue-50"
                      title="Edit"
                    >
                      <img src={editIcon} alt="Edit" className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomList;
