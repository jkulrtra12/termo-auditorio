import React, { useEffect, useRef } from 'react';
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  AirFlowType,
  SimpleFan,
  WallSide,
  SimScaleSettings,
  ViewTabType,
} from '../types';
import {
  Trash2,
  Users,
  SquareDot,
  Snowflake,
  Wind,
  Fan,
  Building,
  Thermometer,
  Sun,
  Activity,
  Plus,
  DoorOpen,
  Gauge,
  Power,
  CloudSun,
  Layers,
  Eye,
  Sliders,
  Sparkles,
  Palette,
} from 'lucide-react';
import { BTU_TO_WATT, WATT_TO_BTU, M3H_TO_CFM } from '../utils/physics';

interface SidebarPropertiesProps {
  config: AuditoriumConfig;
  setConfig: React.Dispatch<React.SetStateAction<AuditoriumConfig>>;
  occupantZones: OccupantZone[];
  setOccupantZones: React.Dispatch<React.SetStateAction<OccupantZone[]>>;
  windows: WindowItem[];
  setWindows: React.Dispatch<React.SetStateAction<WindowItem[]>>;
  acUnits: ACEquipment[];
  setAcUnits: React.Dispatch<React.SetStateAction<ACEquipment[]>>;
  airFlowUnits: AirFlowEquipment[];
  setAirFlowUnits: React.Dispatch<React.SetStateAction<AirFlowEquipment[]>>;
  fans: SimpleFan[];
  setFans: React.Dispatch<React.SetStateAction<SimpleFan[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  activeSidebarTab: number;
  setActiveSidebarTab: (tab: number) => void;
  onResetSimulation?: () => void;
  simScaleSettings: SimScaleSettings;
  setSimScaleSettings: React.Dispatch<React.SetStateAction<SimScaleSettings>>;
  onSelectViewTab?: (tab: ViewTabType) => void;
}

export const SidebarProperties: React.FC<SidebarPropertiesProps> = ({
  config,
  setConfig,
  occupantZones,
  setOccupantZones,
  windows,
  setWindows,
  acUnits,
  setAcUnits,
  airFlowUnits,
  setAirFlowUnits,
  fans,
  setFans,
  selectedId,
  setSelectedId,
  selectedType,
  setSelectedType,
  activeSidebarTab,
  setActiveSidebarTab,
  onResetSimulation,
  simScaleSettings,
  setSimScaleSettings,
  onSelectViewTab,
}) => {
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto scroll to selected item card when selection changes
  useEffect(() => {
    if (selectedId && itemRefs.current[selectedId]) {
      itemRefs.current[selectedId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedId]);

  // Tab definitions
  const tabs = [
    {
      id: 0,
      label: 'Sitio & Clima Inicial',
      shortLabel: 'Clima',
      icon: <CloudSun className="w-3.5 h-3.5" />,
      color: 'text-amber-400',
      activeColor: 'bg-amber-600/25 text-amber-300 border-amber-500/60 shadow-amber-500/10',
      count: null,
    },
    {
      id: 1,
      label: 'Geometría & Aberturas',
      shortLabel: 'Geometría',
      icon: <Building className="w-3.5 h-3.5" />,
      color: 'text-cyan-400',
      activeColor: 'bg-cyan-600/25 text-cyan-300 border-cyan-500/60 shadow-cyan-500/10',
      count: windows.length,
    },
    {
      id: 2,
      label: 'Zonas Ocupantes',
      shortLabel: 'Ocupantes',
      icon: <Users className="w-3.5 h-3.5" />,
      color: 'text-blue-400',
      activeColor: 'bg-blue-600/25 text-blue-300 border-blue-500/60 shadow-blue-500/10',
      count: occupantZones.length,
    },
    {
      id: 3,
      label: 'Ventiladores Mecánicos',
      shortLabel: 'Ventiladores',
      icon: <Fan className="w-3.5 h-3.5" />,
      color: 'text-purple-400',
      activeColor: 'bg-purple-600/25 text-purple-300 border-purple-500/60 shadow-purple-500/10',
      count: fans.length,
    },
    {
      id: 4,
      label: 'Inyección & Extracción',
      shortLabel: 'HVAC Vent.',
      icon: <Wind className="w-3.5 h-3.5" />,
      color: 'text-emerald-400',
      activeColor: 'bg-emerald-600/25 text-emerald-300 border-emerald-500/60 shadow-emerald-500/10',
      count: airFlowUnits.length,
    },
    {
      id: 5,
      label: 'Aire Acondicionado',
      shortLabel: 'A/C',
      icon: <Snowflake className="w-3.5 h-3.5" />,
      color: 'text-sky-400',
      activeColor: 'bg-sky-600/25 text-sky-300 border-sky-500/60 shadow-sky-500/10',
      count: acUnits.length,
    },
    {
      id: 6,
      label: 'SimScale CFD & Mapa Térmico',
      shortLabel: 'SimScale CFD',
      icon: <Activity className="w-3.5 h-3.5" />,
      color: 'text-rose-400',
      activeColor: 'bg-rose-600/25 text-rose-300 border-rose-500/60 shadow-rose-500/10',
      count: null,
    },
  ];

  // Helper creators
  const handleAddWindow = () => {
    const newWin: WindowItem = {
      id: `win_${Date.now()}`,
      name: `Ventana ${windows.length + 1}`,
      type: 'window',
      wall: 'west',
      offset: Number((config.length * 0.3).toFixed(1)),
      width: 3.0,
      height: 1.8,
      sillHeight: 1.0,
      openingPercentage: 25,
      glassUValue: 2.8,
      solarHeatGainCoeff: 0.6,
    };
    setWindows((prev) => [...prev, newWin]);
    setSelectedId(newWin.id);
    setSelectedType('window');
    setActiveSidebarTab(1);
  };

  const handleAddDoor = () => {
    const newDoor: WindowItem = {
      id: `door_${Date.now()}`,
      name: `Puerta Acceso ${windows.filter((w) => w.type === 'door').length + 1}`,
      type: 'door',
      wall: 'south',
      offset: Number((config.width * 0.5 - 1.0).toFixed(1)),
      width: 2.0,
      height: 2.2,
      sillHeight: 0,
      openingPercentage: 0,
      glassUValue: 2.0,
      solarHeatGainCoeff: 0.3,
    };
    setWindows((prev) => [...prev, newDoor]);
    setSelectedId(newDoor.id);
    setSelectedType('window');
    setActiveSidebarTab(1);
  };

  const handleAddOccupantZone = () => {
    const defaultW = Math.max(3, Number((config.width * 0.35).toFixed(1)));
    const defaultL = Math.max(3, Number((config.length * 0.35).toFixed(1)));
    const defaultOccupants = Math.max(10, Math.round((defaultW * defaultL) / 1.1));

    const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4'];
    const color = colors[occupantZones.length % colors.length];

    const newZone: OccupantZone = {
      id: `zone_${Date.now()}`,
      name: `Zona Platea ${occupantZones.length + 1}`,
      x: Number((config.width * 0.15).toFixed(1)),
      y: Number((config.length * 0.15).toFixed(1)),
      width: defaultW,
      length: defaultL,
      occupants: defaultOccupants,
      sensibleHeatPerPerson: 85,
      latentHeatPerPerson: 45,
      activityType: 'seated_relaxed',
      color,
    };
    setOccupantZones((prev) => [...prev, newZone]);
    setSelectedId(newZone.id);
    setSelectedType('occupant_zone');
    setActiveSidebarTab(2);
  };

  const handleAddFan = () => {
    const newFan: SimpleFan = {
      id: `fan_${Date.now()}`,
      name: `Ventilador Techo ${fans.length + 1}`,
      type: 'ceiling',
      x: Number((config.width * 0.5).toFixed(1)),
      y: Number((config.length * 0.5).toFixed(1)),
      z: Number((config.height - 0.8).toFixed(1)),
      diameter: 1.4,
      airVelocityMS: 2.2,
      airflowM3H: 4500,
      angle: 0,
      coverageRadius: 2.8,
      powerWatts: 65,
      enabled: true,
    };
    setFans((prev) => [...prev, newFan]);
    setSelectedId(newFan.id);
    setSelectedType('simple_fan');
    setActiveSidebarTab(3);
  };

  const handleAddAirflow = (type: AirFlowType) => {
    const isInj = type === 'injection';
    const newAf: AirFlowEquipment = {
      id: `af_${Date.now()}`,
      name: isInj
        ? `Inyector Aire ${airFlowUnits.filter((u) => u.type === 'injection').length + 1}`
        : `Extractor Techo ${airFlowUnits.filter((u) => u.type === 'extraction').length + 1}`,
      type,
      x: Number((config.width * 0.5).toFixed(1)),
      y: isInj ? 1.5 : Number((config.length - 1.5).toFixed(1)),
      z: isInj ? Number((config.height - 0.6).toFixed(1)) : config.height,
      airflowM3H: isInj ? 1800 : 2000,
      motorPowerWatts: isInj ? 450 : 500,
      supplyTemperature: isInj ? 19 : undefined,
      enabled: true,
    };
    setAirFlowUnits((prev) => [...prev, newAf]);
    setSelectedId(newAf.id);
    setSelectedType('airflow');
    setActiveSidebarTab(4);
  };

  const handleAddAC = () => {
    // Default to a wall Split on the West wall
    const newAC: ACEquipment = {
      id: `ac_${Date.now()}`,
      name: `Split Pared ${acUnits.filter((u) => u.type === 'split').length + 1}`,
      type: 'split',
      x: 0.3,
      y: Number((config.length * 0.5).toFixed(1)),
      z: 3.2,
      wallAttachment: 'west',
      coolingCapacityBTU: 36000,
      coolingCapacityKW: 10.55,
      setpointTemperature: 23,
      supplyTemperature: 14,
      airflowCFM: 1100,
      airflowM3H: 1870,
      cop: 3.2,
      blowDirectionAngle: 0,
      enabled: true,
    };
    setAcUnits((prev) => [...prev, newAC]);
    setSelectedId(newAC.id);
    setSelectedType('ac_equipment');
    setActiveSidebarTab(5);
  };

  const updateAltitude = (alt: number) => {
    const pKPa = Number((101.325 * Math.pow(1 - 2.25577e-5 * alt, 5.25588)).toFixed(1));
    setConfig((prev) => ({
      ...prev,
      altitude: alt,
      atmosphericPressure: pKPa,
    }));
  };

  // Helper render for tab button
  const renderTabButton = (tab: (typeof tabs)[0]) => {
    const isActive = activeSidebarTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveSidebarTab(tab.id)}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-medium text-[11px] transition-all border ${
          isActive
            ? `${tab.activeColor} shadow-md ring-1 ring-white/10 font-bold`
            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
        title={tab.label}
      >
        <div className="flex items-center gap-1">
          <span className={isActive ? tab.color : 'text-slate-400'}>{tab.icon}</span>
          {tab.count !== null && (
            <span
              className={`text-[9px] px-1 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          )}
        </div>
        <span className="mt-0.5 truncate max-w-full text-[10px] leading-tight">{tab.shortLabel}</span>
      </button>
    );
  };

  return (
    <aside className="w-96 md:w-[420px] bg-slate-900 border-l border-slate-800 text-slate-200 flex flex-col h-full overflow-hidden select-none text-xs shrink-0 shadow-2xl">
      {/* 1. TABS HEADER: PERMANENT 2-ROW GRID (All 7 tabs visible simultaneously) */}
      <div className="bg-slate-950/95 border-b border-slate-800 p-2 shrink-0 space-y-1">
        {/* Row 1: Clima, Geometria, Ocupantes, Ventiladores */}
        <div className="grid grid-cols-4 gap-1">
          {tabs.slice(0, 4).map((tab) => renderTabButton(tab))}
        </div>
        {/* Row 2: HVAC, AC, SimScale CFD */}
        <div className="grid grid-cols-3 gap-1">
          {tabs.slice(4, 7).map((tab) => renderTabButton(tab))}
        </div>
      </div>

      {/* 2. TABS CONTENT WITH INDEPENDENT SCROLL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ======================================================== */}
        {/* PESTAÑA 0: SITIO Y CLIMA INICIAL */}
        {/* ======================================================== */}
        {activeSidebarTab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <CloudSun className="w-4 h-4" />
                <span>Sitio y Clima Inicial</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 0</span>
            </div>

            {/* Card: Ambiente Interior Inicial */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                  Ambiente Interior Inicial
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  Punto de Partida
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Temperatura Interior Inicial:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="15"
                      max="40"
                      value={config.initialIndoorTemperature ?? 24}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          initialIndoorTemperature: Number(e.target.value),
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">°C</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="16"
                  max="38"
                  step="0.5"
                  value={config.initialIndoorTemperature ?? 24}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      initialIndoorTemperature: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Humedad Relativa Interior:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="20"
                      max="90"
                      value={config.relativeHumidity ?? 50}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          relativeHumidity: Number(e.target.value),
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={config.relativeHumidity ?? 50}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      relativeHumidity: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {onResetSimulation && (
                <button
                  onClick={onResetSimulation}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Thermometer className="w-3.5 h-3.5" />
                  Reiniciar Malla Térmica a {config.initialIndoorTemperature ?? 24}°C
                </button>
              )}
            </div>

            {/* Card: Opción para omitir condiciones ambientales exteriores (Modo Solo Interior) */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              config.ignoreExteriorConditions
                ? 'bg-amber-950/25 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className={`w-4 h-4 ${config.ignoreExteriorConditions ? 'text-amber-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Modo Solo Interior</span>
                    <span className="text-[10px] text-slate-400 block">Omitir clima exterior (sol, sombras, viento)</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config.ignoreExteriorConditions}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        ignoreExteriorConditions: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {config.ignoreExteriorConditions && (
                <div className="mt-2.5 p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-[11px] text-amber-200/90 leading-tight">
                  ✨ <strong>Clima exterior omitido:</strong> Se analiza exclusivamente el balance térmico de cargas internas (personas, equipos A/C y ventilación mecánica).
                </div>
              )}
            </div>

            {/* Card: Condiciones Exteriores */}
            <div className={`p-3.5 rounded-xl border space-y-3 transition-all ${
              config.ignoreExteriorConditions
                ? 'bg-slate-950/30 border-slate-900 opacity-40 pointer-events-none'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Condiciones Ambientales Exteriores
                </span>
                {config.ignoreExteriorConditions && (
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    OMITIDO
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Temperatura Exterior:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="15"
                      max="50"
                      value={config.ambientTemperature}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          ambientTemperature: Number(e.target.value),
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-amber-300"
                    />
                    <span className="text-slate-400">°C</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="16"
                  max="46"
                  step="0.5"
                  value={config.ambientTemperature}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ambientTemperature: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Humedad Exterior:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="20"
                      max="100"
                      value={config.outdoorRelativeHumidity ?? 60}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          outdoorRelativeHumidity: Number(e.target.value),
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-amber-300"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={config.outdoorRelativeHumidity ?? 60}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      outdoorRelativeHumidity: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Radiación Solar Directa:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="50"
                      min="0"
                      max="1100"
                      value={config.solarRadiation}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          solarRadiation: Number(e.target.value),
                        }))
                      }
                      className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-amber-300"
                    />
                    <span className="text-slate-400">W/m²</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={config.solarRadiation}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      solarRadiation: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Velocidad Viento Exterior:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.2"
                      min="0.2"
                      max="15"
                      value={config.externalWindSpeed}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          externalWindSpeed: Number(e.target.value),
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">m/s</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="12"
                  step="0.2"
                  value={config.externalWindSpeed}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      externalWindSpeed: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Card: Altitud y Presión */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                Altitud y Presión Atmosférica
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Altitud (m s.n.m.):</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    max="4500"
                    value={config.altitude ?? 500}
                    onChange={(e) => updateAltitude(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Presión Barométrica:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.atmosphericPressure ?? 95.5}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        atmosphericPressure: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                  <span className="text-[9px] text-slate-500">kPa</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 1: GEOMETRÍA Y ABERTURAS */}
        {/* ======================================================== */}
        {activeSidebarTab === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Building className="w-4 h-4" />
                <span>Geometría y Aberturas</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 1</span>
            </div>

            {/* Dimensiones del recinto */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Dimensiones del Recinto (m)</span>
                <span className="text-[11px] text-cyan-300 font-mono">
                  {(config.width * config.length).toFixed(1)} m² | {(config.width * config.length * config.height).toFixed(1)} m³
                </span>
              </div>

              {/* Ancho X */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Ancho (X):</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="4"
                      max="50"
                      value={config.width}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, width: Math.max(4, Number(e.target.value)) }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="6"
                  max="40"
                  step="0.5"
                  value={config.width}
                  onChange={(e) => setConfig((prev) => ({ ...prev, width: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Largo Y */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Largo (Y):</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="4"
                      max="60"
                      value={config.length}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, length: Math.max(4, Number(e.target.value)) }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="6"
                  max="50"
                  step="0.5"
                  value={config.length}
                  onChange={(e) => setConfig((prev) => ({ ...prev, length: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Alto Z */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">Alto (Z):</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="2.5"
                      max="15"
                      value={config.height}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, height: Math.max(2.5, Number(e.target.value)) }))
                      }
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-cyan-300"
                    />
                    <span className="text-slate-400">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={config.height}
                  onChange={(e) => setConfig((prev) => ({ ...prev, height: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Listado interactivo de Puertas y Ventanas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <SquareDot className="w-3.5 h-3.5 text-cyan-400" />
                  Aberturas Perimetrales ({windows.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleAddWindow}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    + Ventana
                  </button>
                  <button
                    onClick={handleAddDoor}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
                  >
                    <DoorOpen className="w-3 h-3" />
                    + Puerta
                  </button>
                </div>
              </div>

              {windows.length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                  No hay aberturas definidas. Usa los botones superiores para añadir ventanas o puertas.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {windows.map((win) => {
                    const isSelected = selectedId === win.id;
                    const isDoor = win.type === 'door';
                    return (
                      <div
                        key={win.id}
                        ref={(el) => {
                          itemRefs.current[win.id] = el;
                        }}
                        onClick={() => {
                          setSelectedId(win.id);
                          setSelectedType('window');
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                          isSelected
                            ? isDoor
                              ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-cyan-950/30 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Header card */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isDoor ? (
                              <DoorOpen className="w-4 h-4 text-amber-400" />
                            ) : (
                              <SquareDot className="w-4 h-4 text-cyan-400" />
                            )}
                            <input
                              type="text"
                              value={win.name}
                              onChange={(e) =>
                                setWindows((prev) =>
                                  prev.map((w) => (w.id === win.id ? { ...w, name: e.target.value } : w))
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-cyan-500 w-36 truncate"
                            />
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                isDoor
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}
                            >
                              {isDoor ? 'Puerta' : 'Ventana'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWindows((prev) => prev.filter((w) => w.id !== win.id));
                              if (selectedId === win.id) setSelectedId(null);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                            title="Eliminar elemento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Pared y Ubicación */}
                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Pared:</label>
                            <select
                              value={win.wall}
                              onChange={(e) =>
                                setWindows((prev) =>
                                  prev.map((w) =>
                                    w.id === win.id ? { ...w, wall: e.target.value as WallSide } : w
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                            >
                              <option value="south">Muro Sur (Frontal)</option>
                              <option value="north">Muro Norte (Fondo)</option>
                              <option value="west">Muro Oeste (Izq.)</option>
                              <option value="east">Muro Este (Der.)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Desplazamiento (m):</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setWindows((prev) =>
                                    prev.map((w) =>
                                      w.id === win.id
                                        ? { ...w, offset: Math.max(0, Number((w.offset - 0.5).toFixed(1))) }
                                        : w
                                    )
                                  )
                                }
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                                title="Mover -0.5m"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={win.offset}
                                onChange={(e) =>
                                  setWindows((prev) =>
                                    prev.map((w) =>
                                      w.id === win.id ? { ...w, offset: Math.max(0, Number(e.target.value)) } : w
                                    )
                                  )
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const maxOffset = win.wall === 'south' || win.wall === 'north' ? config.width - win.width : config.length - win.width;
                                  setWindows((prev) =>
                                    prev.map((w) =>
                                      w.id === win.id
                                        ? { ...w, offset: Math.min(maxOffset, Number((w.offset + 0.5).toFixed(1))) }
                                        : w
                                    )
                                  );
                                }}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                                title="Mover +0.5m"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Ancho x Alto */}
                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Ancho (m):</label>
                            <input
                              type="number"
                              step="0.2"
                              min="0.5"
                              value={win.width}
                              onChange={(e) =>
                                setWindows((prev) =>
                                  prev.map((w) =>
                                    w.id === win.id ? { ...w, width: Math.max(0.5, Number(e.target.value)) } : w
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Alto (m):</label>
                            <input
                              type="number"
                              step="0.2"
                              min="0.5"
                              value={win.height}
                              onChange={(e) =>
                                setWindows((prev) =>
                                  prev.map((w) =>
                                    w.id === win.id ? { ...w, height: Math.max(0.5, Number(e.target.value)) } : w
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </div>
                        </div>

                        {/* Apertura Slider */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-slate-300">Apertura:</span>
                            <span className="font-bold text-cyan-400">{win.openingPercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={win.openingPercentage}
                            onChange={(e) =>
                              setWindows((prev) =>
                                prev.map((w) =>
                                  w.id === win.id
                                    ? { ...w, openingPercentage: Number(e.target.value) }
                                    : w
                                )
                              )
                            }
                            className="w-full accent-cyan-400 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: ZONAS DE OCUPANTES (PERSONAS) */}
        {/* ======================================================== */}
        {activeSidebarTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>Zonas de Ocupantes</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 2</span>
            </div>

            {/* Action Bar & Global Occupancy */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Total en Auditorio:</span>
                <span className="text-base font-extrabold text-blue-400">
                  {occupantZones.reduce((sum, z) => sum + z.occupants, 0)} personas
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Carga sensible: ~
                  {(
                    occupantZones.reduce(
                      (sum, z) => sum + z.occupants * (z.sensibleHeatPerPerson || 80),
                      0
                    ) / 1000
                  ).toFixed(1)}{' '}
                  kW
                </span>
              </div>
              <button
                onClick={handleAddOccupantZone}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                + Añadir Zona
              </button>
            </div>

            {/* List of Occupant Zones */}
            {occupantZones.length === 0 ? (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                No hay zonas de butacas creadas. Haz clic en "+ Añadir Zona" o arrastra sobre el plano 2D.
              </div>
            ) : (
              <div className="space-y-3">
                {occupantZones.map((zone) => {
                  const isSelected = selectedId === zone.id;
                  const zoneArea = zone.width * zone.length;
                  const density = zoneArea > 0 ? (zone.occupants / zoneArea).toFixed(1) : '0';
                  const zonePowerKW = (
                    (zone.occupants * (zone.sensibleHeatPerPerson || 80)) /
                    1000
                  ).toFixed(2);

                  return (
                    <div
                      key={zone.id}
                      ref={(el) => {
                        itemRefs.current[zone.id] = el;
                      }}
                      onClick={() => {
                        setSelectedId(zone.id);
                        setSelectedType('occupant_zone');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color || '#3b82f6' }}
                          />
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) =>
                              setOccupantZones((prev) =>
                                prev.map((z) => (z.id === zone.id ? { ...z, name: e.target.value } : z))
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-blue-500 w-44 truncate"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOccupantZones((prev) => prev.filter((z) => z.id !== zone.id));
                            if (selectedId === zone.id) setSelectedId(null);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                          title="Eliminar zona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Number of Occupants Slider + Input */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-slate-300 font-medium">Ocupantes en zona:</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={zone.occupants}
                              onChange={(e) =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id
                                      ? { ...z, occupants: Math.max(1, Number(e.target.value)) }
                                      : z
                                  )
                                )
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-blue-400"
                            />
                            <span className="text-slate-400">pers</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="250"
                          value={zone.occupants}
                          onChange={(e) =>
                            setOccupantZones((prev) =>
                              prev.map((z) =>
                                z.id === zone.id ? { ...z, occupants: Number(e.target.value) } : z
                              )
                            )
                          }
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>

                      {/* Dimensions (Ancho x Largo) */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Ancho (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={zone.width}
                            onChange={(e) =>
                              setOccupantZones((prev) =>
                                prev.map((z) =>
                                  z.id === zone.id
                                    ? { ...z, width: Math.max(1, Number(e.target.value)) }
                                    : z
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Largo (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={zone.length}
                            onChange={(e) =>
                              setOccupantZones((prev) =>
                                prev.map((z) =>
                                  z.id === zone.id
                                    ? { ...z, length: Math.max(1, Number(e.target.value)) }
                                    : z
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Coordinates (X, Y) */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Posición X (m):</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id ? { ...z, x: Math.max(0, Number((z.x - 0.5).toFixed(1))) } : z
                                  )
                                )
                              }
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                              title="-0.5m"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={zone.x}
                              onChange={(e) =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id ? { ...z, x: Math.max(0, Number(e.target.value)) } : z
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id
                                      ? { ...z, x: Math.min(config.width - z.width, Number((z.x + 0.5).toFixed(1))) }
                                      : z
                                  )
                                )
                              }
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                              title="+0.5m"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Posición Y (m):</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id ? { ...z, y: Math.max(0, Number((z.y - 0.5).toFixed(1))) } : z
                                  )
                                )
                              }
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                              title="-0.5m"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={zone.y}
                              onChange={(e) =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id ? { ...z, y: Math.max(0, Number(e.target.value)) } : z
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setOccupantZones((prev) =>
                                  prev.map((z) =>
                                    z.id === zone.id
                                      ? { ...z, y: Math.min(config.length - z.length, Number((z.y + 0.5).toFixed(1))) }
                                      : z
                                  )
                                )
                              }
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                              title="+0.5m"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tasa metabólica por persona */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-300">Calor por Persona:</span>
                          <span className="font-bold text-slate-200">
                            {zone.sensibleHeatPerPerson} W/pers
                          </span>
                        </div>
                        <input
                          type="range"
                          min="65"
                          max="140"
                          step="5"
                          value={zone.sensibleHeatPerPerson}
                          onChange={(e) =>
                            setOccupantZones((prev) =>
                              prev.map((z) =>
                                z.id === zone.id
                                  ? { ...z, sensibleHeatPerPerson: Number(e.target.value) }
                                  : z
                              )
                            )
                          }
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>

                      {/* Badge Summary */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>Área: {zoneArea.toFixed(1)} m²</span>
                        <span>Densidad: {density} pers/m²</span>
                        <span className="text-amber-400 font-bold">+{zonePowerKW} kW</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: VENTILADORES */}
        {/* ======================================================== */}
        {activeSidebarTab === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Fan className="w-4 h-4" />
                <span>Ventiladores Mecánicos</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 3</span>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Equipos instalados:</span>
                <span className="text-base font-extrabold text-purple-400">
                  {fans.filter((f) => f.enabled).length} de {fans.length} activos
                </span>
              </div>
              <button
                onClick={handleAddFan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                + Añadir Ventilador
              </button>
            </div>

            {fans.length === 0 ? (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                No hay ventiladores mecánicos definidos. Haz clic en "+ Añadir Ventilador".
              </div>
            ) : (
              <div className="space-y-3">
                {fans.map((fan) => {
                  const isSelected = selectedId === fan.id;
                  return (
                    <div
                      key={fan.id}
                      ref={(el) => {
                        itemRefs.current[fan.id] = el;
                      }}
                      onClick={() => {
                        setSelectedId(fan.id);
                        setSelectedType('simple_fan');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Fan className="w-4 h-4 text-purple-400" />
                          <input
                            type="text"
                            value={fan.name}
                            onChange={(e) =>
                              setFans((prev) =>
                                prev.map((f) => (f.id === fan.id ? { ...f, name: e.target.value } : f))
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-purple-500 w-40 truncate"
                          />
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setFans((prev) =>
                                prev.map((f) => (f.id === fan.id ? { ...f, enabled: !f.enabled } : f))
                              )
                            }
                            className={`p-1 rounded text-xs transition-all ${
                              fan.enabled ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}
                            title={fan.enabled ? 'Encendido' : 'Apagado'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setFans((prev) => prev.filter((f) => f.id !== fan.id));
                              if (selectedId === fan.id) setSelectedId(null);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                            title="Eliminar ventilador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Selector de Tipo: Pared o Techo */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setFans((prev) =>
                              prev.map((f) => (f.id === fan.id ? { ...f, type: 'ceiling' } : f))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            fan.type === 'ceiling'
                              ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Techo (Circular)
                        </button>
                        <button
                          onClick={() =>
                            setFans((prev) =>
                              prev.map((f) => (f.id === fan.id ? { ...f, type: 'wall' } : f))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            fan.type === 'wall'
                              ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Pared (Direccional)
                        </button>
                      </div>

                      {/* Coordenadas X, Y, Z */}
                      <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">X (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, x: Math.max(0.5, Number((f.x - 0.5).toFixed(1))) } : f
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={fan.x}
                              onChange={(e) =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, x: Number(e.target.value) } : f
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, x: Math.min(config.width - 0.5, Number((f.x + 0.5).toFixed(1))) } : f
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Y (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, y: Math.max(0.5, Number((f.y - 0.5).toFixed(1))) } : f
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={fan.y}
                              onChange={(e) =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, y: Number(e.target.value) } : f
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFans((prev) =>
                                  prev.map((f) =>
                                    f.id === fan.id ? { ...f, y: Math.min(config.length - 0.5, Number((f.y + 0.5).toFixed(1))) } : f
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Z / Alto (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={fan.z}
                            onChange={(e) =>
                              setFans((prev) =>
                                prev.map((f) =>
                                  f.id === fan.id ? { ...f, z: Number(e.target.value) } : f
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                          />
                        </div>
                      </div>

                      {/* Velocidad m/s y Caudal */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-300">Velocidad impulsada:</span>
                          <span className="font-bold text-purple-300">{fan.airVelocityMS} m/s</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="5.0"
                          step="0.1"
                          value={fan.airVelocityMS}
                          onChange={(e) =>
                            setFans((prev) =>
                              prev.map((f) =>
                                f.id === fan.id ? { ...f, airVelocityMS: Number(e.target.value) } : f
                              )
                            )
                          }
                          className="w-full accent-purple-400 cursor-pointer"
                        />
                      </div>

                      {/* Diámetro y Radio Cobertura */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Diámetro (m):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={fan.diameter}
                            onChange={(e) =>
                              setFans((prev) =>
                                prev.map((f) =>
                                  f.id === fan.id ? { ...f, diameter: Number(e.target.value) } : f
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Radio Cobertura (m):</label>
                          <input
                            type="number"
                            step="0.2"
                            value={fan.coverageRadius}
                            onChange={(e) =>
                              setFans((prev) =>
                                prev.map((f) =>
                                  f.id === fan.id ? { ...f, coverageRadius: Number(e.target.value) } : f
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Ángulo si es de pared */}
                      {fan.type === 'wall' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-slate-300">Orientación / Ángulo:</span>
                            <span className="font-bold text-purple-300">{fan.angle}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={fan.angle}
                            onChange={(e) =>
                              setFans((prev) =>
                                prev.map((f) =>
                                  f.id === fan.id ? { ...f, angle: Number(e.target.value) } : f
                                )
                              )
                            }
                            className="w-full accent-purple-400 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 4: INYECCIÓN Y EXTRACCIÓN DE AIRE (HVAC) */}
        {/* ======================================================== */}
        {activeSidebarTab === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Wind className="w-4 h-4" />
                <span>Inyección y Extracción (HVAC)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 4</span>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Balance de Caudales:</span>
                <span className="text-xs font-bold text-emerald-300">
                  Iny: {airFlowUnits.filter((u) => u.enabled && u.type === 'injection').reduce((s, u) => s + u.airflowM3H, 0)} m³/h
                </span>
                <span className="text-xs font-bold text-amber-300 ml-2">
                  Ext: {airFlowUnits.filter((u) => u.enabled && u.type === 'extraction').reduce((s, u) => s + u.airflowM3H, 0)} m³/h
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAddAirflow('injection')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  <Plus className="w-3 h-3" />
                  + Inyector
                </button>
                <button
                  onClick={() => handleAddAirflow('extraction')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  <Plus className="w-3 h-3" />
                  + Extractor
                </button>
              </div>
            </div>

            {airFlowUnits.length === 0 ? (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                No hay equipos de ventilación mecánica definidos.
              </div>
            ) : (
              <div className="space-y-3">
                {airFlowUnits.map((af) => {
                  const isSelected = selectedId === af.id;
                  const isInj = af.type === 'injection';
                  return (
                    <div
                      key={af.id}
                      ref={(el) => {
                        itemRefs.current[af.id] = el;
                      }}
                      onClick={() => {
                        setSelectedId(af.id);
                        setSelectedType('airflow');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? isInj
                            ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50'
                            : 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wind className={`w-4 h-4 ${isInj ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <input
                            type="text"
                            value={af.name}
                            onChange={(e) =>
                              setAirFlowUnits((prev) =>
                                prev.map((u) => (u.id === af.id ? { ...u, name: e.target.value } : u))
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-emerald-500 w-36 truncate"
                          />
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isInj ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {isInj ? 'Inyector' : 'Extractor'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setAirFlowUnits((prev) =>
                                prev.map((u) => (u.id === af.id ? { ...u, enabled: !u.enabled } : u))
                              )
                            }
                            className={`p-1 rounded text-xs transition-all ${
                              af.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}
                            title={af.enabled ? 'Encendido' : 'Apagado'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setAirFlowUnits((prev) => prev.filter((u) => u.id !== af.id));
                              if (selectedId === af.id) setSelectedId(null);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                            title="Eliminar equipo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Selector de Función */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setAirFlowUnits((prev) =>
                              prev.map((u) => (u.id === af.id ? { ...u, type: 'injection' } : u))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            af.type === 'injection'
                              ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Inyector (Impulsión)
                        </button>
                        <button
                          onClick={() =>
                            setAirFlowUnits((prev) =>
                              prev.map((u) => (u.id === af.id ? { ...u, type: 'extraction' } : u))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            af.type === 'extraction'
                              ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Extractor (Retorno)
                        </button>
                      </div>

                      {/* Coordenadas X, Y, Z */}
                      <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">X (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, x: Math.max(0.3, Number((u.x - 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={af.x}
                              onChange={(e) =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, x: Number(e.target.value) } : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, x: Math.min(config.width - 0.3, Number((u.x + 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Y (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, y: Math.max(0.3, Number((u.y - 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={af.y}
                              onChange={(e) =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, y: Number(e.target.value) } : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id ? { ...u, y: Math.min(config.length - 0.3, Number((u.y + 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Z (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={af.z}
                            onChange={(e) =>
                              setAirFlowUnits((prev) =>
                                prev.map((u) =>
                                  u.id === af.id ? { ...u, z: Number(e.target.value) } : u
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                          />
                        </div>
                      </div>

                      {/* Caudal Nominal (m³/h) */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-300">Caudal Nominal:</span>
                          <span className="font-bold text-white font-mono">
                            {af.airflowM3H} m³/h (~{Math.round(af.airflowM3H * M3H_TO_CFM)} CFM)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="300"
                          max="8000"
                          step="100"
                          value={af.airflowM3H}
                          onChange={(e) =>
                            setAirFlowUnits((prev) =>
                              prev.map((u) =>
                                u.id === af.id ? { ...u, airflowM3H: Number(e.target.value) } : u
                              )
                            )
                          }
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      {/* Potencia motor & Temperatura si es Inyector */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Potencia Motor (W):</label>
                          <input
                            type="number"
                            step="50"
                            min="50"
                            value={af.motorPowerWatts ?? 400}
                            onChange={(e) =>
                              setAirFlowUnits((prev) =>
                                prev.map((u) =>
                                  u.id === af.id
                                    ? { ...u, motorPowerWatts: Number(e.target.value) }
                                    : u
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>

                        {isInj ? (
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Temp. Impulsión (°C):</label>
                            <input
                              type="number"
                              step="0.5"
                              min="12"
                              max="35"
                              value={af.supplyTemperature ?? 19}
                              onChange={(e) =>
                                setAirFlowUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === af.id
                                      ? { ...u, supplyTemperature: Number(e.target.value) }
                                      : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-bold font-mono text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center text-[10px] text-slate-500 pt-3">
                            Extracción al exterior
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 5: AIRE ACONDICIONADO (A/C) */}
        {/* ======================================================== */}
        {activeSidebarTab === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Snowflake className="w-4 h-4" />
                <span>Aire Acondicionado (A/C)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Pestaña 5</span>
            </div>

            {/* Action Bar & Total Cooling */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Capacidad Total Instalada:</span>
                <span className="text-base font-extrabold text-sky-400">
                  {acUnits
                    .filter((u) => u.enabled)
                    .reduce((sum, u) => sum + u.coolingCapacityKW, 0)
                    .toFixed(1)}{' '}
                  kW
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ~
                  {Math.round(
                    acUnits
                      .filter((u) => u.enabled)
                      .reduce((sum, u) => sum + u.coolingCapacityBTU, 0)
                  ).toLocaleString()}{' '}
                  BTU/h
                </span>
              </div>
              <button
                onClick={handleAddAC}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                + Añadir A/C
              </button>
            </div>

            {acUnits.length === 0 ? (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-500 italic">
                No hay unidades de aire acondicionado definidas. Haz clic en "+ Añadir A/C".
              </div>
            ) : (
              <div className="space-y-3">
                {acUnits.map((ac) => {
                  const isSelected = selectedId === ac.id;
                  const isSplit = ac.type === 'split';

                  return (
                    <div
                      key={ac.id}
                      ref={(el) => {
                        itemRefs.current[ac.id] = el;
                      }}
                      onClick={() => {
                        setSelectedId(ac.id);
                        setSelectedType('ac_equipment');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Snowflake className="w-4 h-4 text-sky-400" />
                          <input
                            type="text"
                            value={ac.name}
                            onChange={(e) =>
                              setAcUnits((prev) =>
                                prev.map((u) => (u.id === ac.id ? { ...u, name: e.target.value } : u))
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-sky-500 w-36 truncate"
                          />
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            {isSplit ? 'Split' : 'Casete'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setAcUnits((prev) =>
                                prev.map((u) => (u.id === ac.id ? { ...u, enabled: !u.enabled } : u))
                              )
                            }
                            className={`p-1 rounded text-xs transition-all ${
                              ac.enabled ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}
                            title={ac.enabled ? 'Encendido' : 'Apagado'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setAcUnits((prev) => prev.filter((u) => u.id !== ac.id));
                              if (selectedId === ac.id) setSelectedId(null);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                            title="Eliminar unidad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Selector de Tipo: Split o Casete */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setAcUnits((prev) =>
                              prev.map((u) => (u.id === ac.id ? { ...u, type: 'split' } : u))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            ac.type === 'split'
                              ? 'border-sky-500 bg-sky-600/20 text-sky-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Split (Pared)
                        </button>
                        <button
                          onClick={() =>
                            setAcUnits((prev) =>
                              prev.map((u) => (u.id === ac.id ? { ...u, type: 'cassette' } : u))
                            )
                          }
                          className={`py-1 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                            ac.type === 'cassette'
                              ? 'border-sky-500 bg-sky-600/20 text-sky-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          Casete (Techo)
                        </button>
                      </div>

                      {/* Potencia Frigorífica BTU / kW */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-300">Potencia Frigorífica:</span>
                          <span className="font-bold text-sky-300 font-mono">
                            {ac.coolingCapacityBTU.toLocaleString()} BTU/h ({ac.coolingCapacityKW} kW)
                          </span>
                        </div>

                        {/* Quick BTU buttons */}
                        <div className="flex gap-1 mb-1.5 overflow-x-auto pb-0.5">
                          {[12000, 18000, 24000, 36000, 48000, 60000].map((btu) => (
                            <button
                              key={btu}
                              onClick={() => {
                                const kw = Number((btu * BTU_TO_WATT * 0.001).toFixed(2));
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id
                                      ? { ...u, coolingCapacityBTU: btu, coolingCapacityKW: kw }
                                      : u
                                  )
                                );
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 transition-all ${
                                ac.coolingCapacityBTU === btu
                                  ? 'bg-sky-500 text-white font-bold'
                                  : 'bg-slate-900 text-slate-400 hover:text-white'
                              }`}
                            >
                              {btu / 1000}k
                            </button>
                          ))}
                        </div>

                        <input
                          type="range"
                          min="9000"
                          max="72000"
                          step="3000"
                          value={ac.coolingCapacityBTU}
                          onChange={(e) => {
                            const btu = Number(e.target.value);
                            const kw = Number((btu * BTU_TO_WATT * 0.001).toFixed(2));
                            setAcUnits((prev) =>
                              prev.map((u) =>
                                u.id === ac.id
                                  ? { ...u, coolingCapacityBTU: btu, coolingCapacityKW: kw }
                                  : u
                              )
                            );
                          }}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                      </div>

                      {/* Temperatura de Consigna y Temperatura de Impulsión */}
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Consigna Deseada:</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="18"
                              max="28"
                              step="1"
                              value={ac.setpointTemperature ?? 23}
                              onChange={(e) =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id
                                      ? { ...u, setpointTemperature: Number(e.target.value) }
                                      : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-slate-200 text-xs"
                            />
                            <span className="text-slate-400">°C</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Temp. Impulsión:</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="10"
                              max="20"
                              step="1"
                              value={ac.supplyTemperature}
                              onChange={(e) =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id
                                      ? { ...u, supplyTemperature: Number(e.target.value) }
                                      : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-cyan-300 text-xs"
                            />
                            <span className="text-slate-400">°C</span>
                          </div>
                        </div>
                      </div>

                      {/* Coordenadas X, Y, Z */}
                      <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">X (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, x: Math.max(0.3, Number((u.x - 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={ac.x}
                              onChange={(e) =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, x: Number(e.target.value) } : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, x: Math.min(config.width - 0.3, Number((u.x + 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Y (m):</label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, y: Math.max(0.3, Number((u.y - 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={ac.y}
                              onChange={(e) =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, y: Number(e.target.value) } : u
                                  )
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-white font-mono text-xs text-center"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAcUnits((prev) =>
                                  prev.map((u) =>
                                    u.id === ac.id ? { ...u, y: Math.min(config.length - 0.3, Number((u.y + 0.5).toFixed(1))) } : u
                                  )
                                )
                              }
                              className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Z (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={ac.z}
                            onChange={(e) =>
                              setAcUnits((prev) =>
                                prev.map((u) =>
                                  u.id === ac.id ? { ...u, z: Number(e.target.value) } : u
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-xs text-center"
                          />
                        </div>
                      </div>

                      {/* Orientación del flujo si es Split */}
                      {isSplit && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-slate-300">Orientación de Soplado:</span>
                            <span className="font-bold text-sky-300">{ac.blowDirectionAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={ac.blowDirectionAngle}
                            onChange={(e) =>
                              setAcUnits((prev) =>
                                prev.map((u) =>
                                  u.id === ac.id
                                    ? { ...u, blowDirectionAngle: Number(e.target.value) }
                                    : u
                                )
                              )
                            }
                            className="w-full accent-sky-400 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 6: SIMSCALE CFD & MAPAS DE CALOR 3D (NUEVA) */}
        {/* ======================================================== */}
        {activeSidebarTab === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Activity className="w-4 h-4" />
                <span>SimScale CFD & Mapas de Calor 3D</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">
                SimScale Mode
              </span>
            </div>

            {/* Quick action button to switch directly to SimScale view */}
            <button
              onClick={() => onSelectViewTab?.('simscale')}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all ring-1 ring-cyan-300/40"
            >
              <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
              Abrir Visor SimScale 3D con Balizas (Imagen 2)
            </button>

            {/* Card: Altura del Plano de Corte Térmico */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Plano de Corte Térmico (Z)
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  Z = {simScaleSettings.planeHeight.toFixed(2)} m
                </span>
              </div>

              {/* Presets rápidos */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Piso', h: 0.15 },
                  { label: 'Sentado', h: 1.2 },
                  { label: 'De pie', h: 1.7 },
                  { label: 'Techo', h: Math.max(2.5, config.height - 0.5) },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() =>
                      setSimScaleSettings((prev) => ({
                        ...prev,
                        planeHeight: Number(p.h.toFixed(2)),
                      }))
                    }
                    className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                      Math.abs(simScaleSettings.planeHeight - p.h) < 0.1
                        ? 'border-cyan-500 bg-cyan-600/30 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label} ({p.h.toFixed(1)}m)
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="0.1"
                max={config.height}
                step="0.1"
                value={simScaleSettings.planeHeight}
                onChange={(e) =>
                  setSimScaleSettings((prev) => ({
                    ...prev,
                    planeHeight: Number(e.target.value),
                  }))
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Corta volumétricamente el auditorio a cualquier altura para analizar la distribución térmica y estratificación del aire.
              </p>
            </div>

            {/* Card: Estilo Arquitectónico (Imagen 2) */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                Estilo de Visualización
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setSimScaleSettings((prev) => ({ ...prev, theme: 'light' }))
                  }
                  className={`p-2.5 rounded-xl border font-semibold text-center text-xs transition-all flex flex-col items-center gap-1 ${
                    simScaleSettings.theme === 'light'
                      ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-400/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span>SimScale Claro</span>
                  <span className="text-[9px] text-slate-400 font-normal">Como en Imagen 2</span>
                </button>
                <button
                  onClick={() =>
                    setSimScaleSettings((prev) => ({ ...prev, theme: 'dark' }))
                  }
                  className={`p-2.5 rounded-xl border font-semibold text-center text-xs transition-all flex flex-col items-center gap-1 ${
                    simScaleSettings.theme === 'dark'
                      ? 'border-cyan-500 bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-400/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4 text-cyan-300" />
                  <span>Modo Oscuro</span>
                  <span className="text-[9px] text-slate-400 font-normal">Ingeniería CAD</span>
                </button>
              </div>
            </div>

            {/* Card: Balizas de Sensores 3D & Líneas de Corriente */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Elementos Gráficos SimScale
              </span>

              {/* Balizas Flotantes Switch */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-200 block text-xs">Balizas / Pines de Sensores 3D</span>
                  <span className="text-[10px] text-slate-400">
                    Etiquetas flotantes de T° y HR sobre zonas (Imagen 2)
                  </span>
                </div>
                <button
                  onClick={() =>
                    setSimScaleSettings((prev) => ({
                      ...prev,
                      showSensorPins: !prev.showSensorPins,
                    }))
                  }
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    simScaleSettings.showSensorPins
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {simScaleSettings.showSensorPins ? 'Activo' : 'Oculto'}
                </button>
              </div>

              {/* Lineas de Flujo 3D Switch */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-200 block text-xs">Líneas de Corriente (Streamlines)</span>
                  <span className="text-[10px] text-slate-400">
                    Vectores de viento 3D desde las salidas de AC
                  </span>
                </div>
                <button
                  onClick={() =>
                    setSimScaleSettings((prev) => ({
                      ...prev,
                      showStreamlines: !prev.showStreamlines,
                    }))
                  }
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    simScaleSettings.showStreamlines
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {simScaleSettings.showStreamlines ? 'Activo' : 'Oculto'}
                </button>
              </div>

              {/* Opacidad de muros slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-300">Transparencia de Muros:</span>
                  <span className="font-bold text-slate-200">
                    {Math.round((1 - simScaleSettings.wallOpacity) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={simScaleSettings.wallOpacity}
                  onChange={(e) =>
                    setSimScaleSettings((prev) => ({
                      ...prev,
                      wallOpacity: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
