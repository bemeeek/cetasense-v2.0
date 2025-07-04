import React, { useState, useEffect, useRef } from 'react';
import {
  type CSIFileMeta,
  type Ruangan,
  type Methods,
  fetchCSIFileMeta,
  fetchRuangan,
  fetchMethods,
  localize,
  listenLocalizationResult,
  type StatusResponse
} from '../services/api';
import { ComparisonForm } from '../components/ComparisonForm';
import { ComparisonResult } from '../components/ComparisonResult';
import Sidebar from '../components/sidebar/sidebar';

export const ComparisonPage: React.FC = () => {
  // 1) Metadata lists
  const [dataList, setDataList] = useState<CSIFileMeta[]>([]);
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [methodList, setMethodList] = useState<Methods[]>([]);

  // 2) Selected inputs
  const [params, setParams] = useState({
    run1: { data: '', ruangan: '', method: '' },
    run2: { data: '', ruangan: '', method: '' },
  });

  // 3) Results & loading
  const [results, setResults] = useState<{ run1: { x: number; y: number } | null; run2: { x: number; y: number } | null }>({ run1: null, run2: null });
  const [loading, setLoading] = useState(false);

  // 4) SSE refs for cleanup
  const sse = useRef<{ run1: EventSource | null; run2: EventSource | null }>({
    run1: null,
    run2: null,
  });

  // 5) Fetch metadata on mount
  useEffect(() => {
    (async () => {
      const [files, rooms, methods] = await Promise.all([
        fetchCSIFileMeta(),
        fetchRuangan(),
        fetchMethods(),
      ]);
      setDataList(files);
      setRuanganList(rooms);
      setMethodList(methods);
    })();
  }, []);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      sse.current.run1?.close();
      sse.current.run2?.close();
    };
  }, []);

  // 6) Handle changes in form data
        const handleChange = (
        run: 'run1' | 'run2',
        field: 'data' | 'ruangan' | 'method',
        value: string
        ) => {
        setParams(prev => {
            const updatedParams = { ...prev, [run]: { ...prev[run], [field]: value } };

            // Ketika run1 diubah, salin nilai ke run2 untuk field data dan ruangan
            if (run === 'run1' && (field === 'data' || field === 'ruangan')) {
            updatedParams.run2[field] = value;  // Menyalin nilai dari run1 ke run2
            }

            return updatedParams;
        });
        };

  // 7) Start comparison process
const startComparison = async () => {
  setLoading(true);
  setResults({ run1: null, run2: null });

  // Trigger both localization jobs
  const respA = await localize(params.run1.data, params.run1.method, params.run1.ruangan);
  const respB = await localize(params.run2.data, params.run2.method, params.run2.ruangan);

  // Subscribe to both SSE streams
  (['run1', 'run2'] as const).forEach((run) => {
    const jobId = run === 'run1' ? respA.job_id : respB.job_id;
    const es = listenLocalizationResult(jobId, (msg: StatusResponse) => {
      console.log(run, msg); // Add logging to check if both runs are received
      if (msg.status === 'done') {
        setResults(prev => ({
          ...prev,
          [run]: { x: msg.hasil_x!, y: msg.hasil_y! }
        }));
        es.close();
      }
      if (msg.status === 'failed') {
        es.close();
      }
    });
    sse.current[run] = es;
  });
};


  // Check if rooms match
  const sameRoom = params.run1.ruangan && params.run1.ruangan === params.run2.ruangan;
  const room = ruanganList.find((r) => r.id === params.run1.ruangan);
  const sameData = params.run1.data && params.run1.data === params.run2.data;
  const data = dataList.find((d) => d.id === params.run1.data);

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-2xl font-bold">Perbandingan Lokalisasi</h1>

        <ComparisonForm
        dataList={dataList}
        ruanganList={ruanganList}
        methodList={methodList}
        selectedData={params.run1.data}
        selectedRuangan={params.run1.ruangan}
        selectedAlgA={params.run1.method}
        selectedAlgB={params.run2.method}
        onChangeData={v => handleChange('run1', 'data', v)}
        onChangeRuangan={v => handleChange('run1', 'ruangan', v)}
        onChangeAlgA={v => handleChange('run1', 'method', v)}
        onChangeAlgB={v => handleChange('run2', 'method', v)}
        onChangeDataRun2={v => handleChange('run2', 'data', v)}  // For run2
        onChangeRuanganRun2={v => handleChange('run2', 'ruangan', v)} // For run2
        onSubmit={startComparison}
        disabled={loading}
        />
        

        {!sameRoom && (
          <p className="text-red-500">Pastikan kedua algoritma memilih ruangan yang sama.</p>
        )}

        {!sameData && (
          <p className="text-red-500">Pastikan kedua algoritma memilih data yang sama.</p>
        )}

        <button
          onClick={startComparison}
          disabled={loading || !sameRoom}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Mulai Perbandingan
        </button>

        {room && (results.run1 || results.run2) && (
            <ComparisonResult
            ruangan={room}
            results={{ run1: results.run1, run2: results.run2 }}
            />
        )}
      </main>
    </div>
  );
};

export default ComparisonPage;
