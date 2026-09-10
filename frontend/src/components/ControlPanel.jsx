import React, { useState } from 'react';
import { 
  Play, 
  RefreshCw, 
  Cpu, 
  Truck, 
  MapPin, 
  Sliders, 
  Flame, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ControlPanel({
  networkNodes,
  onNetworkNodesChange,
  onRegenerateNetwork,
  selectedStops,
  onSelectPresetStops,
  onClearStops,
  vehicleCapacity,
  onVehicleCapacityChange,
  totalDemand,
  congestionMode,
  onToggleCongestion,
  selectedAlgorithm,
  onSelectAlgorithm,
  numParticles,
  onNumParticlesChange,
  maxIterations,
  onMaxIterationsChange,
  onRunOptimization,
  isOptimizing,
  progress,
  totalNodesAvailable
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="cyber-card p-4 sm:p-5 flex flex-col gap-5 text-sm h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="font-heading text-base font-bold text-white uppercase tracking-wider m-0">
            Optimizer Controls
          </h2>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          VRP / TSP Core
        </span>
      </div>

      {/* 1. Road Network Topology Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Network Scale (Nodes):
          </label>
          <span className="font-mono text-xs font-bold text-cyan-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
            {networkNodes} Intersections
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="25"
            max="54"
            step="1"
            value={networkNodes}
            onChange={(e) => onNetworkNodesChange(parseInt(e.target.value))}
            disabled={isOptimizing}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <button
            onClick={onRegenerateNetwork}
            disabled={isOptimizing}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors"
            title="Generate a new random city network layout"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Delivery Stops Configuration */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/30 border border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            Delivery Stops:
          </label>
          <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            {selectedStops.length} Selected
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          Click any intersection pin on the map or pick a quick batch:
        </p>

        <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
          <button
            onClick={() => onSelectPresetStops(8)}
            disabled={isOptimizing}
            className="py-1 rounded bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-200 border border-white/10 text-center transition-colors"
          >
            8 Stops
          </button>
          <button
            onClick={() => onSelectPresetStops(15)}
            disabled={isOptimizing}
            className="py-1 rounded bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-200 border border-white/10 text-center transition-colors"
          >
            15 Stops
          </button>
          <button
            onClick={() => onSelectPresetStops(24)}
            disabled={isOptimizing}
            className="py-1 rounded bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-200 border border-white/10 text-center transition-colors"
          >
            24 Stops
          </button>
          <button
            onClick={onClearStops}
            disabled={isOptimizing}
            className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 text-center transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 3. Vehicle Capacity & Stop Demands */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            Vehicle Fleet Capacity:
          </label>
          <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {vehicleCapacity} Units / Trip
          </span>
        </div>
        <input
          type="range"
          min="15"
          max="80"
          step="5"
          value={vehicleCapacity}
          onChange={(e) => onVehicleCapacityChange(parseInt(e.target.value))}
          disabled={isOptimizing}
          className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
          <span>Active Total Demand: <strong className="text-slate-200">{totalDemand} units</strong></span>
          <span>Est. Trips: <strong className="text-amber-400">{Math.ceil(totalDemand / Math.max(1, vehicleCapacity))}</strong></span>
        </div>
      </div>

      {/* 4. Traffic Congestion Mode Switch */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
        <div>
          <span className="text-xs font-semibold text-slate-300 block">Traffic Flow Simulation</span>
          <span className="text-[11px] text-slate-400">
            {congestionMode === 'rush_hour' ? 'Severe bottleneck surges' : congestionMode === 'tomtom' ? 'Live traffic telemetry' : 'Normal arterial flow'}
          </span>
        </div>
        <button
          onClick={onToggleCongestion}
          disabled={isOptimizing}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all border ${
            congestionMode === 'rush_hour'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/30'
              : congestionMode === 'tomtom'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/30'
              : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
          }`}
        >
          {congestionMode === 'rush_hour' ? 'RUSH HOUR' : congestionMode === 'tomtom' ? 'LIVE TRAFFIC' : 'NORMAL'}
        </button>
      </div>

      {/* 5. Algorithm Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          Target Optimization Model:
        </label>
        <select
          value={selectedAlgorithm}
          onChange={(e) => onSelectAlgorithm(e.target.value)}
          disabled={isOptimizing}
          className="w-full bg-[#0a0f26] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="all">★ Compare All (QPSO vs PSO vs GA vs Greedy)</option>
          <option value="qpso">Quantum Particle Swarm (QPSO) [Delta Well]</option>
          <option value="pso">Classical Particle Swarm (PSO) [Inertia/Vel]</option>
          <option value="ga">Genetic Algorithm (GA) [Order Crossover]</option>
          <option value="greedy">Greedy Nearest Neighbor [Dijkstra]</option>
        </select>
      </div>

      {/* 6. Advanced Hyperparameters Toggle */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Hyperparameters (Bounded for Demo)
          </span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="p-3 border-t border-white/10 flex flex-col gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Swarm Particles:</span>
                <span className="text-cyan-300 font-bold">{numParticles}</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={numParticles}
                onChange={(e) => onNumParticlesChange(parseInt(e.target.value))}
                disabled={isOptimizing}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Max Iterations:</span>
                <span className="text-purple-300 font-bold">{maxIterations}</span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="10"
                value={maxIterations}
                onChange={(e) => onMaxIterationsChange(parseInt(e.target.value))}
                disabled={isOptimizing}
                className="w-full accent-purple-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 7. Action Button & Live Progress Indicator */}
      <div className="mt-auto pt-2 flex flex-col gap-2">
        {isOptimizing && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs">
            <div className="flex items-center justify-between text-cyan-300 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Evaluating Quantum Superposition...
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={onRunOptimization}
          disabled={isOptimizing || selectedStops.length === 0}
          className="btn-quantum w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider cursor-pointer"
        >
          {isOptimizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
              <span>COMPUTING ROUTES...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-900 text-slate-900" />
              <span>RUN OPTIMIZATION</span>
            </>
          )}
        </button>

        {selectedStops.length === 0 && (
          <p className="text-[11px] text-amber-400/90 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Select at least 1 stop to optimize
          </p>
        )}
      </div>
    </div>
  );
}
