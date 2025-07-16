
import React from 'react';

interface GroundTruthInputProps {
  gtX: string;
  gtY: string;
  onChangeX: (value: string) => void;
  onChangeY: (value: string) => void;
}

export const GroundTruthForm: React.FC<GroundTruthInputProps> = ({
  gtX,
  gtY,
  onChangeX,
  onChangeY,
}) => {
  return (
    <div className="bg-white p-4 mt-5 w-fit rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <h3 className="text-sm font-medium text-gray-800">Posisi Asli Subjek</h3>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="number"
            step="0.01"
            value={gtX}
            onChange={(e) => onChangeX(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="X (m)"
          />
        </div>
        
        <div className="flex-1">
          <input
            type="number"
            step="0.01"
            value={gtY}
            onChange={(e) => onChangeY(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Y (m)"
          />
        </div>
      </div>

      {/* Status indicator - lebih kecil */}
      {(gtX || gtY) && (
        <div className="mt-2 text-xs text-blue-600">
          Koordinat <i>Ground Truth</i>: ({gtX || '0'}, {gtY || '0'})
        </div>
      )}
    </div>
  );
};

export default GroundTruthForm;

