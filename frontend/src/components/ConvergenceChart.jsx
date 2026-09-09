import React, { useState, useMemo } from 'react';
import { TrendingDown, Award, Zap, HelpCircle } from 'lucide-react';

export default function ConvergenceChart({ results, bestKnownProxy }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // Extract algorithms and convergence data
  const { series, maxIter, minVal, maxVal } = useMemo(() => {
    if (!results || Object.keys(results).length === 0) {
      return { series: [], maxIter: 80, minVal: 0, maxVal: 100 };
    }

    const algConfigs = {
      qpso: { label: 'Quantum PSO (QPSO)', color: '#00f0ff', strokeWidth: 3 },
      pso: { label: 'Classical PSO', color: '#f97316', strokeWidth: 2 },
      ga: { label: 'Genetic Algorithm', color: '#a855f7', strokeWidth: 2 },
      greedy: { label: 'Greedy Baseline', color: '#64748b', strokeWidth: 1.5, dashed: true },
    };

    const s = [];
    let longest = 0;
    let lowest = Infinity;
    let highest = -Infinity;

    for (const [key, data] of Object.entries(results)) {
      if (data && data.convergence && data.convergence.length > 0) {
        longest = Math.max(longest, data.convergence.length);
        const config = algConfigs[key] || { label: key.toUpperCase(), color: '#38bdf8', strokeWidth: 2 };
        s.push({
          key,
          ...config,
          data: data.convergence,
          finalCost: data.best_cost,
          runtimeMs: data.runtime_ms,
          iter95: data.iter_to_95_optimal
        });

        data.convergence.forEach(v => {
          if (v < lowest) lowest = v;
          if (v > highest) highest = v;
        });
      }
    }

    // Safety padding for y-axis
    const range = Math.max(10, highest - lowest);
    return {
      series: s,
      maxIter: Math.max(20, longest),
      minVal: Math.max(0, lowest - range * 0.08),
      maxVal: highest + range * 0.08
    };
  }, [results]);

  // Chart dimensions
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Coordinate scales
  const getX = (iterIndex) => {
    return padding.left + (iterIndex / Math.max(1, maxIter - 1)) * innerWidth;
  };

  const getY = (val) => {
    if (maxVal === minVal) return padding.top + innerHeight / 2;
    const ratio = (val - minVal) / (maxVal - minVal);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  // Generate SVG path for a series
  const getPathD = (data) => {
    if (!data || data.length === 0) return '';
    return data.reduce((acc, val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const chartX = clientX - (padding.left / width) * rect.width;
    const ratio = chartX / ((innerWidth / width) * rect.width);
    const iter = Math.round(ratio * (maxIter - 1));
    if (iter >= 0 && iter < maxIter) {
      setHoverIndex(iter);
    }
  };

  if (!results || Object.keys(results).length === 0) {
    return (
      <div className="cyber-card p-5 flex flex-col items-center justify-center min-h-[260px] text-slate-400 text-xs font-mono">
        <TrendingDown className="w-8 h-8 text-cyan-500/40 mb-2 animate-bounce" />
        <span>Run optimization to visualize iteration-by-iteration convergence curves</span>
      </div>
    );
  }

  return (
    <div className="cyber-card p-4 sm:p-5 flex flex-col gap-3">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider m-0">
            Convergence Dynamics (Fitness Cost vs Iterations)
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span 
                className="w-3 h-1 rounded-full" 
                style={{ backgroundColor: s.color }}
              ></span>
              <span className="text-slate-300 text-[11px]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas Line Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="qpsoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + innerHeight * ratio;
            const val = Math.round(maxVal - ratio * (maxVal - minVal));
            return (
              <g key={`grid-h-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Grid lines (vertical) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const x = padding.left + innerWidth * ratio;
            const itNum = Math.round(ratio * maxIter);
            return (
              <g key={`grid-v-${i}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {itNum}
                </text>
              </g>
            );
          })}

          {/* Best-Known Proxy Baseline (Horizontal Dashed Line) */}
          {bestKnownProxy > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={getY(bestKnownProxy)}
                x2={width - padding.right}
                y2={getY(bestKnownProxy)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeOpacity="0.8"
              />
              <text
                x={width - padding.right}
                y={getY(bestKnownProxy) - 4}
                textAnchor="end"
                fill="#10b981"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fontWeight="bold"
              >
                Best-Known Proxy f* ({bestKnownProxy.toFixed(1)})
              </text>
            </g>
          )}

          {/* Algorithm Line Series */}
          {series.map((s) => {
            const pathD = getPathD(s.data);
            return (
              <g key={`series-${s.key}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.strokeWidth}
                  strokeDasharray={s.dashed ? '6 4' : 'none'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: s.key === 'qpso' ? 'drop-shadow(0px 0px 4px rgba(0, 240, 255, 0.6))' : 'none'
                  }}
                />
              </g>
            );
          })}

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {series.map((s) => {
                const val = s.data[hoverIndex] !== undefined ? s.data[hoverIndex] : s.data[s.data.length - 1];
                return (
                  <circle
                    key={`point-${s.key}`}
                    cx={getX(hoverIndex)}
                    cy={getY(val)}
                    r="4"
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + innerWidth / 2}
            y={height - 5}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            Optimization Iteration (t)
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && (
          <div className="absolute top-2 right-4 p-2 rounded-lg bg-[#050814]/95 border border-white/20 text-xs font-mono shadow-xl pointer-events-none">
            <span className="text-cyan-400 font-bold block mb-1">Iteration {hoverIndex + 1}</span>
            {series.map(s => {
              const val = s.data[hoverIndex] !== undefined ? s.data[hoverIndex] : s.data[s.data.length - 1];
              return (
                <div key={s.key} className="flex justify-between gap-3 text-[11px]">
                  <span style={{ color: s.color }}>{s.label}:</span>
                  <span className="text-white font-bold">{val?.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quantum Advantage Insight Note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 font-mono">
        <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-cyan-300">Quantum Delta-Potential Well Advantage:</strong> QPSO particles tunnel out of premature local minima traps that stall Classical PSO, reaching lower route costs with steeper early convergence gradients.
        </div>
      </div>
    </div>
  );
}
