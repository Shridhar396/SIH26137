import React from 'react';
import { X, BookOpen, Atom, Zap, Layers, Cpu, Compass, CheckCircle2 } from 'lucide-react';

export default function HowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="cyber-card-glow max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6 text-slate-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Atom className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white tracking-wide m-0">
                How QuantumRoute Works
              </h2>
              <p className="text-xs text-cyan-300/80 font-mono">
                Mathematical Foundations & Technical Architecture for SIH Judges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="flex flex-col gap-6 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. SPV Encoding */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold font-heading text-base">
              <Compass className="w-5 h-5 text-cyan-400" />
              1. Smallest Position Value (SPV) Continuous-to-Discrete Mapping
            </div>
            <p className="text-slate-300">
              Vehicle routing is a discrete permutation problem (e.g. stop sequence <code>[3 → 7 → 1]</code>), whereas quantum mechanics operates in continuous Hilbert space. We bridge this using <strong>SPV encoding</strong>:
            </p>
            <div className="p-3 rounded-lg bg-[#050814] border border-cyan-500/30 font-mono text-xs flex flex-col gap-1.5 text-cyan-200">
              <div><strong>Continuous Particle:</strong> <code>X = [+1.42, -0.85, +0.31, -2.10]</code></div>
              <div><strong>Sorted Indices (argsort):</strong> <code>Order = [3, 1, 2, 0]</code></div>
              <div><strong>Discrete Visiting Sequence:</strong> <code>Stop #3 → Stop #1 → Stop #2 → Stop #0</code></div>
            </div>
            <p className="text-slate-400 text-xs">
              <strong>Key Advantage:</strong> Eliminates infeasible tours or duplicate visits. Every continuous position translates into a mathematically valid routing permutation with zero repair heuristics needed.
            </p>
          </div>

          {/* 2. Quantum Delta Potential Well & mbest */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-purple-300 font-bold font-heading text-base">
              <Atom className="w-5 h-5 text-purple-400" />
              2. Quantum Delta-Potential-Well Mechanics (Why It Beats Classical PSO)
            </div>
            <p className="text-slate-300">
              In Classical PSO, particles follow Newtonian mechanics using velocity and inertia vectors:
              <br />
              <code className="text-amber-300">V(t+1) = w·V(t) + c1·r1·(pbest - X) + c2·r2·(gbest - X)</code>.
              This frequently causes premature convergence because particles get trapped in local energy wells.
            </p>
            <p className="text-slate-300">
              In <strong>QPSO</strong> (Sun et al.), particles have no fixed trajectory. Instead, each particle moves inside a <strong>quantum delta potential well</strong> centered at a stochastic local attractor:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#050814] border border-purple-500/30 flex flex-col gap-1">
                <span className="text-purple-300 font-bold">Mean-Best Position (mbest):</span>
                <p className="text-slate-300 text-[11px]">
                  <code>mbest = (1/M) · Σ P_i</code>
                  <br />
                  Center of gravity representing the collective memory of the entire swarm.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#050814] border border-purple-500/30 flex flex-col gap-1">
                <span className="text-purple-300 font-bold">Local Attractor (p_i):</span>
                <p className="text-slate-300 text-[11px]">
                  <code>p_i = φ · P_i + (1 - φ) · G</code>
                  <br />
                  Stochastic balance between personal best P_i and global swarm best G.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#050814] border border-purple-500/40 font-mono text-xs text-purple-200">
              <div className="font-bold text-white mb-1">Quantum Wave Function Position Update:</div>
              <code>X_{'{i,d}'}(t+1) = p_{'{i,d}'} ± α · |mbest_d - X_{'{i,d}'}| · ln(1 / u)</code>
              <p className="mt-1.5 text-[11px] text-slate-400">
                where <code>u ~ U(0, 1)</code>, sign is chosen randomly (50%), and <code>α</code> is the Contraction-Expansion (CE) coefficient dynamically annealed from 1.0 down to 0.5.
              </p>
            </div>

            <p className="text-slate-300 text-xs">
              <strong>Quantum Tunneling Effect:</strong> Because the probability density function has non-zero tails across the entire state space, QPSO particles can tunnel across high cost barriers to discover globally superior delivery routes.
            </p>
          </div>

          {/* 3. Multi-Objective Edge Cost */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold font-heading text-base">
              <Zap className="w-5 h-5 text-amber-400" />
              3. Dynamic Congestion Cost Function
            </div>
            <p className="text-slate-300">
              Unlike static TSP solvers that only minimize physical Euclidean distance, QuantumRoute minimizes a dynamic composite cost:
            </p>
            <div className="p-3 rounded-lg bg-[#050814] border border-amber-500/30 font-mono text-xs text-amber-200">
              <code>cost(u, v, t) = α · Distance(u, v) + β · Travel_Time(u, v) + γ · Congestion(u, v, t)^1.8</code>
            </div>
            <p className="text-slate-400 text-xs">
              When <strong>Rush Hour Mode</strong> is enabled, sinusoidal traffic waves choke arterial highways. QuantumRoute dynamically reroutes around bottlenecks via secondary streets.
            </p>
          </div>

          {/* 4. Capacitated VRP (CVRP) */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-300 font-bold font-heading text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              4. Capacitated Vehicle Fleet Splitting
            </div>
            <p className="text-slate-300">
              Each delivery stop has an assigned demand between 1 and 10 units. As the vehicle executes the SPV sequence, cumulative payload is tracked. When the next stop would breach vehicle capacity <code>C</code>, the vehicle automatically returns to Central Depot (Node 0) to reload, seamlessly dividing the global permutation into optimal multi-trip routes.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="btn-quantum px-6 py-2 rounded-xl text-xs font-bold"
          >
            Got It, Back to Demo
          </button>
        </div>
      </div>
    </div>
  );
}
