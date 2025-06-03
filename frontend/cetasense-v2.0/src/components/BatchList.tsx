import React, { useState, useEffect } from 'react';
import { fetchAllBatches, fetchBatchData } from '../services/api';

const BatchList: React.FC = () => {
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchData, setBatchData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setIsLoading(true);
        const batchesData = await fetchAllBatches();
        setBatches(batchesData);
        if (batchesData.length > 0) {
          setSelectedBatch(batchesData[0]);
        }
      } catch (err) {
        setError('Failed to load batches');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      const loadBatchData = async () => {
        try {
          setIsLoading(true);
          const data = await fetchBatchData(selectedBatch);
          setBatchData(data.slice(0, 5)); // Show first 5 entries
        } catch (err) {
          setError('Failed to load batch data');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadBatchData();
    }
  }, [selectedBatch]);

  if (isLoading && batches.length === 0) {
    return <div className="text-center py-4">Loading batches...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (batches.length === 0) {
    return <div className="text-center py-4">No batches available</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">CSI Data Batches</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Batch
        </label>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {batches.map(batch => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading batch data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amplitude
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phase
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RSSI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batchData.map((data, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.timestamp[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.amplitude[0].toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.phase[0].toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.rssi[0].toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm text-gray-500">
            Showing {batchData.length} of {batchData.length} entries (first 5 shown)
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchList;