import React, { useRef } from 'react';
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  SimpleFan,
  ThermalSummary,
} from '../types';
import { Printer, Download, X, Thermometer, ShieldCheck, FileText } from 'lucide-react';
import { getComfortLabel } from '../utils/physics';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AuditoriumConfig;
  occupantZones: OccupantZone[];
  windows: WindowItem[];
  acUnits: ACEquipment[];
  airFlowUnits: AirFlowEquipment[];
  fans: SimpleFan[];
  summary: ThermalSummary;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  config,
  occupantZones,
  windows,
  acUnits,
  airFlowUnits,
  fans,
  summary,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalOccupants = occupantZones.reduce((acc, z) => acc + z.occupants, 0);
  const comfort = getComfortLabel(summary.averagePMV);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Informe Técnico de Climatización y Análisis Térmico
              </h2>
              <p className="text-xs text-slate-400 m-0">
                Memoria de cálculo y distribución de temperatura en auditorio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div
          ref={reportRef}
          className="p-6 overflow-y-auto space-y-6 text-slate-200 text-xs bg-slate-900 print:bg-white print:text-black print:p-0"
        >
          {/* Header Summary Box */}
          <div className="border border-slate-700 print:border-black rounded-xl p-4 bg-slate-950/40 print:bg-slate-50 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-cyan-400 print:text-blue-700 m-0">
                PROYECTO: CLIMATIZACIÓN DE AUDITORIO
              </h1>
              <p className="text-slate-400 print:text-slate-600 m-0 text-xs">
                Fecha: {new Date().toLocaleDateString('es-ES')} | Software: TERMO-AUDITORIO v2.5 (CFD & HVAC)
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 print:text-slate-600 block">Confort Resultante:</span>
              <span
                className="text-sm font-bold px-2 py-0.5 rounded inline-block mt-0.5"
                style={{
                  backgroundColor: `${comfort.color}25`,
                  color: comfort.color,
                }}
              >
                {comfort.text} (PMV: {summary.averagePMV})
              </span>
            </div>
          </div>

          {/* Section 1: Geometría y Condiciones Exteriores */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              1. Geometría del Auditorio y Clima Exterior
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 print:text-black">
              <div className="p-2.5 bg-slate-950/60 print:bg-slate-100 rounded-lg">
                <span className="text-slate-400 print:text-slate-500 block text-[10px]">Dimensiones:</span>
                <span className="font-bold">{config.width}m x {config.length}m x {config.height}m</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 print:bg-slate-100 rounded-lg">
                <span className="text-slate-400 print:text-slate-500 block text-[10px]">Superficie / Volumen:</span>
                <span className="font-bold">{(config.width * config.length).toFixed(1)} m² | {summary.auditoriumVolumeM3} m³</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 print:bg-slate-100 rounded-lg">
                <span className="text-slate-400 print:text-slate-500 block text-[10px]">Temperatura Exterior:</span>
                <span className="font-bold text-amber-400 print:text-amber-700">{config.ambientTemperature} °C</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 print:bg-slate-100 rounded-lg">
                <span className="text-slate-400 print:text-slate-500 block text-[10px]">Radiación Solar / Viento:</span>
                <span className="font-bold">{config.solarRadiation} W/m² | {config.externalWindSpeed} m/s</span>
              </div>
            </div>
          </div>

          {/* Section 2: Balance Térmico General */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              2. Balance Térmico y Cargas de Climatización
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cargas de Calor */}
              <div className="p-3 bg-slate-950/60 print:bg-slate-100 rounded-xl space-y-1.5 border border-slate-800 print:border-slate-300">
                <div className="font-bold text-amber-400 print:text-amber-800 mb-1">
                  Ganancias de Calor (Cargas Térmicas)
                </div>
                <div className="flex justify-between">
                  <span>Ocupantes ({totalOccupants} personas):</span>
                  <span className="font-mono font-bold">{(summary.occupantsHeatTotalW / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Radiación Solar en Ventanas:</span>
                  <span className="font-mono font-bold">{(summary.windowsSolarHeatW / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Conducción en Ventanas y Vidrios:</span>
                  <span className="font-mono font-bold">{(summary.windowsConductionHeatW / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Conducción en Muros Perimetrales y Techo:</span>
                  <span className="font-mono font-bold">{(summary.wallsConductionHeatW / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventilación / Infiltración Aire Exterior:</span>
                  <span className="font-mono font-bold">{(summary.ventilationHeatW / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-800 print:border-slate-300 font-bold text-white print:text-black">
                  <span>CARGA TÉRMICA TOTAL:</span>
                  <span className="text-amber-400 print:text-amber-700">
                    {(summary.totalHeatGainW / 1000).toFixed(2)} kW (~{Math.round(summary.totalHeatGainW * 3.412).toLocaleString()} BTU/h)
                  </span>
                </div>
              </div>

              {/* Potencia Frigorífica */}
              <div className="p-3 bg-slate-950/60 print:bg-slate-100 rounded-xl space-y-1.5 border border-slate-800 print:border-slate-300">
                <div className="font-bold text-sky-400 print:text-blue-800 mb-1">
                  Capacidad de Refrigeración Instalada (HVAC)
                </div>
                <div className="flex justify-between">
                  <span>Unidades AC Split activas:</span>
                  <span className="font-mono font-bold">
                    {acUnits.filter((u) => u.type === 'split' && u.enabled).length} uds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Unidades AC Casete activas:</span>
                  <span className="font-mono font-bold">
                    {acUnits.filter((u) => u.type === 'cassette' && u.enabled).length} uds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Potencia Frigorífica Total:</span>
                  <span className="font-mono font-bold text-sky-400 print:text-blue-700">
                    {(summary.acCoolingTotalW / 1000).toFixed(2)} kW ({Math.round(summary.acCoolingTotalBTU).toLocaleString()} BTU/h)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Renovaciones por Hora (ACH):</span>
                  <span className="font-mono font-bold text-emerald-400 print:text-emerald-700">
                    {summary.airChangesPerHour.toFixed(1)} ACH
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-800 print:border-slate-300 font-bold text-white print:text-black">
                  <span>BALANCE NETO:</span>
                  <span className={summary.netThermalBalanceW <= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}>
                    {summary.netThermalBalanceW <= 0 ? 'Superávit ' : 'Déficit '}
                    {Math.abs(summary.netThermalBalanceW / 1000).toFixed(2)} kW
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tabla de Equipos y Elementos */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              3. Relación de Equipamiento de Climatización y Ventilación
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-600 font-semibold text-[11px]">
                    <th className="py-2">Elemento</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Ubicación (X, Y, Z)</th>
                    <th className="py-2">Capacidad / Caudal</th>
                    <th className="py-2">Temperatura</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {acUnits.map((ac) => (
                    <tr key={ac.id}>
                      <td className="py-2 font-medium">{ac.name}</td>
                      <td className="py-2">{ac.type === 'split' ? 'Split Pared' : 'Casete Techo'}</td>
                      <td className="py-2 font-mono">({ac.x}m, {ac.y}m, {ac.z}m)</td>
                      <td className="py-2 font-mono">{ac.coolingCapacityBTU.toLocaleString()} BTU/h ({ac.coolingCapacityKW} kW)</td>
                      <td className="py-2">{ac.supplyTemperature}°C</td>
                      <td className="py-2">
                        <span className={ac.enabled ? 'text-emerald-400 print:text-emerald-700 font-bold' : 'text-slate-500'}>
                          {ac.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {airFlowUnits.map((af) => (
                    <tr key={af.id}>
                      <td className="py-2 font-medium">{af.name}</td>
                      <td className="py-2">{af.type === 'injection' ? 'Inyección Aire' : 'Extracción Aire'}</td>
                      <td className="py-2 font-mono">({af.x}m, {af.y}m, {af.z}m)</td>
                      <td className="py-2 font-mono">{af.airflowM3H} m³/h</td>
                      <td className="py-2">{af.supplyTemperature ? `${af.supplyTemperature}°C` : '-'}</td>
                      <td className="py-2">
                        <span className={af.enabled ? 'text-emerald-400 print:text-emerald-700 font-bold' : 'text-slate-500'}>
                          {af.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {fans.map((fan) => (
                    <tr key={fan.id}>
                      <td className="py-2 font-medium">{fan.name}</td>
                      <td className="py-2">Ventilador Simple</td>
                      <td className="py-2 font-mono">({fan.x}m, {fan.y}m, {fan.z}m)</td>
                      <td className="py-2 font-mono">Ø {fan.diameter}m | {fan.airVelocityMS} m/s</td>
                      <td className="py-2">Mezcla</td>
                      <td className="py-2">
                        <span className={fan.enabled ? 'text-emerald-400 print:text-emerald-700 font-bold' : 'text-slate-500'}>
                          {fan.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Tabla de Ventanas y Ventilación Natural */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              4. Aberturas y Ventanas Perimetrales
            </h3>
            {windows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-600 font-semibold text-[11px]">
                      <th className="py-1.5">Ventana</th>
                      <th className="py-1.5">Muro</th>
                      <th className="py-1.5">Largo x Alto</th>
                      <th className="py-1.5">Apertura %</th>
                      <th className="py-1.5">Ventilación Natural Estimada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                    {windows.map((w) => (
                      <tr key={w.id}>
                        <td className="py-1.5 font-medium">{w.name}</td>
                        <td className="py-1.5 capitalize">{w.wall}</td>
                        <td className="py-1.5">{w.width}m x {w.height}m (Área: {(w.width * w.height).toFixed(1)} m²)</td>
                        <td className="py-1.5 font-bold text-cyan-400 print:text-cyan-800">{w.openingPercentage}%</td>
                        <td className="py-1.5">
                          {w.openingPercentage > 0
                            ? `~${Math.round(w.width * w.height * (w.openingPercentage / 100) * config.externalWindSpeed * 0.6 * 3600)} m³/h`
                            : 'Sellada (0 m³/h)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 italic">No se han definido ventanas perimetrales.</p>
            )}
          </div>

          {/* Section 5: Conclusiones y Diagnóstico */}
          <div className="p-4 bg-slate-950/60 print:bg-slate-100 rounded-xl border border-slate-800 print:border-slate-300 space-y-2">
            <h3 className="font-bold text-cyan-400 print:text-blue-800 m-0">
              5. Diagnóstico y Recomendaciones Técnicas
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-black">
              {summary.diagnostics.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
              <li>
                Temperatura media proyectada en zona ocupada: <strong>{summary.averageTemp} °C</strong> (Mínima: {summary.minTemp}°C, Máxima: {summary.maxTemp}°C).
              </li>
              <li>
                Confort térmico evaluado: <strong>{summary.comfortAreaPercent}%</strong> de la sala dentro de la franja óptima de confort (21°C - 25°C).
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            Documento técnico generado automáticamente listo para adjuntar a proyecto.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
