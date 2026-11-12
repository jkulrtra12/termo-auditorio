// Types for Auditorium Thermal Analysis Application

export type ToolType =
  | 'select'
  | 'occupant_zone'
  | 'window'
  | 'door'
  | 'ac_split'
  | 'ac_cassette'
  | 'air_injection'
  | 'air_extraction'
  | 'simple_fan'
  | 'probe';

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface AuditoriumConfig {
  width: number;  // Ancho (X) en metros, e.g. 15m
  length: number; // Largo (Y) en metros, e.g. 20m
  height: number; // Alto (Z) en metros, e.g. 5m
  
  // Condiciones interiores iniciales
  initialIndoorTemperature: number; // Temperatura inicial ambiente interior (°C), def: 24°C
  relativeHumidity: number; // Humedad relativa interior (%), def: 50%
  
  // Condiciones ambientales exteriores
  ignoreExteriorConditions?: boolean; // Si es true, se ignoran radiación solar, viento y temperatura exterior (solo balance interior)
  ambientTemperature: number; // Temperatura exterior (°C), e.g. 32°C
  outdoorRelativeHumidity: number; // Humedad relativa exterior (%), def: 60%
  solarRadiation: number; // Radiación solar directa (W/m²), e.g. 500 W/m²
  externalWindSpeed: number; // Velocidad del viento exterior (m/s), e.g. 2.5 m/s
  altitude: number; // Altitud m s.n.m. (e.g. 500m)
  atmosphericPressure: number; // Presión atmosférica en kPa (e.g. 101.3 kPa)

  // Aislamiento de la envolvente
  wallUValue: number; // Coeficiente transmisión térmica muros (W/m²·K), e.g. 0.8
  roofUValue: number; // Coeficiente transmisión térmica techo (W/m²·K), e.g. 0.5
}

export type OpeningType = 'window' | 'door';

export interface WindowItem {
  id: string;
  name: string;
  type?: OpeningType; // 'window' o 'door'
  wall: WallSide; // 'north' (arriba), 'south' (abajo), 'west' (izq), 'east' (der)
  offset: number; // Posición a lo largo del muro (metros desde el inicio)
  width: number; // Largo de la abertura (metros)
  height: number; // Alto de la abertura (metros)
  sillHeight: number; // Altura del antepecho desde el suelo (m, def: 1.0m para ventana, 0m para puerta)
  openingPercentage: number; // 0 a 100% (abierta/cerrada)
  glassUValue: number; // W/m²K (def: 2.8 doble vidrio o 5.7 simple)
  solarHeatGainCoeff: number; // SHGC (def: 0.6)
}

export interface OccupantZone {
  id: string;
  name: string;
  x: number; // metros desde el origen (esquina inf-izq)
  y: number;
  width: number; // metros
  length: number; // metros
  occupants: number; // Número de ocupantes
  sensibleHeatPerPerson: number; // Watts por persona (def: 80W)
  latentHeatPerPerson: number; // Watts por persona (def: 45W)
  activityType: 'seated_relaxed' | 'seated_active' | 'standing';
  color?: string;
}

export type ACType = 'split' | 'cassette';

export interface ACEquipment {
  id: string;
  name: string;
  type: ACType;
  x: number; // metros
  y: number; // metros
  z: number; // altura de instalación (m), e.g. split a 3m en pared, cassette en techo
  wallAttachment?: WallSide; // para splits instalados en pared
  coolingCapacityBTU: number; // BTU/h (e.g. 18000, 24000, 36000, 60000)
  coolingCapacityKW: number; // kW frigoríficos
  setpointTemperature?: number; // Temperatura de consigna del termostato (°C, def: 23°C)
  supplyTemperature: number; // Temperatura de impulsión (°C, e.g. 14°C)
  airflowCFM: number; // Caudal de aire impulsado en CFM
  airflowM3H: number; // Caudal en m³/h
  cop: number; // Coeficiente de rendimiento energético (e.g. 3.2)
  blowDirectionAngle: number; // Ángulo de soplado en grados (0-360)
  enabled: boolean;
}

export type AirFlowType = 'injection' | 'extraction';

export interface AirFlowEquipment {
  id: string;
  name: string;
  type: AirFlowType; // Inyección o Extracción
  x: number; // metros
  y: number; // metros
  z: number; // altura en metros (e.g. 4.5m techo o 0.5m piso)
  airflowM3H: number; // Caudal m³/h
  motorPowerWatts?: number; // Potencia del motor/ventilador en Watts (e.g. 350 W)
  supplyTemperature?: number; // Para inyección (°C, e.g. 18°C tratado o 30°C exterior)
  enabled: boolean;
}

export interface SimpleFan {
  id: string;
  name: string;
  type: 'ceiling' | 'wall' | 'pedestal';
  x: number; // metros
  y: number; // metros
  z: number; // altura metros
  diameter: number; // diámetro aspas en metros (e.g. 1.4m para techo)
  airVelocityMS: number; // velocidad impulsión m/s (e.g. 2.5 m/s)
  airflowM3H?: number; // Caudal de aire estimado o nominal m³/h
  angle: number; // dirección de soplado en grados (para pared/pedestal, o 0 para techo hacia abajo)
  coverageRadius: number; // radio de influencia en metros (e.g. 2.5m)
  powerWatts?: number; // Potencia eléctrica W (e.g. 75W)
  enabled: boolean;
}

export type SimScaleTheme = 'light' | 'dark';
export type ViewTabType = '2d' | '3d' | 'simscale';

export interface SimScaleSettings {
  theme: SimScaleTheme; // 'light' (como imagen 2) o 'dark'
  planeHeight: number; // Altura Z del plano de corte térmico (m), def 1.2m
  showSensorPins: boolean; // Balizas 3D flotantes de temperatura (como imagen 2)
  showStreamlines: boolean; // Líneas de corriente / flujo de aire 3D
  colormap: 'simscale' | 'turbo' | 'thermal';
  wallOpacity: number; // Opacidad muros (0.1 a 0.8)
  cutawayHeight: number; // Altura corte muros
}

export interface SimulationProbe {
  x: number;
  y: number;
  temperature: number;
  velocity: number;
  pmv: number;
  ppd: number;
  comfortLabel: string;
}

export interface SimulationState {
  isRunning: boolean;
  iteration: number;
  gridResolution: number; // Tamaño de cada celda en metros (e.g. 0.5m)
  gridWidth: number;
  gridLength: number;
  temperatureGrid: number[][]; // [y][x] en °C
  velocityGridX: number[][]; // [y][x] en m/s
  velocityGridY: number[][]; // [y][x] en m/s
  comfortGridPMV: number[][]; // [y][x] PMV index
  probe: SimulationProbe | null;
}

export interface ThermalSummary {
  // Cargas de Calor
  occupantsHeatTotalW: number;
  windowsSolarHeatW: number;
  windowsConductionHeatW: number;
  wallsConductionHeatW: number;
  ventilationHeatW: number;
  totalHeatGainW: number;

  // Capacidad de Enfriamiento
  acCoolingTotalW: number;
  acCoolingTotalBTU: number;
  acCoolingTotalKW: number;

  // Balance
  netThermalBalanceW: number; // totalHeatGainW - acCoolingTotalW
  
  // Caudales y Ventilación
  injectionAirflowTotalM3H: number;
  extractionAirflowTotalM3H: number;
  naturalVentilationM3H: number;
  airChangesPerHour: number; // ACH
  auditoriumVolumeM3: number;

  // Temperaturas Estadísticas
  averageTemp: number; // °C
  minTemp: number;
  maxTemp: number;
  hotspotAreaPercent: number; // % del área por encima de 26°C
  coldspotAreaPercent: number; // % del área por debajo de 20°C
  comfortAreaPercent: number; // % del área entre 21°C y 25°C

  // Confort Térmico Promedio
  averagePMV: number;
  averagePPD: number;
  statusRecommendation: string;
  diagnostics: {
    type: 'success' | 'warning' | 'danger' | 'info';
    message: string;
  }[];
}
