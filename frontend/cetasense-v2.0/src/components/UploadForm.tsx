import React, { useState, useEffect } from 'react';
import { FaUpload } from 'react-icons/fa';
import { uploadCSV, fetchRuangan, fetchFilter, type Ruangan, type Filter } from '../services/api';

const UploadForm: React.FC = () => {
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [filterList, setFilterList] = useState<Filter[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [batchId, setBatchId] = useState<number>(0); // Batch ID as a number
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const ruanganData = await fetchRuangan();
        const filterData = await fetchFilter();
        
        setRuanganList(ruanganData);
        setFilterList(filterData);
        
        if (ruanganData.length > 0) setSelectedRuangan(ruanganData[0].nama_ruangan);
        if (filterData.length > 0) setSelectedFilter(filterData[0].nama_filter);
      } catch (error) {
        setMessage('Failed to load options. Please check your backend connection.');
        console.error(error);
      }
    };
    
    loadOptions();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi lebih ketat
    if (!file) {
        setMessage('Please select a CSV file');
        setIsSuccess(false);
        return;
    }

    if (!selectedRuangan || selectedRuangan.trim() === '') {
        setMessage('Please select a valid ruangan');
        setIsSuccess(false);
        return;
    }

    if (!selectedFilter || selectedFilter.trim() === '') {
        setMessage('Please select a valid filter');
        setIsSuccess(false);
        return;
    }

    if (batchId === 0) {
        setMessage('Please enter a valid batch ID');
        setIsSuccess(false);
        return;
    }

    try {
        setIsUploading(true);
        setMessage('Uploading file...');
        
        console.log("Uploading with:", {
            ruangan: selectedRuangan,  // Pastikan selectedRuangan ada
            filter: selectedFilter,
            batchId: batchId,
            file: file.name,
            size: file.size
        });

        const response = await uploadCSV(
            file, 
            selectedRuangan,  // Kirim nama_ruangan
            selectedFilter, 
            batchId
        );
        
        console.log("Upload response:", response);
        console.log("Response data:", response.data);
        console.log("Rows processed:", response.data.rows_processed);
        console.log("Selected ruangan:", selectedRuangan);
        
        setMessage(`File uploaded successfully! Rows processed: ${response.data.rows_processed}`);
        setIsSuccess(true);
        
        // Reset form
        setFile(null);
    } catch (error: any) {
        let errorMessage = 'Upload failed';
        
        if (error.response) {
            errorMessage += `: ${error.response.status} - ${error.response.data.message || error.response.data}`;
        } else if (error.request) {
            errorMessage += ': No response from server';
        } else {
            errorMessage += `: ${error.message}`;
        }
        
        setMessage(errorMessage);
        setIsSuccess(false);
    } finally {
        setIsUploading(false);
    }
};

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload CSI Data</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ruangan
            </label>
            <select
              value={selectedRuangan}
              onChange={(e) => setSelectedRuangan(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isUploading}
            >
              {ruanganList.map(ruangan => (
                <option key={ruangan.id} value={ruangan.nama_ruangan}>
                  {ruangan.nama_ruangan}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter
            </label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isUploading}
            >
              {filterList.map(filter => (
                <option key={filter.id} value={filter.nama_filter}>
                  {filter.nama_filter}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch ID (number)
          </label>
          <div className="flex">
            <input
              type="number" // Ensure input type is number
              value={batchId}
              onChange={(e) => setBatchId(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isUploading}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSI Data File (CSV)
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FaUpload className="w-10 h-10 mb-3 text-gray-400" />
                {file ? (
                  <>
                    <p className="mb-1 text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">Click to change file</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      CSV files only (amplitude,phase,rssi,timestamp)
                    </p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isUploading || !file}
          className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
            isUploading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Upload CSI Data'
          )}
        </button>
        
        {message && (
          <div className={`p-4 rounded-md ${
            isSuccess 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {isSuccess ? (
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadForm;
