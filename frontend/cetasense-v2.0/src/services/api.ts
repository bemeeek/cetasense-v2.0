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
    posisiTX: number;
    posisiRX: number;
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

export const fetchRuangan = async (): Promise<Ruangan[]> => {
    try {
        const response = await api.get<Ruangan[]>('/ruangan');
        return response.data;
    } catch (error) {
        console.error("Error fetching Ruangan:", error);
        throw new Error("Failed to fetch Ruangan.");
    }
}

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
    ruanganID: string,
    filterID: string,
    batchId: number // Ubah menjadi number
): Promise<any> => {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('nama_ruangan', ruanganID);
    formData.append('nama_filter', filterID);
    formData.append('batch_id', batchId.toString()); // Konversi ke string

    return await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export const fetchBatchData = async (
    batchId: number
): Promise<Data[]> => {
    try {
        const response = await api.get<Data[]>(`/data?batch=${batchId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching batch data:", error);
        throw new Error("Failed to fetch batch data.");
    }
}


