// src/pages/RoomSettingPage.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar/sidebar';
import RoomForm from '../components/RoomForm';
import HistoryRoomList from '../components/RoomList';
import aiIcon from '../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg';
import {
  fetchRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  type Ruangan,
  type RuanganCreate
} from '../services/api';
import { TabSwitcher } from '../components/switchertab/TabSwitcher';

const RoomSettingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metode' | 'ruangan' | 'data'>('ruangan');
  const [rooms, setRooms] = useState<Ruangan[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Ruangan | undefined>(undefined);
  const [error, setError] = useState<string>('');

  const loadRooms = async () => {
    try {
      const resp = await fetchRoom();
      setRooms(resp.data ?? []);
    } catch {
      setError('Gagal memuat data ruangan.');
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // handler save (create/update)
  const handleSave = async (payload: RuanganCreate | Ruangan) => {
    try {
      if ('id' in payload) {
        await updateRoom(payload as Ruangan);
      } else {
        await createRoom(payload as RuanganCreate);
      }
      setSelectedRoom(undefined);
      await loadRooms();
    } catch {
      setError('Gagal menyimpan ruangan.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRoom(id);
      if (selectedRoom?.id === id) setSelectedRoom(undefined);
      await loadRooms();
    } catch {
      setError('Gagal menghapus ruangan.');
    }
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* ← Sidebar */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* ← Konten Utama */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <img src={aiIcon} alt="AI Icon" className="w-[52px] h-[52px]" />
          <div className="ml-4">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">
              Laman Pengaturan
            </h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
              Laman pengaturan memungkinkan anda untuk mengunggah algoritma pemosisian, data parameter CSI, dan mengatur ruangan untuk sistem pemosisian
            </p>
          </div>
        </header>

        {/* Tabs */}
        <TabSwitcher />

        {/* Body */}
        <main className="flex-1 p-8 mt-0 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <RoomForm
                initial={selectedRoom}
                onCreate={dto => handleSave(dto)}
                onUpdate={room => handleSave(room)}
                onCancel={() => setSelectedRoom(undefined)}
              />
              <HistoryRoomList
                rooms={rooms}
                onSelect={room => setSelectedRoom(room)}
                onDelete={handleDelete}
              />
            </div>

          {error && <p className="text-red-600 mt-4">{error}</p>}
        </main>
      </div>
    </div>
  );
};

export default RoomSettingPage;
