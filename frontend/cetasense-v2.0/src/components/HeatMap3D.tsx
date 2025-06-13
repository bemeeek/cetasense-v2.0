// src/components/Heatmap3D.tsx
import React from 'react';
import Plot from 'react-plotly.js';

export interface Heatmap3DProps {
  theta: number[];
  tau: number[];
  z: number[][];
}

const Heatmap3D: React.FC<Heatmap3DProps> = ({ theta, tau, z }) => {
  // Define surface trace with contour lines on the Z axis
  const surfaceTrace: any = {
    type: 'surface',
    x: theta,
    y: tau,
    z: z,
    colorscale: 'Viridis',
    contours: {
      z: {
        show: true,
        usecolormap: true,
        highlightcolor: '#42f462',
        project: { z: true }
      }
    }
  };

  return (
    <Plot
      data={[surfaceTrace]}
      layout={{
        title: { text: '3D Heatmap Surface with Contours' },
        scene: {
          xaxis: { title: { text: 'θ (theta_scan)' } },
          yaxis: { title: { text: 'τ (tau_scan)' } },
          zaxis: { title: { text: 'Value' } }
        },
        autosize: true,
        margin: { l: 10, r: 10, b: 10, t: 50 }
      }}
      style={{ width: '100%', height: '600px' }}
      config={{ responsive: true }}
    />
  );
};

export default Heatmap3D;
