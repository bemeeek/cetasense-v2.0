import React from "react";
import { type Ruangan } from "../services/api";

interface RoomListProps {
    rooms: Ruangan[];
    onRoomSelect: (room: Ruangan) => void;
    onRoomDelete: (id: string) => void;
    onRoomReload: () => void;
}

const RoomList: React.FC<RoomListProps> = ({ rooms, onRoomSelect, onRoomDelete, onRoomReload }) => {
    return <div className="w-1/3">
        <h2 className="text-xl font-semibold mb-4">Daftar Ruangan</h2>
        <ul className="space-y-2">
            {rooms.map(room => (
                <li key={room.id} className="p-2 bg-white rounded shadow hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRoomSelect(room)}>
                    {room.nama_ruangan}
                    <button className="ml-2 text-red-500" onClick={(e) => {
                        e.stopPropagation();
                        onRoomDelete(room.id);
                        onRoomReload();
                    } }>Hapus</button>
                </li>
            ))}
        </ul>
    </div>; 
}

export default RoomList;