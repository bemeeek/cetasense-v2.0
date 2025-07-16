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
} from '../services/api';
import { ComparisonForm } from '../components/ComparisonForm';
import { ComparisonResult } from '../components/ComparisonResult';
import Sidebar from '../components/sidebar/sidebar';
import { WifiIcon } from '@heroicons/react/24/outline';
import { TabSwitcherData } from '../components/switchertab/TabSwitcherData';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { GroundTruthForm } from '../components/GroundTruthForm';

export const ComparisonPage: React.FC = () => {
  // 1) Metadata lists
  const [dataList, setDataList] = useState<CSIFileMeta[]>([]);
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [methodList, setMethodList] = useState<Methods[]>([]);
  const [jobStatus, setJobStatus] = useState<'idle'|'queued'|'running'|'done'|'failed'>('idle');
  const isLoading = jobStatus==='queued' || jobStatus==='running';
  const [gtX, setGtX] = useState<string>('');
  const [gtY, setGtY] = useState<string>('');

  // 2) Selected inputs
  const [params, setParams] = useState({
    run1: { data: '', ruangan: '', method: '' },
    run2: { data: '', ruangan: '', method: '' },
  });

  // 3) Results & loading
  const [results, setResults] = useState<{ run1: { x: number; y: number } | null; run2: { x: number; y: number } | null }>({ run1: null, run2: null });

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
    setJobStatus('queued');
    setResults({ run1: null, run2: null });

    // Trigger both localization jobs
    const respA = await localize(params.run1.data, params.run1.method, params.run1.ruangan);
    const respB = await localize(params.run2.data, params.run2.method, params.run2.ruangan);

    // Subscribe to both SSE streams
    (['run1', 'run2'] as const).forEach((run) => {
      const jobId = run === 'run1' ? respA.job_id : respB.job_id;
      const es = listenLocalizationResult(jobId, (msg) => {
        console.log(run, msg); // Add logging to check if both runs are received
        if (msg.status==='running') {
          setJobStatus('running');
        }
        if (msg.status === 'done') {
          setResults(prev => {
            const next = { ...prev, [run]: { x: msg.hasil_x!, y: msg.hasil_y! } };
            // baru set jadi DONE kalau kedua run1 & run2 sudah ada hasil
            if (next.run1 && next.run2) {
              setJobStatus('done');
            }
            return next;
          });
          es.close();
        }
        if (msg.status === 'failed') {
          setJobStatus('failed');
          es.close();
        }
      });
      sse.current[run] = es;
    });
  };

  // Helper function untuk mendapatkan nama method berdasarkan ID
  const getMethodName = (methodId: string): string => {
    const method = methodList.find(m => m.method_id === methodId);
    return method ? method.method_name : 'Unknown Method';
  };

  // Check if rooms match
  const room = ruanganList.find((r) => r.id === params.run1.ruangan);

  return (
    <div className="flex bg-gray-100 min-h-screen overflow-hidden">
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 items-center gap-4 flex-col">
        {/* Header */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <WifiIcon className="w-[52px] h-[52px]" />
          <div className="ml-6">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">
              Data Stream
            </h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
              Laman Data Stream ini digunakan untuk melihat analisis data parameter CSI yang akan digunakan, melihat hasil sistem pemosisian subjek dalam ruang, dan membandingkan hasil dari dua algoritma yang berbeda.
            </p>
          </div>
        </header>

        <TabSwitcherData />

        <div className="flex-1 flex-row items-center p-8 gap-4">
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
            disabled={isLoading}
            gtX={gtX}
            gtY={gtY}
            onChangeGtX={setGtX}
            onChangeGtY={setGtY}
          />
          <div className="flex flex-col mt-4 mb-5 gap-2">
            {isLoading && (
              <LoadingIndicator />
            )}

            {jobStatus !== 'idle' && <StatusMessage status={jobStatus} />}
          </div>

          {/* UPDATE: Kirimkan method information ke ComparisonResult */}
          {room && (results.run1 || results.run2) && (
            <ComparisonResult
              ruangan={room}
              results={{ run1: results.run1, run2: results.run2 }}
              methods={{
                run1: getMethodName(params.run1.method),
                run2: getMethodName(params.run2.method)
              }}
              // teruskan GT sebagai number (atau null jika kosong)
              groundTruth={{
                x: parseFloat(gtX) || null,
                y: parseFloat(gtY) || null,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Loading Indicator Component
const LoadingIndicator = () => (
  <div className="fixed top-6 right-6 z-50">
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 animate-fade-in">
      <div className="relative flex-shrink-0">
        <div className="animate-spin rounded-full h-6 w-6 border-[3px] border-blue-100"></div>
        <div className="animate-spin rounded-full h-6 w-6 border-t-[3px] border-blue-600 absolute top-0 left-0"></div>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-800">Memproses Pemosisian</div>
        <div className="text-xs text-gray-500">Harap tunggu...</div>
      </div>
    </div>
  </div>
);

// Enhanced Status Message Component
const StatusMessage: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return {
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        title: 'Proses Selesai'
      };
    } else if (statusLower.includes('fail') || statusLower.includes('error')) {
      return {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Proses Gagal'
      };
    } else {
      return {
        icon: ClockIcon,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Proses Berjalan'
      };
    }
  };

  const { icon: Icon, iconColor, bgColor, borderColor, textColor, title } = getStatusConfig();

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className={`flex items-center gap-3 p-4 ${bgColor} rounded-xl shadow-2xl border ${borderColor} animate-fade-in`}>
        <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0`} />
        <div>
          <div className={`text-sm font-semibold ${textColor}`}>{title}</div>
          <div className="text-xs text-gray-500">{status}</div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;