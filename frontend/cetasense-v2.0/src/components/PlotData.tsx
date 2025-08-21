import React from "react";
import Plot from "react-plotly.js";

/** ====== Types sesuai JSON dari plot_handlers.go ====== **/
export interface RankItem {
  channel: number;       // 1..3
  rank: number;          // 1..5
  subcarrier: number;    // 1..30 (1-based)
  series: Array<number | null>; // BNR dB per packet; null = masked/drop-out
  median: number;
  p90: number;
  std: number;
  validPct: number;
}

export interface ChannelPayload {
  channel: number; // 1..3
  top5: RankItem[]; // length <= 5
}

export interface HandlerMeta {
  method: string;
  clipDb: [number, number];
  channels: number;      // 3
  subcarriers: number;   // 30
  packets: number;       // e.g. 1500
  ranking: string;       // description
}

export interface BnrHandlerResponse {
  meta: HandlerMeta;
  indices1based: number[][]; // [ [sc1,sc2,sc3], per channel ]
  channels: ChannelPayload[];
}

/** ====== Komponen ====== **/
interface PlotDataProps {
  data: BnrHandlerResponse;
}

const PlotDataComponent: React.FC<PlotDataProps> = ({ data }) => {
  const { meta, channels } = data;
  
  // State untuk setiap channel (active rank: 1..5)
  const [activeRankCh1, setActiveRankCh1] = React.useState(1);
  const [activeRankCh2, setActiveRankCh2] = React.useState(1);
  const [activeRankCh3, setActiveRankCh3] = React.useState(1);

  const clipLo = meta?.clipDb?.[0] ?? -60;
  const clipHi = meta?.clipDb?.[1] ?? 60;
  const packets = meta?.packets ?? (channels?.[0]?.top5?.[0]?.series?.length ?? 0);

  // Palet warna: satu warna per channel yang tetap
  const channelColors = ["#3b82f6", "#ef4444", "#10b981"]; // Channel 1: biru, Channel 2: merah, Channel 3: hijau

  const commonConfig = {
    responsive: true,
    displayModeBar: false,
    displaylogo: false,
  } as const;

  const baseLayout = {
    margin: { t: 36, l: 56, r: 24, b: 40 },
    font: { family: "Inter, system-ui, sans-serif", size: 12 },
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      title: { text: "Packet Index", font: { size: 13, color: "#374151" } },
      gridcolor: "#f3f4f6",
      linecolor: "#e5e7eb",
      zeroline: false,
    },
    yaxis: {
      title: { text: "BNR (dB)", font: { size: 13, color: "#374151" } },
      gridcolor: "#f3f4f6",
      linecolor: "#e5e7eb",
      range: [clipLo, clipHi],
      zeroline: false,
    },
    showlegend: false,
  };

  const cardClass =
    "bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300";

  // Helper membangun trace untuk satu RankItem
  const buildTrace = (item: RankItem) => {
    const x = Array.from({ length: item.series.length }, (_, i) => i + 1);
    const color = channelColors[item.channel - 1];
    const name =
      `SC ${item.subcarrier} • r${item.rank} • ` +
      `med ${item.median.toFixed(2)} dB • p90 ${item.p90.toFixed(2)} • ` +
      `σ ${item.std.toFixed(2)} • valid ${Math.round(item.validPct)}%`;
    return {
      x,
      y: item.series, // null => gap, sesuai Plotly
      type: "scatter" as const,
      mode: "lines" as const,
      name,
      connectgaps: false,
      line: { color, width: 3 },
      hovertemplate:
        `Packet %{x}<br>` +
        `BNR %{y:.2f} dB<br>` +
        `<b>SC ${item.subcarrier} (Rank ${item.rank})</b><extra></extra>`,
    };
  };

  // TabButton component
  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    color?: string;
  }> = ({ active, onClick, children, color }) => {
    let activeClasses = "";
    if (active) {
      switch (color) {
        case "blue":
          activeClasses = "bg-blue-500 text-white shadow-md transform scale-105";
          break;
        case "red":
          activeClasses = "bg-red-500 text-white shadow-md transform scale-105";
          break;
        case "green":
          activeClasses = "bg-green-500 text-white shadow-md transform scale-105";
          break;
        default:
          activeClasses = "bg-gray-500 text-white shadow-md transform scale-105";
      }
    }
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          active ? activeClasses : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
        }`}
      >
        {children}
      </button>
    );
  };

  // Helper untuk mendapatkan active rank berdasarkan channel
  const getActiveRank = (channelIndex: number) => {
    switch (channelIndex) {
      case 0: return activeRankCh1;
      case 1: return activeRankCh2;
      case 2: return activeRankCh3;
      default: return 1;
    }
  };

  // Helper untuk set active rank
  const setActiveRank = (channelIndex: number, rank: number) => {
    switch (channelIndex) {
      case 0: setActiveRankCh1(rank); break;
      case 1: setActiveRankCh2(rank); break;
      case 2: setActiveRankCh3(rank); break;
    }
  };

  // Header meta ringkas
  const MetaHeader = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
        <span className="font-semibold">BNR Analysis • {meta.ranking}</span>
        <span>method: <b>{meta.method}</b></span>
        <span>packets: <b>{meta.packets}</b></span>
        <span>subcarriers: <b>{meta.subcarriers}</b></span>
        <span>clip: [{clipLo}, {clipHi}] dB</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <MetaHeader />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Analisis Subcarrier Dengan Band-to-Noise Ratio (BNR)
        </h1>
        <p className="text-gray-600">
          Analisis ini memberikan wawasan tentang kinerja subcarrier berdasarkan rasio sinyal terhadap noise (BNR).
        </p>
      </div>

      {/* Vertical Cards untuk setiap Channel */}
      <div className="space-y-8">
        {channels.map((ch, channelIndex) => {
          const activeRank = getActiveRank(channelIndex);
          const activeItem = ch.top5.find(item => item.rank === activeRank);
          const channelColor = channelColors[channelIndex];
          const colorName = ['blue', 'red', 'green'][channelIndex];

          if (!activeItem) return null;

          return (
            <div key={ch.channel} className={cardClass}>
              <div className="flex items-center mb-6">
                <div 
                  className="w-1.5 h-6 rounded-full mr-3"
                  style={{ backgroundColor: channelColor }}
                ></div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Channel {ch.channel} - Performansi Subcarrier
                </h3>
              </div>
              
              {/* Button switching untuk rank */}
              <div className="flex gap-3 mb-4">
                {ch.top5
                  .sort((a, b) => a.rank - b.rank)
                  .map((item) => (
                    <TabButton
                      key={item.rank}
                      active={activeRank === item.rank}
                      onClick={() => setActiveRank(channelIndex, item.rank)}
                      color={colorName}
                    >
                      Peringkat {item.rank} - Subcarrier ke-{item.subcarrier}
                    </TabButton>
                  ))}
              </div>

              {/* Info box untuk item yang dipilih */}
              <div 
                className="mb-4 p-4 rounded-lg"
                style={{ backgroundColor: `${channelColor}15`, borderLeft: `4px solid ${channelColor}` }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Subcarrier:</span>
                    <p className="text-lg font-bold" style={{ color: channelColor }}>
                      Subcarrier ke-{activeItem.subcarrier}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Median:</span>
                    <p className="text-lg font-bold text-gray-800">
                      {activeItem.median.toFixed(2)} dB
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">P90:</span>
                    <p className="text-lg font-bold text-gray-800">
                      {activeItem.p90.toFixed(2)} dB
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Valid:</span>
                    <p className="text-lg font-bold text-gray-800">
                      {Math.round(activeItem.validPct)}%
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Standar Deviasi :</span> {activeItem.std.toFixed(2)} dB
                </div>
              </div>

              {/* Plot untuk item yang dipilih */}
              <Plot
                data={[buildTrace(activeItem)]}
                layout={{
                  ...baseLayout,
                  xaxis: {
                    ...baseLayout.xaxis,
                    range: [1, Math.max(1, packets)],
                  },
                }}
                config={commonConfig}
                style={{ width: "100%", height: 350 }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-gray-200">
        <p className="text-gray-500 text-sm">
          BNR Top-5 Interactive Analysis • Method: <b>{meta.method}</b>
        </p>
      </div>
    </div>
  );
};

export default PlotDataComponent;