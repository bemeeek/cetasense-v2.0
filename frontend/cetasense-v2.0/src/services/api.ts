import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

export interface Ruangan {
    id: string;
    nama_ruangan: string;
    panjang: number;
    lebar: number;
    posisi_tx: number;
    posisi_rx: number;
}

export interface RuanganCreate {
    nama_ruangan: string;
    panjang: number;
    lebar: number;
    posisi_tx: number;
    posisi_rx: number;
}
export interface Filter {
    id: string;
    nama_filter: string;
    description: string;
}

export interface Data {
    amplitude: number[];
    phase: number[];
    rssi: number[];
    timestamp: string[];
    batchID: number;  // Changed batchID to number for consistency
    ruanganID: string;
    filterID: string;
}

export interface CSIFileMeta {
    id: string;
    file_name: string;
    object_path: string;
    created_at: string;
    ruangan_id : string;
    filter_id : string;
    nama_ruangan: string;
    nama_filter: string;
}

export interface Methods {
    method_id: string;
    method_name: string;
    filetype: 'script' | 'model';
    object_path: string;
}


export const fetchCSIFileMeta = async (): Promise<CSIFileMeta[]> => {
    try {
        const resp = await api.get<CSIFileMeta[]>('/uploads');
        return resp.data;
    } catch (err: any) {
        // Kalau 404, return empty array
        if (err.response?.status === 404) {
        return [];
        }
        throw err;
    }
}

export const fetchRuangan = async (): Promise<Ruangan[]> => {
    try {
        const response = await api.get<Ruangan[]>('/ruangan');
        return response.data;
    } catch (error) {
        console.error("Error fetching Ruangan:", error);
        throw new Error("Failed to fetch Ruangan.");
    }
}

export const fetchRoom = () => api.get<Ruangan[]>('/ruangan');
export const createRoom = (room: RuanganCreate) =>
  api.post<RuanganCreate>('/ruangan', room)
export const updateRoom = (room: Ruangan) => api.put<Ruangan>(`/ruangan/${room.id}`, room);
export const deleteRoom = (id: string) => api.delete(`/ruangan/${id}`);

export const fetchFilter = async (): Promise<Filter[]> => {
    try {
        const response = await api.get<Filter[]>('/filter');
        return response.data;
    } catch (error) {
        console.error("Error fetching Filter:", error);
        throw new Error("Failed to fetch Filter.");
    }
}

export const uploadCSV = async (
    file: File,
    nama_ruangan: string,
    nama_filter: string
): Promise<any> => {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('nama_ruangan', nama_ruangan);
    formData.append('nama_filter', nama_filter);
    return await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export const uploadMethod = async (
    file: File,
    nama_metode : string,
    tipe_metode : 'script' | 'model'
): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nama_metode', nama_metode);
    formData.append('tipe_metode', tipe_metode);
    const resp = await api.post('/methods', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return resp.data;
}

export const fetchMethods = async (): Promise<Methods[]> => {
  const response = await api.get<Methods[]>('/methods');
  return response.data;
}

export const deleteMethod = async (method_id: string): Promise<void> => {
    try {
        await api.delete(`/methods/${method_id}`);
    } catch (error) {
        console.error("Error deleting Method:", error);
        throw new Error("Failed to delete Method.");
    }
}







