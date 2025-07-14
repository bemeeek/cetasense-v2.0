// src/components/MethodList.tsx
import React, { useEffect, useState } from 'react';
import { type Methods, deleteMethod, renameMethod } from '../services/api';
import deleteIcon from '../assets/delete.svg';
import editIcon   from '../assets/edit.svg';
import { FolderOpenIcon } from '@heroicons/react/16/solid';

interface MethodListProps {
  methods?: Methods[] | null;
  onMethodSelect: (method: Methods) => void;
  onMethodDelete: (methodId: string) => void;
  onMethodRename: (methodId: string, newName: string) => void;  // pastikan ada
}

const MethodList: React.FC<MethodListProps> = ({
  methods,
  onMethodDelete,
  onMethodRename
}) => {
  const list = methods ?? [];
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [newName, setNewName]               = useState<string>('');
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    if (!list.length) console.warn("No methods available to display.");
  }, [list]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEdit = (id: string) => {
    const method = list.find(m => m.method_id === id);
    if (method) {
      setEditingMethodId(id);
      setNewName(method.method_name);
    }
  };

  const handleSave = async () => {
    if (!editingMethodId || !newName.trim()) return;
    setSaving(true);
    try {
      await renameMethod(editingMethodId, newName);
      onMethodRename(editingMethodId, newName);  // beri tahu parent
      setEditingMethodId(null);
      setNewName('');  // reset input
    } catch (err) {
      console.error(err);
      alert('Gagal mengganti nama.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingMethodId(null);
    setNewName('');
  };

  const allSelected = list.length > 0 && list.every(m => selectedIds.has(m.method_id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(list.map(m => m.method_id)));
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <FolderOpenIcon className="w-8 h-8" />
        <div>
          <h2 className="text-card1">Histori Algoritma Tersimpan</h2>
          <p className="text-card2">Pilih dan unggah metode yang diinginkan</p>
        </div>
      </div>

      {/* Tabel header */}
      <div className="flex items-center bg-gray-100 h-14 px-4 border-b mb-4">
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

      {/* Daftar */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {list.map(method => {
          const isSelected = selectedIds.has(method.method_id);
          return (
            <div
              key={method.method_id}
              className="flex items-center h-14 border rounded-lg px-4 hover:bg-gray-50"
            >
              <div className="w-16 flex justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(method.method_id)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </div>

              <div className="flex-1">
                {editingMethodId === method.method_id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="border px-2 w-full"
                    disabled={saving}
                  />
                ) : (
                  method.method_name
                )}
              </div>

              <div className="w-28 flex justify-center gap-2">
                {isSelected && (
                  <>
                    {/* Hapus */}
                    <button
                      onClick={async () => {
                        if (window.confirm(`Hapus metode ${method.method_name}?`)) {
                          try {
                            await deleteMethod(method.method_id);
                            onMethodDelete(method.method_id);
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="p-2 border rounded hover:bg-red-50"
                      title="Hapus"
                    >
                      <img src={deleteIcon} alt="Delete" className="w-5 h-5" />
                    </button>

                    {/* Edit / Simpan */}
                    <button
                      onClick={() =>
                        editingMethodId === method.method_id
                          ? handleSave()
                          : handleEdit(method.method_id)
                      }
                      className="p-2 border rounded hover:bg-blue-50 disabled:opacity-50"
                      disabled={saving && editingMethodId === method.method_id}
                      title={editingMethodId === method.method_id ? "Simpan" : "Edit"}
                    >
                      <img src={editIcon} alt="Edit" className="w-5 h-5" />
                    </button>

                    {/* Batal */}
                    {editingMethodId === method.method_id && (
                      <button
                        onClick={handleCancel}
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Batal"
                        disabled={saving}
                      >
                        Batal
                      </button>
                    )}
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

export default MethodList;
