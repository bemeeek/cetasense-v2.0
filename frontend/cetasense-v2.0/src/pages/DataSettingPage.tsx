import React from 'react';
import UploadForm from '../components/UploadForm';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto"> {/* Reduced max width here */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">CSI Data Management System</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Upload, manage, and analyze CSI parameter data for indoor positioning
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* Adjust grid columns */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">Data Upload</h2>
              <UploadForm />
            </div>
          </div>
        </div>

        <footer className="mt-16 pt-6 border-t border-gray-200 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8">
            <p className="text-gray-600 text-sm">CSI Data Management System v1.0</p>
            <p className="text-gray-500 text-sm">Backend: http://localhost:8080</p>
            <p className="text-gray-500 text-sm">© 2023 Indoor Positioning Lab</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
