import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  MapPin, 
  Navigation, 
  Clock, 
  Gauge, 
  ShieldAlert,
  Info
} from 'lucide-react';

export default function GraphView({
  networkData,
  selectedStops,
  onToggleStop,
  bestRouteStops,
  detailedPathCoords,
  bestAlgorithm,
  congestionMode,
  isOptimizing
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  // Compute graph bounds to fit automatically
  const { minX, maxX, minY, maxY, width, height } = useMemo(() => {
    if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
      return { minX: 0, maxX: 600, minY: 0, maxY: 600, width: 600, height: 600 };
    }
    const xs = networkData.nodes.map(n => n.x);
    const ys = networkData.nodes.map(n => n.y);
    const min_x = Math.min(...xs) - 40;
    const max_x = Math.max(...xs) + 40;
    const min_y = Math.min(...ys) - 40;
    const max_y = Math.max(...ys) + 40;
    return {
      minX: min_x,
      maxX: max_x,
      minY: min_y,
      maxY: max_y,
      width: Math.max(400, max_x - min_x),
      height: Math.max(400, max_y - min_y)
    };
  }, [networkData]);

  // Reset View
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect' || e.target.id === 'graph-canvas-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(prev => Math.min(3.0, Math.max(0.6, prev * zoomFactor)));
  };

  // Congestion color gradient
  const getCongestionColor = (cong) => {
    if (cong < 0.30) return '#10b981'; // Green
    if (cong < 0.50) return '#84cc16'; // Lime
    if (cong < 0.70) return '#f59e0b'; // Amber
    if (cong < 0.85) return '#f97316'; // Orange
    return '#f43f5e';                  // Crimson Red
  };

  // Stop lookup map
  const stopSet = useMemo(() => new Set(selectedStops), [selectedStops]);

  // Node coordinate lookup
  const nodeCoords = useMemo(() => {
    const map = new Map();
    if (networkData?.nodes) {
      networkData.nodes.forEach(n => map.set(n.id, { x: n.x, y: n.y, ...n }));
    }
    return map;
  }, [networkData]);

  // SVG path string for the optimized winning route
  const routePathD = useMemo(() => {
    if (!detailedPathCoords || detailedPathCoords.length < 2) return '';
    return detailedPathCoords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt[0]} ${pt[1]}` : `${acc} L ${pt[0]} ${pt[1]}`;
    }, '');
  }, [detailedPathCoords]);

  return (
    <div 
      ref={containerRef}
      className="cyber-card relative w-full h-full min-h-[480px] lg:min-h-[560px] flex flex-col overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Viewport Top Bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#050814]/90 border border-white/10 text-xs font-mono backdrop-blur-md">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-semibold">City Road Grid</span>
          <span className="text-slate-400 text-[10px]">({networkData?.nodes?.length || 0} Nodes, {networkData?.edges?.length || 0} Roads)</span>
        </div>

        {bestAlgorithm && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Active Path: <strong className="uppercase">{bestAlgorithm}</strong></span>
          </div>
        )}
      </div>

      {/* Congestion Legend Top Right */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050814]/90 border border-white/10 text-[11px] font-mono backdrop-blur-md">
          <span className="text-slate-400">Traffic:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" title="Free Flow (<30%)"></span>
            <span className="text-[10px] text-emerald-400">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" title="Moderate (30-70%)"></span>
            <span className="text-[10px] text-amber-400">Med</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" title="Congested (>70%)"></span>
            <span className="text-[10px] text-rose-400">Congested</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#050814]/90 border border-white/10 pointer-events-auto backdrop-blur-md">
          <button 
            onClick={() => setZoom(z => Math.min(3.0, z * 1.2))}
            className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-cyan-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoom(z => Math.max(0.6, z / 1.2))}
            className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-cyan-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleResetView}
            className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-cyan-300"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <svg 
        className="w-full h-full cursor-grab active:cursor-grabbing flex-grow"
        style={{ backgroundColor: '#050814' }}
      >
        <defs>
          {/* Glowing Filters */}
          <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Marker Arrow for Route Flow */}
          <marker 
            id="flowArrow" 
            viewBox="0 0 10 10" 
            refX="6" 
            refY="5" 
            markerWidth="4" 
            markerHeight="4" 
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#00f0ff" />
          </marker>
        </defs>

        <rect id="graph-canvas-bg" width="100%" height="100%" fill="transparent" />

        {/* Transform Group for Pan & Zoom */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Center alignment translation */}
          <g transform={`translate(${-minX + 30}, ${-minY + 30})`}>

            {/* 1. Road Network Edges */}
            {networkData?.edges?.map((edge, idx) => {
              const uNode = nodeCoords.get(edge.u);
              const vNode = nodeCoords.get(edge.v);
              if (!uNode || !vNode) return null;

              const cong = edge.current_congestion;
              const edgeColor = getCongestionColor(cong);
              const strokeWidth = edge.is_arterial ? 3.5 : 2.0;

              return (
                <g key={`edge-${idx}`}>
                  {/* Outer wider line for easier hover */}
                  <line
                    x1={uNode.x}
                    y1={uNode.y}
                    x2={vNode.x}
                    y2={vNode.y}
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {/* Visual road line */}
                  <line
                    x1={uNode.x}
                    y1={uNode.y}
                    x2={vNode.x}
                    y2={vNode.y}
                    stroke={edgeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={edge.is_arterial ? 0.75 : 0.45}
                    strokeDasharray={edge.is_arterial ? "6 3" : "none"}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}

            {/* 2. Highlighted Optimized Route (with quantum glow and flow animation) */}
            {routePathD && (
              <g>
                {/* Background high-intensity glow */}
                <path
                  d={routePathD}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="7"
                  strokeOpacity="0.4"
                  filter="url(#cyanGlow)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Core bright neon path */}
                <path
                  d={routePathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Animated dash flow line */}
                <path
                  d={routePathD}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="route-flow-line"
                  markerMid="url(#flowArrow)"
                />
              </g>
            )}

            {/* 3. Intersection Nodes */}
            {networkData?.nodes?.map((node) => {
              const isDepot = node.id === 0;
              const isStop = stopSet.has(node.id);
              const isHovered = hoveredNode?.id === node.id;

              if (isDepot) {
                // Central Depot: Cyan Diamond
                return (
                  <g 
                    key={`node-${node.id}`} 
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <polygon
                      points="0,-12 12,0 0,12 -12,0"
                      fill="#00f0ff"
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter="url(#cyanGlow)"
                      className="animate-quantum-pulse"
                    />
                    <text
                      y="-16"
                      textAnchor="middle"
                      fill="#00f0ff"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                    >
                      DEPOT [0]
                    </text>
                  </g>
                );
              }

              if (isStop) {
                // Delivery Stop: Purple glowing marker with demand badge
                return (
                  <g 
                    key={`node-${node.id}`} 
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => onToggleStop(node.id)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Glowing outer ring */}
                    <circle
                      r="11"
                      fill="#a855f7"
                      fillOpacity="0.3"
                      stroke="#c084fc"
                      strokeWidth="2"
                      filter="url(#purpleGlow)"
                    />
                    {/* Inner core */}
                    <circle
                      r="6"
                      fill="#ffffff"
                    />
                    {/* Stop Number & Demand Badge */}
                    <text
                      y="-14"
                      textAnchor="middle"
                      fill="#e9d5ff"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      className="drop-shadow"
                    >
                      #{node.id} [{node.demand}u]
                    </text>
                  </g>
                );
              }

              // Regular unselected intersection
              return (
                <g 
                  key={`node-${node.id}`} 
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={() => onToggleStop(node.id)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    r={isHovered ? "6" : "3.5"}
                    fill={isHovered ? "#38bdf8" : "#334155"}
                    stroke={isHovered ? "#ffffff" : "#1e293b"}
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                </g>
              );
            })}

          </g>
        </g>
      </svg>

      {/* Floating Hover Tooltip (Node or Edge) */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 z-30 p-2.5 rounded-xl bg-[#0a0f26]/95 border border-cyan-500/40 text-xs font-mono backdrop-blur-md shadow-lg shadow-black/80 max-w-xs pointer-events-none">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
            <span className="font-bold text-cyan-300">
              {hoveredNode.is_depot ? '★ CENTRAL DEPOT' : `INTERSECTION #${hoveredNode.id}`}
            </span>
            <span className="text-[10px] text-slate-400">{hoveredNode.zone}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
            <span>Coordinates:</span>
            <span className="text-right text-slate-100">({hoveredNode.x}, {hoveredNode.y})</span>
            <span>Delivery Demand:</span>
            <span className="text-right text-purple-300 font-bold">{hoveredNode.demand} units</span>
            <span>Status:</span>
            <span className={`text-right font-semibold ${stopSet.has(hoveredNode.id) ? 'text-purple-400' : 'text-slate-400'}`}>
              {hoveredNode.is_depot ? 'Depot Hub' : stopSet.has(hoveredNode.id) ? 'Active Stop' : 'Intersection'}
            </span>
          </div>
          {!hoveredNode.is_depot && (
            <div className="mt-1.5 pt-1 border-t border-white/5 text-[10px] text-cyan-400/80">
              Click to {stopSet.has(hoveredNode.id) ? 'remove from' : 'add to'} stops
            </div>
          )}
        </div>
      )}

      {hoveredEdge && !hoveredNode && (
        <div className="absolute bottom-3 left-3 z-30 p-2.5 rounded-xl bg-[#0a0f26]/95 border border-amber-500/40 text-xs font-mono backdrop-blur-md shadow-lg shadow-black/80 max-w-xs pointer-events-none">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
            <span className="font-bold text-amber-300">
              ROAD SEGMENT ({hoveredEdge.u} ↔ {hoveredEdge.v})
            </span>
            <span className="text-[10px] text-slate-400">{hoveredEdge.is_arterial ? 'Expressway' : 'Street'}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
            <span>Congestion:</span>
            <span className="text-right font-bold" style={{ color: getCongestionColor(hoveredEdge.current_congestion) }}>
              {(hoveredEdge.current_congestion * 100).toFixed(1)}%
            </span>
            <span>Distance:</span>
            <span className="text-right text-slate-100">{hoveredEdge.distance} m</span>
            <span>Travel Time:</span>
            <span className="text-right text-slate-100">{hoveredEdge.travel_time} min</span>
            <span>Composite Cost:</span>
            <span className="text-right text-cyan-300 font-bold">{hoveredEdge.cost}</span>
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-none text-[11px] text-slate-400 font-mono hidden md:block">
        Pan: Drag canvas | Zoom: Scroll wheel | Toggle Stop: Click node
      </div>
    </div>
  );
}
