import React, { useEffect, useState } from 'react';
import { type CSIFileMeta, type Ruangan, type Methods, fetchCSIFileMeta, fetchRuangan, fetchMethods } from '../services/api';
import { localize, listenLocalizationResult} from '../services/api';
import { LocalizationForm } from '../components/LocalizationForm';
import { LocalizationResult } from '../components/LocalizationResult';

export const LocalizationPage: React.FC = () => {
  const [dataList, setDataList] = useState<CSIFileMeta[]>([]);
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [methodList, setMethodList] = useState<Methods[]>([]);
  const [selData, setSelData] = useState('');
  const [selRuangan, setSelRuangan] = useState('');
  const [selMethod, setSelMethod] = useState('');
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string>('');
  const [result, setResult] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCSIFileMeta().then(setDataList);
    fetchRuangan().then(setRuanganList);
    fetchMethods().then(setMethodList);
  }, []);

  const startLocalization = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setResult(null);
      const { job_id, status } = await localize(selData, selMethod, selRuangan);
      setJobId(job_id);
      setJobStatus(status);

      listenLocalizationResult(job_id, (data) => {
        setJobStatus(data.status);
        if (data.status === 'done') {
          setResult({ x: data.hasil_x!, y: data.hasil_y! });
          setIsLoading(false);
        }
      });
    } catch (e) {
      setError('Gagal memulai lokalisasi');
      setIsLoading(false);
    }
  };

  const selRoomObj = ruanganList.find(r => r.id === selRuangan);

  return (
    <div className="p-6">
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
              onSubmit={startLocalization} disabled={false} />

      {isLoading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <span className="text-sm">Loading hasil lokalisasi...</span>
        </div>
      )}

      {jobStatus && !isLoading && (
        <div className="mb-4 text-sm">
          Status Lokalisasi: <strong>{jobStatus}</strong>
        </div>
      )}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {selRoomObj && result && (
        <LocalizationResult ruangan={selRoomObj} result={result} />
      )}
    </div>
  );
};

export default LocalizationPage;
