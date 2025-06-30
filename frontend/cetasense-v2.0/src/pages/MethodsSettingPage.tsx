import React, { useState, useEffect } from 'react';
import { fetchMethods, type Methods } from '../services/api';
import UploadMethod from '../components/MethodForm';
import MethodList from '../components/MethodList';
import { TabSwitcher } from '../components/switchertab/TabSwitcher';
import Sidebar from '../components/sidebar/sidebar';
import aiIcon from '../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg';

const MethodSettingPage: React.FC = () => {
    const [methods, setMethods] = useState<Methods[]>([]);
    
    useEffect(() => {
        const load = async () => {
            try {
                const response = await fetchMethods();
                if (Array.isArray(response)) {
                    setMethods(response);
                } else if (Array.isArray((response as any).data)) {
                    setMethods((response as any).data);
                } else if (Array.isArray((response as any).methods)) {
                    setMethods((response as any).methods);
                } else {
                    setMethods([]);
                }
            } catch (err) {
                console.error(err);
                setMethods([]);
            }
        };
        load();
    }, []);

    return (
    <div className="flex min-h-screen  bg-gray-100">
      {/* ← Sidebar */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

  {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <img src={aiIcon} alt="AI Icon" className="w-[52px] h-[52px]" />
          <div className="ml-4">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">
              Laman Pengaturan
            </h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
              Laman pengaturan memungkinkan anda untuk mengunggah algoritma pemosisian, data parameter CSI, dan mengatur ruangan untuk sistem pemosisian
            </p>
          </div>
        </header>

    {/* Switcher Tabs */}
    <TabSwitcher />

    {/* Main content body */}
    <main className="flex-1 p-8 mt-0 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Card: Upload Method */}
          <UploadMethod
            onUploaded={(newMethod) => {
              console.log("Uploaded method →", newMethod);
              setMethods(prev => [...prev, newMethod]);
            }}
            onError={(error) => {
              console.error("Error uploading method:", error);
            }}
          />
        {/* Right Card: Method List */}
          <MethodList
            methods={methods}
            onMethodSelect={(method) => {
              console.log("Selected method:", method);
            }}
            onMethodDelete={async (method_id) => {
              setMethods((prev) => prev.filter((m) => m.method_id !== method_id));
            }}
          />
        </div>
    </main>
  </div>
</div>
  );
};


export default MethodSettingPage;
