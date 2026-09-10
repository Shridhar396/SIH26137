import React from 'react';
import { 
  Atom, 
  Activity, 
  BookOpen, 
  Flame, 
  Sparkles, 
  Zap, 
  Server,
  Layers
} from 'lucide-react';

export default function Navbar({ 
  congestionMode, 
  onToggleCongestion, 
  onOpenTheory, 
  isOnline, 
  onApplyPreset 
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#050814]/80 backdrop-blur-md px-4 lg:px-8 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#050814] rounded-[11px] flex items-center justify-center">
              <Atom className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: '14s' }} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold tracking-tight text-white m-0">
                Quantum<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Route</span>
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                SIH PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Quantum Particle Swarm Optimizer for Real-Time Dynamic Traffic VRP
            </p>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Preset Buttons */}
          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
            <span className="px-2 text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
            </span>
            <button 
              onClick={() => onApplyPreset('downtown')}
              className="px-2.5 py-1 rounded hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              Downtown (10)
            </button>
            <button 
              onClick={() => onApplyPreset('rush')}
              className="px-2.5 py-1 rounded hover:bg-white/10 text-slate-300 hover:text-rose-400 transition-colors"
            >
              Gridlock (18)
            </button>
            <button 
              onClick={() => onApplyPreset('metro')}
              className="px-2.5 py-1 rounded hover:bg-white/10 text-slate-300 hover:text-purple-300 transition-colors"
            >
              Metro (28)
            </button>
          </div>

          {/* Rush Hour Toggle */}
          <button
            onClick={onToggleCongestion}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
              congestionMode === 'rush_hour'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-rose-500/20'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
            }`}
            title="Toggle between Normal flow and Peak Rush-Hour traffic surge"
          >
            <Flame className={`w-3.5 h-3.5 ${congestionMode === 'rush_hour' ? 'text-rose-400 animate-bounce' : congestionMode === 'tomtom' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span>{congestionMode === 'rush_hour' ? 'Rush Hour (Active)' : congestionMode === 'tomtom' ? 'Live TomTom Traffic' : 'Normal Flow'}</span>
          </button>

          {/* Theory / Math explanation */}
          <button
            onClick={onOpenTheory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:text-white transition-all text-xs font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">How It Works</span>
          </button>

          {/* Backend Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-300">{isOnline ? 'Local Engine' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
