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

export 