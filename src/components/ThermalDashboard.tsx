import React from 'react';
import {
  ThermalSummary,
} from '../types';
import {
  Thermometer,
  Zap,
  Wind,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Flame,
  Snowflake,
  Users,
  Activity,
} from 'lucide-react';
import { getComfortLabel } from '../utils/physics';

interface ThermalDashboardProps {
  summary: ThermalSummary;
  totalOccupants: number;
}

export const ThermalDashboard: React.FC<ThermalDashboardProps> = ({
  summary,
  totalOccupants,
}) => {
  const comfort = getComfortLabel(summary.averagePMV);

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-slate-200 p-3 select-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: Temperatura & Confort */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5 text-cyan-400">
              <Thermometer className="w-3.5 h-3.5" />
              Temperatura en Sala
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: `${comfort.color}25`, color: comfort.color }}
            >
              PMV: {summary.averagePMV}
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{summary.averageTemp} °C</span>
            <span className="text-xs text-slate-400">
              (Mín: {summary.minTemp}° / Máx: {summary.maxTemp}°)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80">
            <span className="text-slate-400">Sensación Térmica:</span>
            <span className="font-bold" style={{ color: comfort.color }}>
              {comfort.text} ({summary.averagePPD}% PPD)
            </span>
          </div>
        </div>

        {/* CARD 2: Balance Térmico (Cargas vs Climatización) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5 text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              Balance Térmico
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                summary.netThermalBalanceW <= 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {summary.netThermalBalanceW <= 0 ? 'Potencia Suficiente' : 'Déficit Frigorífico'}
            </span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">Carga Térmica Total:</span>
              <span className="text-base font-bold text-amber-300">
                {(summary.totalHeatGainW / 1000).toFixed(1)} kW
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">AC Instalado:</span>
              <span className="text-base font-bold text-sky-400">
                {(summary.acCoolingTotalW / 1000).toFixed(1)} kW
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 text-slate-400">
            <span>Personas ({totalOccupants}p): {(summary.occupantsHeatTotalW / 1000).toFixed(1)} kW</span>
            <span>Ventanas: {((summary.windowsSolarHeatW + summary.windowsConductionHeatW) / 1000).toFixed(1)} kW</span>
          </div>
        </div>

        {/* CARD 3: Ventilación & Renovaciones */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
              <Wind className="w-3.5 h-3.5" />
              Renovación de Aire
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              Vol: {summary.auditoriumVolumeM3} m³
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {summary.airChangesPerHour.toFixed(1)} ACH
            </span>
            <span className="text-xs text-slate-400">Renovaciones / hora</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 text-slate-400">
            <span>Inyección: {summary.injectionAirflowTotalM3H} m³/h</span>
            <span>Extracción: {summary.extractionAirflowTotalM3H} m³/h</span>
          </div>
        </div>

        {/* CARD 4: Distribución Térmica & Alertas */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-purple-400">
              <Users className="w-3.5 h-3.5" />
              Áreas de Confort
            </span>
            <span className="text-[10px] text-slate-400">Malla 2D</span>
          </div>

          {/* Segmented bar for comfort / hot / cold */}
          <div className="h-2.5 w-full bg-slate-800 rounded-full flex overflow-hidden my-1">
            <div
              style={{ width: `${summary.coldspotAreaPercent}%` }}
              className="bg-blue-500"
              title={`Frío (<19.5°C): ${summary.coldspotAreaPercent}%`}
            />
            <div
              style={{ width: `${summary.comfortAreaPercent}%` }}
              className="bg-emerald-500"
              title={`Confort Ideal (20-25°C): ${summary.comfortAreaPercent}%`}
            />
            <div
              style={{ width: `${summary.hotspotAreaPercent}%` }}
              className="bg-rose-500"
              title={`Puntos Calientes (>26.5°C): ${summary.hotspotAreaPercent}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span className="text-emerald-400 font-semibold">{summary.comfortAreaPercent}% Confort</span>
            <span className="text-rose-400 font-semibold">{summary.hotspotAreaPercent}% Caliente</span>
            <span className="text-blue-400 font-semibold">{summary.coldspotAreaPercent}% Frío</span>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-300 truncate">
            {summary.statusRecommendation}
          </div>
        </div>
      </div>

      {/* Engineering Diagnostic Alerts Bar */}
      {summary.diagnostics.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            Diagnósticos:
          </span>
          {summary.diagnostics.map((diag, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0 text-xs ${
                diag.type === 'danger'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : diag.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : diag.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {diag.type === 'danger' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              {diag.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
              {diag.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {diag.type === 'info' && <Info className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{diag.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
