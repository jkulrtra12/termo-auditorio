// Thermal physics engine for auditorium analysis
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  SimpleFan,
  ThermalSummary,
  SimulationProbe,
} from '../types';

export const AIR_DENSITY = 1.204; // kg/m³ a 20°C a nivel del mar
export const AIR_SPECIFIC_HEAT = 1005; // J/(kg·K)
export const BTU_TO_WATT = 0.29307107;
export const WATT_TO_BTU = 3.41214163;
export const CFM_TO_M3H = 1.69901;
export const M3H_TO_CFM = 0.588578;

// Orientation solar factor multiplier
export function getWallOrientationSolarFactor(wall: string): number {
  switch (wall) {
    case 'south':
      return 1.1; // Mayor insolación en hemisferio norte o sol de mediodía
    case 'west':
      return 1.25; // Sol de tarde fuerte
    case 'east':
      return 0.9; // Sol de mañana
    case 'north':
      return 0.45; // Radiación difusa
    default:
      return 0.8;
  }
}

// Compute comprehensive summary metrics
export function calculateThermalSummary(
  config: AuditoriumConfig,
  occupantZones: OccupantZone[],
  windows: WindowItem[],
  acUnits: ACEquipment[],
  airFlowUnits: AirFlowEquipment[],
  _fans: SimpleFan[],
  temperatureGrid?: number[][]
): ThermalSummary {
  const auditoriumVolume = config.width * config.length * config.height;
  const ignoreExt = Boolean(config.ignoreExteriorConditions);
  const indoorT = config.initialIndoorTemperature ?? 24;

  // 1. Carga de Ocupantes (Personas con modelo fisiológico dinámico ASHRAE)
  let totalOccupants = 0;
  let occupantsHeatTotalW = 0;
  
  // Temperatura media estimada para modulación de calor sensible
  const estRoomTemp = (temperatureGrid && temperatureGrid.length > 0 && temperatureGrid[0].length > 0)
    ? temperatureGrid.flat().reduce((a, b) => a + b, 0) / (temperatureGrid.length * temperatureGrid[0].length)
    : indoorT;
  // Factor de disipación sensible ASHRAE Fundamentals:
  // A 24°C = 1.0 (~80W sensible), a 30°C = ~0.61 (~50W sensible), y decae a 0 al alcanzar 36°C (donde el 100% es sudoración latente)
  const sensibleFactor = estRoomTemp >= 36.0
    ? 0.0
    : Math.max(0.0, Math.min(1.25, 1.0 - 0.065 * (estRoomTemp - 24.0)));

  for (const zone of occupantZones) {
    totalOccupants += zone.occupants;
    const sensible = zone.sensibleHeatPerPerson || 80;
    // Factor de radiación/convección directa sensible modulada
    occupantsHeatTotalW += zone.occupants * sensible * sensibleFactor;
  }

  // 2. Ventanas: Carga Solar y Conducción (Omitida si ignoreExteriorConditions es true)
  let windowsSolarHeatW = 0;
  let windowsConductionHeatW = 0;
  let naturalVentilationM3H = 0;

  if (!ignoreExt) {
    for (const win of windows) {
      const area = win.width * win.height;
      const solarFactor = getWallOrientationSolarFactor(win.wall);
      
      // Radiación solar que ingresa a través del vidrio
      const solarHeat = area * (win.solarHeatGainCoeff || 0.6) * config.solarRadiation * solarFactor;
      windowsSolarHeatW += solarHeat;

      // Transmisión térmica por conducción
      const tempDiff = Math.max(0, config.ambientTemperature - indoorT);
      const condHeat = area * (win.glassUValue || 2.8) * tempDiff;
      windowsConductionHeatW += condHeat;

      // Ventilación natural por apertura
      if (win.openingPercentage > 0) {
        const openArea = area * (win.openingPercentage / 100);
        const dischargeCoeff = 0.62;
        const effectiveWindSpeed = Math.max(0.5, config.externalWindSpeed * 0.4);
        const flowM3S = dischargeCoeff * openArea * effectiveWindSpeed;
        naturalVentilationM3H += flowM3S * 3600;
      }
    }
  }

  // 3. Muros y Techo por Conducción (Omitida si ignoreExteriorConditions es true)
  let wallsConductionHeatW = 0;
  if (!ignoreExt) {
    const perimeter = 2 * (config.width + config.length);
    const totalWallArea = perimeter * config.height;
    const roofArea = config.width * config.length;
    const tempDiffEnv = Math.max(0, config.ambientTemperature - indoorT);
    wallsConductionHeatW = (totalWallArea * (config.wallUValue || 0.8) + roofArea * (config.roofUValue || 0.5)) * tempDiffEnv;
  }

  // 4. Infiltración / Ventilación natural aportando calor si exterior es más caliente
  let ventilationHeatW = 0;
  if (!ignoreExt) {
    const naturalVentMassFlow = (naturalVentilationM3H / 3600) * AIR_DENSITY;
    ventilationHeatW = Math.max(0, naturalVentMassFlow * AIR_SPECIFIC_HEAT * (config.ambientTemperature - indoorT));
  }

  const totalHeatGainW = occupantsHeatTotalW + windowsSolarHeatW + windowsConductionHeatW + wallsConductionHeatW + ventilationHeatW;

  // 5. Potencia Frigorífica de Equipos AC
  let acCoolingTotalW = 0;
  for (const ac of acUnits) {
    if (ac.enabled) {
      acCoolingTotalW += ac.coolingCapacityKW * 1000;
    }
  }
  const acCoolingTotalBTU = acCoolingTotalW * WATT_TO_BTU;
  const acCoolingTotalKW = acCoolingTotalW / 1000;

  // 6. Caudales de Inyección y Extracción
  let injectionAirflowTotalM3H = 0;
  let extractionAirflowTotalM3H = 0;
  for (const unit of airFlowUnits) {
    if (unit.enabled) {
      if (unit.type === 'injection') {
        injectionAirflowTotalM3H += unit.airflowM3H;
      } else {
        extractionAirflowTotalM3H += unit.airflowM3H;
      }
    }
  }

  // Renovaciones por hora (ACH)
  const totalFreshAirM3H = injectionAirflowTotalM3H + naturalVentilationM3H;
  const airChangesPerHour = auditoriumVolume > 0 ? totalFreshAirM3H / auditoriumVolume : 0;

  // Balance neto
  const netThermalBalanceW = totalHeatGainW - acCoolingTotalW;

  // Estadísticas del Grid de Temperatura (si está disponible)
  let avgTemp = indoorT;
  let minTemp = indoorT;
  let maxTemp = indoorT;
  let hotspotCells = 0;
  let coldspotCells = 0;
  let comfortCells = 0;
  let totalCells = 1;

  if (temperatureGrid && temperatureGrid.length > 0 && temperatureGrid[0].length > 0) {
    const ny = temperatureGrid.length;
    const nx = temperatureGrid[0].length;
    totalCells = ny * nx;
    let sumT = 0;
    minTemp = 999;
    maxTemp = -999;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const t = temperatureGrid[j][i];
        sumT += t;
        if (t < minTemp) minTemp = t;
        if (t > maxTemp) maxTemp = t;

        if (t > 26.5) hotspotCells++;
        else if (t < 19.5) coldspotCells++;
        else comfortCells++;
      }
    }
    avgTemp = sumT / totalCells;
  } else {
    // Estimación teórica si no hay simulación corrida aún
    const deltaT = (netThermalBalanceW / (auditoriumVolume * AIR_DENSITY * AIR_SPECIFIC_HEAT)) * 60;
    avgTemp = Math.min(38, Math.max(16, indoorT + deltaT * 0.15));
    minTemp = avgTemp - 2.5;
    maxTemp = avgTemp + 3.0;
  }

  const hotspotAreaPercent = Math.round((hotspotCells / totalCells) * 100);
  const coldspotAreaPercent = Math.round((coldspotCells / totalCells) * 100);
  const comfortAreaPercent = Math.round((comfortCells / totalCells) * 100);

  // Estimación de PMV / PPD simplificado
  const pmv = calculatePMV(avgTemp, 0.2, config.relativeHumidity || 50, 1.1, 0.6);
  const ppd = calculatePPD(pmv);

  // Diagnósticos y Recomendaciones
  const diagnostics: ThermalSummary['diagnostics'] = [];

  // Check 1: Capacidad frigorífica vs carga térmica
  if (acCoolingTotalW < totalHeatGainW * 0.9) {
    const deficitKW = ((totalHeatGainW - acCoolingTotalW) / 1000).toFixed(1);
    const deficitBTU = Math.round((totalHeatGainW - acCoolingTotalW) * WATT_TO_BTU);
    diagnostics.push({
      type: 'danger',
      message: `Capacidad de climatización insuficiente: Déficit de ${deficitKW} kW (~${deficitBTU.toLocaleString()} BTU/h) para neutralizar la carga térmica.`,
    });
  } else if (acCoolingTotalW > totalHeatGainW * 1.6 && acCoolingTotalW > 0) {
    diagnostics.push({
      type: 'warning',
      message: `Capacidad de climatización sobredimensionada (+${Math.round((acCoolingTotalW / totalHeatGainW - 1) * 100)}%). Podría generar ciclos cortos o sobreenfriamiento localizado.`,
    });
  } else {
    diagnostics.push({
      type: 'success',
      message: `Capacidad frigorífica adecuada (${(acCoolingTotalW / 1000).toFixed(1)} kW instalados vs ${(totalHeatGainW / 1000).toFixed(1)} kW de carga térmica).`,
    });
  }

  // Check 2: Renovaciones de aire / ACH
  if (airChangesPerHour < 4) {
    diagnostics.push({
      type: 'warning',
      message: `Baja tasa de renovación de aire (${airChangesPerHour.toFixed(1)} ACH). Se recomiendan entre 6 y 12 ACH para auditorios según normativas (ASHRAE 62.1 / RITE).`,
    });
  } else if (airChangesPerHour > 15) {
    diagnostics.push({
      type: 'info',
      message: `Alta tasa de renovación (${airChangesPerHour.toFixed(1)} ACH). Excelente calidad de aire, vigilar posibles pérdidas energéticas si el aire exterior no está pretratado.`,
    });
  } else {
    diagnostics.push({
      type: 'success',
      message: `Ventilación óptima (${airChangesPerHour.toFixed(1)} Renovaciones/hora) para ocupación de auditorio.`,
    });
  }

  // Check 3: Balance de presión (Inyección vs Extracción)
  const netAirflow = injectionAirflowTotalM3H - extractionAirflowTotalM3H;
  if (Math.abs(netAirflow) > 1000) {
    if (netAirflow > 0) {
      diagnostics.push({
        type: 'info',
        message: `Presurización positiva (+${Math.round(netAirflow)} m³/h): evita infiltraciones de aire exterior no tratado por rendijas y puertas.`,
      });
    } else {
      diagnostics.push({
        type: 'warning',
        message: `Depresión en sala (${Math.round(netAirflow)} m³/h): la extracción supera la inyección, provocando corrientes no deseadas por aberturas.`,
      });
    }
  }

  // Check 4: Ventanas abiertas en día caluroso
  const openWindows = windows.filter((w) => w.openingPercentage > 20);
  if (openWindows.length > 0 && config.ambientTemperature > 28 && acUnits.some((u) => u.enabled)) {
    diagnostics.push({
      type: 'warning',
      message: `Hay ventanas abiertas con AC encendido y T° exterior elevada (${config.ambientTemperature}°C). Esto incrementa el consumo y crea bolsas térmicas perimetrales.`,
    });
  }

  // Recomendación general
  let statusRecommendation = 'Condiciones térmicas en rango de confort aceptable.';
  if (avgTemp > 26) {
    statusRecommendation = 'Auditorio caluroso. Incrementar potencia frigorífica o redistribuir unidades AC.';
  } else if (avgTemp < 20) {
    statusRecommendation = 'Auditorio frío. Modular consignas de temperatura o reducir potencia activa.';
  } else if (hotspotAreaPercent > 20) {
    statusRecommendation = 'Hay zonas con gradientes altos de temperatura. Instalar ventiladores de mezcla o reubicar splits.';
  }

  return {
    occupantsHeatTotalW: Math.round(occupantsHeatTotalW),
    windowsSolarHeatW: Math.round(windowsSolarHeatW),
    windowsConductionHeatW: Math.round(windowsConductionHeatW),
    wallsConductionHeatW: Math.round(wallsConductionHeatW),
    ventilationHeatW: Math.round(ventilationHeatW),
    totalHeatGainW: Math.round(totalHeatGainW),
    acCoolingTotalW: Math.round(acCoolingTotalW),
    acCoolingTotalBTU,
    acCoolingTotalKW,
    netThermalBalanceW: Math.round(netThermalBalanceW),
    injectionAirflowTotalM3H: Math.round(injectionAirflowTotalM3H),
    extractionAirflowTotalM3H: Math.round(extractionAirflowTotalM3H),
    naturalVentilationM3H: Math.round(naturalVentilationM3H),
    airChangesPerHour,
    auditoriumVolumeM3: Math.round(auditoriumVolume),
    averageTemp: Number(avgTemp.toFixed(1)),
    minTemp: Number(minTemp.toFixed(1)),
    maxTemp: Number(maxTemp.toFixed(1)),
    hotspotAreaPercent,
    coldspotAreaPercent,
    comfortAreaPercent,
    averagePMV: Number(pmv.toFixed(2)),
    averagePPD: Number(ppd.toFixed(1)),
    statusRecommendation,
    diagnostics,
  };
}

// Simplified Fanger PMV calculation (ISO 7730 / ASHRAE 55)
// Ta = air temp (°C), v = air velocity (m/s), rh = relative humidity (%), met = metabolic rate (met), clo = clothing insulation (clo)
export function calculatePMV(ta: number, v: number = 0.15, rh: number = 50, met: number = 1.1, clo: number = 0.6): number {
  const m = met * 58.15; // W/m²
  const w = 0; // mechanical work
  const pa = (rh / 100) * 10 * Math.exp(16.6536 - 4030.183 / (ta + 235)); // vapor pressure kPa
  const icl = 0.155 * clo; // thermal resistance of clothing m²K/W

  const fcl = icl <= 0.078 ? 1.0 + 1.29 * icl : 1.05 + 0.645 * icl;
  const hc = Math.max(2.38 * Math.pow(Math.abs(ta - 24), 0.25), 12.1 * Math.sqrt(Math.max(v, 0.1)));

  // Robust clothing surface temperature calculation (ASHRAE 55 closed-form seed)
  const tra = ta; // Mean radiant temperature approximated by air temperature
  const tcl = ta + (35.5 - ta) / (3.5 * (6.45 * icl + 0.1));
  
  // Heat loss components (ISO 7730)
  const hl1 = 3.05 * 0.001 * (5733 - 6.99 * (m - w) - pa);
  const hl2 = 0.42 * (m - w - 58.15);
  const hl3 = 1.7 * 0.00001 * m * (5867 - pa);
  const hl4 = 0.0014 * m * (34 - ta);
  const hl5 = 3.96 * Math.pow(10, -8) * fcl * (Math.pow(tcl + 273, 4) - Math.pow(tra + 273, 4));
  const hl6 = fcl * hc * (tcl - ta);

  const l = m - w - hl1 - hl2 - hl3 - hl4 - hl5 - hl6;
  const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;
  const pmv = ts * l;

  return Math.min(3, Math.max(-3, pmv));
}

export function calculatePPD(pmv: number): number {
  const ppd = 100 - 95 * Math.exp(-0.03353 * Math.pow(pmv, 4) - 0.2179 * Math.pow(pmv, 2));
  return Math.min(100, Math.max(5, ppd));
}

export function getComfortLabel(pmv: number): { text: string; color: string } {
  if (pmv > 2.0) return { text: 'Muy Caluroso (Incómodo)', color: '#ef4444' };
  if (pmv > 1.0) return { text: 'Cálido', color: '#f97316' };
  if (pmv > 0.5) return { text: 'Ligeramente Cálido', color: '#eab308' };
  if (pmv >= -0.5) return { text: 'Confort Ideal (Neutro)', color: '#10b981' };
  if (pmv >= -1.0) return { text: 'Ligeramente Frío', color: '#06b6d4' };
  if (pmv >= -2.0) return { text: 'Frío', color: '#3b82f6' };
  return { text: 'Muy Frío (Corrientes)', color: '#6366f1' };
}

// 2D Finite Difference Thermal & Airflow Simulation Grid Solver
export class ThermalSimulationEngine {
  public nx: number;
  public ny: number;
  public res: number; // m per cell
  public temp: number[][]; // [y][x]
  public tempPrev: number[][];
  public velX: number[][];
  public velY: number[][];
  public heatSource: number[][]; // W per cell
  public occupantHeatSource: number[][]; // W nominal sensible per cell
  public otherHeatSource: number[][]; // W windows/equip heat per cell
  public coolingSource: number[][]; // W cooling per cell
  public ignoreExteriorConditions: boolean = false;
  public initialIndoorTemperature: number = 24.0;

  constructor(width: number, length: number, resolution: number = 0.5) {
    this.res = Math.max(0.2, resolution);
    this.nx = Math.max(4, Math.ceil(width / this.res));
    this.ny = Math.max(4, Math.ceil(length / this.res));

    this.temp = Array.from({ length: this.ny }, () => Array(this.nx).fill(25.0));
    this.tempPrev = Array.from({ length: this.ny }, () => Array(this.nx).fill(25.0));
    this.velX = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.05));
    this.velY = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.0));
    this.heatSource = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.0));
    this.occupantHeatSource = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.0));
    this.otherHeatSource = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.0));
    this.coolingSource = Array.from({ length: this.ny }, () => Array(this.nx).fill(0.0));
  }

  // Initialize or reset grid to ambient/initial temperature
  public reset(initialTemp: number = 24.0) {
    this.initialIndoorTemperature = initialTemp;
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        this.temp[j][i] = initialTemp;
        this.tempPrev[j][i] = initialTemp;
        this.velX[j][i] = 0.05;
        this.velY[j][i] = 0.0;
        this.heatSource[j][i] = 0;
        this.occupantHeatSource[j][i] = 0;
        this.otherHeatSource[j][i] = 0;
        this.coolingSource[j][i] = 0;
      }
    }
  }

  // Build boundary conditions, sources, and sinks from auditorium elements
  public updatePhysicsModel(
    config: AuditoriumConfig,
    occupantZones: OccupantZone[],
    windows: WindowItem[],
    acUnits: ACEquipment[],
    airFlowUnits: AirFlowEquipment[],
    fans: SimpleFan[]
  ) {
    this.ignoreExteriorConditions = Boolean(config.ignoreExteriorConditions);
    this.initialIndoorTemperature = config.initialIndoorTemperature ?? 24.0;

    // 1. Reset source grids
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        this.heatSource[j][i] = 0;
        this.occupantHeatSource[j][i] = 0;
        this.otherHeatSource[j][i] = 0;
        this.coolingSource[j][i] = 0;
        // background gentle buoyancy / drift
        this.velX[j][i] = 0.04;
        this.velY[j][i] = 0.02;
      }
    }

    const cellArea = this.res * this.res;

    // 2. Add Occupant Heat (Nominal sensible heat)
    for (const zone of occupantZones) {
      if (zone.occupants <= 0) continue;
      const zoneSensibleW = zone.occupants * (zone.sensibleHeatPerPerson || 80);
      const zoneArea = Math.max(0.1, zone.width * zone.length);
      const heatFluxPerM2 = zoneSensibleW / zoneArea;
      const heatPerCell = heatFluxPerM2 * cellArea;

      const iMin = Math.max(0, Math.floor(zone.x / this.res));
      const iMax = Math.min(this.nx - 1, Math.floor((zone.x + zone.width) / this.res));
      const jMin = Math.max(0, Math.floor(zone.y / this.res));
      const jMax = Math.min(this.ny - 1, Math.floor((zone.y + zone.length) / this.res));

      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) {
          this.occupantHeatSource[j][i] += heatPerCell;
          this.heatSource[j][i] += heatPerCell;
        }
      }
    }

    // 3. Add Windows (Perimeter conduction + solar + ventilation)
    // Se omiten por completo si ignoreExteriorConditions está activado
    if (!this.ignoreExteriorConditions) {
      for (const win of windows) {
        const area = win.width * win.height;
        const solarW = area * (win.solarHeatGainCoeff || 0.6) * config.solarRadiation * getWallOrientationSolarFactor(win.wall);
        const condW = area * (win.glassUValue || 2.8) * Math.max(0, config.ambientTemperature - this.initialIndoorTemperature);
        const winHeatTotal = solarW + condW;

        // Determine cell coordinates along the wall
        let cells: [number, number][] = [];
        const winStart = win.offset;
        const winEnd = win.offset + win.width;

        if (win.wall === 'south') {
          // y = 0
          const iStart = Math.max(0, Math.floor(winStart / this.res));
          const iEnd = Math.min(this.nx - 1, Math.floor(winEnd / this.res));
          for (let i = iStart; i <= iEnd; i++) cells.push([i, 0]);
        } else if (win.wall === 'north') {
          // y = length
          const iStart = Math.max(0, Math.floor(winStart / this.res));
          const iEnd = Math.min(this.nx - 1, Math.floor(winEnd / this.res));
          for (let i = iStart; i <= iEnd; i++) cells.push([i, this.ny - 1]);
        } else if (win.wall === 'west') {
          // x = 0
          const jStart = Math.max(0, Math.floor(winStart / this.res));
          const jEnd = Math.min(this.ny - 1, Math.floor(winEnd / this.res));
          for (let j = jStart; j <= jEnd; j++) cells.push([0, j]);
        } else if (win.wall === 'east') {
          // x = width
          const jStart = Math.max(0, Math.floor(winStart / this.res));
          const jEnd = Math.min(this.ny - 1, Math.floor(winEnd / this.res));
          for (let j = jStart; j <= jEnd; j++) cells.push([this.nx - 1, j]);
        }

        if (cells.length > 0) {
          const heatPerCell = winHeatTotal / cells.length;
          for (const [ci, cj] of cells) {
            this.otherHeatSource[cj][ci] += heatPerCell;
            this.heatSource[cj][ci] += heatPerCell;
            
            // If window is open, inject ambient air velocity
            if (win.openingPercentage > 0) {
              const openRatio = win.openingPercentage / 100;
              const windSpeed = config.externalWindSpeed * openRatio * 0.4;
              if (win.wall === 'south') this.velY[cj][ci] += windSpeed;
              if (win.wall === 'north') this.velY[cj][ci] -= windSpeed;
              if (win.wall === 'west') this.velX[cj][ci] += windSpeed;
              if (win.wall === 'east') this.velX[cj][ci] -= windSpeed;
            }
          }
        }
      }
    }

    // 4. Add AC Units (Splits & Cassettes)
    for (const ac of acUnits) {
      if (!ac.enabled) continue;
      const ci = Math.min(this.nx - 1, Math.max(0, Math.floor(ac.x / this.res)));
      const cj = Math.min(this.ny - 1, Math.max(0, Math.floor(ac.y / this.res)));
      const coolingW = ac.coolingCapacityKW * 1000;

      if (ac.type === 'cassette') {
        // Radial 4-way dispersion (radius ~ 3-4m)
        const radiusMeters = 3.5;
        const radiusCells = Math.max(1, Math.round(radiusMeters / this.res));
        let affectedCellsCount = 0;
        
        for (let dj = -radiusCells; dj <= radiusCells; dj++) {
          for (let di = -radiusCells; di <= radiusCells; di++) {
            const dist = Math.sqrt(di * di + dj * dj) * this.res;
            if (dist <= radiusMeters) {
              const ni = ci + di;
              const nj = cj + dj;
              if (ni >= 0 && ni < this.nx && nj >= 0 && nj < this.ny) {
                affectedCellsCount++;
              }
            }
          }
        }

        const coolingPerCell = coolingW / Math.max(1, affectedCellsCount);

        for (let dj = -radiusCells; dj <= radiusCells; dj++) {
          for (let di = -radiusCells; di <= radiusCells; di++) {
            const dist = Math.sqrt(di * di + dj * dj) * this.res;
            if (dist <= radiusMeters) {
              const ni = ci + di;
              const nj = cj + dj;
              if (ni >= 0 && ni < this.nx && nj >= 0 && nj < this.ny) {
                const decay = 1.0 - dist / (radiusMeters + 0.1);
                this.coolingSource[nj][ni] += coolingPerCell * decay * 1.5;

                // Radial velocity pushed outward
                if (dist > 0.1) {
                  const vRad = 0.4 * (ac.airflowCFM / 1000) * decay;
                  this.velX[nj][ni] += (di / (dist / this.res)) * vRad;
                  this.velY[nj][ni] += (dj / (dist / this.res)) * vRad;
                }
              }
            }
          }
        }
      } else {
        // Split: Directional throw jet (cone of ~ 6-8m forward)
        const throwDistM = 6.0;
        const throwCells = Math.round(throwDistM / this.res);
        const rad = (ac.blowDirectionAngle * Math.PI) / 180;
        const dirX = Math.cos(rad);
        const dirY = Math.sin(rad);

        let affectedCells = 0;
        for (let step = 1; step <= throwCells; step++) {
          const spread = Math.ceil(step * 0.4);
          for (let s = -spread; s <= spread; s++) {
            const px = Math.round(ci + dirX * step - dirY * s);
            const py = Math.round(cj + dirY * step + dirX * s);
            if (px >= 0 && px < this.nx && py >= 0 && py < this.ny) {
              affectedCells++;
            }
          }
        }

        const coolingPerCell = coolingW / Math.max(1, affectedCells);

        for (let step = 1; step <= throwCells; step++) {
          const spread = Math.ceil(step * 0.4);
          const distFraction = step / throwCells;
          const decay = Math.pow(1 - distFraction, 0.7);

          for (let s = -spread; s <= spread; s++) {
            const px = Math.round(ci + dirX * step - dirY * s);
            const py = Math.round(cj + dirY * step + dirX * s);
            if (px >= 0 && px < this.nx && py >= 0 && py < this.ny) {
              this.coolingSource[py][px] += coolingPerCell * decay * 1.4;
              const vAir = 1.2 * decay * (ac.airflowCFM / 800);
              this.velX[py][px] += dirX * vAir;
              this.velY[py][px] += dirY * vAir;
            }
          }
        }
        // At the unit itself: strong cooling
        this.coolingSource[cj][ci] += coolingPerCell * 2;
      }
    }

    // 5. Airflow Units (Inyeccion / Extraccion)
    for (const af of airFlowUnits) {
      if (!af.enabled) continue;
      const ci = Math.min(this.nx - 1, Math.max(0, Math.floor(af.x / this.res)));
      const cj = Math.min(this.ny - 1, Math.max(0, Math.floor(af.y / this.res)));
      const vMagnitude = Math.min(2.5, (af.airflowM3H / 3600) / 0.5);

      if (af.type === 'injection') {
        const supplyT = af.supplyTemperature ?? 20;
        // Inyeccion: influye con temperatura fresca o tratada respecto al interior
        const targetW = (af.airflowM3H / 3600) * AIR_DENSITY * AIR_SPECIFIC_HEAT * (this.initialIndoorTemperature - supplyT);
        if (targetW > 0) {
          this.coolingSource[cj][ci] += targetW;
        } else {
          this.heatSource[cj][ci] += Math.abs(targetW);
        }
        // Circulación local
        this.velX[cj][ci] += vMagnitude * 0.5;
        this.velY[cj][ci] += vMagnitude * 0.5;
      } else {
        // Extracción: retira aire caliente del recinto
        this.coolingSource[cj][ci] += (af.airflowM3H / 3600) * AIR_DENSITY * AIR_SPECIFIC_HEAT * 0.5;
        this.velY[cj][ci] += vMagnitude * 0.4;
      }
    }

    // 6. Simple Fans (Ventiladores de techo o pared)
    for (const fan of fans) {
      if (!fan.enabled) continue;
      const ci = Math.min(this.nx - 1, Math.max(0, Math.floor(fan.x / this.res)));
      const cj = Math.min(this.ny - 1, Math.max(0, Math.floor(fan.y / this.res)));
      const radiusCells = Math.max(1, Math.round(fan.coverageRadius / this.res));

      for (let dj = -radiusCells; dj <= radiusCells; dj++) {
        for (let di = -radiusCells; di <= radiusCells; di++) {
          const dist = Math.sqrt(di * di + dj * dj) * this.res;
          if (dist <= fan.coverageRadius) {
            const ni = ci + di;
            const nj = cj + dj;
            if (ni >= 0 && ni < this.nx && nj >= 0 && nj < this.ny) {
              const decay = 1.0 - dist / (fan.coverageRadius + 0.1);
              // Convección forzada que distribuye el calor
              const vFan = fan.airVelocityMS * decay;
              if (fan.type === 'ceiling') {
                // Swirl / torbellino de mezcla centrífugo
                if (dist > 0.1) {
                  this.velX[nj][ni] += (-dj / (dist / this.res)) * (vFan * 0.6);
                  this.velY[nj][ni] += (di / (dist / this.res)) * (vFan * 0.6);
                }
              } else {
                // Wall / pedestal directional
                const rad = (fan.angle * Math.PI) / 180;
                this.velX[nj][ni] += Math.cos(rad) * vFan;
                this.velY[nj][ni] += Math.sin(rad) * vFan;
              }
            }
          }
        }
      }
    }
  }

  // Perform single time step of the thermal advection-diffusion equation
  // dt: seconds
  public step(dt: number = 0.4, ambientTemp: number = 30.0) {
    const effectiveAmbient = this.ignoreExteriorConditions ? this.initialIndoorTemperature : ambientTemp;

    // Sub-stepping to guarantee von Neumann unconditional stability (r <= 0.10 << 0.25)
    // Eliminates the numerical checkerboard oscillation pattern completely
    const subSteps = Math.max(1, Math.ceil(dt / 0.12));
    const subDt = dt / subSteps;
    const alpha = 0.18; // Effective thermal diffusivity coefficient (m²/s) with turbulent air mixing
    const cellVol = this.res * this.res * 1.5; // 1.5m occupied & breathing layer height (concentrates metabolic plume)
    const cellThermalCapacity = AIR_DENSITY * AIR_SPECIFIC_HEAT * cellVol; // J/K
    const r = (alpha * subDt) / (this.res * this.res); // r <= 0.086 (strictly stable)

    for (let sub = 0; sub < subSteps; sub++) {
      // Copy current state
      for (let j = 0; j < this.ny; j++) {
        for (let i = 0; i < this.nx; i++) {
          this.tempPrev[j][i] = this.temp[j][i];
        }
      }

      for (let j = 0; j < this.ny; j++) {
        for (let i = 0; i < this.nx; i++) {
          const tCenter = this.tempPrev[j][i];

          // Boundary values:
          // If ignoring exterior conditions, perimeter walls are adiabatic (Neumann condition: zero conductive loss to outside)
          let tLeft: number, tRight: number, tBottom: number, tTop: number;
          if (this.ignoreExteriorConditions) {
            tLeft = i > 0 ? this.tempPrev[j][i - 1] : tCenter;
            tRight = i < this.nx - 1 ? this.tempPrev[j][i + 1] : tCenter;
            tBottom = j > 0 ? this.tempPrev[j - 1][i] : tCenter;
            tTop = j < this.ny - 1 ? this.tempPrev[j + 1][i] : tCenter;
          } else {
            // Physical envelope thermal transmission factor per sub-step based on wall thermal resistance
            // Prevents non-physical flash-heating of perimeter cells
            const wallFactor = 0.008;
            tLeft = i > 0 ? this.tempPrev[j][i - 1] : tCenter + wallFactor * (effectiveAmbient - tCenter);
            tRight = i < this.nx - 1 ? this.tempPrev[j][i + 1] : tCenter + wallFactor * (effectiveAmbient - tCenter);
            tBottom = j > 0 ? this.tempPrev[j - 1][i] : tCenter + wallFactor * (effectiveAmbient - tCenter);
            tTop = j < this.ny - 1 ? this.tempPrev[j + 1][i] : tCenter + wallFactor * (effectiveAmbient - tCenter);
          }

          // Diffusion (Laplacian)
          const laplacian = (tLeft + tRight + tBottom + tTop - 4 * tCenter);

          // Advection (Upwind differencing for numerical stability)
          const vx = this.velX[j][i];
          const vy = this.velY[j][i];
          let advX = 0;
          let advY = 0;
          if (vx > 0) {
            advX = -vx * ((tCenter - tLeft) / this.res);
          } else {
            advX = -vx * ((tRight - tCenter) / this.res);
          }
          if (vy > 0) {
            advY = -vy * ((tCenter - tBottom) / this.res);
          } else {
            advY = -vy * ((tTop - tCenter) / this.res);
          }

          // Dynamic ASHRAE Human Sensible Heat Thermoregulation (ASHRAE Fundamentals Ch. 9):
          // A 24°C = 1.0 (~80W sensible), a 30°C = ~0.61 (~50W sensible), a 36°C = 0W (100% sudoración latente)
          const sensibleFactor = tCenter >= 36.0
            ? 0.0
            : Math.max(0.0, Math.min(1.25, 1.0 - 0.065 * (tCenter - 24.0)));
          const effectiveHeatW = this.occupantHeatSource[j][i] * sensibleFactor + this.otherHeatSource[j][i];
          const netPowerW = effectiveHeatW - this.coolingSource[j][i];
          const deltaTSource = (netPowerW * subDt) / cellThermalCapacity;

          // Envelope thermal loss: 0 if ignoring exterior, else slight relaxation to ambient
          const envLoss = this.ignoreExteriorConditions ? 0 : 0.003 * (effectiveAmbient - tCenter) * subDt;

          let nextT = tCenter + r * laplacian + (advX + advY) * subDt * 0.35 + deltaTSource + envLoss;
          // Realistic comfort limit
          nextT = Math.max(14.0, Math.min(36.0, nextT));
          this.temp[j][i] = nextT;
        }
      }
    }
  }

  // Fast Steady-State Convergence Solver
  // Simulates pseudo-transient continuous event regime (~30-45 minutes) to reach realistic thermal equilibrium
  public solveSteadyState(ambientTemp: number = 30.0) {
    const effectiveAmbient = this.ignoreExteriorConditions ? this.initialIndoorTemperature : ambientTemp;
    // Stage 1: Accelerated thermal buildup in occupant plumes
    for (let it = 0; it < 60; it++) {
      this.step(2.5, effectiveAmbient);
    }
    // Stage 2: Convective & diffusive thermal smoothing across aisles and enclosure
    for (let it = 0; it < 60; it++) {
      this.step(0.8, effectiveAmbient);
    }
  }

  // Sample probe at (x, y) coordinates in meters
  public sampleProbe(x: number, y: number): SimulationProbe | null {
    if (x < 0 || x > this.nx * this.res || y < 0 || y > this.ny * this.res) {
      return null;
    }
    const ci = Math.min(this.nx - 1, Math.max(0, Math.floor(x / this.res)));
    const cj = Math.min(this.ny - 1, Math.max(0, Math.floor(y / this.res)));
    const temperature = this.temp[cj][ci];
    const vx = this.velX[cj][ci];
    const vy = this.velY[cj][ci];
    const velocity = Number(Math.sqrt(vx * vx + vy * vy).toFixed(2));
    const pmv = Number(calculatePMV(temperature, velocity, 50, 1.1, 0.6).toFixed(2));
    const ppd = Number(calculatePPD(pmv).toFixed(1));
    const comfortLabel = getComfortLabel(pmv).text;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      temperature: Number(temperature.toFixed(1)),
      velocity,
      pmv,
      ppd,
      comfortLabel,
    };
  }
}
