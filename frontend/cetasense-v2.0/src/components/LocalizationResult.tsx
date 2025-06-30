import React from 'react';
import {type Ruangan } from '../services/api';

interface Props {
  ruangan: Ruangan;
  result: { x: number; y: number };
}

export const LocalizationResult: React.FC<Props> = ({ ruangan, result }) => {
  const { panjang, lebar, posisi_x_tx, posisi_x_rx, posisi_y_tx, posisi_y_rx, nama_ruangan } = ruangan;
  const size = 400;
  const maxDivisions = 10;
  const divX = Math.min(maxDivisions, Math.ceil(panjang));
  const divY = Math.min(maxDivisions, Math.ceil(lebar));

  const toPct = (x: number, y: number) => ({
    left: `${(x / panjang) * 100}%`,
    top: `${(y / lebar) * 100}%`
  });
  const txPct = toPct(posisi_x_tx, posisi_y_tx);
  const rxPct = toPct(posisi_x_rx, posisi_y_rx);
  const subPct = toPct(result.x, result.y);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Data Lokalisasi untuk {nama_ruangan}</h2>
      <div
        className="localization-container mx-auto"
        style={{ width: size, height: size }}
      >
        {[...Array(divX + 1)].map((_, i) => (
          <div
            key={`v${i}`}
            className="grid-line-vertical"
            style={{ left: `${(i / divX) * 100}%` }}
          />
        ))}
        {[...Array(divY + 1)].map((_, i) => (
          <div
            key={`h${i}`}
            className="grid-line-horizontal"
            style={{ top: `${(i / divY) * 100}%` }}
          />
        ))}

        <div
          title="Antena TX"
          className="marker-tx"
          style={{ left: txPct.left, top: txPct.top, transform: 'translate(-50%, 0)' }}
        />
        <div
          title="Antena RX"
          className="marker-rx"
          style={{ left: rxPct.left, top: rxPct.top, transform: 'translate(-50%, -100%)' }}
        />
        <div
          title={`Posisi Subjek (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`}
          className="marker-subject"
          style={{ left: subPct.left, top: subPct.top, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-center gap-6 mt-4 text-lg font-medium">
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-pink-500"></span>Antena TX</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-yellow-500"></span>Antena RX</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-600 border border-white"></span>Posisi Subjek</div>
      </div>
    </div>
  );
};