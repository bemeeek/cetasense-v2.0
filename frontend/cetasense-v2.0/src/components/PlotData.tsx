import React from "react";
import Plot from "react-plotly.js";

export interface PlotData {
  avgAll: number[][];        // [3][30]
  avgPerPacket: number[][]; // [3][30]
  meanAnt1: number[];        // [30]
  meanAnt2: number[];        // [30]
  meanAnt3: number[];        // [30]
  snapshots1: {
    pkt1: number[];
    mid: number[];
    last: number[];
  };
  snapshots2: {
    pkt1: number[];
    mid: number[];
    last: number[];
  };
  snapshots3: {
    pkt1: number[];
    mid: number[];
    last: number[];
  };
  overallMean: number[];     // [3]
  subcarriers: number;       // misal 30
  antennas: string[];        // ["Channel 1","Channel 2","Channel 3"]
}

interface PlotDataProps {
  data: PlotData;
}

const PlotDataComponent: React.FC<PlotDataProps> = ({ data }) => {
  const subs = Array.from({ length: data.subcarriers }, (_, i) => i + 1);

  const commonConfig = {
    responsive: true,
    displayModeBar: false,
    displaylogo: false,
  };

   const [activePktAnt, setActivePktAnt] = React.useState(0);

  const baseLayout = {
    margin: { t: 40, l: 60, r: 40, b: 40 },
    font: { family: "Inter, system-ui, sans-serif", size: 12 },
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      title: { text: "Subcarrier", font: { size: 14, color: "#374151" } },
      gridcolor: "#f3f4f6",
      linecolor: "#e5e7eb",
    },
    yaxis: {
      gridcolor: "#f3f4f6",
      linecolor: "#e5e7eb",
    },
    showlegend: true as const,
    legend: {
      orientation: "h" as const,
      y: -0.3,
      x: 0.5,
      xanchor: "center" as const,
    },
  };

  const cardClass =
    "bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300";

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  // State untuk Snapshot per Channel
  const [activeSnapshot, setActiveSnapshot] = React.useState<
    "snapshots1" | "snapshots2" | "snapshots3"
  >("snapshots1");
  const snapshotOptions: ("snapshots1" | "snapshots2" | "snapshots3")[] = [
    "snapshots1",
    "snapshots2",
    "snapshots3",
  ];

  // State untuk Bar Chart per Channel
  const [activeMean, setActiveMean] = React.useState<
    "meanAnt1" | "meanAnt2" | "meanAnt3"
  >("meanAnt1");

  // Tombol tab
  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    color?: string;
  }> = ({ active, onClick, children, color = "blue" }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active
          ? `bg-${color}-500 text-white shadow-md transform scale-105`
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* — Plot rata-rata per paket per Channel — */}
      <div className={cardClass}>
        <h3 className="font-semibold mb-2">Rata-Rata Amplitudo per Paket</h3>
        <div className="flex gap-2 mb-4">
          {data.antennas.map((ant,i) =>
            <button
              key={ant}
              onClick={()=>setActivePktAnt(i)}
              className={
                activePktAnt===i
                  ? "bg-blue-600 text-white px-3 py-1 rounded"
                  : "bg-gray-200 text-gray-700 px-3 py-1 rounded"
              }
            >
              {ant}
            </button>
          )}
        </div>
        <Plot
          data={[
            {
              x: Array.from({ length: data.avgPerPacket[0].length }, (_, i) => i + 1),
              y: data.avgPerPacket[Number(activeMean.slice(-1)) - 1],
              type: "scatter" as const,
              mode: "lines",
              name: data.antennas[Number(activeMean.slice(-1)) - 1],
              line: { color: "#14b8a6", width: 2 },
            },
          ]}
          layout={{
            ...baseLayout,
            xaxis: {
              title: { text: "Indeks Paket", font: { size: 14 } },
            },
            yaxis: {
              title: { text: "Mean Amplitudo", font: { size: 14 } },
            },
            showlegend: false,
          }}
          config={commonConfig}
          style={{ width: "100%", height: 300 }}
        />

      </div>


      {/* 2) Plot Bar Chart per Channel */}
      <div className={cardClass}>
        <div className="flex items-center mb-6">
          <div className="w-1 h-6 bg-green-500 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-800">
            Analisis Per Channel
          </h3>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Distribusi amplitudo per Channel secara detail
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          {["Channel 1", "Channel 2", "Channel 3"].map((label, i) => {
            const meanKey = (`meanAnt${i + 1}` as "meanAnt1" | "meanAnt2" | "meanAnt3");
            return (
              <TabButton
                key={label}
                active={activeMean === meanKey}
                onClick={() => setActiveMean(meanKey)}
                color="green"
              >
                {label}
              </TabButton>
            );
          })}
        </div>
        <Plot
          data={[
            {
              x: subs,
              y: data[activeMean],
              type: "bar" as const,
              name: activeMean,
              marker: {
                color: colors[parseInt(activeMean.slice(-1)) - 1],
                opacity: 0.8,
                line: {
                  color: colors[parseInt(activeMean.slice(-1)) - 1],
                  width: 2,
                },
              },
            },
          ]}
          layout={{
            ...baseLayout,
            yaxis: {
              ...baseLayout.yaxis,
              title: { text: "Rata-Rata Amplitudo", font: { size: 14, color: "#374151" } },
            },
          }}
          config={commonConfig}
          style={{ width: "100%", height: 320 }}
        />
      </div>

      {/* 3) Snapshot Temporal per Channel */}
      <div className={`${cardClass} xl:col-span-2`}>
        <div className="flex items-center mb-6">
          <div className="w-1 h-6 bg-purple-500 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-800">
            Snapshot Temporal
          </h3>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Tampilan evolusi sinyal pada paket awal, tengah, dan akhir
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          {["Channel 1", "Channel 2", "Channel 3"].map((label, i) => (
            <TabButton
              key={label}
              active={activeSnapshot === snapshotOptions[i]}
              onClick={() => setActiveSnapshot(snapshotOptions[i])}
              color="purple"
            >
              {label}
            </TabButton>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(["pkt1", "mid", "last"] as const).map((key, idx) => {
            const titles = ["Paket Pertama", "Paket Tengah", "Paket Terakhir"];
            const descriptions = [
              "Pengambilan awal sinyal",
              "Kondisi tengah transmisi",
              "Kondisi akhir sinyal",
            ];
            return (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-1">{titles[idx]}</h4>
                <p className="text-xs text-gray-500 mb-3">{descriptions[idx]}</p>
                <Plot
                  data={[
                    {
                      x: subs,
                      y: data[activeSnapshot][key],
                      type: "scatter" as const,
                      mode: "lines+markers" as const,
                      name: titles[idx],
                      line: {
                        color: colors[idx + 2],
                        width: 2,
                        shape: "spline" as const,
                      },
                      marker: { size: 4, color: colors[idx + 2] },
                    },
                  ]}
                  layout={{
                    ...baseLayout,
                    yaxis: {
                      ...baseLayout.yaxis,
                      title: { text: "Amplitudo", font: { size: 12, color: "#374151" } },
                    },
                    margin: { t: 20, l: 50, r: 20, b: 50 },
                    showlegend: false,
                  }}
                  config={commonConfig}
                  style={{ width: "100%", height: 250 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4) Ringkasan Kinerja Keseluruhan */}
      <div className={`${cardClass} xl:col-span-2`}>
        <div className="flex items-center mb-6">
          <div className="w-1 h-6 bg-orange-500 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-800">
            Ringkasan Kinerja Keseluruhan
          </h3>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Metrik agregat di semua Channel
        </p>
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <Plot
              data={[
                {
                  x: data.antennas,
                  y: data.overallMean,
                  type: "bar" as const,
                  marker: {
                    color: colors.slice(0, data.antennas.length),
                    opacity: 0.8,
                    line: { color: "#ffffff", width: 4 },
                  },
                  text: data.overallMean.map((v) => v.toFixed(2)),
                  textposition: "outside" as const,
                  textfont: { size: 14, color: "#374151" },
                },
              ]}
              layout={{
                ...baseLayout,
                xaxis: {
                  ...baseLayout.xaxis,
                  title: { text: "Channel", font: { size: 14, color: "#374151" } },
                },
                yaxis: {
                  ...baseLayout.yaxis,
                  title: { text: "Rata-Rata Amplitudo", font: { size: 14, color: "#374151" } },
                },
                showlegend: false,
              }}
              style={{ width: "100%", height: 400 }}
              config={commonConfig}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-gray-200">
        <p className="text-gray-500 text-sm">
          Dashboard Analisis CSI • Pemantauan Real-time Channel State Information
        </p>
      </div>
    </div>
  );
};

export default PlotDataComponent;