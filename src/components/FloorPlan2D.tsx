import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  SimpleFan,
  ToolType,
  SimulationProbe,
  WallSide,
} from '../types';
import { ThermalSimulationEngine, getComfortLabel } from '../utils/physics';

interface FloorPlan2DProps {
  config: AuditoriumConfig;
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
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  showHeatmap: boolean;
  showVectors: boolean;
  showIsotherms: boolean;
  showGrid: boolean;
  showLabels: boolean;
  simEngine: ThermalSimulationEngine | null;
  probe: SimulationProbe | null;
  setProbe: (probe: SimulationProbe | null) => void;
  activeSidebarTab: number;
  setActiveSidebarTab?: (tab: number) => void;
}

// Color mapper for temperature heatmap (16°C to 34°C)
function getTemperatureColor(temp: number, alpha: number = 0.75): string {
  const minT = 17;
  const maxT = 33;
  const clamped = Math.max(minT, Math.min(maxT, temp));
  const t = (clamped - minT) / (maxT - minT); // 0.0 to 1.0

  let r = 0, g = 0, b = 0;
  if (t < 0.25) {
    // 17°C - 21°C: Deep Blue to Cyan
    const f = t / 0.25;
    r = Math.round(30 * (1 - f) + 34 * f);
    g = Math.round(100 * (1 - f) + 211 * f);
    b = Math.round(230 * (1 - f) + 238 * f);
  } else if (t < 0.5) {
    // 21°C - 25°C: Cyan to Emerald Green (Confort Ideal)
    const f = (t - 0.25) / 0.25;
    r = Math.round(34 * (1 - f) + 16 * f);
    g = Math.round(211 * (1 - f) + 185 * f);
    b = Math.round(238 * (1 - f) + 129 * f);
  } else if (t < 0.75) {
    // 25°C - 29°C: Green to Warm Amber / Orange
    const f = (t - 0.5) / 0.25;
    r = Math.round(16 * (1 - f) + 245 * f);
    g = Math.round(185 * (1 - f) + 158 * f);
    b = Math.round(129 * (1 - f) + 11 * f);
  } else {
    // 29°C - 33°C+: Orange to Crimson Red (Caluroso)
    const f = (t - 0.75) / 0.25;
    r = Math.round(245 * (1 - f) + 239 * f);
    g = Math.round(158 * (1 - f) + 68 * f);
    b = Math.round(11 * (1 - f) + 68 * f);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const FloorPlan2D: React.FC<FloorPlan2DProps> = ({
  config,
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
  activeTool,
  setActiveTool,
  showHeatmap,
  showVectors,
  showIsotherms,
  showGrid,
  showLabels,
  simEngine,
  probe,
  setProbe,
  activeSidebarTab,
  setActiveSidebarTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dragging state
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [dragStartMeters, setDragStartMeters] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentMeters, setDragCurrentMeters] = useState<{ x: number; y: number } | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [movingItemType, setMovingItemType] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ ox: number; oy: number } | null>(null);
  const [liveDragCoords, setLiveDragCoords] = useState<{ x: number; y: number; text: string } | null>(null);

  // Viewport transformation: scale (px per meter), origin offset (px)
  const [scale, setScale] = useState(28); // px per meter
  const [panOffset, setPanOffset] = useState({ x: 80, y: 70 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Convert canvas pixel coordinates to Auditorium meters
  const screenToMeters = useCallback(
    (screenX: number, screenY: number) => {
      const mx = (screenX - panOffset.x) / scale;
      // Invert Y so 0 is bottom
      const my = config.length - (screenY - panOffset.y) / scale;
      return { x: mx, y: my };
    },
    [panOffset, scale, config.length]
  );

  // Convert Auditorium meters to canvas pixel coordinates
  const metersToScreen = useCallback(
    (mx: number, my: number) => {
      const sx = panOffset.x + mx * scale;
      const sy = panOffset.y + (config.length - my) * scale;
      return { x: sx, y: sy };
    },
    [panOffset, scale, config.length]
  );

  // Auto-fit auditorium into canvas view on initial load or resize
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const paddingX = 140;
    const paddingY = 120;
    const availW = Math.max(200, clientWidth - paddingX);
    const availH = Math.max(200, clientHeight - paddingY);

    const scaleX = availW / config.width;
    const scaleY = availH / config.length;
    const fitScale = Math.min(scaleX, scaleY, 50);

    setScale(Math.max(15, fitScale));
    setPanOffset({
      x: (clientWidth - config.width * fitScale) / 2,
      y: (clientHeight - config.length * fitScale) / 2,
    });
  }, [config.width, config.length]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear background
    ctx.fillStyle = '#090d16'; // Deep blueprint dark
    ctx.fillRect(0, 0, width, height);

    // 2. Draw outer grid (if enabled)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const gridSizePx = scale; // 1 meter grid
      const startX = panOffset.x % gridSizePx;
      const startY = panOffset.y % gridSizePx;

      for (let x = startX; x < width; x += gridSizePx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += gridSizePx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Auditorium bounding box on screen
    const roomTopLeft = metersToScreen(0, config.length);
    const roomW = config.width * scale;
    const roomH = config.length * scale;

    // 3. Render Auditorium Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);

    // 4. Render Thermal Heatmap Layer
    if (showHeatmap && simEngine && simEngine.temp) {
      const res = simEngine.res;
      const cellW = res * scale;
      const cellH = res * scale;

      ctx.save();
      // Clip to room boundary
      ctx.beginPath();
      ctx.rect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);
      ctx.clip();

      for (let j = 0; j < simEngine.ny; j++) {
        for (let i = 0; i < simEngine.nx; i++) {
          const t = simEngine.temp[j][i];
          const mY = (j + 1) * res; // top of cell in auditorium coords
          const mX = i * res;
          const pos = metersToScreen(mX, mY);

          ctx.fillStyle = getTemperatureColor(t, 0.72);
          ctx.fillRect(pos.x, pos.y, cellW + 0.5, cellH + 0.5);
        }
      }
      ctx.restore();
    }

    // 5. Render Isotherms (Contour Lines)
    if (showIsotherms && simEngine && simEngine.temp) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);
      ctx.clip();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);

      const isoLevels = [19, 21, 23, 25, 27, 29, 31];
      const res = simEngine.res;

      for (const iso of isoLevels) {
        ctx.strokeStyle = getTemperatureColor(iso, 0.9);
        for (let j = 0; j < simEngine.ny - 1; j++) {
          for (let i = 0; i < simEngine.nx - 1; i++) {
            const t0 = simEngine.temp[j][i];
            const t1 = simEngine.temp[j][i + 1];
            const t2 = simEngine.temp[j + 1][i];

            if ((t0 <= iso && t1 >= iso) || (t0 >= iso && t1 <= iso)) {
              const fraction = (iso - t0) / (t1 - t0 || 0.001);
              const px = (i + fraction) * res;
              const py = (j + 0.5) * res;
              const pt = metersToScreen(px, py);
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }
      ctx.restore();
    }

    // 6. Render Velocity Vectors (Airflow arrows)
    if (showVectors && simEngine && simEngine.velX) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

      const step = Math.max(1, Math.round(2 / simEngine.res)); // every ~2 meters
      for (let j = 0; j < simEngine.ny; j += step) {
        for (let i = 0; i < simEngine.nx; i += step) {
          const vx = simEngine.velX[j][i];
          const vy = simEngine.velY[j][i];
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed < 0.08) continue;

          const mX = (i + 0.5) * simEngine.res;
          const mY = (j + 0.5) * simEngine.res;
          const pt = metersToScreen(mX, mY);

          const len = Math.min(22, Math.max(6, speed * 12));
          const angle = Math.atan2(-vy, vx); // canvas y is inverted

          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          const endX = pt.x + Math.cos(angle) * len;
          const endY = pt.y + Math.sin(angle) * len;
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.arc(endX, endY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 7. Render Internal Grid Overlay inside room
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      for (let m = 1; m < config.width; m++) {
        const pt = metersToScreen(m, config.length);
        ctx.beginPath();
        ctx.moveTo(pt.x, roomTopLeft.y);
        ctx.lineTo(pt.x, roomTopLeft.y + roomH);
        ctx.stroke();
      }
      for (let m = 1; m < config.length; m++) {
        const pt = metersToScreen(0, m);
        ctx.beginPath();
        ctx.moveTo(roomTopLeft.x, pt.y);
        ctx.lineTo(roomTopLeft.x + roomW, pt.y);
        ctx.stroke();
      }
    }

    // 8. Render Occupant Zones (Silletería / Personas)
    for (const zone of occupantZones) {
      const isSelected = selectedId === zone.id;
      const zoneTL = metersToScreen(zone.x, zone.y + zone.length);
      const zoneW = zone.width * scale;
      const zoneH = zone.length * scale;

      // Zone box
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.45)'
        : zone.color
        ? `${zone.color}33`
        : 'rgba(59, 130, 246, 0.25)';
      ctx.fillRect(zoneTL.x, zoneTL.y, zoneW, zoneH);

      ctx.strokeStyle = isSelected ? '#60a5fa' : zone.color || '#3b82f6';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(isSelected ? [] : [4, 3]);
      ctx.strokeRect(zoneTL.x, zoneTL.y, zoneW, zoneH);
      ctx.setLineDash([]);

      // Chair grid pattern inside zone
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      const chairPitch = Math.max(14, 0.9 * scale);
      const cols = Math.floor(zoneW / chairPitch);
      const rows = Math.floor(zoneH / chairPitch);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = zoneTL.x + (c + 0.5) * (zoneW / Math.max(1, cols));
          const cy = zoneTL.y + (r + 0.5) * (zoneH / Math.max(1, rows));
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Zone label
      if (showLabels) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        const sensibleTotalKW = ((zone.occupants * (zone.sensibleHeatPerPerson || 80)) / 1000).toFixed(1);
        ctx.fillText(
          `${zone.name} (${zone.occupants}p)`,
          zoneTL.x + 6,
          zoneTL.y + 16
        );
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(
          `Área: ${(zone.width * zone.length).toFixed(1)}m² | +${sensibleTotalKW} kW`,
          zoneTL.x + 6,
          zoneTL.y + 29
        );
      }
    }

    // 9. Currently Drawing Zone Preview
    if (isDrawingZone && dragStartMeters && dragCurrentMeters) {
      const minX = Math.min(dragStartMeters.x, dragCurrentMeters.x);
      const maxX = Math.max(dragStartMeters.x, dragCurrentMeters.x);
      const minY = Math.min(dragStartMeters.y, dragCurrentMeters.y);
      const maxY = Math.max(dragStartMeters.y, dragCurrentMeters.y);

      const previewTL = metersToScreen(minX, maxY);
      const pw = (maxX - minX) * scale;
      const ph = (maxY - minY) * scale;

      ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.fillRect(previewTL.x, previewTL.y, pw, ph);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(previewTL.x, previewTL.y, pw, ph);
      ctx.setLineDash([]);

      // Preview badge
      const estArea = (maxX - minX) * (maxY - minY);
      const estOccupants = Math.max(1, Math.round(estArea / 1.1));
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(
        `Nueva Zona: ~${estOccupants} personas (${estArea.toFixed(1)} m²)`,
        previewTL.x + 8,
        previewTL.y + 20
      );
    }

    // 10. Render Windows along Walls
    for (const win of windows) {
      const isSelected = selectedId === win.id;
      ctx.save();
      let wx = 0, wy = 0, wLen = 0, wThick = 8;
      let isVertical = false;

      if (win.wall === 'south') {
        const pt = metersToScreen(win.offset, 0);
        wx = pt.x;
        wy = pt.y - 4;
        wLen = win.width * scale;
      } else if (win.wall === 'north') {
        const pt = metersToScreen(win.offset, config.length);
        wx = pt.x;
        wy = pt.y - 4;
        wLen = win.width * scale;
      } else if (win.wall === 'west') {
        const pt = metersToScreen(0, win.offset + win.width);
        wx = pt.x - 4;
        wy = pt.y;
        wLen = win.width * scale;
        isVertical = true;
      } else if (win.wall === 'east') {
        const pt = metersToScreen(config.width, win.offset + win.width);
        wx = pt.x - 4;
        wy = pt.y;
        wLen = win.width * scale;
        isVertical = true;
      }

      // Check if door or window
      const isDoor = win.type === 'door';

      // Frame
      ctx.fillStyle = isSelected
        ? isDoor ? '#f59e0b' : '#38bdf8'
        : isDoor ? '#b45309' : '#0284c7';

      if (!isVertical) {
        ctx.fillRect(wx, wy, wLen, wThick);
      } else {
        ctx.fillRect(wx, wy, wThick, wLen);
      }

      // If Door: draw door swing arc
      if (isDoor) {
        ctx.strokeStyle = isSelected ? '#fbbf24' : '#d97706';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        if (win.wall === 'south') {
          ctx.arc(wx, wy + wThick, wLen, 0, Math.PI / 2);
        } else if (win.wall === 'north') {
          ctx.arc(wx, wy, wLen, (3 * Math.PI) / 2, 2 * Math.PI);
        } else if (win.wall === 'west') {
          ctx.arc(wx + wThick, wy, wLen, Math.PI, (3 * Math.PI) / 2);
        } else {
          ctx.arc(wx, wy, wLen, Math.PI / 2, Math.PI);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (win.openingPercentage > 0) {
        // Window opening percentage indicator (gap in the window)
        ctx.fillStyle = '#38bdf8';
        const openRatio = win.openingPercentage / 100;
        if (!isVertical) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(wx, wy - 3, wLen * openRatio, wThick + 6);
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(wx - 3, wy, wThick + 6, wLen * openRatio);
        }
      }

      // Opening label
      if (showLabels) {
        ctx.fillStyle = isDoor ? '#fde68a' : '#bae6fd';
        ctx.font = '10px system-ui, sans-serif';
        const labelText = isDoor
          ? `[Puerta] ${win.name} (${win.width}m)`
          : `[Ventana] ${win.name} (${win.width}m | ${win.openingPercentage}%)`;
        if (!isVertical) {
          ctx.fillText(labelText, wx, wy - 8);
        } else {
          ctx.save();
          ctx.translate(wx - 10, wy + wLen / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(labelText, -40, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // 11. Render AC Equipment (Splits & Cassettes)
    for (const ac of acUnits) {
      const isSelected = selectedId === ac.id;
      const pt = metersToScreen(ac.x, ac.y);

      ctx.save();
      if (ac.type === 'cassette') {
        // Ceiling Cassette (Square with 4-way diagonal arrows)
        const size = Math.max(18, 1.2 * scale);
        ctx.translate(pt.x, pt.y);

        // Body
        ctx.fillStyle = isSelected ? '#38bdf8' : ac.enabled ? '#1e293b' : '#475569';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeStyle = isSelected ? '#67e8f9' : '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        // Center grill
        ctx.fillStyle = ac.enabled ? '#0284c7' : '#64748b';
        ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

        // 4 arrows
        if (ac.enabled) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          const arrowLen = size * 0.75;
          [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * arrowLen, Math.sin(ang) * arrowLen);
            ctx.stroke();
          });
        }
      } else {
        // Split (Wall Unit)
        const w = Math.max(22, 1.4 * scale);
        const h = Math.max(10, 0.5 * scale);
        ctx.translate(pt.x, pt.y);

        // Body
        ctx.fillStyle = isSelected ? '#38bdf8' : ac.enabled ? '#0f172a' : '#475569';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = isSelected ? '#67e8f9' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Cooling blow cone
        if (ac.enabled) {
          const rad = (ac.blowDirectionAngle * Math.PI) / 180;
          ctx.rotate(rad);
          const grad = ctx.createRadialGradient(0, 0, 4, 30, 0, 45);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(45, -25);
          ctx.lineTo(45, 25);
          ctx.lineTo(0, h / 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      // Label
      if (showLabels) {
        ctx.fillStyle = ac.enabled ? '#e0f2fe' : '#94a3b8';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(
          `${ac.name} (${(ac.coolingCapacityKW).toFixed(1)}kW • ${ac.supplyTemperature}°C)`,
          pt.x - 40,
          pt.y + (ac.type === 'cassette' ? 24 : 18)
        );
      }
    }

    // 12. Render Airflow Units (Inyección & Extracción)
    for (const af of airFlowUnits) {
      const isSelected = selectedId === af.id;
      const pt = metersToScreen(af.x, af.y);

      ctx.save();
      ctx.translate(pt.x, pt.y);
      const rad = 14;

      if (af.type === 'injection') {
        // Inyeccion: Green circle with incoming ring
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#34d399' : af.enabled ? '#065f46' : '#334155';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Downward arrow
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 2);
        ctx.moveTo(0, 6);
        ctx.lineTo(4, 2);
        ctx.stroke();
      } else {
        // Extraccion: Amber/Orange square with exhaust spiral
        ctx.fillStyle = isSelected ? '#fbbf24' : af.enabled ? '#78350f' : '#334155';
        ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(-rad, -rad, rad * 2, rad * 2);

        // Upward arrow
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -6);
        ctx.lineTo(-4, -2);
        ctx.moveTo(0, -6);
        ctx.lineTo(4, -2);
        ctx.stroke();
      }
      ctx.restore();

      if (showLabels) {
        ctx.fillStyle = af.type === 'injection' ? '#a7f3d0' : '#fde68a';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(
          `${af.name} (${af.airflowM3H} m³/h)`,
          pt.x - 30,
          pt.y + 24
        );
      }
    }

    // 13. Render Simple Fans (Ventiladores)
    for (const fan of fans) {
      const isSelected = selectedId === fan.id;
      const pt = metersToScreen(fan.x, fan.y);
      const radiusPx = fan.coverageRadius * scale;

      // Coverage circle
      ctx.strokeStyle = isSelected ? '#c084fc' : 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fan blades
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.fillStyle = fan.enabled ? '#9333ea' : '#475569';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;

      // Hub
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // 3 blades
      const bladeLen = Math.max(10, (fan.diameter / 2) * scale);
      [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((bAng) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(bAng) * bladeLen, Math.sin(bAng) * bladeLen);
        ctx.stroke();
      });
      ctx.restore();

      if (showLabels) {
        ctx.fillStyle = '#f3e8ff';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(
          `${fan.name} (${fan.airVelocityMS} m/s)`,
          pt.x - 30,
          pt.y + 20
        );
      }
    }

    // 14. Render Perimeter Walls (Heavy architectural border)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.strokeRect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(roomTopLeft.x, roomTopLeft.y, roomW, roomH);

    // 15. Render Exterior Dimension Arrows (Metric)
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = '11px monospace';

    // Width Dimension Line (Bottom)
    const dimY = roomTopLeft.y + roomH + 28;
    ctx.beginPath();
    ctx.moveTo(roomTopLeft.x, dimY);
    ctx.lineTo(roomTopLeft.x + roomW, dimY);
    ctx.stroke();
    // Ticks
    ctx.beginPath();
    ctx.moveTo(roomTopLeft.x, dimY - 6);
    ctx.lineTo(roomTopLeft.x, dimY + 6);
    ctx.moveTo(roomTopLeft.x + roomW, dimY - 6);
    ctx.lineTo(roomTopLeft.x + roomW, dimY + 6);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(`ANCHO: ${config.width.toFixed(1)} m`, roomTopLeft.x + roomW / 2, dimY - 6);

    // Length Dimension Line (Left)
    const dimX = roomTopLeft.x - 28;
    ctx.beginPath();
    ctx.moveTo(dimX, roomTopLeft.y);
    ctx.lineTo(dimX, roomTopLeft.y + roomH);
    ctx.stroke();
    // Ticks
    ctx.beginPath();
    ctx.moveTo(dimX - 6, roomTopLeft.y);
    ctx.lineTo(dimX + 6, roomTopLeft.y);
    ctx.moveTo(dimX - 6, roomTopLeft.y + roomH);
    ctx.lineTo(dimX + 6, roomTopLeft.y + roomH);
    ctx.stroke();
    ctx.save();
    ctx.translate(dimX - 8, roomTopLeft.y + roomH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`LARGO: ${config.length.toFixed(1)} m (ALTO: ${config.height.toFixed(1)}m)`, 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // 16. Compass Rose / Orientation Indicator
    const compX = width - 45;
    const compY = 45;
    ctx.save();
    ctx.translate(compX, compY);
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('N', -4, -22);
    ctx.restore();

    // 17. Probe Marker & Floating Temp Tag (if active)
    if (probe) {
      const probePt = metersToScreen(probe.x, probe.y);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(probePt.x, probePt.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(probePt.x - 12, probePt.y);
      ctx.lineTo(probePt.x + 12, probePt.y);
      ctx.moveTo(probePt.x, probePt.y - 12);
      ctx.lineTo(probePt.x, probePt.y + 12);
      ctx.stroke();

      // Floating probe tag badge
      const tagText = `${probe.temperature} °C`;
      ctx.font = 'bold 12px monospace';
      const tw = ctx.measureText(tagText).width;
      const tagX = probePt.x + 12;
      const tagY = probePt.y - 20;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = probe.temperature > 28 ? '#f43f5e' : probe.temperature < 21 ? '#38bdf8' : '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tw + 16, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(tagText, tagX + 8, tagY + 15);
    }

    // 18. Floating Live Dragging Coordinate HUD Tooltip
    if (liveDragCoords) {
      ctx.save();
      ctx.font = 'bold 11px system-ui, sans-serif';
      const textWidth = ctx.measureText(liveDragCoords.text).width;
      const bw = textWidth + 20;
      const bh = 26;
      const bx = liveDragCoords.x + 14;
      const by = liveDragCoords.y - 32;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(liveDragCoords.text, bx + 10, by + 17);
      ctx.restore();
    }

    // 19. Top-Center Active Edit Mode Banner
    ctx.save();
    let modeText = '';
    let modeIconColor = '#38bdf8';
    if (activeSidebarTab === 0) {
      modeText = '🔒 Clima Inicial: Modo lectura y sondas (Arrastre bloqueado)';
      modeIconColor = '#94a3b8';
    } else if (activeSidebarTab === 1) {
      modeText = '📐 Geometría: Arrastra Puertas y Ventanas sobre los muros';
      modeIconColor = '#38bdf8';
    } else if (activeSidebarTab === 2) {
      modeText = '👥 Ocupantes: Arrastra bloques de personas para reubicarlos';
      modeIconColor = '#60a5fa';
    } else if (activeSidebarTab === 3) {
      modeText = '🌀 Ventiladores: Arrastra para posicionar en el recinto';
      modeIconColor = '#c084fc';
    } else if (activeSidebarTab === 4) {
      modeText = '💨 HVAC: Arrastra bocas de inyección y extracción';
      modeIconColor = '#34d399';
    } else if (activeSidebarTab === 5) {
      modeText = '❄️ Aire Acondicionado: Arrastra Splits y Casetes';
      modeIconColor = '#67e8f9';
    } else if (activeSidebarTab === 6) {
      modeText = '📊 SimScale CFD: Inspección térmica 3D/2D activa';
      modeIconColor = '#a78bfa';
    }

    if (modeText) {
      ctx.font = 'bold 11px system-ui, sans-serif';
      const mWidth = ctx.measureText(modeText).width;
      const bW = mWidth + 24;
      const bH = 26;
      const bX = (width - bW) / 2;
      const bY = 16;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = modeIconColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 13);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = modeIconColor;
      ctx.textAlign = 'center';
      ctx.fillText(modeText, width / 2, bY + 17);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }, [
    config,
    occupantZones,
    windows,
    acUnits,
    airFlowUnits,
    fans,
    selectedId,
    activeTool,
    showHeatmap,
    showVectors,
    showIsotherms,
    showGrid,
    showLabels,
    simEngine,
    probe,
    scale,
    panOffset,
    isDrawingZone,
    dragStartMeters,
    dragCurrentMeters,
    metersToScreen,
    activeSidebarTab,
    liveDragCoords,
  ]);

  // Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const m = screenToMeters(sx, sy);

    // Pan with middle click or space key
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: sx - panOffset.x, y: sy - panOffset.y });
      return;
    }

    // Tool: Occupant Zone Drawing
    if (activeTool === 'occupant_zone') {
      // Clamped inside auditorium
      const clampedX = Math.max(0, Math.min(config.width, m.x));
      const clampedY = Math.max(0, Math.min(config.length, m.y));
      setIsDrawingZone(true);
      setDragStartMeters({ x: clampedX, y: clampedY });
      setDragCurrentMeters({ x: clampedX, y: clampedY });
      return;
    }

    // Tool: Window Placement
    if (activeTool === 'window') {
      // Determine nearest wall
      const dSouth = Math.abs(m.y - 0);
      const dNorth = Math.abs(m.y - config.length);
      const dWest = Math.abs(m.x - 0);
      const dEast = Math.abs(m.x - config.width);
      const minD = Math.min(dSouth, dNorth, dWest, dEast);

      let wall: WallSide = 'south';
      let offset = 2;
      const defaultWinLen = 3.0;

      if (minD === dSouth) {
        wall = 'south';
        offset = Math.max(0, Math.min(config.width - defaultWinLen, m.x - defaultWinLen / 2));
      } else if (minD === dNorth) {
        wall = 'north';
        offset = Math.max(0, Math.min(config.width - defaultWinLen, m.x - defaultWinLen / 2));
      } else if (minD === dWest) {
        wall = 'west';
        offset = Math.max(0, Math.min(config.length - defaultWinLen, m.y - defaultWinLen / 2));
      } else {
        wall = 'east';
        offset = Math.max(0, Math.min(config.length - defaultWinLen, m.y - defaultWinLen / 2));
      }

      const newWin: WindowItem = {
        id: `win_${Date.now()}`,
        name: `Ventana ${windows.length + 1}`,
        wall,
        offset: Number(offset.toFixed(1)),
        width: defaultWinLen,
        height: 1.8,
        sillHeight: 1.0,
        openingPercentage: 30, // 30% apertura por defecto
        glassUValue: 2.8,
        solarHeatGainCoeff: 0.6,
      };

      setWindows((prev) => [...prev, newWin]);
      setSelectedId(newWin.id);
      setSelectedType('window');
      setActiveSidebarTab?.(1);
      setActiveTool('select');
      return;
    }

    // Tool: Door Placement
    if (activeTool === 'door') {
      const dSouth = Math.abs(m.y - 0);
      const dNorth = Math.abs(m.y - config.length);
      const dWest = Math.abs(m.x - 0);
      const dEast = Math.abs(m.x - config.width);
      const minD = Math.min(dSouth, dNorth, dWest, dEast);

      let wall: WallSide = 'south';
      let offset = 2;
      const defaultDoorLen = 1.8;

      if (minD === dSouth) {
        wall = 'south';
        offset = Math.max(0, Math.min(config.width - defaultDoorLen, m.x - defaultDoorLen / 2));
      } else if (minD === dNorth) {
        wall = 'north';
        offset = Math.max(0, Math.min(config.width - defaultDoorLen, m.x - defaultDoorLen / 2));
      } else if (minD === dWest) {
        wall = 'west';
        offset = Math.max(0, Math.min(config.length - defaultDoorLen, m.y - defaultDoorLen / 2));
      } else {
        wall = 'east';
        offset = Math.max(0, Math.min(config.length - defaultDoorLen, m.y - defaultDoorLen / 2));
      }

      const newDoor: WindowItem = {
        id: `door_${Date.now()}`,
        name: `Puerta ${windows.filter((w) => w.type === 'door').length + 1}`,
        type: 'door',
        wall,
        offset: Number(offset.toFixed(1)),
        width: defaultDoorLen,
        height: 2.2,
        sillHeight: 0,
        openingPercentage: 0,
        glassUValue: 2.0,
        solarHeatGainCoeff: 0.3,
      };

      setWindows((prev) => [...prev, newDoor]);
      setSelectedId(newDoor.id);
      setSelectedType('window');
      setActiveSidebarTab?.(1);
      setActiveTool('select');
      return;
    }

    // Tool: AC Split Placement
    if (activeTool === 'ac_split') {
      const clampedX = Math.max(0.3, Math.min(config.width - 0.3, m.x));
      const clampedY = Math.max(0.3, Math.min(config.length - 0.3, m.y));

      // Determine nearest wall for attachment and blow direction
      const dSouth = clampedY;
      const dNorth = config.length - clampedY;
      const dWest = clampedX;
      const dEast = config.width - clampedX;
      const minD = Math.min(dSouth, dNorth, dWest, dEast);

      let angle = 0;
      let wallAtt: WallSide = 'west';
      if (minD === dWest) {
        angle = 0; // sopla hacia el este (+X)
        wallAtt = 'west';
      } else if (minD === dEast) {
        angle = 180; // sopla hacia el oeste (-X)
        wallAtt = 'east';
      } else if (minD === dSouth) {
        angle = 90; // sopla hacia el norte (+Y)
        wallAtt = 'south';
      } else {
        angle = 270; // sopla hacia el sur (-Y)
        wallAtt = 'north';
      }

      const newAC: ACEquipment = {
        id: `ac_${Date.now()}`,
        name: `Split Pared ${acUnits.length + 1}`,
        type: 'split',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        z: 3.2,
        wallAttachment: wallAtt,
        coolingCapacityBTU: 36000,
        coolingCapacityKW: 10.55,
        supplyTemperature: 14,
        airflowCFM: 1100,
        airflowM3H: 1870,
        cop: 3.2,
        blowDirectionAngle: angle,
        enabled: true,
      };

      setAcUnits((prev) => [...prev, newAC]);
      setSelectedId(newAC.id);
      setSelectedType('ac_equipment');
      setActiveSidebarTab?.(5);
      setActiveTool('select');
      return;
    }

    // Tool: AC Cassette Placement
    if (activeTool === 'ac_cassette') {
      const clampedX = Math.max(1.0, Math.min(config.width - 1.0, m.x));
      const clampedY = Math.max(1.0, Math.min(config.length - 1.0, m.y));

      const newCas: ACEquipment = {
        id: `cas_${Date.now()}`,
        name: `Casete Techo ${acUnits.length + 1}`,
        type: 'cassette',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        z: config.height,
        coolingCapacityBTU: 48000,
        coolingCapacityKW: 14.07,
        supplyTemperature: 13,
        airflowCFM: 1450,
        airflowM3H: 2465,
        cop: 3.3,
        blowDirectionAngle: 0,
        enabled: true,
      };

      setAcUnits((prev) => [...prev, newCas]);
      setSelectedId(newCas.id);
      setSelectedType('ac_equipment');
      setActiveSidebarTab?.(5);
      setActiveTool('select');
      return;
    }

    // Tool: Air Injection Placement
    if (activeTool === 'air_injection') {
      const clampedX = Math.max(0.5, Math.min(config.width - 0.5, m.x));
      const clampedY = Math.max(0.5, Math.min(config.length - 0.5, m.y));

      const newInj: AirFlowEquipment = {
        id: `inj_${Date.now()}`,
        name: `Inyección Aire ${airFlowUnits.length + 1}`,
        type: 'injection',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        z: config.height - 0.5,
        airflowM3H: 1500,
        supplyTemperature: 19,
        enabled: true,
      };

      setAirFlowUnits((prev) => [...prev, newInj]);
      setSelectedId(newInj.id);
      setSelectedType('airflow');
      setActiveSidebarTab?.(4);
      setActiveTool('select');
      return;
    }

    // Tool: Air Extraction Placement
    if (activeTool === 'air_extraction') {
      const clampedX = Math.max(0.5, Math.min(config.width - 0.5, m.x));
      const clampedY = Math.max(0.5, Math.min(config.length - 0.5, m.y));

      const newExt: AirFlowEquipment = {
        id: `ext_${Date.now()}`,
        name: `Extracción Aire ${airFlowUnits.length + 1}`,
        type: 'extraction',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        z: config.height,
        airflowM3H: 1800,
        enabled: true,
      };

      setAirFlowUnits((prev) => [...prev, newExt]);
      setSelectedId(newExt.id);
      setSelectedType('airflow');
      setActiveSidebarTab?.(4);
      setActiveTool('select');
      return;
    }

    // Tool: Simple Fan Placement
    if (activeTool === 'simple_fan') {
      const clampedX = Math.max(1.0, Math.min(config.width - 1.0, m.x));
      const clampedY = Math.max(1.0, Math.min(config.length - 1.0, m.y));

      const newFan: SimpleFan = {
        id: `fan_${Date.now()}`,
        name: `Ventilador Techo ${fans.length + 1}`,
        type: 'ceiling',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        z: config.height - 0.8,
        diameter: 1.4,
        airVelocityMS: 2.2,
        angle: 0,
        coverageRadius: 2.6,
        enabled: true,
      };

      setFans((prev) => [...prev, newFan]);
      setSelectedId(newFan.id);
      setSelectedType('simple_fan');
      setActiveSidebarTab?.(3);
      setActiveTool('select');
      return;
    }

    // Tool: Select / Move (Filtrado estricto por la pestaña activa en el panel lateral)
    if (activeTool === 'select' || activeTool === 'probe') {
      // Pestaña 0 (Clima) y 6 (SimScale CFD): Modo solo lectura/sonda, no permite arrastrar elementos
      if (activeSidebarTab === 0 || activeSidebarTab === 6) {
        setSelectedId(null);
        setSelectedType('auditorium');
        return;
      }

      // Pestaña 1: ÚNICAMENTE Puertas y Ventanas
      if (activeSidebarTab === 1) {
        for (const win of windows) {
          let inside = false;
          if (win.wall === 'south' && Math.abs(m.y) < 1.2 && m.x >= win.offset - 0.2 && m.x <= win.offset + win.width + 0.2) inside = true;
          if (win.wall === 'north' && Math.abs(m.y - config.length) < 1.2 && m.x >= win.offset - 0.2 && m.x <= win.offset + win.width + 0.2) inside = true;
          if (win.wall === 'west' && Math.abs(m.x) < 1.2 && m.y >= win.offset - 0.2 && m.y <= win.offset + win.width + 0.2) inside = true;
          if (win.wall === 'east' && Math.abs(m.x - config.width) < 1.2 && m.y >= win.offset - 0.2 && m.y <= win.offset + win.width + 0.2) inside = true;

          if (inside) {
            setSelectedId(win.id);
            setSelectedType('window');
            setMovingItemId(win.id);
            setMovingItemType('window');
            const curVal = (win.wall === 'south' || win.wall === 'north') ? m.x : m.y;
            setMoveOffset({ ox: curVal - win.offset, oy: 0 });
            return;
          }
        }
      }

      // Pestaña 2: ÚNICAMENTE Zonas de Ocupantes
      if (activeSidebarTab === 2) {
        for (let idx = occupantZones.length - 1; idx >= 0; idx--) {
          const zone = occupantZones[idx];
          if (
            m.x >= zone.x &&
            m.x <= zone.x + zone.width &&
            m.y >= zone.y &&
            m.y <= zone.y + zone.length
          ) {
            setSelectedId(zone.id);
            setSelectedType('occupant_zone');
            setMovingItemId(zone.id);
            setMovingItemType('occupant_zone');
            setMoveOffset({ ox: m.x - zone.x, oy: m.y - zone.y });
            return;
          }
        }
      }

      // Pestaña 3: ÚNICAMENTE Ventiladores
      if (activeSidebarTab === 3) {
        for (const fan of fans) {
          const dist = Math.hypot(m.x - fan.x, m.y - fan.y);
          if (dist <= 1.2) {
            setSelectedId(fan.id);
            setSelectedType('simple_fan');
            setMovingItemId(fan.id);
            setMovingItemType('simple_fan');
            setMoveOffset({ ox: m.x - fan.x, oy: m.y - fan.y });
            return;
          }
        }
      }

      // Pestaña 4: ÚNICAMENTE Inyección y Extracción de Aire
      if (activeSidebarTab === 4) {
        for (const af of airFlowUnits) {
          const dist = Math.hypot(m.x - af.x, m.y - af.y);
          if (dist <= 1.2) {
            setSelectedId(af.id);
            setSelectedType('airflow');
            setMovingItemId(af.id);
            setMovingItemType('airflow');
            setMoveOffset({ ox: m.x - af.x, oy: m.y - af.y });
            return;
          }
        }
      }

      // Pestaña 5: ÚNICAMENTE Equipos de Aire Acondicionado (Splits y Casetes)
      if (activeSidebarTab === 5) {
        for (const ac of acUnits) {
          const dist = Math.hypot(m.x - ac.x, m.y - ac.y);
          if (dist <= 1.2) {
            setSelectedId(ac.id);
            setSelectedType('ac_equipment');
            setMovingItemId(ac.id);
            setMovingItemType('ac_equipment');
            setMoveOffset({ ox: m.x - ac.x, oy: m.y - ac.y });
            return;
          }
        }
      }

      // Clic en espacio vacío -> deseleccionar
      setSelectedId(null);
      setSelectedType('auditorium');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const m = screenToMeters(sx, sy);

    // Pan viewport
    if (isPanning) {
      setPanOffset({
        x: sx - panStart.x,
        y: sy - panStart.y,
      });
      return;
    }

    // Probe sampling
    if (simEngine && (activeTool === 'probe' || activeTool === 'select')) {
      const sample = simEngine.sampleProbe(m.x, m.y);
      if (sample) {
        setProbe(sample);
      }
    }

    // Drawing new occupant zone
    if (isDrawingZone) {
      setDragCurrentMeters({
        x: Math.max(0, Math.min(config.width, m.x)),
        y: Math.max(0, Math.min(config.length, m.y)),
      });
      return;
    }

    // Dragging selected item with fluid snapping and live coordinate feedback
    if (movingItemId && moveOffset) {
      const snapStep = e.shiftKey ? 0.1 : 0.25; // 0.25m por defecto, 0.1m con Shift
      const rawX = m.x - moveOffset.ox;
      const rawY = m.y - moveOffset.oy;
      const newX = Number((Math.round(rawX / snapStep) * snapStep).toFixed(2));
      const newY = Number((Math.round(rawY / snapStep) * snapStep).toFixed(2));

      if (movingItemType === 'window') {
        const win = windows.find((w) => w.id === movingItemId);
        if (win) {
          const isHoriz = win.wall === 'south' || win.wall === 'north';
          const maxOffset = isHoriz ? config.width - win.width : config.length - win.width;
          const curVal = isHoriz ? m.x : m.y;
          const rawOffset = curVal - moveOffset.ox;
          const newOffset = Number(Math.max(0, Math.min(maxOffset, Math.round(rawOffset / snapStep) * snapStep)).toFixed(2));
          
          setWindows((prev) =>
            prev.map((item) => (item.id === movingItemId ? { ...item, offset: newOffset } : item))
          );
          setLiveDragCoords({
            x: sx,
            y: sy,
            text: `📍 Desplazamiento: ${newOffset} m (${win.wall.toUpperCase()})`,
          });
        }
      } else if (movingItemType === 'ac_equipment') {
        const clampedX = Math.max(0.3, Math.min(config.width - 0.3, newX));
        const clampedY = Math.max(0.3, Math.min(config.length - 0.3, newY));
        setAcUnits((prev) =>
          prev.map((item) =>
            item.id === movingItemId ? { ...item, x: clampedX, y: clampedY } : item
          )
        );
        setLiveDragCoords({
          x: sx,
          y: sy,
          text: `📍 A/C: X = ${clampedX} m, Y = ${clampedY} m`,
        });
      } else if (movingItemType === 'airflow') {
        const clampedX = Math.max(0.3, Math.min(config.width - 0.3, newX));
        const clampedY = Math.max(0.3, Math.min(config.length - 0.3, newY));
        setAirFlowUnits((prev) =>
          prev.map((item) =>
            item.id === movingItemId ? { ...item, x: clampedX, y: clampedY } : item
          )
        );
        setLiveDragCoords({
          x: sx,
          y: sy,
          text: `📍 HVAC: X = ${clampedX} m, Y = ${clampedY} m`,
        });
      } else if (movingItemType === 'simple_fan') {
        const clampedX = Math.max(0.5, Math.min(config.width - 0.5, newX));
        const clampedY = Math.max(0.5, Math.min(config.length - 0.5, newY));
        setFans((prev) =>
          prev.map((item) =>
            item.id === movingItemId ? { ...item, x: clampedX, y: clampedY } : item
          )
        );
        setLiveDragCoords({
          x: sx,
          y: sy,
          text: `📍 Ventilador: X = ${clampedX} m, Y = ${clampedY} m`,
        });
      } else if (movingItemType === 'occupant_zone') {
        const targetZone = occupantZones.find((z) => z.id === movingItemId);
        if (targetZone) {
          const clampedX = Math.max(0, Math.min(config.width - targetZone.width, newX));
          const clampedY = Math.max(0, Math.min(config.length - targetZone.length, newY));
          setOccupantZones((prev) =>
            prev.map((item) =>
              item.id === movingItemId ? { ...item, x: clampedX, y: clampedY } : item
            )
          );
          setLiveDragCoords({
            x: sx,
            y: sy,
            text: `📍 Zona: X = ${clampedX} m, Y = ${clampedY} m`,
          });
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setMovingItemId(null);
    setMovingItemType(null);
    setMoveOffset(null);
    setLiveDragCoords(null);

    // Finalize drawing occupant zone
    if (isDrawingZone && dragStartMeters && dragCurrentMeters) {
      const minX = Math.min(dragStartMeters.x, dragCurrentMeters.x);
      const maxX = Math.max(dragStartMeters.x, dragCurrentMeters.x);
      const minY = Math.min(dragStartMeters.y, dragCurrentMeters.y);
      const maxY = Math.max(dragStartMeters.y, dragCurrentMeters.y);

      const zoneW = Number((maxX - minX).toFixed(1));
      const zoneL = Number((maxY - minY).toFixed(1));

      // Minimum threshold 1m x 1m
      if (zoneW >= 1.0 && zoneL >= 1.0) {
        const area = zoneW * zoneL;
        // Estimate comfortable auditoria density: ~1 person per 1.2 m²
        const defaultOccupants = Math.max(4, Math.round(area / 1.2));

        const newZone: OccupantZone = {
          id: `zone_${Date.now()}`,
          name: `Zona Platea ${occupantZones.length + 1}`,
          x: Number(minX.toFixed(1)),
          y: Number(minY.toFixed(1)),
          width: zoneW,
          length: zoneL,
          occupants: defaultOccupants,
          sensibleHeatPerPerson: 85,
          latentHeatPerPerson: 45,
          activityType: 'seated_relaxed',
          color: '#3b82f6',
        };

        setOccupantZones((prev) => [...prev, newZone]);
        setSelectedId(newZone.id);
        setSelectedType('occupant_zone');
        setActiveSidebarTab?.(2);
        setActiveTool('select');
      }

      setIsDrawingZone(false);
      setDragStartMeters(null);
      setDragCurrentMeters(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((prev) => Math.max(12, Math.min(100, prev * zoomFactor)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas
        ref={canvasRef}
        className={`w-full h-full cursor-${
          activeTool === 'occupant_zone'
            ? 'crosshair'
            : activeTool === 'probe'
            ? 'help'
            : isPanning
            ? 'grabbing'
            : 'default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Floating Thermal Probe Inspector Card */}
      {probe && (
        <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs text-white max-w-xs pointer-events-none transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Sonda Térmica Local
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              X: {probe.x}m, Y: {probe.y}m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block">Temperatura:</span>
              <span
                className="text-base font-extrabold"
                style={{ color: getComfortLabel(probe.pmv).color }}
              >
                {probe.temperature} °C
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Vel. Aire:</span>
              <span className="text-sm font-bold text-sky-300">{probe.velocity} m/s</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Confort PMV:</span>
              <span className="font-semibold text-slate-200">{probe.pmv}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Insatisfechos PPD:</span>
              <span className="font-semibold text-slate-200">{probe.ppd} %</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Sensación:</span>
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${getComfortLabel(probe.pmv).color}22`,
                color: getComfortLabel(probe.pmv).color,
              }}
            >
              {probe.comfortLabel}
            </span>
          </div>
        </div>
      )}

      {/* Floating Thermal Gradient Scale Legend */}
      {showHeatmap && (
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl text-white select-none">
          <div className="text-[11px] font-bold text-slate-300 mb-1.5 text-center">
            Escala Térmica (°C)
          </div>
          <div
            className="w-48 h-3.5 rounded-md border border-slate-700"
            style={{
              background:
                'linear-gradient(to right, rgb(30,100,230), rgb(34,211,238), rgb(16,185,129), rgb(245,158,11), rgb(239,68,68))',
            }}
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-300 mt-1">
            <span>17°C Frío</span>
            <span className="text-emerald-400 font-bold">23°C Confort</span>
            <span>33°C+ Calor</span>
          </div>
        </div>
      )}

      {/* Helper instruction tooltip */}
      <div className="absolute top-4 right-4 bg-slate-900/85 backdrop-blur-sm border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hidden sm:block">
        {activeTool === 'occupant_zone' && 'Arrastre un rectángulo sobre el plano para crear zona de butacas.'}
        {activeTool === 'window' && 'Haga clic cerca de una de las 4 paredes perimetrales para colocar ventana.'}
        {activeTool === 'ac_split' && 'Haga clic cerca de un muro para fijar un Split.'}
        {activeTool === 'ac_cassette' && 'Haga clic en el techo del auditorio para ubicar un Casete de 4 vías.'}
        {activeTool === 'air_injection' && 'Haga clic para colocar difusor de inyección de aire fresco.'}
        {activeTool === 'air_extraction' && 'Haga clic para colocar rejilla o extractor de aire.'}
        {activeTool === 'simple_fan' && 'Haga clic para colocar ventilador de mezcla.'}
        {activeTool === 'select' && 'Haga clic o arrastre cualquier equipo o zona para moverlo y ver sus propiedades.'}
        {activeTool === 'probe' && 'Mueva el cursor para sondear temperaturas y confort PMV en tiempo real.'}
      </div>
    </div>
  );
};
