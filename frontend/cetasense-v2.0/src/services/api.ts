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
    posisiTX : number;
    posisiRX : number;
}

export interface Filter {
    id : string;
    nama_filter: string;
}

export interface Data {
    amplitude: number[];
    phase: number[];
    rssi: number[];
    timestamp: string[];
    batchID: string;
    ruanganID: string;
    filterID: string;
}

export const fetchRuangan = async (): Promise<Ruangan[]> => {
    const response = await api.get<Ruangan[]>('/ruangan');
    return response.data;
}

export const fetchFilter = async (): Promise<Filter[]> => {
    const response = await api.get<Filter[]>('/filter');
    return response.data;
}

export const uploadCSV = async (
    file: File,
    ruanganID: string,
    filterID: string,
    batchName: string
): Promise<any> => {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('ruangan_id', ruanganID);
    formData.append('filter_id', filterID);
    formData.append('batch_name', batchName);

    return await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export const fetchBatchData = async (
    batchName: string
): Promise<Data[]> => {
    const response = await api.get<Data[]>(`/data?batch=${batchName}`);
    return response.data;
}

export const fetchAllData = async (): Promise<Data[]> => {
    const response = await api.get<Data[]>('/data/batches');
    return response.data;
}

export const fetchAllBatches = async (): Promise<string[]> => {
    const response = await api.get<string[]>('/batches');
    return response.data;
}