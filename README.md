# 🌡️ TERMO-AUDITORIO | Simulación Térmica y Confort HVAC (2D / 3D SimScale CFD)

Aplicación web interactiva para el análisis térmico, balance energético, ventilación (ACH) y simulación de confort higrotérmico (PMV/PPD según **ISO 7730** y **ASHRAE 55 / Fundamentals**) en auditorios y recintos de alta ocupación.

---

## ✨ Características Principales

- **Modelado en Planta 2D y Visor 3D Interactivo:**
  - Configuración dinámica de dimensiones del recinto (`Ancho X`, `Largo Y`, `Alto Z`).
  - Edición interactiva sincronizada en tiempo real entre el panel lateral por pestañas y el lienzo gráfico.
- **Modo de Análisis CFD estilo SimScale 3D:**
  - Plano de corte térmico ajustable en altura (`Plano Z`) con interpolación bilineal continua.
  - Balizas / sondas 3D flotantes con lectura estricta de temperatura de aire ambiente simulada (`T° Aire`).
- **Motor Físico Termodinámico (ASHRAE):**
  - Curva fisiológica de disipación humana de calor sensible y latente en función de la temperatura interior.
  - Modo **Solo Interior** (aislamiento adiabático para análisis puro de cargas internas) o acoplado con clima exterior (radiación solar, transmisión por muros/vidrios e infiltración).
  - Solver de diferencias finitas 2D con advección-difusión y convergencia acelerada a **Estado Estacionario (Equilibrio)**.
- **Gestión Completa de Equipos e Instalaciones:**
  - **Geometría y Aberturas:** Puertas y ventanas por muro (`Norte`, `Sur`, `Este`, `Oeste`) con porcentaje de apertura.
  - **Zonas de Ocupantes:** Bloques configurables de personas con tasa metabólica y visualización dinámica de butacas en 3D.
  - **Ventiladores Mecánicos:** Unidades de techo y pared con radio de cobertura y velocidad de flujo.
  - **Ventilación HVAC:** Equipos de inyección y extracción de aire con cálculo automático de renovaciones por hora (`ACH`).
  - **Aire Acondicionado (A/C):** Unidades tipo *Split* (muro) y *Cassette* (techo 4 vías) con potencia en BTU/h y kW.

---

## 🚀 Instalación y Ejecución Local

### Requisitos previos
- **Node.js** (v18 o superior)
- **npm**

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```

---

## 🛠️ Tecnologías Utilizadas

- **React 19** + **TypeScript**
- **Three.js** (Renderizado 3D y planos de corte CFD)
- **Tailwind CSS** (Interfaz oscura de ingeniería CAD)
- **Lucide React** (Iconografía técnica)
- **Vite** (Bundler de alto rendimiento)
