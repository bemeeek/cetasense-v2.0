import React, { useState, useEffect, Suspense, lazy } from 'react';
import { fetchMethods, type Methods } from '../services/api';
import { Stepper } from '../components/switchertab/Stepper';

// Lazy load komponen berat
const UploadMethod = lazy(() => import('../components/MethodForm'));
const MethodList = lazy(() => import('../components/MethodList'));
const Sidebar = lazy(() => import('../components/sidebar/sidebar'));
import aiIcon from '../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg';

// Preload critical image
const MethodSettingPage: React.FC = () => {
  const [methods, setMethods] = useState<Methods[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimasi API call dengan caching
  useEffect(() => {
    const loadMethods = async () => {
      try {
        // Check cache first
        const cached = sessionStorage.getItem('methods-cache');
        const cacheTime = sessionStorage.getItem('methods-cache-time');
        const now = Date.now();
        
        // Use cache if less than 5 minutes old
        if (cached && cacheTime && (now - parseInt(cacheTime)) < 300000) {
          setMethods(JSON.parse(cached));
          sessionStorage.setItem('step-3-completed', 'true');
          setLoading(false);
          return;
        }

        const response = await fetchMethods();
        let methodsData: Methods[] = [];
        
        if (Array.isArray(response)) {
          methodsData = response;
        } else if (Array.isArray((response as any).data)) {
          methodsData = (response as any).data;
        } else if (Array.isArray((response as any).methods)) {
          methodsData = (response as any).methods;
        }
        
        setMethods(methodsData);
        
        // Cache the result
        sessionStorage.setItem('methods-cache', JSON.stringify(methodsData));
        sessionStorage.setItem('methods-cache-time', now.toString());
        
      } catch (err) {
        console.error(err);
        setMethods([]);
      } finally {
        setLoading(false);
      }
    };

    loadMethods();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Lazy loaded sidebar */}
      {/* ← Sidebar full‐height */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col">
        {/* OPTIMIZED HEADER - Critical LCP Element */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <img src={aiIcon} alt="AI Icon" className="w-[52px] h-[52px]" />
          <div className="ml-4">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">Laman Pengaturan</h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
              Laman pengaturan memungkinkan anda untuk mengunggah algoritma pemosisian, data parameter CSI, dan mengatur ruangan untuk sistem pemosisian
            </p>
          </div>
        </header>

        {/* Stepper - Load immediately as it's lightweight */}
        <Stepper />

        {/* Lazy loaded main content */}
        <main className="flex-1 p-8 mt-0 overflow-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Suspense fallback={
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
              }>
                <UploadMethod
                  onUploaded={(newMethod) => {
                    setMethods(prev => [...prev, newMethod]);
                    // Clear cache when new method added
                    sessionStorage.removeItem('methods-cache');
                  }}
                  onError={(error) => {
                    console.error("Error uploading method:", error);
                  }}
                />
              </Suspense>

              <Suspense fallback={
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
              }>
                 <MethodList
                    methods={methods}
                    onMethodSelect={() => {}}
                    onMethodDelete={(id) => {
                      setMethods(prev => prev.filter(m => m.method_id !== id));
                      sessionStorage.removeItem('methods-cache');
                    }}
                    onMethodRename={(id, newName) => {
                      setMethods(prev =>
                        prev.map(m =>
                          m.method_id === id
                            ? { ...m, method_name: newName }
                            : m
                        )
                      );
                      sessionStorage.removeItem('methods-cache');
                    }}
                  />
              </Suspense>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MethodSettingPage;