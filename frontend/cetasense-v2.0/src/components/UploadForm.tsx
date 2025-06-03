import React, { useState, useEffect } from 'react';
import { FaUpload } from 'react-icons/fa';
import { uploadCSV, fetchRuangan, fetchFilter, type Ruangan, type Filter } from '../services/api';


const UploadForm: React.FC = () => {
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);
  const [filterList, setFilterList] = useState<Filter[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('Batch-' + new Date().toISOString().slice(0, 10));
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
        
        if (ruanganData.length > 0) setSelectedRuangan(ruanganData[0].id);
        if (filterData.length > 0) setSelectedFilter(filterData[0].id);
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
    
    if (!file || !selectedRuangan || !selectedFilter || !batchName) {
      setMessage('Please fill all fields and select a file');
      setIsSuccess(false);
      return;
    }
    
    try {
      setIsUploading(true);
      setMessage('Uploading file...');
      
      const response = await uploadCSV(
        file, 
        selectedRuangan, 
        selectedFilter, 
        batchName
      );
      
      setMessage(`File uploaded successfully! Rows processed: ${response.data.rows_added}`);
      setIsSuccess(true);
      
      // Reset form
      setFile(null);
      setBatchName('Batch-' + new Date().toISOString().slice(0, 10));
    } catch (error) {
      setMessage('Upload failed: ' + (error as any).message);
      setIsSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-whiterounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Upload CSI Data</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ruangan
          </label>
          <select
            value={selectedRuangan}
            onChange={(e) => setSelectedRuangan(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isUploading}
          >
            {ruanganList.map(ruangan => (
              <option key={ruangan.id} value={ruangan.id}>
                {ruangan.nama_ruangan}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter
          </label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isUploading}
          >
            {filterList.map(filter => (
              <option key={filter.id} value={filter.id}>
                {filter.nama_filter}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Batch Name
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isUploading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSV File
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FaUpload className="w-8 h-8 mb-2 text-gray-500" />
                {file ? (
                  <p className="text-sm text-gray-500">{file.name}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
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
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isUploading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </button>
        
        {message && (
          <div className={`p-3 rounded-md ${
            isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadForm;