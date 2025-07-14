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
  type StatusResponse,
} from '../services/api';
import { LocalizationForm } from '../components/LocalizationForm';
import LocalizationResult from '../components/LocalizationResult';
import Sidebar from '../components/sidebar/sidebar';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, WifiIcon } from '@heroicons/react/24/outline';
import TabSwitcherData from '../components/switchertab/TabSwitcherData';

export const LocalizationPage: React.FC = () => {
  const [dataList, setDataList] = useState<CSIFileMeta[]>([]);
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [methodList, setMethodList] = useState<Methods[]>([]);
  const [selData, setSelData] = useState('');
  const [selRuangan, setSelRuangan] = useState('');
  const [selMethod, setSelMethod] = useState('');
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // init fetch
  useEffect(() => {
    async function init() {
      try {
        const [files, rooms, methods] = await Promise.all([
          fetchCSIFileMeta(),
          fetchRuangan(),
          fetchMethods(),
        ]);
        setDataList(files);
        setRuanganList(rooms);
        setMethodList(methods);
      } catch {
        console.error('Gagal load init data');
      }
    }
    init();
  }, []);
  useEffect(() => () => sseRef.current?.close(), []);

  const reset = () => {
    setError(null);
    setResult(null);
    setJobStatus(null);
    setIsLoading(true);
  };
  const startLocalization = async () => {
    reset();
    try {
      const { job_id, status } = await localize(selData, selMethod, selRuangan);
      setJobStatus(status);
      const es = listenLocalizationResult(job_id, (data: StatusResponse) => {
        setJobStatus(data.status);
        if (data.status === 'done') {
          setResult({ x: data.hasil_x!, y: data.hasil_y! });
          setIsLoading(false);
          es.close();
        }
        if (data.status === 'failed') {
          setError('Pemosisian gagal');
          setIsLoading(false);
          es.close();
        }
      });
      sseRef.current = es;
    } catch {
      setError('Gagal memulai');
      setIsLoading(false);
    }
  };

  const getMethodName = (methodId: string): string => {
    const method = methodList.find(m => m.method_id === methodId);
    return method ? method.method_name : 'Unknown Method';
  };

  const selRuanganObj = ruanganList.find(r => r.id === selRuangan);

  return (
    <div className="flex bg-gray-100 min-h-screen overflow-hidden">
      <aside className="flex-shrink-0"><Sidebar /></aside>
      <div className="flex-1 flex-col">
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <WifiIcon className="w-[52px] h-[52px]" />
          <div className="ml-6">
            <h1 className="text-[23.5px] font-bold">Data Stream</h1>
            <p className="text-[17.2px] text-[#7a7a7a]">Laman Data Stream ini digunakan untuk melihat analisis data parameter CSI yang akan digunakan, melihat hasil sistem pemosisian subjek dalam ruang, dan membandingkan hasil dari dua algoritma yang berbeda.
</p>
          </div>
        </header>
        <TabSwitcherData />
        <div className="p-8 flex">
          <LocalizationForm
            dataList={dataList}
            ruanganList={ruanganList}
            methodList={methodList}
            selectedData={selData}
            setSelectedData={setSelData}
            selectedRuangan={selRuangan}
            setSelectedRuangan={setSelRuangan}
            selectedMethod={selMethod}
            setSelectedMethod={setSelMethod}
            onSubmit={startLocalization}
            disabled={isLoading}
          />
        </div>
        {isLoading && <LoadingIndicator />}
        {jobStatus && <StatusMessage status={jobStatus} />}
        {error && <ErrorMessage message={error} />}
        <div className="p-8">
          {selRuanganObj && result && (
            <LocalizationResult ruangan={selRuanganObj} result={result} methods={getMethodName(selMethod)} />
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

// Enhanced Error Message Component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed top-6 right-6 z-50">
    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl shadow-2xl border border-red-200 animate-fade-in max-w-md">
      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-semibold text-red-700 mb-1">Terjadi Kesalahan</div>
        <div className="text-sm text-red-600">{message}</div>
      </div>
    </div>
  </div>
);


export default LocalizationPage;