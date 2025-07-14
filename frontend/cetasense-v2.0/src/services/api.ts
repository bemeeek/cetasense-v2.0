import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { sendFrontendMetric } from "./metrics";  // ← pastikan path-nya benar

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// —————————————————————————————————————————————————
// INTERCEPTOR: CAPTURE TTFB & TTLB
// —————————————————————————————————————————————————
interface Metadata { startTime: number }
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // simpan waktu mulai
  (config as any).metadata = { startTime: performance.now() };
  return config;
});

api.interceptors.response.use((response) => {
  // 1) TTLB
  const start = (response.config as any).metadata?.startTime ?? performance.now();
  const ttlb = performance.now() - start;

  // 2) TTFB via Server Timing header
  let ttfb = NaN;
  const serverTiming = response.headers['server-timing'];
  if (serverTiming) {
    // Parsing Server-Timing header, misalnya "ttfb;dur=123.45"
    const match = /ttfb;dur=(\d+\.?\d*)/.exec(serverTiming);
    if (match) {
      ttfb = parseFloat(match[1]);
    }
  }

  // 3) reqID
  const reqID = response.headers['x-request-id'] ?? '';

  // 4) log di console
  console.log(
    `[FETCH] ${response.config.method?.toUpperCase()} ${response.config.url}` +
    ` reqID=${reqID}` +
    ` TTFB=${isNaN(ttfb) ? 'n/a' : ttfb.toFixed(2)}ms` +
    ` TTLB=${ttlb.toFixed(2)}ms`
  );

  const route = new URL(response.config.url!, window.location.origin).pathname;

  // 5) kirim metrik
  sendFrontendMetric({
    reqID:   reqID,
    type:    'fetch',
    route:   route,
    ttfb_ms: ttfb,
    ttlb_ms: ttlb,
  });

    // 6) clear old resource timing entries
  if ('clearResourceTimings' in performance) {
   performance.clearResourceTimings();
  }
  
  return response;

  },
  (error) => {
    // log juga bila error
    const cfg = (error.config as AxiosRequestConfig & { metadata?: Metadata }) || {};
    const start = cfg.metadata?.startTime ?? performance.now();
    const ttlb = performance.now() - start;
    console.log(
      `${new Date().toISOString()} FETCH ERROR ${cfg.method?.toUpperCase()} ${cfg.url} TTLB=${ttlb.toFixed(2)}ms`
    );
    return Promise.reject(error);
  }
);


// ————————————————————————————————————————————————————————————————
// Data types
// ————————————————————————————————————————————————————————————————

export interface Ruangan {
  id: string;
  nama_ruangan: string;
  panjang: number;
  lebar: number;
  posisi_x_tx: number;
  posisi_y_tx: number;
  posisi_x_rx: number;
  posisi_y_rx: number;
}

export interface RuanganCreate {
  nama_ruangan: string;
  panjang: number;
  lebar: number;
  posisi_x_tx: number;
  posisi_y_tx: number;
  posisi_x_rx: number;
  posisi_y_rx: number;
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
  batchID: number;
  ruanganID: string;
  filterID: string;
}

export interface CSIFileMeta {
  id: string;
  file_name: string;
  object_path: string;
  created_at: string;
  ruangan_id: string;
  filter_id: string;
  nama_ruangan: string;
  nama_filter: string;
}

// interface RawMethod {
//   id:          string;
//   nama_metode: string;
//   tipe_metode: number;
//   path_file:   string;
// }

export interface Methods {
  method_id: string;
  method_name: string;
  filetype: 'script' | 'model';
  object_path: string;
}

// Response tipe untuk enqueue lokalizasi
export interface LocalizationResponse {
  job_id: string;
  status: 'queued' | 'running' | 'done';
}

// Response tipe untuk update SSE
export interface StatusResponse {
  status: 'queued' | 'running' | 'done' | 'failed';
  hasil_x?: number;
  hasil_y?: number;
}

// ————————————————————————————————————————————————————————————————
// CRUD / utility lain (tetap sama seperti sebelum)
// ————————————————————————————————————————————————————————————————

export const fetchCSIFileMeta = async (): Promise<CSIFileMeta[]> => {
  const resp = await api.get<CSIFileMeta[]>('/uploads')
  return resp.data
}

export const deleteUpload = async (id: string): Promise<void> => {
  await api.delete(`/uploads/${id}`)
}

export const fetchRuangan = async (): Promise<Ruangan[]> => {
  const resp = await api.get<Ruangan[]>('/ruangan');
  console.log('🛠️ fetchRuangan resp.data =', resp.data);
  return resp.data ?? [];
}


export const renameUpload = async (id: string, new_name: string): Promise<CSIFileMeta> => {
  const resp = await api.put<CSIFileMeta>(`/uploads/${id}`, { new_name });  // Menggunakan new_name untuk parameter
  return resp.data;
};

export const createRoom = (room: RuanganCreate) =>
  api.post<RuanganCreate>('/ruangan', room);

export const updateRoom = (room: Ruangan) =>
  api.put<Ruangan>(`/ruangan/${room.id}`, room);

export const deleteRoom = (id: string) => api.delete(`/ruangan/${id}`);

export const fetchFilter = async (): Promise<Filter[]> => {
  const resp = await api.get<Filter[]>('/filter');
  return resp.data;
};

export const uploadCSV = async (
  file: File,
  nama_ruangan: string,
  nama_filter: string
): Promise<any> => {
  const form = new FormData();
  form.append('csv_file', file);
  form.append('nama_ruangan', nama_ruangan);
  form.append('nama_filter', nama_filter);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};


export const uploadMethod = async (
  file: File,
  nama_metode: string,
  tipe_metode: 'script' | 'model'
): Promise<any> => {
  const form = new FormData();
  form.append('file', file);
  form.append('nama_metode', nama_metode);
  form.append('tipe_metode', tipe_metode);
  const resp = await api.post('/methods', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
};

export const fetchMethods = async (): Promise<Methods[]> => {
  const resp = await api.get<Methods[]>('/methods');
  console.log('🛠️ fetchMethods resp.data =', resp.data);
  return resp.data;  // <-- sekarang resp.data sudah array Methods yang benar
};

export const deleteMethod = async (method_id: string): Promise<void> => {
  await api.delete(`/methods/${method_id}`);
};

export const renameMethod = async (
  method_id: string,
  new_name: string
): Promise<Methods> => {
  const resp = await api.put<Methods>(`/methods/${method_id}`, { new_name });
  return resp.data;
};

// ————————————————————————————————————————————————————————————————
// Bagian Lokalizasi (Diperbarui)
// ————————————————————————————————————————————————————————————————

/**
 * Buka koneksi SSE ke Go-gateway untuk job_id tertentu.
 * Harus dipanggil sebelum localize() sehingga subscriber sudah siap
 */



export function listenLocalizationResult(
  job_id: string,
  onMessage: (data: StatusResponse) => void
): EventSource {
  // pakai fallback '/api' seperti axios
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  const url  = `${base}/localize/stream/${job_id}`;
  const es   = new EventSource(url);
  es.onmessage = e => onMessage(JSON.parse(e.data));
  es.onerror   = () => es.close();
  return es;
}

export async function localize(
  data_id: string,
  id_metode: string,
  id_ruangan: string
): Promise<LocalizationResponse> {
  const resp = await api.post<LocalizationResponse>('/localize', {
    id_data:    data_id,
    id_metode:  id_metode,
    id_ruangan: id_ruangan,
  });
  return resp.data;
}
