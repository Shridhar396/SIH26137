import React, { useState, useMemo, useEffect } from 'react';
import { 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  Maximize2 
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Center of New Delhi as base for synthetic grid fallback
const BASE_LAT = 28.6139;
const BASE_LNG = 77.2090;

// Helper to convert abstract (x, y) to (lat, lng) if real ones are missing
const toLatLng = (x, y) => {
  const lat = BASE_LAT - (y - 400) / 8000;
  const lng = BASE_LNG + (x - 400) / 8000;
  return [lat, lng];
};

const getPos = (node) => {
  if (node.lat && node.lon && node.lat !== 0) return [node.lat, node.lon];
  return toLatLng(node.x, node.y);
};

// Component to dynamically fit bounds
function FitBounds({ networkData }) {
  const map = useMap();
  
  useEffect(() => {
    if (!networkData || !networkData.nodes || networkData.nodes.length === 0) return;
    
    const bounds = L.latLngBounds(networkData.nodes.map(n => getPos(n)));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [networkData, map]);
  
  return null;
}

export default function GraphView({
  networkData,
  selectedStops,
  onToggleStop,
  bestRouteStops,
  detailedPathCoords,
  detailedPathLatlons,
  bestAlgorithm
}) {
  const stopSet = useMemo(() => new Set(selectedStops), [selectedStops]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    if (networkData?.nodes) {
      networkData.nodes.forEach(n => map.set(n.id, n));
    }
    return map;
  }, [networkData]);

  // Congestion color gradient
  const getCongestionColor = (cong) => {
    if (cong < 0.30) return '#10b981'; // Green
    if (cong < 0.50) return '#84cc16'; // Lime
    if (cong < 0.70) return '#f59e0b'; // Amber
    if (cong < 0.85) return '#f97316'; // Orange
    return '#f43f5e';                  // Crimson Red
  };

  const routePolyline = useMemo(() => {
    if (detailedPathLatlons && detailedPathLatlons.length >= 2) {
      return detailedPathLatlons;
    }
    if (detailedPathCoords && detailedPathCoords.length >= 2) {
      return detailedPathCoords.map(pt => toLatLng(pt[0], pt[1]));
    }
    return [];
  }, [detailedPathCoords, detailedPathLatlons]);

  return (
    <div className="cyber-card relative w-full h-full min-h-[480px] lg:min-h-[560px] flex flex-col overflow-hidden rounded-xl border border-white/10">
      
      {/* Top Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#050814]/90 border border-white/10 text-xs font-mono backdrop-blur-md">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-semibold">Satellite Grid</span>
          <span className="text-slate-400 text-[10px]">({networkData?.nodes?.length || 0} Nodes, {networkData?.edges?.length || 0} Roads)</span>
        </div>
        {bestAlgorithm && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Active Path: <strong className="uppercase">{bestAlgorithm}</strong></span>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050814]/90 border border-white/10 text-[11px] font-mono backdrop-blur-md">
          <span className="text-slate-400">Traffic:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <span className="text-[10px] text-emerald-400">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
            <span className="text-[10px] text-amber-400">Med</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
            <span className="text-[10px] text-rose-400">High</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer 
        center={[BASE_LAT, BASE_LNG]} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', background: '#050814' }}
        zoomControl={false}
      >
        <FitBounds networkData={networkData} />
        
        {/* Esri World Imagery (Satellite Base) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={19}
        />
        
        {/* Labels Overlay so location names are visible */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
          zIndex={10}
        />

        {/* 1. Road Network Edges */}
        {networkData?.edges?.map((edge, idx) => {
          const uNode = nodeMap.get(edge.u);
          const vNode = nodeMap.get(edge.v);
          if (!uNode || !vNode) return null;

          const positions = edge.geometry && edge.geometry.length > 0
            ? edge.geometry
            : [getPos(uNode), getPos(vNode)];
          
          const cong = edge.current_congestion;
          const edgeColor = getCongestionColor(cong);

          return (
            <Polyline 
              key={`edge-${idx}`} 
              positions={positions} 
              color={edgeColor} 
              weight={edge.is_arterial ? 5 : 3}
              opacity={edge.is_arterial ? 0.9 : 0.6}
              dashArray={edge.is_arterial ? "8, 6" : null}
            >
              <Tooltip sticky>
                <div className="text-xs font-mono">
                  <strong className="text-slate-800">ROAD ({edge.u} ↔ {edge.v})</strong><br/>
                  Congestion: {(cong * 100).toFixed(1)}%<br/>
                  Distance: {edge.distance}m<br/>
                  Time: {edge.travel_time}min
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* 2. Highlighted Optimized Route */}
        {routePolyline.length > 0 && (
          <Polyline 
            positions={routePolyline} 
            color="#00f0ff" 
            weight={6}
            opacity={0.8}
            className="animate-pulse"
          />
        )}

        {/* 3. Intersection Nodes */}
        {networkData?.nodes?.map((node) => {
          const isDepot = node.id === 0;
          const isStop = stopSet.has(node.id);
          const pos = getPos(node);

          let fillColor = "#334155";
          let color = "#1e293b";
          let radius = 6;
          let fillOpacity = 0.8;

          if (isDepot) {
            fillColor = "#00f0ff";
            color = "#ffffff";
            radius = 10;
            fillOpacity = 1;
          } else if (isStop) {
            fillColor = "#a855f7";
            color = "#ffffff";
            radius = 8;
            fillOpacity = 1;
          }

          return (
            <CircleMarker 
              key={`node-${node.id}`} 
              center={pos} 
              radius={radius}
              fillColor={fillColor}
              color={color}
              weight={2}
              fillOpacity={fillOpacity}
              eventHandlers={{
                click: () => {
                  if (!isDepot && onToggleStop) onToggleStop(node.id);
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="text-xs font-mono">
                  <strong className="text-slate-800">
                    {isDepot ? '★ CENTRAL DEPOT' : `INTERSECTION #${node.id}`}
                  </strong><br/>
                  Zone: {node.zone}<br/>
                  Demand: {node.demand} units
                  {!isDepot && (
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[#a855f7]">
                      Click to {isStop ? 'remove from' : 'add to'} route
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
