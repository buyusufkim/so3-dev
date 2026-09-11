import React from 'react';

export type MeasurementTrendPoint = {
  id: number;
  measured_at: string;
  value: number;
};

interface MeasurementTrendChartProps {
  data: MeasurementTrendPoint[];
  label: string;
  unit: string;
}

export function MeasurementTrendChart({ data, label, unit }: MeasurementTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40 text-sm">
        {label} için ölçüm bulunamadı.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="text-3xl font-light text-white mb-2">
          {data[0].value.toFixed(1)} <span className="text-lg text-white/50">{unit}</span>
        </div>
        <div className="text-sm text-white/50">
          Trend için en az iki ölçüm gerekiyor.
        </div>
      </div>
    );
  }

  // Calculate SVG bounds
  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  
  // Padding for visual display
  const padding = maxVal === minVal ? 5 : (maxVal - minVal) * 0.2;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  
  const width = 600;
  const height = 220;
  
  // Create points
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - yMin) / (yMax - yMin)) * height;
    return { ...d, x, y };
  });
  
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const firstDate = data[0].measured_at.split(' ')[0];
  const lastDate = data[data.length - 1].measured_at.split(' ')[0];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative min-h-[220px]">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible"
          role="img" 
          aria-label={`${label} ölçümlerinin zaman içindeki değişimi`}
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2={width} y2="0" stroke="currentColor" strokeOpacity="0.05" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeOpacity="0.05" />
          <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity="0.05" />
          
          {/* Line */}
          <polyline 
            points={polylinePoints} 
            fill="none" 
            stroke="#851C35" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {points.map((p, i) => (
            <circle 
              key={p.id}
              cx={p.x} 
              cy={p.y} 
              r={i === points.length - 1 ? 5 : 4} 
              fill={i === points.length - 1 ? "#851C35" : "#121212"} 
              stroke={i === points.length - 1 ? "#fff" : "#851C35"} 
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      
      {/* X-Axis simple labels */}
      <div className="flex justify-between text-xs text-white/40 mt-4 px-1">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}
