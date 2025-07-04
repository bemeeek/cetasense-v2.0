import React from "react";
import Plot from "react-plotly.js";

export interface PlotData {
  avgAll: number[][];        // [3][30]
  meanAnt1: number[];        // [30]
  snapshots: {
    pkt1: number[];
    mid: number[];
    last: number[];
  };
  overallMean: number[];     // [3]
  subcarriers: number;       // misal 30
  antennas: string[];        // ["Ant 1","Ant 2","Ant 3"]
}

interface PlotDataProps {
  data: PlotData;
}

const PlotDataComponent: React.FC<PlotDataProps> = ({ data }) => {
  const subs = Array.from({ length: data.subcarriers }, (_, i) => i + 1);

  const commonConfig = { responsive: true };
  const baseLayout = {
    margin: { t: 20, l: 50, r: 20, b: 50 },
    xaxis: { title: { text: "Subcarrier" } },
    showlegend: true as const,
  };

  const card = "bg-white rounded-2xl shadow border border-gray-200 p-6";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1) avgAll */}
      <div className={card}>
        <h3 className="text-lg font-semibold mb-4">
          Average Amplitude per Subcarrier (All Antennas)
        </h3>
        <Plot
          data={data.avgAll.map((arr, i) => ({
            x: subs,
            y: arr,
            type: "scatter" as const,
            mode: "lines+markers" as const,
            name: data.antennas[i],
          }))}
          layout={{
            ...baseLayout,
            yaxis: { title: { text: "Mean Amplitude" } },
          }}
          config={commonConfig}
          style={{ width: "100%", height: 280 }}
        />
      </div>

      {/* 2) meanAnt1 */}
      <div className={card}>
        <h3 className="text-lg font-semibold mb-4">
          Mean Amplitude per Subcarrier (Antenna 1)
        </h3>
        <Plot
          data={[{
            x: subs,
            y: data.meanAnt1,
            type: "bar" as const,
            name: "Antenna 1",
          }]}
          layout={{
            ...baseLayout,
            yaxis: { title: { text: "Mean Amplitude" } },
          }}
          config={commonConfig}
          style={{ width: "100%", height: 280 }}
        />
      </div>

      {/* 3) snapshots */}
      <div className={card}>
        <h3 className="text-lg font-semibold mb-4">
          Snapshots for Antenna 1
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["pkt1","mid","last"] as const).map((key) => {
            const title =
              key === "pkt1" ? "Packet 1"
              : key === "mid" ? `Packet ${Math.floor(data.subcarriers/2)}`
              : `Packet ${data.subcarriers}`;
            return (
              <Plot
                key={key}
                data={[{
                  x: subs,
                  y: data.snapshots[key],
                  type: "scatter" as const,
                  mode: "lines+markers" as const,
                  name: title,
                }]}
                layout={{
                  ...baseLayout,
                  yaxis: { title: { text: "Amplitude" } },
                  margin: { t: 30, l: 40, r: 10, b: 40 },
                  showlegend: false,
                }}
                config={commonConfig}
                style={{ width: "100%", height: 200 }}
              />
            );
          })}
        </div>
      </div>

      {/* 4) overallMean */}
      <div className={card}>
        <h3 className="text-lg font-semibold mb-4">
          Overall Mean Amplitude per Antenna
        </h3>
              {/* 4) Bar Chart: overallMean */}
      <Plot
        data={[
          {
            x: data.antennas,
            y: data.overallMean,
            type: "bar" as const,
            marker: { color: "#fbbf24" },
          },
        ]}
        layout={{
          title: { text: "Overall Mean Amplitude per Antenna" },
          xaxis: { title: { text: "Antenna" } },
          yaxis: { title: { text: "Mean Amplitude" } },
        }}
        style={{ width: "100%", height: 350 }}
        config={{ responsive: true }}
      />
      </div>
    </div>
  );
};

export default PlotDataComponent;
