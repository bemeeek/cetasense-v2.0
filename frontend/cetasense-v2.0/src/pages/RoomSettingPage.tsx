import React, { useState, useEffect} from 'react';
import { createRoom, deleteRoom, fetchRoom, updateRoom,  type Ruangan, type RuanganCreate } from '../services/api';
import RoomForm from '../components/RoomForm';
import RoomList from '../components/RoomList';


interface RoomFormProps {
  initial?: Ruangan;
  onCreate: (payload: RuanganCreate) => Promise<void>;
  onUpdate: (full: Ruangan) => Promise<void>;
  onCancel: () => void;
}


const RoomSettingPage: React.FC = () => {
    const [rooms, setRooms] = useState<Ruangan[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Ruangan | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const loadRooms = async () => {
        const response = await fetchRoom();
        setRooms(response.data);
    }

    useEffect(() => {
        loadRooms();
    }, []);

    return (
        <>
        <div className='flex space-x-6'>
            <div className='w-1/3'>
                <RoomList
                    rooms={rooms}
                    onRoomSelect={(room) => {
                        setSelectedRoom(room);
                        setIsEditing(false);
                    }}
                    onRoomDelete={async (id) => {
                        try {
                            await deleteRoom(id);
                            loadRooms();
                        } catch (err) {
                            setError("Gagal menghapus ruangan.");
                        }
                    }}
                    onRoomReload={loadRooms}
                />
            </div>
            <div className='w-2/3'>
                <RoomForm
                    initial={selectedRoom ?? undefined}
                    onCreate={async dto => {
                        await createRoom(dto);
                        setSelectedRoom(null);
                        loadRooms();
                    }}
                    onUpdate={async full => {
                        await updateRoom(full);
                        setSelectedRoom(null);
                        loadRooms();
                    }}
                    onCancel={() => {
                        setSelectedRoom(null);
                    }}
                    />
            </div>
        </div>
        {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
        </>
    );
}

export default RoomSettingPage;