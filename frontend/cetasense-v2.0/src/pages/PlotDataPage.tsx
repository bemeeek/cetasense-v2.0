import React, { useEffect, useState } from "react";
import PlotDataComponent, { type PlotData } from "../components/PlotData";
import { api, fetchCSIFileMeta, type CSIFileMeta } from "../services/api";
import Sidebar from "../components/sidebar/sidebar";
import { WifiIcon } from "@heroicons/react/24/outline";
import { TabSwitcherData } from "../components/switchertab/TabSwitcherData";

const PlotPage: React.FC = () => {
  const [files, setFiles] = useState<CSIFileMeta[]>([]);
  const [selected, setSelected] = useState<CSIFileMeta | null>(null);
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load list of CSV files
  useEffect(() => {
    fetchCSIFileMeta()
      .then(setFiles)
      .catch((err) => console.error("Error fetching files:", err));
  }, []);

  const onSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setPlotData(null);
    api
      .get(`/plots/${selected.id}`)
      .then((response) => {
        setPlotData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching plot data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const Select: React.FC<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string; disabled: boolean; }> = ({ value, options, onChange, placeholder, disabled }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-[250px] h-full px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md disabled:opacity-50"
      disabled={disabled}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );  

  return (
  <div className="flex bg-gray-100 min-h-screen overflow-hidden">
        {/* ← Sidebar */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 items-center gap-4 flex-col">
        {/* Header */}
        <header className="flex items-center bg-white h-[122px] px-8 shadow-sm">
          <WifiIcon className="w-[52px] h-[52px]" />
          <div className="ml-4">
            <h1 className="text-[23.5px] font-bold text-[#1c1c1c]">
              Data Stream
            </h1>
            <p className="text-[17.2px] text-[#7a7a7a]">
                            Laman pengaturan memungkinkan anda untuk mengunggah algoritma pemosisian, data parameter CSI, dan mengatur ruangan untuk sistem pemosisian
            </p>
          </div>
        </header>

        <TabSwitcherData />

      <div className="flex-col h-fit p-8 overflow-y-auto space-y-6 ">
      <div className="container mx-auto space-y-6">
        {/* File selector and plot button */}
        <div className="flex flex-col">
          {/* File selector */}
          <div className="flex flex-row h-10 gap-4 mb-4">
            <Select
              value={selected ? selected.id : ""}
              placeholder="Pilih file CSI"
              options={files.map((f) => ({ value: f.id, label: f.file_name }))}
              onChange={(value) =>
                setSelected(files.find((f) => f.id === value) || null)
              }
              disabled={files.length === 0 || loading}
            />
            <button
              onClick={onSubmit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              disabled={files.length === 0 || loading || !selected}
            >
              Tampilkan Plot Data
            </button>
          </div>
        </div>
      </div>
      {loading && <p>Loading data…</p>}
      <div className="flex-1 h-fit overflow-y-auto">
        {plotData && !loading && (
          <PlotDataComponent data={plotData} />
        )}
      </div>
    </div>
  </div>
  </div>
  );
};

export default PlotPage;
