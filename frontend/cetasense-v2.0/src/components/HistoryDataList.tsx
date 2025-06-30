import React, { useState, useEffect } from 'react';
import deleteIcon from '../assets/delete.svg';
import editIcon from '../assets/edit.svg';
import {
  fetchCSIFileMeta,
  deleteUpload,
  renameUpload,
  type CSIFileMeta
} from '../services/api';
import { FolderOpenIcon } from '@heroicons/react/16/solid';

interface HistoryDataListProps {
  uploads: CSIFileMeta[];
  setUploads: React.Dispatch<React.SetStateAction<CSIFileMeta[]>>; // Tambahkan prop untuk setUploads
}

const HistoryDataList: React.FC<HistoryDataListProps> = ({ uploads, setUploads }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingFileId, setEditingFileId] = useState<string | null>(null); // Track which file is being edited
  const [newName, setNewName] = useState<string>(''); // Store the new name for editing

  useEffect(() => {
    (async () => {
      const list = await fetchCSIFileMeta();
      setUploads(list || []); // Update state with fetched data
    })();
  }, [setUploads]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus file ini?')) return;
    try {
      await deleteUpload(id);
      setUploads(prev => prev.filter(x => x.id !== id));
      setSelectedIds(s => { s.delete(id); return new Set(s); });
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus.');
    }
  };

  const handleEdit = (id: string) => {
    const u = uploads.find(x => x.id === id);
    if (!u) return;
    setEditingFileId(id);
    setNewName(u.file_name); // Set the new name to current file's name
  };

  const handleSave = async () => {
    if (!newName || newName.trim() === '') return; // Do nothing if name is empty
    try {
      const updated = await renameUpload(editingFileId!, newName); // Forcefully unwrapping as we already checked if editingFileId is valid
      setUploads(prev =>
        prev.map(x => (x.id === editingFileId ? { ...x, file_name: updated.file_name } : x))
      );
      setEditingFileId(null); // Stop editing after successful update
    } catch (err) {
      console.error(err);
      alert('Gagal mengganti nama.');
    }
  };

  const handleCancel = () => {
    setEditingFileId(null); // Cancel editing
    setNewName(''); // Reset new name input
  };

  // helper select-all
  const allSelected = uploads.length > 0 && uploads.every(u => selectedIds.has(u.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(uploads.map(u => u.id)));
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <FolderOpenIcon className="logo-card" />
        <div>
          <h2 className="text-card1">Histori Data Tersimpan</h2>
          <p className="text-card2">
            Pilih dan unggah file yang diinginkan
          </p>
        </div>
      </div>

      {/* Tabel header */}
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

      {/* Daftar */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {uploads.map(u => {
          const isSelected = selectedIds.has(u.id);
          return (
            <div
              key={u.id}
              className="flex items-center h-14 border rounded-lg px-4"
            >
              <div className="w-16 flex justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(u.id)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="flex-1">
                {/* Show input if editing this file */}
                {editingFileId === u.id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="border px-2"
                  />
                ) : (
                  u.file_name
                )}
              </div>
              <div className="w-28 flex justify-center gap-2">
                {isSelected && (
                  <>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-2 border rounded hover:bg-red-50"
                      title="Hapus"
                    >
                      <img src={deleteIcon} alt="Delete" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => (editingFileId === u.id ? handleSave() : handleEdit(u.id))}
                      className="p-2 border rounded hover:bg-blue-50"
                      title={editingFileId === u.id ? "Simpan Nama" : "Edit Nama"}
                    >
                      <img src={editIcon} alt="Edit" className="w-5 h-5" />
                    </button>
                    {editingFileId === u.id && (
                      <button
                        onClick={handleCancel}
                        className="p-2 border rounded hover:bg-gray-50"
                        title="Batal"
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

export default HistoryDataList;
