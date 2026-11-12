import React from 'react';
import {
  MousePointer,
  Users,
  SquareDot,
  DoorOpen,
  Snowflake,
  Wind,
  Fan,
  HelpCircle,
  Eye,
  EyeOff,
  Compass,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  showHeatmap: boolean;
  setShowHeatmap: (val: boolean) => void;
  showVectors: boolean;
  setShowVectors: (val: boolean) => void;
  showIsotherms: boolean;
  setShowIsotherms: (val: boolean) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  showLabels: boolean;
  setShowLabels: (val: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  showHeatmap,
  setShowHeatmap,
  showVectors,
  setShowVectors,
  showIsotherms,
  setShowIsotherms,
  showGrid,
  setShowGrid,
  showLabels,
  setShowLabels,
}) => {
  const tools: { id: ToolType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      id: 'select',
      label: 'Seleccionar / Mover',
      icon: <MousePointer className="w-4 h-4" />,
      color: 'hover:bg-slate-700',
      desc: 'Haga clic para seleccionar y arrastrar elementos o zonas',
    },
    {
      id: 'occupant_zone',
      label: 'Zona Ocupantes',
      icon: <Users className="w-4 h-4" />,
      color: 'hover:bg-blue-600/30 text-blue-400',
      desc: 'Arrastre un rectángulo para definir área de silletería y número de personas',
    },
    {
      id: 'window',
      label: 'Ventana',
      icon: <SquareDot className="w-4 h-4" />,
      color: 'hover:bg-cyan-600/30 text-cyan-400',
      desc: 'Clic en un muro para ubicar ventana con largo, alto y % apertura',
    },
    {
      id: 'door',
      label: 'Puerta',
      icon: <DoorOpen className="w-4 h-4" />,
      color: 'hover:bg-amber-600/30 text-amber-400',
      desc: 'Clic en un muro para colocar una puerta de acceso',
    },
    {
      id: 'ac_split',
      label: 'AC Split (Pared)',
      icon: <Snowflake className="w-4 h-4" />,
      color: 'hover:bg-sky-600/30 text-sky-300',
      desc: 'Clic en pared para colocar unidad Split (BTU/kW y temp. impulsión)',
    },
    {
      id: 'ac_cassette',
      label: 'AC Casete (Techo)',
      icon: <Snowflake className="w-4 h-4" />,
      color: 'hover:bg-indigo-600/30 text-indigo-300',
      desc: 'Clic en el techo para colocar unidad Casete 4 vías con potencia y temp.',
    },
    {
      id: 'air_injection',
      label: 'Inyección de Aire',
      icon: <ArrowDownToLine className="w-4 h-4" />,
      color: 'hover:bg-emerald-600/30 text-emerald-400',
      desc: 'Insuflador de aire exterior tratado / fresco (m³/h y temp)',
    },
    {
      id: 'air_extraction',
      label: 'Extracción de Aire',
      icon: <ArrowUpFromLine className="w-4 h-4" />,
      color: 'hover:bg-amber-600/30 text-amber-400',
      desc: 'Extractor de aire caliente / retorno hacia el exterior (m³/h)',
    },
    {
      id: 'simple_fan',
      label: 'Ventilador Simple',
      icon: <Fan className="w-4 h-4" />,
      color: 'hover:bg-purple-600/30 text-purple-400',
      desc: 'Ventilador de techo o pared para recirculación y mezcla de aire',
    },
    {
      id: 'probe',
      label: 'Sonda Térmica',
      icon: <Activity className="w-4 h-4" />,
      color: 'hover:bg-rose-600/30 text-rose-400',
      desc: 'Pase el ratón sobre cualquier punto para medir temperatura y confort PMV',
    },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Tool Palette */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden md:inline">
          Herramientas:
        </span>
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                  : `bg-slate-800/80 text-slate-300 hover:text-white ${t.color}`
              }`}
              title={t.desc}
            >
              {t.icon}
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layer Visibility Toggles */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showHeatmap ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar mapa de calor continuo"
        >
          {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Mapa Térmico
        </button>

        <button
          onClick={() => setShowVectors(!showVectors)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showVectors ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar vectores de velocidad y dirección del aire"
        >
          <Wind className="w-3.5 h-3.5" />
          Flujo de Aire
        </button>

        <button
          onClick={() => setShowIsotherms(!showIsotherms)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showIsotherms ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar curvas isotermas"
        >
          <Compass className="w-3.5 h-3.5" />
          Isotermas
        </button>

        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showLabels ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar etiquetas y datos en plano"
        >
          Etiquetas
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showGrid ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar cuadrícula métrica"
        >
          Rejilla
        </button>
      </div>
    </div>
  );
};
