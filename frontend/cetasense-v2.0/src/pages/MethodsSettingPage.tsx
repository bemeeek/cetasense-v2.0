import React, { useState, useEffect } from 'react';
import { fetchMethods, type Methods} from '../services/api';
import UploadMethod from '../components/MethodForm';
import MethodList from '../components/MethodList';


const MethodSettingPage: React.FC = () => {
    const [methods, setMethods] = useState<Methods[]>([]);
    
        useEffect(() => {
  const load = async () => {
    try {
        const data = await fetchMethods();
        console.log("fetched methods:", data);   // harus terlihat array
        setMethods(data);
    } catch {
      setMethods([]);
    }
  }
  load();
}, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Pengaturan Metode</h1>
            <div className="flex space-x-4">
                <UploadMethod
                    onUploaded={(newMethod) => {
                        console.log("Uploaded method →", newMethod);
                        setMethods(prev => [...prev, newMethod]);
                    }}
                    onError={(error) => {
                        console.error("Error uploading method:", error);
                    }}
                />
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
        </div>
    );
}

export default MethodSettingPage;