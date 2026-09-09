import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import ControlPanel from './components/ControlPanel';
import GraphView from './components/GraphView';
import ConvergenceChart from './components/ConvergenceChart';
import ResultsTable from './components/ResultsTable';
import ScalabilityChart from './components/ScalabilityChart';
import HowItWorksModal from './components/HowItWorksModal';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  // Backend State
  const [isOnline, setIsOnline] = useState(false);
  const [networkData, setNetworkData] = useState(null);

  // Configuration State
  const [networkNodes, setNetworkNodes] = useState(36);
  const [congestionMode, setCongestionMode] = useState('normal');
  const [selectedStops, setSelectedStops] = useState([4, 8, 14, 21, 28, 33]);
  const [vehicleCapacity, setVehicleCapacity] = useState(35);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('all');
  const [numParticles, setNumParticles] = useState(30);
  const [maxIterations, setMaxIterations] = useState(80);

  // Optimization Output State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [optimizationData, setOptimizationData] = useState(null);

  // UI State
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const progressTimerRef = useRef(null);

  // 1. Health check & Initial Network Load
  const checkHealthAndLoad = useCallback(async () => {
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`);
      if (healthRes.ok) {
        setIsOnline(true);
        // Load initial network
        const netRes = await fetch(`${API_BASE}/api/generate-network`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ num_nodes: networkNodes, congestion_mode: congestionMode, seed: 42 })
        });
        if (netRes.ok) {
          const data = await netRes.json();
          setNetworkData(data);
        }
      }
    } catch (err) {
      console.warn("Backend not yet connected:", err.message);
      setIsOnline(false);
    }
  }, [networkNodes, congestionMode]);

  useEffect(() => {
    checkHealthAndLoad();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [checkHealthAndLoad]);

  // 2. Regenerate Network
  const handleRegenerateNetwork = async () => {
    try {
      const newSeed = Math.floor(Math.random() * 100000);
      const res = await fetch(`${API_BASE}/api/generate-network`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_nodes: networkNodes, congestion_mode: congestionMode, seed: newSeed })
      });
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);
        // Reset selected stops to a subset of valid nodes
        const validIds = data.nodes.filter(n => n.id !== 0).map(n => n.id);
        const sampleSize = Math.min(8, validIds.length);
        const shuffled = [...validIds].sort(() => 0.5 - Math.random());
        setSelectedStops(shuffled.slice(0, sampleSize));
        setOptimizationData(null);
      }
    } catch (err) {
      console.error("Failed to regenerate network:", err);
    }
  };

  // 3. Toggle Congestion Mode (Normal <-> Rush Hour)
  const handleToggleCongestion = async () => {
    const nextMode = congestionMode === 'normal' ? 'rush_hour' : 'normal';
    setCongestionMode(nextMode);
    try {
      const res = await fetch(`${API_BASE}/api/update-congestion?mode=${nextMode}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);
      }
    } catch (err) {
      console.error("Failed to update congestion mode:", err);
    }
  };

  // 4. Stop Selection Handlers
  const handleToggleStop = (nodeId) => {
    if (nodeId === 0) return; // Depot cannot be a delivery stop
    setSelectedStops(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSelectPresetStops = (count) => {
    if (!networkData?.nodes) return;
    const available = networkData.nodes.filter(n => n.id !== 0).map(n => n.id);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    setSelectedStops(shuffled.slice(0, Math.min(count, available.length)));
  };

  const handleClearStops = () => {
    setSelectedStops([]);
  };

  // 5. Presets
  const handleApplyPreset = async (type) => {
    let nodes = 36;
    let mode = 'normal';
    let stops = [];

    if (type === 'downtown') {
      nodes = 30;
      mode = 'normal';
      setNetworkNodes(30);
      setCongestionMode('normal');
    } else if (type === 'rush') {
      nodes = 42;
      mode = 'rush_hour';
      setNetworkNodes(42);
      setCongestionMode('rush_hour');
    } else if (type === 'metro') {
      nodes = 48;
      mode = 'normal';
      setNetworkNodes(48);
      setCongestionMode('normal');
    }

    try {
      const res = await fetch(`${API_BASE}/api/generate-network`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_nodes: nodes, congestion_mode: mode, seed: 777 })
      });
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);
        const valid = data.nodes.filter(n => n.id !== 0).map(n => n.id);
        const targetCount = type === 'downtown' ? 10 : type === 'rush' ? 18 : 28;
        setSelectedStops(valid.slice(0, Math.min(targetCount, valid.length)));
        setOptimizationData(null);
      }
    } catch (err) {
      console.error("Error applying preset:", err);
    }
  };

  // 6. Run Optimization
  const handleRunOptimization = async () => {
    if (selectedStops.length === 0) return;

    setIsOptimizing(true);
    setProgress(10);

    // Progress simulation while server computes
    progressTimerRef.current = setInterval(() => {
      setProgress(p => (p < 90 ? p + Math.floor(Math.random() * 15) + 5 : p));
    }, 120);

    try {
      const payload = {
        start_node: 0,
        stop_nodes: selectedStops,
        vehicle_capacity: vehicleCapacity,
        congestion_mode: congestionMode,
        algorithm: selectedAlgorithm,
        num_particles: numParticles,
        max_iterations: maxIterations
      };

      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(100);
        setOptimizationData(data);

        // If QPSO is winner or top performer, fire celebratory quantum confetti!
        if (data.best_algorithm === 'qpso' || data.results?.qpso) {
          confetti({
            particleCount: 75,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f0ff', '#a855f7', '#6366f1', '#10b981']
          });
        }
      } else {
        const errJson = await res.json();
        alert(`Optimization failed: ${errJson.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Error running optimization:", err);
      alert("Failed to connect to backend optimization service. Ensure Python backend is running.");
    } finally {
      clearInterval(progressTimerRef.current);
      setTimeout(() => {
        setIsOptimizing(false);
        setProgress(0);
      }, 400);
    }
  };

  // Compute total demand for selected stops
  const totalDemand = selectedStops.reduce((sum, stopId) => {
    const n = networkData?.nodes?.find(node => node.id === stopId);
    return sum + (n?.demand || 0);
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#050814] text-slate-100">
      {/* Top Header Navbar */}
      <Navbar
        congestionMode={congestionMode}
        onToggleCongestion={handleToggleCongestion}
        onOpenTheory={() => setShowTheoryModal(true)}
        isOnline={isOnline}
        onApplyPreset={handleApplyPreset}
      />

      {/* Main Control-Room Grid */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1720px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Left Column: Controls (4 cols on desktop) */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col">
          <ControlPanel
            networkNodes={networkNodes}
            onNetworkNodesChange={setNetworkNodes}
            onRegenerateNetwork={handleRegenerateNetwork}
            selectedStops={selectedStops}
            onSelectPresetStops={handleSelectPresetStops}
            onClearStops={handleClearStops}
            vehicleCapacity={vehicleCapacity}
            onVehicleCapacityChange={setVehicleCapacity}
            totalDemand={totalDemand}
            congestionMode={congestionMode}
            onToggleCongestion={handleToggleCongestion}
            selectedAlgorithm={selectedAlgorithm}
            onSelectAlgorithm={setSelectedAlgorithm}
            numParticles={numParticles}
            onNumParticlesChange={setNumParticles}
            maxIterations={maxIterations}
            onMaxIterationsChange={setMaxIterations}
            onRunOptimization={handleRunOptimization}
            isOptimizing={isOptimizing}
            progress={progress}
            totalNodesAvailable={networkData?.nodes?.length || 0}
          />
        </aside>

        {/* Right Column: Visualization & Telemetry (8 cols on desktop) */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4 sm:gap-5">
          
          {/* 1. Interactive Road Network Visualization */}
          <div className="w-full">
            <GraphView
              networkData={networkData}
              selectedStops={selectedStops}
              onToggleStop={handleToggleStop}
              bestRouteStops={optimizationData?.best_route_stops}
              detailedPathCoords={optimizationData?.detailed_path_coords}
              bestAlgorithm={optimizationData?.best_algorithm}
              congestionMode={congestionMode}
              isOptimizing={isOptimizing}
            />
          </div>

          {/* 2. Convergence Dynamics & KPI Table */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ConvergenceChart
              results={optimizationData?.results}
              bestKnownProxy={optimizationData?.best_known_proxy}
            />
            <ResultsTable
              results={optimizationData?.results}
              bestAlgorithm={optimizationData?.best_algorithm}
              bestKnownProxy={optimizationData?.best_known_proxy}
              totalDistance={optimizationData?.total_physical_distance}
              totalTravelTime={optimizationData?.total_travel_time_min}
              totalStops={optimizationData?.total_stops_visited}
              totalDemand={optimizationData?.total_demand}
            />
          </div>

          {/* 3. Scalability Benchmark Stress Test */}
          <div className="w-full">
            <ScalabilityChart congestionMode={congestionMode} />
          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-4 px-6 text-center text-xs font-mono text-slate-400 bg-black/40">
        QuantumRoute • Quantum-Inspired Intelligent Traffic Route Optimization • Smart India Hackathon 2024-2025 • Fully Local & Offline
      </footer>

      {/* Mathematical Theory & Architecture Modal */}
      <HowItWorksModal
        isOpen={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
      />
    </div>
  );
}
