// src/components/PropertyFrameWrapper.tsx
import React from 'react';

interface Props {
  className?: string;
  /** nama file SVG utama, misal 'vector-10.svg' */
  img: string;
  /** modifier styling, biasanya 'frame-1' atau sejenis */
  property1?: string;
  /** lapisan SVG kedua, misal 'vector-9.svg' */
  vector: string;
  /** lapisan SVG ketiga, misal 'vector-11.svg' */
  vector1: string;
}

/**
 * Komponen utilitas untuk me-render background frame
 * (beberapa layer SVG) yang kamu desain di Figma.
 */
export const PropertyFrameWrapper: React.FC<Props> = ({
  className = '',
  img,
  property1,
  vector,
  vector1,
}) => (
  <div className={className}>
    <img
      src={require(`../assets/${img}`)}
      alt=""
      className="block"
    />
    <img
      src={require(`../assets/${vector}`)}
      alt=""
      className="block absolute top-0 left-0"
    />
    <img
      src={require(`../assets/${vector1}`)}
      alt=""
      className="block absolute top-0 left-0"
    />
  </div>
);

export default PropertyFrameWrapper;
