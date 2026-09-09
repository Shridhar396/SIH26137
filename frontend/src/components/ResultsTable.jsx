import React, { useState } from 'react';
import { 
  Trophy, 
  Clock, 
  Navigation, 
  ArrowUpDown, 
  Zap, 
  CheckCircle2, 
  Truck,
  Sparkles
} from 'lucide-react';

export default function ResultsTable({ 
  results, 
  bestAlgorithm, 
  bestKnownProxy,
  totalDistance,
  totalTravelTime,
  totalStops,
  totalDemand
}) {
  const [sortField, setSortField] = useState('best_cost');
  const [sortAsc, setSortAsc] = useState(true);

  if (!results || Object.keys(results).length === 0) return null;

  const algNames = {
    qpso: 'Quantum PSO (QPSO)',
    pso: 'Classical PSO',
    ga: 'Genetic Algorithm (GA)',
    greedy: 'Greedy Nearest Neighbor'
  };

  const rows = Object.entries(results).map(([key, data]) => ({
    key,
    name: algNames[key] || key.toUpperCase(),
    best_cost: data.best_cost,
    runtime_ms: data.runtime_ms,
    iter95: data.iter_to_95_optimal,
    num_trips: data.num_trips || 1,
    gap_percent: data.gap_percent || 0.0,
    isWinner: key === bestAlgorithm
  }));

  // Sort rows
  rows.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Calculate percentage improvement of QPSO over Classical PSO
  const qpsoCost = results?.qpso?.best_cost;
  const psoCost = results?.pso?.best_cost;
  const qpsoImprovement = (qpsoCost && psoCost && psoCost > 0)
    ? (((psoCost - qpsoCost) / psoCost) * 100).toFixed(1)
    : null;

  return (
    <div className="cyber-card p-4 sm:p-5 flex flex-col gap-4">
      {/* Header with Title and KPI Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider m-0">
            Performance Benchmarking Matrix
          </h3>
        </div>

        {/* Global Winner Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-xs font-mono text-cyan-300 shadow-sm shadow-cyan-500/20">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>Optimal Solver: <strong className="text-white uppercase">{algNames[bestAlgorithm] || bestAlgorithm}</strong></span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" /> Best Composite Cost
          </span>
          <span className="text-lg font-heading font-bold text-white mt-1">
            {bestKnownProxy?.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
            {qpsoImprovement && Number(qpsoImprovement) > 0 ? `+${qpsoImprovement}% vs Classical` : 'Ground Truth Proxy'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-cyan-400" /> Total Route Distance
          </span>
          <span className="text-lg font-heading font-bold text-cyan-300 mt-1">
            {totalDistance || 0} <span className="text-xs text-slate-400">m</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {totalStops} Stops Visited
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" /> Estimated Travel Time
          </span>
          <span className="text-lg font-heading font-bold text-purple-300 mt-1">
            {totalTravelTime || 0} <span className="text-xs text-slate-400">min</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Accounting for Congestion
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Truck className="w-3 h-3 text-amber-400" /> Fleet Capacity Demand
          </span>
          <span className="text-lg font-heading font-bold text-amber-300 mt-1">
            {totalDemand || 0} <span className="text-xs text-slate-400">units</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {results[bestAlgorithm]?.num_trips || 1} Vehicle Trip(s)
          </span>
        </div>
      </div>

      {/* Benchmark Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-white/5 border-b border-white/10 text-slate-300">
            <tr>
              <th className="p-3 font-semibold">Algorithm</th>
              <th 
                className="p-3 font-semibold cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={() => handleSort('best_cost')}
              >
                <div className="flex items-center gap-1">
                  Final Cost <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="p-3 font-semibold cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={() => handleSort('runtime_ms')}
              >
                <div className="flex items-center gap-1">
                  Runtime (ms) <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="p-3 font-semibold cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={() => handleSort('iter95')}
              >
                <div className="flex items-center gap-1">
                  Iter to 95% Opt <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-semibold">Fleet Trips</th>
              <th className="p-3 font-semibold text-right">Optimality Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {rows.map((row) => (
              <tr 
                key={row.key} 
                className={`transition-colors ${
                  row.isWinner 
                    ? 'bg-cyan-500/10 hover:bg-cyan-500/15' 
                    : 'hover:bg-white/5'
                }`}
              >
                <td className="p-3 font-semibold flex items-center gap-2">
                  {row.isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={row.isWinner ? 'text-cyan-300 font-bold' : 'text-slate-200'}>
                    {row.name}
                  </span>
                  {row.key === 'qpso' && (
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-400/30">
                      QUANTUM
                    </span>
                  )}
                </td>
                <td className="p-3 font-bold text-white">
                  {row.best_cost?.toLocaleString()}
                </td>
                <td className="p-3 text-slate-300">
                  {row.runtime_ms} ms
                </td>
                <td className="p-3 text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-bold">
                    {row.iter95} iter
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {row.num_trips}
                </td>
                <td className="p-3 text-right">
                  {row.isWinner ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      BEST (0.0%)
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      +{row.gap_percent}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 font-mono">
        * Ground-truth proxy optimum <code className="text-cyan-400">f* = min(QPSO, PSO, GA)</code> represents the lowest fitness achieved across all engines for the exact problem instance.
      </p>
    </div>
  );
}
