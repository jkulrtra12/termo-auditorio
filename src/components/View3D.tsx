import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AuditoriumConfig,
  OccupantZone,
  WindowItem,
  ACEquipment,
  AirFlowEquipment,
  SimpleFan,
  SimScaleSettings,
  ViewTabType,
  WallSide,
} from '../types';
import { ThermalSimulationEngine, getComfortLabel } from '../utils/physics';
import { Eye, Sun, Sparkles, Layers, Sliders } from 'lucide-react';

interface View3DProps {
  config: AuditoriumConfig;
  occupantZones: OccupantZone[];
  windows: WindowItem[];
  acUnits: ACEquipment[];
  airFlowUnits: AirFlowEquipment[];
  fans: SimpleFan[];
  simEngine: ThermalSimulationEngine | null;
  simScaleSettings: SimScaleSettings;
  setSimScaleSettings: React.Dispatch<React.SetStateAction<SimScaleSettings>>;
  viewMode: ViewTabType;
}

// Generate high-resolution sprite badge for 3D floating sensor pins (like Image 2)
function createSensorPinSprite(
  label: string,
  tempText: string,
  subtext: string = '',
  isCold: boolean = false,
  isHot: boolean = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Background pill badge (white or slight tint)
  ctx.fillStyle = isCold ? '#f0f9ff' : isHot ? '#fff1f2' : '#ffffff';
  ctx.beginPath();
  ctx.roundRect(10, 10, 300, 110, 18);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';

  // Accent border
  ctx.strokeStyle = isCold ? '#0284c7' : isHot ? '#e11d48' : '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Small droplet/thermometer indicator
  ctx.fillStyle = isCold ? '#0284c7' : isHot ? '#e11d48' : '#059669';
  ctx.beginPath();
  ctx.arc(36, 42, 10, 0, Math.PI * 2);
  ctx.fill();

  // Temperature Value (Bold)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(tempText, 56, 52);

  // Subtext (e.g. 52.4% RH or zone name)
  if (subtext) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText(subtext, 56, 82);
  }

  // Label tag at bottom
  ctx.fillStyle = isCold ? '#0369a1' : isHot ? '#be123c' : '#475569';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(label.toUpperCase(), 36, 108);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.6, 1.6, 1);
  return sprite;
}

export const View3D: React.FC<View3DProps> = ({
  config,
  occupantZones,
  windows,
  acUnits,
  airFlowUnits,
  fans,
  simEngine,
  simScaleSettings,
  setSimScaleSettings,
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isSimScale = viewMode === 'simscale';
  const isLightTheme = isSimScale && simScaleSettings.theme === 'light';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    if (isLightTheme) {
      scene.background = new THREE.Color(0xf1f5f9); // Clean white/light grey as in Image 2
      scene.fog = new THREE.FogExp2(0xf1f5f9, 0.01);
    } else {
      scene.background = new THREE.Color(0x090d16); // Dark CAD engineering
      scene.fog = new THREE.FogExp2(0x090d16, 0.015);
    }

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const maxDim = Math.max(config.width, config.length, config.height);
    camera.position.set(config.width * 1.3, config.height * 2.4, config.length * 1.6);
    camera.lookAt(config.width / 2, config.height * 0.35, config.length / 2);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isLightTheme ? 0.9 : 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, isLightTheme ? 1.4 : 1.1);
    sunLight.position.set(config.width * 1.5, config.height * 3.5, config.length * 1.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(isLightTheme ? 0xe0f2fe : 0x38bdf8, 0.6);
    fillLight.position.set(-config.width, config.height * 2, -config.length);
    scene.add(fillLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 5. Thermal Colormap Texture (Smooth Continuous Bilinear Interpolation)
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = 256;
    heatCanvas.height = 256;
    const hctx = heatCanvas.getContext('2d')!;

    const renderHeatTexture = () => {
      if (simEngine && simEngine.temp && simEngine.temp.length > 0) {
        const ny = simEngine.ny;
        const nx = simEngine.nx;
        const imgData = hctx.createImageData(256, 256);

        for (let py = 0; py < 256; py++) {
          // Three.js PlaneGeometry top (py=0) aligns with South (Z=0, y=0).
          // Bottom (py=255) aligns with North (Z=length, y=length).
          // py/255 aligns physical grid coordinates correctly with 3D world space.
          const gyRatio = py / 255;
          const v = gyRatio * (ny - 1);
          const j0 = Math.floor(v);
          const j1 = Math.min(ny - 1, j0 + 1);
          const fj = v - j0;

          for (let px = 0; px < 256; px++) {
            const gxRatio = px / 255;
            const u = gxRatio * (nx - 1);
            const i0 = Math.floor(u);
            const i1 = Math.min(nx - 1, i0 + 1);
            const fi = u - i0;

            // Continuous bilinear interpolation for smooth CFD colormap
            const t00 = simEngine.temp[j0][i0];
            const t10 = simEngine.temp[j0][i1];
            const t01 = simEngine.temp[j1][i0];
            const t11 = simEngine.temp[j1][i1];
            const t = (t00 * (1 - fi) + t10 * fi) * (1 - fj) + (t01 * (1 - fi) + t11 * fi) * fj;

            const clamped = Math.max(16, Math.min(34, t));
            const f = (clamped - 16) / 18; // 0.0 to 1.0

            let r = 0, g = 0, b = 0;
            if (f < 0.25) {
              const uVal = f / 0.25;
              r = Math.round(15 * (1 - uVal) + 30 * uVal);
              g = Math.round(75 * (1 - uVal) + 200 * uVal);
              b = Math.round(235 * (1 - uVal) + 245 * uVal);
            } else if (f < 0.5) {
              const uVal = (f - 0.25) / 0.25;
              r = Math.round(30 * (1 - uVal) + 16 * uVal);
              g = Math.round(200 * (1 - uVal) + 195 * uVal);
              b = Math.round(245 * (1 - uVal) + 110 * uVal);
            } else if (f < 0.75) {
              const uVal = (f - 0.5) / 0.25;
              r = Math.round(16 * (1 - uVal) + 245 * uVal);
              g = Math.round(195 * (1 - uVal) + 160 * uVal);
              b = Math.round(110 * (1 - uVal) + 10 * uVal);
            } else {
              const uVal = (f - 0.75) / 0.25;
              r = Math.round(245 * (1 - uVal) + 235 * uVal);
              g = Math.round(160 * (1 - uVal) + 50 * uVal);
              b = Math.round(10 * (1 - uVal) + 50 * uVal);
            }

            const idx = (py * 256 + px) * 4;
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = isSimScale ? 245 : 220;
          }
        }
        hctx.putImageData(imgData, 0, 0);
      } else {
        hctx.fillStyle = isLightTheme ? '#e2e8f0' : '#1e293b';
        hctx.fillRect(0, 0, 256, 256);
      }
    };
    renderHeatTexture();

    const heatTexture = new THREE.CanvasTexture(heatCanvas);
    heatTexture.generateMipmaps = true;

    // 6. Auditorium Floor
    const floorGeo = new THREE.PlaneGeometry(config.width, config.length, 64, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isLightTheme ? 0xffffff : 0x0f172a,
      roughness: 0.8,
      metalness: 0.1,
      map: !isSimScale ? heatTexture : undefined, // in SimScale, floor is clean white as in image 2
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(config.width / 2, 0, config.length / 2);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    // Floor Metric Grid
    const gridHelper = new THREE.GridHelper(
      Math.max(config.width, config.length),
      Math.max(config.width, config.length),
      isLightTheme ? 0xcbd5e1 : 0x475569,
      isLightTheme ? 0xe2e8f0 : 0x1e293b
    );
    gridHelper.position.set(config.width / 2, 0.01, config.length / 2);
    rootGroup.add(gridHelper);

    // 7. SimScale 3D Elevated Thermal Cutting Plane (Plano de Corte Z)
    let thermalSliceMesh: THREE.Mesh | null = null;
    if (isSimScale) {
      const sliceGeo = new THREE.PlaneGeometry(config.width, config.length, 64, 64);
      const sliceMat = new THREE.MeshBasicMaterial({
        map: heatTexture,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      thermalSliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
      thermalSliceMesh.rotation.x = -Math.PI / 2;
      thermalSliceMesh.position.set(
        config.width / 2,
        simScaleSettings.planeHeight,
        config.length / 2
      );
      rootGroup.add(thermalSliceMesh);

      // Slice border ring
      const sliceEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(sliceGeo),
        new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
      );
      sliceEdges.rotation.x = -Math.PI / 2;
      sliceEdges.position.copy(thermalSliceMesh.position);
      rootGroup.add(sliceEdges);
    }

    // 8. Architectural Cutaway Walls
    const wallOpacity = isSimScale ? simScaleSettings.wallOpacity : 0.28;
    const wallColor = isLightTheme ? 0xe2e8f0 : 0x334155;
    const cutawayHeight = isSimScale ? Math.min(config.height, 2.8) : config.height;

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      transparent: true,
      opacity: wallOpacity,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    // North wall (Z = config.length)
    const nWallGeo = new THREE.PlaneGeometry(config.width, cutawayHeight);
    const nWall = new THREE.Mesh(nWallGeo, wallMat);
    nWall.position.set(config.width / 2, cutawayHeight / 2, config.length);
    rootGroup.add(nWall);

    // South wall (Z = 0)
    const sWall = new THREE.Mesh(nWallGeo, wallMat);
    sWall.position.set(config.width / 2, cutawayHeight / 2, 0);
    sWall.rotation.y = Math.PI;
    rootGroup.add(sWall);

    // West wall (X = 0)
    const wWallGeo = new THREE.PlaneGeometry(config.length, cutawayHeight);
    const wWall = new THREE.Mesh(wWallGeo, wallMat);
    wWall.position.set(0, cutawayHeight / 2, config.length / 2);
    wWall.rotation.y = Math.PI / 2;
    rootGroup.add(wWall);

    // East wall (X = config.width)
    const eWall = new THREE.Mesh(wWallGeo, wallMat);
    eWall.position.set(config.width, cutawayHeight / 2, config.length / 2);
    eWall.rotation.y = -Math.PI / 2;
    rootGroup.add(eWall);

    // Wireframe boundary
    const boxWireGeo = new THREE.BoxGeometry(config.width, config.height, config.length);
    const boxWireMat = new THREE.LineBasicMaterial({
      color: isLightTheme ? 0x94a3b8 : 0x475569,
      linewidth: 1.5,
    });
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(boxWireGeo), boxWireMat);
    wireframe.position.set(config.width / 2, config.height / 2, config.length / 2);
    rootGroup.add(wireframe);

    // 9. DYNAMIC OCCUPANTS (FIX ISSUE 2: Visibly changing when occupants count changes)
    occupantZones.forEach((zone) => {
      // Elevated seating platform
      const zoneGeo = new THREE.BoxGeometry(zone.width, 0.25, zone.length);
      const zoneColor = zone.color ? new THREE.Color(zone.color) : new THREE.Color(0x3b82f6);
      const zoneMat = new THREE.MeshStandardMaterial({
        color: isLightTheme ? 0xdbeafe : zoneColor,
        roughness: 0.6,
        metalness: 0.1,
      });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.position.set(zone.x + zone.width / 2, 0.125, zone.y + zone.length / 2);
      zoneMesh.receiveShadow = true;
      rootGroup.add(zoneMesh);

      // Distribute exact number of seats & people dynamically!
      const totalOccupants = zone.occupants;
      if (totalOccupants > 0) {
        const aspect = zone.width / Math.max(0.5, zone.length);
        const cols = Math.max(1, Math.round(Math.sqrt(totalOccupants * aspect)));
        const rows = Math.max(1, Math.ceil(totalOccupants / cols));

        const seatChairGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
        const chairMat = new THREE.MeshStandardMaterial({
          color: isLightTheme ? 0x475569 : 0x334155,
          roughness: 0.5,
        });

        const personBodyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.5, 8);
        const personHeadGeo = new THREE.SphereGeometry(0.11, 8, 8);
        const personBodyMat = new THREE.MeshStandardMaterial({
          color: zoneColor,
          roughness: 0.4,
        });
        const personHeadMat = new THREE.MeshStandardMaterial({
          color: 0xf5d0b0, // skin tone
          roughness: 0.7,
        });

        let seatedCount = 0;
        for (let r = 0; r < rows && seatedCount < totalOccupants; r++) {
          for (let c = 0; c < cols && seatedCount < totalOccupants; c++) {
            const px = zone.x + (c + 0.5) * (zone.width / cols);
            const pz = zone.y + (r + 0.5) * (zone.length / rows);

            // Chair
            const chair = new THREE.Mesh(seatChairGeo, chairMat);
            chair.position.set(px, 0.4, pz);
            chair.castShadow = true;
            rootGroup.add(chair);

            // Seated Person Body
            const body = new THREE.Mesh(personBodyGeo, personBodyMat);
            body.position.set(px, 0.75, pz);
            body.castShadow = true;
            rootGroup.add(body);

            // Head
            const head = new THREE.Mesh(personHeadGeo, personHeadMat);
            head.position.set(px, 1.08, pz);
            rootGroup.add(head);

            seatedCount++;
          }
        }
      }

      // Zone Floating Label Billboard
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 80;
      const lctx = labelCanvas.getContext('2d')!;
      lctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      lctx.beginPath();
      lctx.roundRect(5, 5, 246, 70, 12);
      lctx.fill();
      lctx.strokeStyle = zone.color || '#38bdf8';
      lctx.lineWidth = 3;
      lctx.stroke();

      lctx.fillStyle = '#ffffff';
      lctx.font = 'bold 22px sans-serif';
      lctx.fillText(`${zone.name}`, 16, 34);
      lctx.fillStyle = '#38bdf8';
      lctx.font = '18px monospace';
      lctx.fillText(`${zone.occupants} pers • ${((zone.occupants * (zone.sensibleHeatPerPerson || 80)) / 1000).toFixed(1)} kW`, 16, 60);

      const lTex = new THREE.CanvasTexture(labelCanvas);
      const lMat = new THREE.SpriteMaterial({ map: lTex, depthTest: false });
      const lSprite = new THREE.Sprite(lMat);
      lSprite.scale.set(2.8, 1.0, 1);
      lSprite.position.set(zone.x + zone.width / 2, 1.8, zone.y + zone.length / 2);
      rootGroup.add(lSprite);
    });

    // 10. REALISTIC AC SPLIT & CASSETTE UNITS (FIX ISSUE 3: Aligning to walls)
    const animPlumes: THREE.Object3D[] = [];

    acUnits.forEach((ac) => {
      if (ac.type === 'split') {
        // Wall attachment calculation
        let wall: WallSide = ac.wallAttachment || 'west';
        if (!ac.wallAttachment) {
          const dWest = ac.x;
          const dEast = config.width - ac.x;
          const dSouth = ac.y;
          const dNorth = config.length - ac.y;
          const minD = Math.min(dWest, dEast, dSouth, dNorth);
          if (minD === dWest) wall = 'west';
          else if (minD === dEast) wall = 'east';
          else if (minD === dSouth) wall = 'south';
          else wall = 'north';
        }

        const splitGroup = new THREE.Group();

        // Dimensions of indoor unit: Length = 1.2m, Height = 0.38m, Depth = 0.22m
        const splitBodyGeo = new THREE.BoxGeometry(1.2, 0.38, 0.22);
        const splitBodyMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.2,
          metalness: 0.1,
        });
        const splitBody = new THREE.Mesh(splitBodyGeo, splitBodyMat);
        splitBody.castShadow = true;
        splitGroup.add(splitBody);

        // Top intake vent
        const ventGeo = new THREE.BoxGeometry(1.0, 0.04, 0.14);
        const ventMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const vent = new THREE.Mesh(ventGeo, ventMat);
        vent.position.set(0, 0.18, -0.02);
        splitGroup.add(vent);

        // Front glowing LED temperature display badge (14°C)
        const ledGeo = new THREE.PlaneGeometry(0.18, 0.08);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0.35, 0.02, 0.115);
        splitGroup.add(led);

        // Bottom air discharge louver flap
        const louverGeo = new THREE.BoxGeometry(1.1, 0.06, 0.08);
        const louverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const louver = new THREE.Mesh(louverGeo, louverMat);
        louver.rotation.x = 0.45; // angled down
        louver.position.set(0, -0.16, 0.08);
        splitGroup.add(louver);

        // Wall alignment position & rotation
        let posX = ac.x;
        let posZ = ac.y;
        let rotY = 0;

        if (wall === 'west') {
          posX = 0.12;
          rotY = Math.PI / 2; // front faces +X (into room)
        } else if (wall === 'east') {
          posX = config.width - 0.12;
          rotY = -Math.PI / 2; // front faces -X (into room)
        } else if (wall === 'south') {
          posZ = 0.12;
          rotY = 0; // front faces +Z (into room)
        } else if (wall === 'north') {
          posZ = config.length - 0.12;
          rotY = Math.PI; // front faces -Z (into room)
        }

        splitGroup.position.set(posX, Math.min(config.height - 0.4, ac.z), posZ);
        splitGroup.rotation.y = rotY;
        rootGroup.add(splitGroup);

        // Cool air downward jet stream
        if (ac.enabled) {
          const jetGeo = new THREE.ConeGeometry(1.6, 3.5, 16, 1, true);
          const jetMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.25,
            wireframe: true,
            side: THREE.DoubleSide,
          });
          const jet = new THREE.Mesh(jetGeo, jetMat);
          jet.rotation.x = Math.PI / 2 + 0.35; // angled downwards
          jet.position.set(0, -1.2, 1.6);
          splitGroup.add(jet);
          animPlumes.push(jet);
        }
      } else {
        // Ceiling Cassette (Square 4-way diffuser)
        const casGeo = new THREE.BoxGeometry(1.2, 0.22, 1.2);
        const casMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const casMesh = new THREE.Mesh(casGeo, casMat);
        casMesh.position.set(ac.x, config.height - 0.11, ac.y);
        casMesh.castShadow = true;
        rootGroup.add(casMesh);

        // Downward cool air cone
        if (ac.enabled) {
          const coneGeo = new THREE.ConeGeometry(2.4, 3.0, 16, 1, true);
          const coneMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.2,
            wireframe: true,
            side: THREE.DoubleSide,
          });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(ac.x, config.height - 1.6, ac.y);
          rootGroup.add(cone);
          animPlumes.push(cone);
        }
      }
    });

    // 11. Windows & Doors
    windows.forEach((win) => {
      const isDoor = win.type === 'door';
      const winGeo = new THREE.BoxGeometry(win.width, win.height, 0.16);
      const winMat = isDoor
        ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 })
        : new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
          });
      const winMesh = new THREE.Mesh(winGeo, winMat);
      const winY = isDoor ? win.height / 2 : win.sillHeight + win.height / 2;

      if (win.wall === 'south') {
        winMesh.position.set(win.offset + win.width / 2, winY, 0);
      } else if (win.wall === 'north') {
        winMesh.position.set(win.offset + win.width / 2, winY, config.length);
      } else if (win.wall === 'west') {
        winMesh.rotation.y = Math.PI / 2;
        winMesh.position.set(0, winY, win.offset + win.width / 2);
      } else {
        winMesh.rotation.y = Math.PI / 2;
        winMesh.position.set(config.width, winY, win.offset + win.width / 2);
      }
      rootGroup.add(winMesh);
    });

    // 12. Fans & Blades
    const fanBladesList: THREE.Group[] = [];
    fans.forEach((fan) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(fan.x, Math.min(config.height - 0.6, fan.z), fan.y);

      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      rod.position.y = 0.3;
      fanGroup.add(rod);

      const bladesGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(fan.diameter / 2, 0.02, 0.14);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9333ea });

      [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((bAng) => {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.x = fan.diameter / 4;
        const arm = new THREE.Group();
        arm.rotation.y = bAng;
        arm.add(blade);
        bladesGroup.add(arm);
      });

      fanGroup.add(bladesGroup);
      rootGroup.add(fanGroup);
      if (fan.enabled) fanBladesList.push(bladesGroup);
    });

    // 13. FLOATING 3D SENSOR PINS / BILLBOARDS (LIKE IMAGE 2 - SIMSCALE MODE)
    if (isSimScale && simScaleSettings.showSensorPins) {
      const pinRodMat = new THREE.LineBasicMaterial({
        color: isLightTheme ? 0x0f172a : 0x94a3b8,
        linewidth: 2,
      });

      // Pin at each Occupant Zone (Strictly Simulated Ambient Air Temperature)
      occupantZones.forEach((zone) => {
        const cx = zone.x + zone.width / 2;
        const cz = zone.y + zone.length / 2;
        const probe = simEngine ? simEngine.sampleProbe(cx, cz) : null;
        const probeTemp = probe?.temperature ?? (config.initialIndoorTemperature ?? 24);

        // Vertical pin rod
        const rodGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, 2.5, cz),
        ]);
        const rodLine = new THREE.Line(rodGeo, pinRodMat);
        rootGroup.add(rodLine);

        // Ground pinhead
        const pinHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x0f172a })
        );
        pinHead.position.set(cx, 0.1, cz);
        rootGroup.add(pinHead);

        // Floating Sprite Badge: Ambient Air Temperature strictly
        const sprite = createSensorPinSprite(
          zone.name,
          `${probeTemp.toFixed(1)} °C`,
          `${config.relativeHumidity ?? 50}% RH • ${zone.occupants}p`,
          probeTemp < 21,
          probeTemp > 26.5
        );
        sprite.position.set(cx, 2.7, cz);
        rootGroup.add(sprite);
      });

      // Pin at each ENABLED AC Unit (Strictly Ambient Temperature at equipment location)
      // If AC is disabled, no pin or fake cooling badge is rendered
      acUnits
        .filter((ac) => ac.enabled)
        .forEach((ac) => {
          const ax = ac.x;
          const az = ac.y;
          const probe = simEngine ? simEngine.sampleProbe(ax, az) : null;
          const probeTemp = probe?.temperature ?? (config.initialIndoorTemperature ?? 24);

          const rodGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ax, 0, az),
            new THREE.Vector3(ax, 2.4, az),
          ]);
          const rodLine = new THREE.Line(rodGeo, pinRodMat);
          rootGroup.add(rodLine);

          const sprite = createSensorPinSprite(
            ac.name,
            `${probeTemp.toFixed(1)} °C`,
            `A/C Activo • Consigna: ${ac.setpointTemperature ?? 23}°C`,
            probeTemp < 21,
            probeTemp > 26.5
          );
          sprite.position.set(ax, 2.6, az);
          rootGroup.add(sprite);
        });

      // Pin at main window/door (Strictly Indoor Ambient Air Temperature)
      if (windows.length > 0) {
        const w0 = windows[0];
        const wx =
          w0.wall === 'south' || w0.wall === 'north'
            ? w0.offset + w0.width / 2
            : w0.wall === 'west'
            ? 0.5
            : config.width - 0.5;
        const wz =
          w0.wall === 'west' || w0.wall === 'east'
            ? w0.offset + w0.width / 2
            : w0.wall === 'south'
            ? 0.5
            : config.length - 0.5;

        const probe = simEngine ? simEngine.sampleProbe(wx, wz) : null;
        const probeTemp = probe?.temperature ?? (config.initialIndoorTemperature ?? 24);

        const rodGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(wx, 0, wz),
          new THREE.Vector3(wx, 2.6, wz),
        ]);
        const rodLine = new THREE.Line(rodGeo, pinRodMat);
        rootGroup.add(rodLine);

        const sprite = createSensorPinSprite(
          w0.name,
          `${probeTemp.toFixed(1)} °C`,
          w0.openingPercentage > 0 ? `Apertura: ${w0.openingPercentage}%` : 'Cerrada (Estanca)',
          probeTemp < 21,
          probeTemp > 26.5
        );
        sprite.position.set(wx, 2.8, wz);
        rootGroup.add(sprite);
      }
    }

    // 14. Orbit Controls (Smooth mouse drag & zoom)
    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };
    const spherical = new THREE.Spherical();
    const target = new THREE.Vector3(config.width / 2, config.height * 0.35, config.length / 2);
    const offset = new THREE.Vector3().copy(camera.position).sub(target);
    spherical.setFromVector3(offset);

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - dy * 0.008));
      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      spherical.radius = Math.max(5, Math.min(maxDim * 4, spherical.radius * zoomFactor));
      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 15. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Rotate fan blades
      fanBladesList.forEach((b) => {
        b.rotation.y += delta * 12;
      });

      // Pulse cold air plumes
      animPlumes.forEach((p, idx) => {
        const s = 1 + 0.04 * Math.sin(clock.getElapsedTime() * 3 + idx);
        p.scale.set(s, 1, s);
      });

      // Dynamic heatmap texture update in real-time
      if (clock.getElapsedTime() % 0.15 < 0.03) {
        renderHeatTexture();
        heatTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (container.contains(domEl)) container.removeChild(domEl);
      renderer.dispose();
      scene.clear();
    };
  }, [
    config,
    occupantZones,
    windows,
    acUnits,
    airFlowUnits,
    fans,
    simEngine,
    simScaleSettings,
    viewMode,
    isSimScale,
    isLightTheme,
  ]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${isLightTheme ? 'bg-slate-100' : 'bg-slate-950'}`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* SimScale HUD Floating Controls & Colorbar Legend (as in Image 2) */}
      {isSimScale && (
        <>
          {/* Vertical SimScale Colorbar Legend */}
          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-200 text-slate-800 pointer-events-auto flex flex-col items-center select-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              T° Aire (°C)
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-56 rounded-full border border-slate-300 shadow-inner"
                style={{
                  background:
                    'linear-gradient(to top, rgb(15,75,235), rgb(30,200,245), rgb(16,195,110), rgb(245,160,10), rgb(235,50,50))',
                }}
              />
              <div className="flex flex-col justify-between h-56 text-[10px] font-mono font-bold text-slate-600">
                <span className="text-rose-600">34 °C</span>
                <span>30 °C</span>
                <span className="text-amber-500">26 °C</span>
                <span className="text-emerald-600">22 °C Confort</span>
                <span>18 °C</span>
                <span className="text-blue-600">16 °C</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[9px] text-slate-500 font-semibold text-center">
              Plano Z: {simScaleSettings.planeHeight.toFixed(1)} m
            </div>
          </div>

          {/* Bottom SimScale Floating Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-200 text-slate-800 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              <span className="font-semibold text-slate-700">Plano Z:</span>
              <span className="font-mono font-bold text-cyan-700 w-12">
                {simScaleSettings.planeHeight.toFixed(1)} m
              </span>
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
                className="w-32 accent-cyan-600 cursor-pointer"
              />
            </div>

            <div className="h-5 w-px bg-slate-200" />

            {/* Sensor Pins Toggle */}
            <button
              onClick={() =>
                setSimScaleSettings((prev) => ({
                  ...prev,
                  showSensorPins: !prev.showSensorPins,
                }))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                simScaleSettings.showSensorPins
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Balizas 3D
            </button>

            {/* Theme Toggle (Light like Image 2 vs Dark) */}
            <button
              onClick={() =>
                setSimScaleSettings((prev) => ({
                  ...prev,
                  theme: prev.theme === 'light' ? 'dark' : 'light',
                }))
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              {simScaleSettings.theme === 'light' ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
