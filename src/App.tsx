import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  SimpleFan,
  ToolType,
  SimulationProbe,
  ThermalSummary,
  ViewTabType,
  SimScaleSettings,
} from './types';
import { PRESETS } from './utils/presets';
import {
  ThermalSimulationEngine,
  calculateThermalSummary,
} from './utils/physics';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { FloorPlan2D } from './components/FloorPlan2D';
import { View3D } from './components/View3D';
import { SidebarProperties } from './components/SidebarProperties';
import { ThermalDashboard } from './components/ThermalDashboard';
import { ExportReportModal } from './components/ExportReportModal';

export const App: React.FC = () => {
  // Initial preset
  const defaultPreset = PRESETS[0];

  // Auditorium & Equipment State
  const [currentPresetId, setCurrentPresetId] = useState<string>(defaultPreset.id);
  const [config, setConfig] = useState<AuditoriumConfig>(defaultPreset.config);
  const [occupantZones, setOccupantZones] = useState<OccupantZone[]>(defaultPreset.occupantZones);
  const [windows, setWindows] = useState<WindowItem[]>(defaultPreset.windows);
  const [acUnits, setAcUnits] = useState<ACEquipment[]>(defaultPreset.acUnits);
  const [airFlowUnits, setAirFlowUnits] = useState<AirFlowEquipment[]>(defaultPreset.airFlowUnits);
  const [fans, setFans] = useState<SimpleFan[]>(defaultPreset.fans);

  // UI Selection & Tool state
  const [activeTab, setActiveTab] = useState<ViewTabType>('2d');
  const [activeSidebarTab, setActiveSidebarTab] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>('auditorium');

  // SimScale CFD 3D Settings
  const [simScaleSettings, setSimScaleSettings] = useState<SimScaleSettings>({
    theme: 'light',
    planeHeight: 1.2,
    showSensorPins: true,
    showStreamlines: true,
    colormap: 'simscale',
    wallOpacity: 0.35,
    cutawayHeight: 2.8,
  });

  // Visualization Layers
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showIsotherms, setShowIsotherms] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Simulation Engine & State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simTick, setSimTick] = useState<number>(0);
  const [probe, setProbe] = useState<SimulationProbe | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Persistent Simulation Engine instance
  const simEngineRef = useRef<ThermalSimulationEngine | null>(null);

  // Initialize or re-create simulation engine when auditorium dimensions change
  useEffect(() => {
    const initTemp = config.initialIndoorTemperature ?? 24.0;
    const engine = new ThermalSimulationEngine(config.width, config.length, 0.5);
    engine.reset(initTemp);
    engine.updatePhysicsModel(config, occupantZones, windows, acUnits, airFlowUnits, fans);
    const effAmbient = config.ignoreExteriorConditions ? initTemp : config.ambientTemperature;
    engine.solveSteadyState(effAmbient);
    simEngineRef.current = engine;
    setSimTick((t) => t + 1);
  }, [config.width, config.length]);

  // Synchronize simulation mesh baseline when initial indoor temperature changes
  const prevInitialTempRef = useRef(config.initialIndoorTemperature ?? 24.0);
  useEffect(() => {
    const curInit = config.initialIndoorTemperature ?? 24.0;
    if (prevInitialTempRef.current !== curInit) {
      prevInitialTempRef.current = curInit;
      if (simEngineRef.current) {
        simEngineRef.current.reset(curInit);
        simEngineRef.current.updatePhysicsModel(
          config,
          occupantZones,
          windows,
          acUnits,
          airFlowUnits,
          fans
        );
        const effAmbient = config.ignoreExteriorConditions ? curInit : config.ambientTemperature;
        simEngineRef.current.solveSteadyState(effAmbient);
        setSimTick((t) => t + 1);
      }
    }
  }, [config.initialIndoorTemperature, config.ignoreExteriorConditions, config.ambientTemperature, occupantZones, windows, acUnits, airFlowUnits, fans]);

  // Update physics model whenever equipment or boundary conditions change
  useEffect(() => {
    if (simEngineRef.current) {
      simEngineRef.current.updatePhysicsModel(
        config,
        occupantZones,
        windows,
        acUnits,
        airFlowUnits,
        fans
      );
      // Auto-equilibrate when simulation is paused so deleting, adding or modifying equipment
      // immediately recalculates the true physical steady-state balance without ghost residuals
      if (!isSimulating) {
        const curInit = config.initialIndoorTemperature ?? 24.0;
        simEngineRef.current.reset(curInit);
        simEngineRef.current.updatePhysicsModel(
          config,
          occupantZones,
          windows,
          acUnits,
          airFlowUnits,
          fans
        );
        const effAmbient = config.ignoreExteriorConditions ? curInit : config.ambientTemperature;
        simEngineRef.current.solveSteadyState(effAmbient);
      }
      setSimTick((t) => t + 1);
    }
  }, [config, occupantZones, windows, acUnits, airFlowUnits, fans, isSimulating]);

  // Real-time simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      if (dt > 0.05 && simEngineRef.current) {
        lastTime = now;
        const effAmbient = config.ignoreExteriorConditions
          ? (config.initialIndoorTemperature ?? 24.0)
          : config.ambientTemperature;
        simEngineRef.current.step(0.4, effAmbient);
        setSimTick((t) => t + 1);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, config.ambientTemperature, config.ignoreExteriorConditions, config.initialIndoorTemperature]);

  // Instant Steady State Solver
  const handleSolveSteadyState = useCallback(() => {
    if (simEngineRef.current) {
      simEngineRef.current.updatePhysicsModel(
        config,
        occupantZones,
        windows,
        acUnits,
        airFlowUnits,
        fans
      );
      const effAmbient = config.ignoreExteriorConditions
        ? (config.initialIndoorTemperature ?? 24.0)
        : config.ambientTemperature;
      simEngineRef.current.solveSteadyState(effAmbient);
      setSimTick((t) => t + 1);
    }
  }, [config, occupantZones, windows, acUnits, airFlowUnits, fans]);

  // Reset Simulation
  const handleResetSimulation = useCallback(() => {
    if (simEngineRef.current) {
      simEngineRef.current.reset(config.initialIndoorTemperature ?? 24.0);
      simEngineRef.current.updatePhysicsModel(
        config,
        occupantZones,
        windows,
        acUnits,
        airFlowUnits,
        fans
      );
      setSimTick((t) => t + 1);
    }
  }, [config, occupantZones, windows, acUnits, airFlowUnits, fans]);

  // Preset Selection
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCurrentPresetId(preset.id);
      setConfig(preset.config);
      setOccupantZones(preset.occupantZones);
      setWindows(preset.windows);
      setAcUnits(preset.acUnits);
      setAirFlowUnits(preset.airFlowUnits);
      setFans(preset.fans);
      setSelectedId(null);
      setSelectedType('auditorium');
    } else {
      setCurrentPresetId('custom');
    }
  };

  // Export Project JSON
  const handleExportJSON = () => {
    const projectData = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      config,
      occupantZones,
      windows,
      acUnits,
      airFlowUnits,
      fans,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditorio-termico-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Project JSON
  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.config) setConfig(data.config);
        if (data.occupantZones) setOccupantZones(data.occupantZones);
        if (data.windows) setWindows(data.windows);
        if (data.acUnits) setAcUnits(data.acUnits);
        if (data.airFlowUnits) setAirFlowUnits(data.airFlowUnits);
        if (data.fans) setFans(data.fans);
        setCurrentPresetId('custom');
        setSelectedId(null);
        setSelectedType('auditorium');
      } catch (err) {
        alert('Archivo JSON de proyecto inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Compute live thermal summary
  const summary: ThermalSummary = useMemo(() => {
    return calculateThermalSummary(
      config,
      occupantZones,
      windows,
      acUnits,
      airFlowUnits,
      fans,
      simEngineRef.current?.temp
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, occupantZones, windows, acUnits, airFlowUnits, fans, simTick]);

  const totalOccupants = useMemo(() => {
    return occupantZones.reduce((sum, z) => sum + z.occupants, 0);
  }, [occupantZones]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 1. TOP NAVIGATION HEADER */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        onToggleSimulate={() => setIsSimulating(!isSimulating)}
        onSolveSteadyState={handleSolveSteadyState}
        onResetSimulate={handleResetSimulation}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenReport={() => setIsReportOpen(true)}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />

      {/* 2. CAD TOOLBAR */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showVectors={showVectors}
        setShowVectors={setShowVectors}
        showIsotherms={showIsotherms}
        setShowIsotherms={setShowIsotherms}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
      />

      {/* 3. MAIN WORKSPACE (VIEWPORT + PROPERTIES SIDEBAR) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Viewport: 2D Floor Plan or 3D Spatial */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
          {activeTab === '2d' ? (
            <FloorPlan2D
              config={config}
              occupantZones={occupantZones}
              setOccupantZones={setOccupantZones}
              windows={windows}
              setWindows={setWindows}
              acUnits={acUnits}
              setAcUnits={setAcUnits}
              airFlowUnits={airFlowUnits}
              setAirFlowUnits={setAirFlowUnits}
              fans={fans}
              setFans={setFans}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              showHeatmap={showHeatmap}
              showVectors={showVectors}
              showIsotherms={showIsotherms}
              showGrid={showGrid}
              showLabels={showLabels}
              simEngine={simEngineRef.current}
              probe={probe}
              setProbe={setProbe}
              activeSidebarTab={activeSidebarTab}
              setActiveSidebarTab={setActiveSidebarTab}
            />
          ) : (
            <View3D
              config={config}
              occupantZones={occupantZones}
              windows={windows}
              acUnits={acUnits}
              airFlowUnits={airFlowUnits}
              fans={fans}
              simEngine={simEngineRef.current}
              simScaleSettings={simScaleSettings}
              setSimScaleSettings={setSimScaleSettings}
              viewMode={activeTab}
            />
          )}
        </main>

        {/* Right Sidebar: Properties & Parametric Inspector with Tabs */}
        <SidebarProperties
          config={config}
          setConfig={setConfig}
          occupantZones={occupantZones}
          setOccupantZones={setOccupantZones}
          windows={windows}
          setWindows={setWindows}
          acUnits={acUnits}
          setAcUnits={setAcUnits}
          airFlowUnits={airFlowUnits}
          setAirFlowUnits={setAirFlowUnits}
          fans={fans}
          setFans={setFans}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          onResetSimulation={handleResetSimulation}
          simScaleSettings={simScaleSettings}
          setSimScaleSettings={setSimScaleSettings}
          onSelectViewTab={setActiveTab}
        />
      </div>

      {/* 4. BOTTOM ANALYTICAL DASHBOARD */}
      <ThermalDashboard summary={summary} totalOccupants={totalOccupants} />

      {/* 5. EXPORT TECHNICAL REPORT MODAL */}
      <ExportReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        config={config}
        occupantZones={occupantZones}
        windows={windows}
        acUnits={acUnits}
        airFlowUnits={airFlowUnits}
        fans={fans}
        summary={summary}
      />
    </div>
  );
};

export default App;
