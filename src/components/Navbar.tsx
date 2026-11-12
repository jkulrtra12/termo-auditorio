import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Download,
  Upload,
  FileText,
  Layers,
  Box,
  Flame,
  Thermometer,
} from 'lucide-react';
import { ViewTabType } from '../types';
import { PRESETS } from '../utils/presets';

interface NavbarProps {
  activeTab: ViewTabType;
  setActiveTab: (tab: ViewTabType) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onSolveSteadyState: () => void;
  onResetSimulate: () => void;
  currentPresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenReport: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSimulating,
  onToggleSimulate,
  onSolveSteadyState,
  onResetSimulate,
  currentPresetId,
  onSelectPreset,
  onOpenReport,
  onExportJSON,
  onImportJSON,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center">
          <Thermometer className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white m-0">TERMO-AUDITORIO</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CFD & HVAC v2.5
            </span>
          </div>
          <p className="text-xs text-slate-400 m-0">Análisis y Simulación Térmica en Auditorios</p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
        <span className="text-xs text-slate-400 font-medium">Plantilla:</span>
        <select
          value={currentPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="bg-transparent text-xs text-cyan-300 font-medium focus:outline-none cursor-pointer"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-white">
              {p.name}
            </option>
          ))}
          <option value="custom" className="bg-slate-900 text-white">
            ✎ Proyecto Personalizado
          </option>
        </select>
      </div>

      {/* 2D / 3D / SimScale Switch */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('2d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === '2d'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Planta 2D
        </button>
        <button
          onClick={() => setActiveTab('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === '3d'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          Espacio 3D
        </button>
        <button
          onClick={() => setActiveTab('simscale')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'simscale'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/25 ring-1 ring-cyan-400/50'
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-900'
          }`}
          title="Vista 3D SimScale con plano de corte térmico y balizas de sensores"
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>SimScale 3D</span>
          <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-1 py-0.2 rounded font-bold uppercase">
            CFD
          </span>
        </button>
      </div>

      {/* Simulation Engine Controls */}
      <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
        <button
          onClick={onToggleSimulate}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={isSimulating ? 'Pausar simulación' : 'Iniciar simulación en tiempo real'}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isSimulating ? 'Pausar' : 'Simular'}
        </button>

        <button
          onClick={onSolveSteadyState}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all hover:border-cyan-400"
          title="Calcular estado estacionario instantáneo (Equilibrio térmico final)"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Equilibrio
        </button>

        <button
          onClick={onResetSimulate}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Reiniciar temperatura inicial"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions: Export Report & Save/Load */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all"
        >
          <FileText className="w-3.5 h-3.5" />
          Informe Técnico
        </button>

        <button
          onClick={onExportJSON}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
          title="Guardar proyecto (.json)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
          title="Cargar proyecto (.json)"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </header>
  );
};
