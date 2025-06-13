import react, { useEffect } from 'react';
import Heatmap3D, { type Heatmap3DProps } from '../components/HeatMap3D';
import { api, fetchCSIFileMeta, type CSIFileMeta } from '../services/api';
// import { api } from '../services/api';

const HeatMapPage: React.FC = () => {
    const [files, setFiles] = react.useState<CSIFileMeta[]>([]);
    const [selectedFile, setSelectedFile] = react.useState<CSIFileMeta | null>(null);
    const [heatmapData, setHeatmapData] = react.useState<Heatmap3DProps | null>(null);
    const [loading, setLoading] = react.useState<boolean>(false);

    useEffect(() => {
        fetchCSIFileMeta()
        .then(data => setFiles(data))
        .catch(err => console.error('Error fetching files:', err));
    }, []);

    // Fetch heatmap on demand
    useEffect(() => {
        const loadHeatmap = async () => {
            if (!selectedFile || !selectedFile.id) return;
            setLoading(true);
            try {
                const resp = await api.get<Heatmap3DProps>(`/heatmap/${selectedFile.id}`);
                setHeatmapData(resp.data);
            } catch (err) {
                console.error('Error fetching heatmap data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadHeatmap();
    }, [selectedFile]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">3D Heatmap Viewer</h1>

      <div className="mb-4">
        <label htmlFor="csvSelect" className="mr-2">Pilih file CSV:</label>
        <select
          id="csvSelect"
          value={selectedFile?.id || ''}
          onChange={e => {
            const selected = files.find(f => f.id === e.target.value);
            setSelectedFile(selected || null);
          }}
          className="border p-1"
        >
          <option value="">-- Pilih CSV --</option>
          {files.map(f => (
            <option key={f.id} value={f.id}>{f.file_name}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading heatmap data…</p>}

      {heatmapData && !loading && (
        <Heatmap3D
          theta={heatmapData.theta}
          tau={heatmapData.tau}
          z={heatmapData.z}
        />
      )}
    </div>
  );
};

export default HeatMapPage;