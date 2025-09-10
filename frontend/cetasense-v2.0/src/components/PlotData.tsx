import React, { useMemo } from "react";
import Plot from "react-plotly.js";

// ===== Types that match the RSSI payload =====
export interface RSSIAttemptSeries {
  attempt: number;
  y: Array<number | null>; // aligned to anchors[]
}

export interface RSSIPlotResponse {
  meta: {
    kind: string; // "RSSI"
    anchorCount: number;
    attemptCount: number;
    xLabel: string;
    yLabel: string;
  };
  anchors: string[];        // tick labels, sorted (e.g., "0","1",...)
  attempts: number[];       // 1..N
  series: RSSIAttemptSeries[]; // one per attempt
}

interface Props { 
  data: RSSIPlotResponse;
  className?: string;
  height?: number;
}

const PlotDataComponent: React.FC<Props> = ({ 
  data, 
  className = "",
  height = 420 
}) => {
  const { anchors, series, meta } = data;

  // Memoize calculations untuk performance
  const plotData = useMemo(() => {
    // X positions 1..N, but display label +1 if numeric so user sees 1..6 instead of 0..5
    const xvals = anchors.map((_, i) => i + 1);
    const tickvals = xvals;
    const anchorsDisplay = anchors.map((a) => {
      const n = Number(a);
      return Number.isFinite(n) ? String(n + 1) : String(a);
    });

    return { xvals, tickvals, anchorsDisplay };
  }, [anchors]);

  // Enhanced color palette dengan lebih banyak variasi
  const palette = [
    "#2563eb", // blue-600
    "#dc2626", // red-600
    "#059669", // emerald-600
    "#7c3aed", // violet-600
    "#f59e0b", // amber-500
    "#0ea5e9", // sky-500
    "#ef4444", // red-500
    "#16a34a", // green-600
    "#8b5cf6", // violet-500
    "#06b6d4"  // cyan-500
  ];

  const traces = useMemo(() => {
    return series.map((s, idx) => ({
      x: plotData.xvals,
      y: s.y,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: `Attempt ${s.attempt}`,
      connectgaps: false,
      line: { 
        width: 3, 
        color: palette[idx % palette.length],
        shape: "linear" as const
      },
      marker: { 
        size: 8,
        color: palette[idx % palette.length],
        line: { width: 2, color: "#ffffff" }
      },
      customdata: plotData.anchorsDisplay,
      hovertemplate:
        `<b>Anchor %{customdata}</b><br>` +
        `RSSI: %{y:.2f} dBm<br>` +
        `<i>Attempt ${s.attempt}</i>` +
        `<extra></extra>`,
    }));
  }, [series, plotData, palette]);

  // Calculate statistics untuk summary
  const stats = useMemo(() => {
    const allValues = series.flatMap(s => s.y.filter(val => val !== null)) as number[];
    if (allValues.length === 0) return null;

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;

    return { min, max, avg };
  }, [series]);

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${className}`}>
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">
            📡 RSSI Measurement Analysis
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {meta.kind}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-sm">
            <span className="font-medium">{meta.anchorCount}</span> anchors • 
            <span className="font-medium ml-1">{meta.attemptCount}</span> attempts
          </p>
          
          {/* Statistics Summary */}
          {stats && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Min: <strong>{stats.min.toFixed(1)} dBm</strong></span>
              <span>Avg: <strong>{stats.avg.toFixed(1)} dBm</strong></span>
              <span>Max: <strong>{stats.max.toFixed(1)} dBm</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Plot Container */}
      <div className="relative">
        <Plot
          data={traces}
          layout={{
            margin: { t: 30, l: 60, r: 30, b: 80 },
            font: { 
              family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", 
              size: 12 
            },
            plot_bgcolor: "rgba(248, 250, 252, 0.5)",
            paper_bgcolor: "rgba(0,0,0,0)",
            
            xaxis: {
              title: { 
                text: meta.xLabel, 
                font: { size: 14, color: "#374151", family: "Inter" },
                standoff: 20
              },
              gridcolor: "#f1f5f9",
              linecolor: "#e2e8f0",
              tickmode: "array",
              tickvals: plotData.tickvals,
              ticktext: plotData.anchorsDisplay,
              zeroline: false,
              showline: true,
              ticks: "outside",
              tickcolor: "#cbd5e1"
            },
            
            yaxis: {
              title: { 
                text: meta.yLabel, 
                font: { size: 14, color: "#374151", family: "Inter" },
                standoff: 20
              },
              gridcolor: "#f1f5f9",
              linecolor: "#e2e8f0",
              zeroline: false,
              showline: true,
              ticks: "outside",
              tickcolor: "#cbd5e1",
              autorange: true,
            },
            
            showlegend: true,
            legend: { 
              orientation: "h", 
              y: -0.15,
              x: 0.5,
              xanchor: "center",
              bgcolor: "rgba(255,255,255,0.8)",
              bordercolor: "#e2e8f0",
              borderwidth: 1,
              font: { size: 11 }
            },
            
            hovermode: "closest",
            hoverlabel: {
              bgcolor: "rgba(0,0,0,0.8)",
              bordercolor: "rgba(255,255,255,0.2)",
              font: { color: "white", size: 12 }
            }
          }}
          
          config={{ 
            responsive: true, 
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: [
              'pan2d', 'lasso2d', 'select2d', 'autoScale2d', 
              'hoverClosestCartesian', 'hoverCompareCartesian'
            ],
            toImageButtonOptions: {
              format: 'png',
              filename: `rssi_measurement_${new Date().toISOString().split('T')[0]}`,
              height: height,
              width: 800,
              scale: 2
            }
          }}
          
          style={{ width: "100%", height }}
        />
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Hover over data points for detailed values • Use toolbar to zoom, pan, or download
        </p>
      </div>
    </div>
  );
};

export default PlotDataComponent;