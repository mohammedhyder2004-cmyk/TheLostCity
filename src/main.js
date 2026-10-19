import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import './style.css';

// ========================================
// CINEMATIC SCREEN OVERLAYS
// ========================================

const vignette = document.createElement('div');
vignette.className = 'cinematic-vignette';
document.body.appendChild(vignette);

const crosshair = document.createElement('div');
crosshair.className = 'crosshair';
document.body.appendChild(crosshair);

const controlsHint = document.createElement('div');
controlsHint.className = 'controls-hint';
controlsHint.innerHTML = `
  <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
  <span><kbd>Shift</kbd> Sprint</span>
  <span><kbd>Space</kbd> Jump</span>
  <span><kbd>Mouse</kbd> / <kbd>Q</kbd><kbd>E</kbd> Look</span>
  <span><kbd>Click</kbd> Lock View</span>
`;
document.body.appendChild(controlsHint);

// ========================================
// SCENE, CAMERA AND RENDERER
// ========================================

const scene = new THREE.Scene();

// Warm desert atmospheric haze that blends foreground and distant architecture
const hazeColor = new THREE.Color(0x91806d);
scene.fog = new THREE.Fog(hazeColor, 25, 145);

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 4.5, 11);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

document.body.appendChild(renderer.domElement);

// ========================================
// FAST PROCEDURAL PERLIN NOISE GENERATOR
// ========================================

function createPerlinNoise2D(seed = 1337) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  let s = seed;
  function rnd() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  }
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  return function noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    return lerp(v,
      lerp(u, grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf)),
      lerp(u, grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1))
    );
  };
}

const noise = createPerlinNoise2D(2024);

function fbm(x, y, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += noise(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

// ========================================
// ATMOSPHERIC SKY DOME & CANYON HORIZON
// ========================================

function createDesertSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Realistic warm desert sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  skyGrad.addColorStop(0.0, '#1d3148'); // Deep Mediterranean azure zenith
  skyGrad.addColorStop(0.32, '#354c68'); // Soft upper sky
  skyGrad.addColorStop(0.62, '#6d7580'); // Atmospheric dust transition
  skyGrad.addColorStop(0.80, '#b69772'); // Warm golden sand haze
  skyGrad.addColorStop(0.93, '#d8aa73'); // Radiant desert horizon warmth
  skyGrad.addColorStop(1.0, '#9e7d58');  // Ground blend

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Radiant Golden Adventure Sun
  const sunX = 1420;
  const sunY = 560;

  // Outer atmospheric golden glow
  const outerGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 450);
  outerGlow.addColorStop(0.0, 'rgba(255, 235, 180, 0.75)');
  outerGlow.addColorStop(0.25, 'rgba(255, 205, 130, 0.35)');
  outerGlow.addColorStop(0.6, 'rgba(220, 150, 85, 0.12)');
  outerGlow.addColorStop(1.0, 'rgba(180, 110, 60, 0.0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 450, 0, Math.PI * 2);
  ctx.fill();

  // Core bright sun disc
  const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
  sunDisc.addColorStop(0.0, '#ffffff');
  sunDisc.addColorStop(0.4, '#fff9e2');
  sunDisc.addColorStop(0.8, '#ffd478');
  sunDisc.addColorStop(1.0, 'rgba(255, 190, 80, 0)');
  ctx.fillStyle = sunDisc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
  ctx.fill();

  // Distant canyon mesa silhouettes framing the lost city basin
  function drawMesaRidge(baseY, heightMult, color, count) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 1024);
    ctx.lineTo(0, baseY);

    for (let i = 0; i <= count; i++) {
      const x = (i / count) * 2048;
      // Broad plateau mesas with sheer cliff steps
      const n1 = Math.sin(i * 0.14) * 26 + Math.cos(i * 0.32) * 16;
      const n2 = Math.sin(i * 0.7) * 8;
      // Flatten peaks into natural canyon mesas
      const plateau = Math.tanh((n1 + n2) * 0.05) * 35;
      const y = baseY + plateau * heightMult;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(2048, 1024);
    ctx.closePath();
    ctx.fill();
  }

  // Far distant mountain ridge (softened by atmospheric haze)
  drawMesaRidge(770, 1.1, 'rgba(74, 80, 94, 0.55)', 100);

  // Mid distant canyon rim
  drawMesaRidge(815, 0.85, 'rgba(62, 65, 78, 0.78)', 80);

  // Near rocky escarpment silhouettes
  drawMesaRidge(855, 0.6, 'rgba(48, 48, 58, 0.94)', 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const skyGeo = new THREE.SphereGeometry(450, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  scene.background = texture;

  return skyMesh;
}

createDesertSky();

// ========================================
// WARM DESERT LIGHTING SYSTEM
// ========================================

// Primary Directional Sunlight (Warm golden hour sunlight)
const sunlight = new THREE.DirectionalLight(0xffe2b8, 2.2);
sunlight.position.set(32, 44, 24);
sunlight.castShadow = true;

// Calibrated shadow frustum covering the full lost city playfield
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 140;
sunlight.shadow.camera.left = -46;
sunlight.shadow.camera.right = 46;
sunlight.shadow.camera.top = 46;
sunlight.shadow.camera.bottom = -46;
sunlight.shadow.bias = -0.0003;
sunlight.shadow.normalBias = 0.025;
scene.add(sunlight);

// Two-tone Hemisphere Light: cool atmospheric sky + rich warm desert sand bounce
const hemisphereLight = new THREE.HemisphereLight(0x6e8fae, 0xdf9452, 0.75);
scene.add(hemisphereLight);

// Subtle Directional Fill Light: prevents crushed blacks in shaded building interiors
const fillLight = new THREE.DirectionalLight(0x557088, 0.35);
fillLight.position.set(-28, 18, -25);
scene.add(fillLight);

// ========================================
// REALISTIC PROCEDURAL PBR TEXTURES
// ========================================

// 1. Natural Desert Ground Texture (NO repeating stripes or zebra lines)
function createNaturalSandPBR() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base warm desert sand fill
  ctx.fillStyle = '#c7ab7e';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const heightData = new Float32Array(size * size);

  // Palette of natural desert tones: golden ochre, dusty rose, warm silt, sun-bleached sand
  const cBase = [199, 171, 126];
  const cPale = [224, 198, 155];
  const cWarm = [181, 146, 101];
  const cDark = [156, 122, 82];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;

      // Multi-scale continuous Perlin noise: creates organic natural dunes and soft patches
      const nx = x * 0.004;
      const ny = y * 0.004;
      const broadNoise = fbm(nx, ny, 4); // Broad desert elevation & color variation
      const fineDrift = fbm(x * 0.02, y * 0.02, 2) * 0.2; // Gentle organic sand drifts
      const microGrain = (Math.random() - 0.5) * 0.12; // Realistic sand grains

      const totalH = broadNoise + fineDrift + microGrain;
      heightData[idx] = totalH;

      // Smooth color blending based on organic noise (NO repetitive wave stripes!)
      const t = Math.min(1.0, Math.max(0.0, broadNoise * 0.8 + 0.5));
      let r, g, b;

      if (t < 0.5) {
        const factor = t * 2;
        r = cDark[0] * (1 - factor) + cWarm[0] * factor;
        g = cDark[1] * (1 - factor) + cWarm[1] * factor;
        b = cDark[2] * (1 - factor) + cWarm[2] * factor;
      } else {
        const factor = (t - 0.5) * 2;
        r = cWarm[0] * (1 - factor) + cPale[0] * factor;
        g = cWarm[1] * (1 - factor) + cPale[1] * factor;
        b = cWarm[2] * (1 - factor) + cPale[2] * factor;
      }

      // Apply subtle grain and lighting modulation
      const shade = 0.94 + fineDrift * 0.4 + microGrain * 0.6;
      const pIdx = idx * 4;
      data[pIdx] = Math.min(255, Math.max(0, r * shade));
      data[pIdx + 1] = Math.min(255, Math.max(0, g * shade));
      data[pIdx + 2] = Math.min(255, Math.max(0, b * shade));
      data[pIdx + 3] = 255;
    }
  }

  // Paint small scattered desert pebbles and stone chips
  for (let p = 0; p < 350; p++) {
    const px = Math.floor(Math.random() * (size - 6)) + 3;
    const py = Math.floor(Math.random() * (size - 6)) + 3;
    const pr = Math.random() * 2 + 1;
    const pidx = (py * size + px) * 4;
    const isDark = Math.random() > 0.5;
    const pv = isDark ? 100 : 220;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx * dx + dy * dy <= pr * pr) {
          const sidx = ((py + dy) * size + (px + dx)) * 4;
          data[sidx] = pv;
          data[sidx + 1] = pv * 0.9;
          data[sidx + 2] = pv * 0.8;
          heightData[(py + dy) * size + (px + dx)] += (isDark ? -0.15 : 0.2);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Soft Tangent-Space Normal Map (Gentle dune curvature, NO harsh zebra ridges)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d');
  const normImg = normCtx.createImageData(size, size);
  const normData = normImg.data;

  const strength = 1.6; // Gentle natural slope
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const dX = (heightData[y * size + xp1] - heightData[y * size + xm1]) * strength;
      const dY = (heightData[yp1 * size + x] - heightData[ym1 * size + x]) * strength;

      const len = Math.hypot(dX, dY, 1.0);
      const nx = -dX / len;
      const ny = -dY / len;
      const nz = 1.0 / len;

      const pIdx = (y * size + x) * 4;
      normData[pIdx] = (nx * 0.5 + 0.5) * 255;
      normData[pIdx + 1] = (ny * 0.5 + 0.5) * 255;
      normData[pIdx + 2] = (nz * 0.5 + 0.5) * 255;
      normData[pIdx + 3] = 255;
    }
  }
  normCtx.putImageData(normImg, 0, 0);

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(6, 6); // Low repeat scale prevents visible tiling across 240m
  albedo.colorSpace = THREE.SRGBColorSpace;

  const normal = new THREE.CanvasTexture(normCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(6, 6);

  return { albedo, normal };
}

// 2. Monumental Ancient Sandstone (Ashlar Megaliths with Geological Strata)
function createMonumentalSandstonePBR() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base warm desert stone
  ctx.fillStyle = '#ba9567';
  ctx.fillRect(0, 0, size, size);

  // Large megalithic block courses (6 large architectural courses)
  const courses = 7;
  const courseHeight = size / courses;
  const heightData = new Float32Array(size * size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Block definitions for realistic varied ashlar stonework
  const blockGrid = [];
  for (let r = 0; r < courses; r++) {
    const y0 = r * courseHeight;
    const y1 = y0 + courseHeight;
    const cols = (r % 2 === 0) ? 4 : 5; // 4 to 5 massive blocks per row
    const colWidth = size / cols;
    const rowBlocks = [];

    for (let c = 0; c < cols; c++) {
      // Randomized block width for authentic ancient masonry
      const shift = (c === 0 || c === cols - 1) ? 0 : (Math.sin(r * 3 + c * 7) * 25);
      const x0 = c * colWidth + shift;
      const x1 = (c + 1) * colWidth + (c === cols - 1 ? 0 : Math.sin(r * 5 + c * 3) * 25);
      const w = Math.max(40, x1 - x0);

      // Unique warm sandstone tone per block with natural mineral variance
      const toneShift = Math.sin(r * 4.2 + c * 9.1) * 22;
      const rVal = Math.min(245, Math.max(150, 195 + toneShift));
      const gVal = Math.min(225, Math.max(125, 160 + toneShift * 0.9));
      const bVal = Math.min(195, Math.max(90, 118 + toneShift * 0.75));

      rowBlocks.push({ x0, x1: x0 + w, y0, y1, rVal, gVal, bVal });
    }
    blockGrid.push(rowBlocks);
  }

  // Paint monumental blocks with geological sedimentary strata & beveled seams
  for (let y = 0; y < size; y++) {
    const r = Math.floor(y / courseHeight);
    const rowOffset = y % courseHeight;
    const isMortarY = rowOffset < 4 || rowOffset > courseHeight - 4;

    // Natural horizontal geological sedimentary rock strata flowing across blocks
    const strata = fbm(0.005, y * 0.025, 3) * 28;

    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const rowBlocks = blockGrid[Math.min(courses - 1, r)];

      // Find which block this pixel belongs to
      let block = rowBlocks[0];
      for (const b of rowBlocks) {
        if (x >= b.x0 && x <= b.x1) {
          block = b;
          break;
        }
      }

      const blockW = block.x1 - block.x0;
      const colOffset = Math.max(0, x - block.x0);
      const isMortarX = colOffset < 4 || colOffset > blockW - 4;

      let h = 0.65;
      if (isMortarY || isMortarX) {
        h = 0.18; // Deep chiseled mortar groove
      } else {
        // Natural beveled block edges and stone face relief
        const edgeDistX = Math.min(colOffset, blockW - colOffset);
        const edgeDistY = Math.min(rowOffset, courseHeight - rowOffset);
        const bevel = Math.min(1.0, Math.min(edgeDistX, edgeDistY) / 16);

        // Chiseled stone face texture
        const stoneNoise = (Math.random() - 0.5) * 0.16;
        h = 0.48 + bevel * 0.38 + stoneNoise;
      }
      heightData[idx] = h;

      const pIdx = idx * 4;
      if (isMortarY || isMortarX) {
        // Dark weathered mortar seam
        data[pIdx] = 78;
        data[pIdx + 1] = 65;
        data[pIdx + 2] = 52;
      } else {
        const shade = 0.82 + h * 0.28;
        data[pIdx] = Math.min(255, (block.rVal + strata) * shade);
        data[pIdx + 1] = Math.min(255, (block.gVal + strata * 0.85) * shade);
        data[pIdx + 2] = Math.min(255, (block.bVal + strata * 0.65) * shade);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Normal Map
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d');
  const normImg = normCtx.createImageData(size, size);
  const normData = normImg.data;

  const strength = 3.4;
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const dX = (heightData[y * size + xp1] - heightData[y * size + xm1]) * strength;
      const dY = (heightData[yp1 * size + x] - heightData[ym1 * size + x]) * strength;

      const len = Math.hypot(dX, dY, 1.0);
      const nx = -dX / len;
      const ny = -dY / len;
      const nz = 1.0 / len;

      const pIdx = (y * size + x) * 4;
      normData[pIdx] = (nx * 0.5 + 0.5) * 255;
      normData[pIdx + 1] = (ny * 0.5 + 0.5) * 255;
      normData[pIdx + 2] = (nz * 0.5 + 0.5) * 255;
      normData[pIdx + 3] = 255;
    }
  }
  normCtx.putImageData(normImg, 0, 0);

  // Roughness Map: smoother on weathered stone faces (~0.76), rougher in seams (~0.98)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d');
  const roughImg = roughCtx.createImageData(size, size);
  const roughData = roughImg.data;

  for (let i = 0; i < size * size; i++) {
    const h = heightData[i];
    const val = (1.0 - h * 0.32) * 255;
    const pIdx = i * 4;
    roughData[pIdx] = val;
    roughData[pIdx + 1] = val;
    roughData[pIdx + 2] = val;
    roughData[pIdx + 3] = 255;
  }
  roughCtx.putImageData(roughImg, 0, 0);

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(1.5, 1.5);
  albedo.colorSpace = THREE.SRGBColorSpace;

  const normal = new THREE.CanvasTexture(normCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(1.5, 1.5);

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(1.5, 1.5);

  return { albedo, normal, roughness };
}

// 3. Ancient Processional Flagstone Pavement
function createProcessionalPBR() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8f7756';
  ctx.fillRect(0, 0, size, size);

  // Large weathered flagstone slabs with sand drifted into cracks
  for (let i = 0; i < 18; i++) {
    const rx = (i % 3) * 170 + 8;
    const ry = Math.floor(i / 3) * 85 + 6;
    const tone = (i % 2 === 0) ? '#a88c64' : '#9c7f58';
    ctx.fillStyle = tone;
    ctx.fillRect(rx, ry, 154, 73);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

const sandPBR = createNaturalSandPBR();
const stonePBR = createMonumentalSandstonePBR();
const flagstoneMap = createProcessionalPBR();

// High Quality Standard Materials
const groundMaterial = new THREE.MeshStandardMaterial({
  map: sandPBR.albedo,
  normalMap: sandPBR.normal,
  normalScale: new THREE.Vector2(0.45, 0.45), // Subtle soft dune normals
  roughness: 0.95,
  metalness: 0.02
});

const stoneMaterial = new THREE.MeshStandardMaterial({
  map: stonePBR.albedo,
  normalMap: stonePBR.normal,
  roughnessMap: stonePBR.roughness,
  normalScale: new THREE.Vector2(1.15, 1.15),
  roughness: 0.86,
  metalness: 0.04
});

const flagstoneMaterial = new THREE.MeshStandardMaterial({
  map: flagstoneMap,
  normalMap: stonePBR.normal,
  normalScale: new THREE.Vector2(0.5, 0.5),
  roughness: 0.92,
  metalness: 0.03
});

// Dark interior portal material
const darkInteriorMaterial = new THREE.MeshStandardMaterial({
  color: 0x14100c,
  roughness: 1.0,
  metalness: 0.0
});

// Bronze / Wrought Lantern Material
const bronzeMaterial = new THREE.MeshStandardMaterial({
  color: 0x483423,
  metalness: 0.8,
  roughness: 0.4
});

// ========================================
// NATURAL DESERT GROUND & PROCESSIONAL ROAD
// ========================================

const groundGeometry = new THREE.PlaneGeometry(240, 240, 120, 120);
groundGeometry.rotateX(-Math.PI / 2);

const positions = groundGeometry.attributes.position;

for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i);
  const z = positions.getZ(i);

  // Keep central city corridor level and smooth for player & collision accuracy
  const distFromCenter = Math.hypot(x * 0.7, (z + 18) * 0.4);
  const corridorMask = Math.min(1.0, Math.max(0.0, (distFromCenter - 14) / 25));

  // Organic Perlin dunes framing the lost city perimeter
  const duneElevation = fbm(x * 0.025, z * 0.025, 3) * 4.5;
  const microUndulation = (Math.sin(x * 0.1) + Math.cos(z * 0.1)) * 0.06;

  const y = microUndulation + duneElevation * corridorMask;
  positions.setY(i, y);
}

groundGeometry.computeVertexNormals();

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

// Processional Stone Road with sand drifted over slabs
const pathGeometry = new THREE.PlaneGeometry(4.4, 34, 8, 32);
pathGeometry.rotateX(-Math.PI / 2);
const pathPositions = pathGeometry.attributes.position;
for (let i = 0; i < pathPositions.count; i++) {
  const px = pathPositions.getX(i);
  // Slightly sunken toward the center with subtle stone wear
  pathPositions.setY(i, -Math.abs(px) * 0.025);
}
pathGeometry.computeVertexNormals();

const processionalRoad = new THREE.Mesh(pathGeometry, flagstoneMaterial);
processionalRoad.position.set(0, 0.015, -4);
processionalRoad.receiveShadow = true;
scene.add(processionalRoad);

// ========================================
// WARM LANTERN SYSTEM
// ========================================

const lanterns = [];

function createWallLantern(x, y, z, parentGroup = scene) {
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(x, y, z);

  // Wrought bronze wall bracket
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.45, 0.35),
    bronzeMaterial
  );
  bracket.castShadow = true;
  lanternGroup.add(bracket);

  // Lantern Housing Cage
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.12, 0.4, 6),
    bronzeMaterial
  );
  cage.position.set(0, -0.15, 0.28);
  cage.castShadow = true;
  lanternGroup.add(cage);

  // Glowing Orange Flame Core
  const flame = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.1),
    new THREE.MeshStandardMaterial({
      color: 0xff7a18,
      emissive: 0xff6600,
      emissiveIntensity: 3.5
    })
  );
  flame.position.set(0, -0.14, 0.28);
  lanternGroup.add(flame);

  // Warm Point Light casting ambient orange glow on sandstone walls
  const light = new THREE.PointLight(0xff7c1a, 1.8, 9, 1.8);
  light.position.set(0, -0.14, 0.35);
  lanternGroup.add(light);

  parentGroup.add(lanternGroup);
  lanterns.push({ flame, light, baseIntensity: 1.8 });

  return lanternGroup;
}

// ========================================
// MONUMENTAL SANDSTONE ARCHITECTURE
// ========================================

// Procedural Arched Doorway / Portal Generator
function createArchedPortal(width, height, depth) {
  const portalGroup = new THREE.Group();

  // Dark interior recessed back-wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.85, height * 0.9, 0.2),
    darkInteriorMaterial
  );
  backWall.position.set(0, height * 0.45, -depth * 0.45);
  portalGroup.add(backWall);

  // Left Stone Door Jamb
  const jambW = width * 0.18;
  const leftJamb = new THREE.Mesh(
    new THREE.BoxGeometry(jambW, height, depth * 0.35),
    stoneMaterial
  );
  leftJamb.position.set(-width * 0.45, height * 0.5, 0);
  leftJamb.castShadow = true;
  leftJamb.receiveShadow = true;
  portalGroup.add(leftJamb);

  // Right Stone Door Jamb
  const rightJamb = new THREE.Mesh(
    new THREE.BoxGeometry(jambW, height, depth * 0.35),
    stoneMaterial
  );
  rightJamb.position.set(width * 0.45, height * 0.5, 0);
  rightJamb.castShadow = true;
  rightJamb.receiveShadow = true;
  portalGroup.add(rightJamb);

  // Heavy Carved Sandstone Lintel
  const lintelH = height * 0.22;
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.08, lintelH, depth * 0.45),
    stoneMaterial
  );
  lintel.position.set(0, height - lintelH * 0.5, 0);
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  portalGroup.add(lintel);

  // Decorative Arch Lunette
  const archRadius = (width - jambW * 2) * 0.48;
  const archGeo = new THREE.CylinderGeometry(archRadius, archRadius, depth * 0.3, 12, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  const arch = new THREE.Mesh(archGeo, stoneMaterial);
  arch.position.set(0, height - lintelH - 0.05, 0);
  arch.castShadow = true;
  arch.receiveShadow = true;
  portalGroup.add(arch);

  return portalGroup;
}

// 4 Architectural Styles for the 14 Buildings (matching reference ancient sandstone architecture)
function createArchitecturalBuilding(x, z, width, height, depth, styleIndex = 0) {
  const buildingGroup = new THREE.Group();
  buildingGroup.position.set(x, 0, z);

  // Face portal toward the central processional street
  const facePositiveX = x < 0; // Left side faces +X (toward center road at x=0)
  const facingSign = facePositiveX ? 1 : -1;

  // 1. Foundation Podium / Stepped Plinth
  const plinthH = 0.45;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, plinthH, depth + 0.5),
    stoneMaterial
  );
  plinth.position.set(0, plinthH / 2, 0);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  buildingGroup.add(plinth);

  // 2. Main Monumental Sandstone Body
  const bodyH = height - plinthH;
  const mainBody = new THREE.Mesh(
    new THREE.BoxGeometry(width, bodyH, depth),
    stoneMaterial
  );
  mainBody.position.set(0, plinthH + bodyH / 2, 0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  buildingGroup.add(mainBody);

  // 3. Multi-Layered Cornices (Cavetto / Stepped Entablature)
  const corniceH1 = 0.35;
  const cornice1 = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.35, corniceH1, depth + 0.35),
    stoneMaterial
  );
  cornice1.position.set(0, height - corniceH1 / 2, 0);
  cornice1.castShadow = true;
  cornice1.receiveShadow = true;
  buildingGroup.add(cornice1);

  const corniceH2 = 0.25;
  const cornice2 = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, corniceH2, depth + 0.5),
    stoneMaterial
  );
  cornice2.position.set(0, height + corniceH2 / 2, 0);
  cornice2.castShadow = true;
  cornice2.receiveShadow = true;
  buildingGroup.add(cornice2);

  // 4. Style-Specific Architectural Features
  if (styleIndex % 4 === 0) {
    // Style A: Monumental Pylon Sanctuary with Deep Recessed Portal & Wall Lantern
    const portalW = Math.min(width * 0.75, 2.2);
    const portalH = Math.min(height * 0.55, 3.4);
    const portal = createArchedPortal(portalW, portalH, depth);
    portal.position.set(facingSign * (width / 2 - 0.05), plinthH, 0);
    if (!facePositiveX) portal.rotation.y = Math.PI;
    else portal.rotation.y = 0;
    portal.rotation.y += (facingSign > 0 ? Math.PI / 2 : -Math.PI / 2);
    buildingGroup.add(portal);

    // Warm Orange Wall Lantern beside entrance
    const lanternZ = depth * 0.35;
    createWallLantern(facingSign * (width / 2 + 0.1), plinthH + 2.0, lanternZ, buildingGroup);

    // Stepped Upper Terrace
    const terraceW = width * 0.65;
    const terraceD = depth * 0.65;
    const terraceH = 1.2;
    const terrace = new THREE.Mesh(
      new THREE.BoxGeometry(terraceW, terraceH, terraceD),
      stoneMaterial
    );
    terrace.position.set(0, height + terraceH / 2 + corniceH2, 0);
    terrace.castShadow = true;
    terrace.receiveShadow = true;
    buildingGroup.add(terrace);

  } else if (styleIndex % 4 === 1) {
    // Style B: Colonnaded Portico Sanctuary with Engaged Fluted Columns
    const colCount = Math.max(2, Math.floor(depth / 1.6));
    const colRadius = 0.26;
    const colHeight = height * 0.7;

    for (let c = 0; c < colCount; c++) {
      const cz = -depth / 2 + (c + 0.5) * (depth / colCount);
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(colRadius * 0.9, colRadius, colHeight, 16),
        stoneMaterial
      );
      col.position.set(facingSign * (width / 2 + colRadius * 0.5), plinthH + colHeight / 2, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      buildingGroup.add(col);

      // Column Capital
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(colRadius * 2.6, 0.22, colRadius * 2.6),
        stoneMaterial
      );
      cap.position.set(facingSign * (width / 2 + colRadius * 0.5), plinthH + colHeight + 0.11, cz);
      cap.castShadow = true;
      buildingGroup.add(cap);
    }

    // Heavy Entablature Architrave above columns
    const entablature = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.38, depth + 0.3),
      stoneMaterial
    );
    entablature.position.set(facingSign * (width / 2 + colRadius * 0.5), plinthH + colHeight + 0.35, 0);
    entablature.castShadow = true;
    buildingGroup.add(entablature);

    // Warm Lantern mounted on the central column
    createWallLantern(facingSign * (width / 2 + colRadius + 0.1), plinthH + 1.8, 0, buildingGroup);

  } else if (styleIndex % 4 === 2) {
    // Style C: Stepped Ziggurat / Terraced Fortress with Carved Pilasters
    const buttressW = 0.38;
    const buttressD = 0.38;
    const corners = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [-width / 2, depth / 2],
      [width / 2, depth / 2]
    ];
    corners.forEach(([cx, cz]) => {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(buttressW, height * 0.85, buttressD),
        stoneMaterial
      );
      buttress.position.set(cx, plinthH + (height * 0.85) / 2, cz);
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      buildingGroup.add(buttress);
    });

    // Mid-level stepped frieze band
    const frieze = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.3, depth + 0.2),
      stoneMaterial
    );
    frieze.position.set(0, plinthH + height * 0.5, 0);
    frieze.castShadow = true;
    buildingGroup.add(frieze);

    // Recessed arched niche
    const nicheW = Math.min(width * 0.6, 1.8);
    const nicheH = 2.2;
    const niche = createArchedPortal(nicheW, nicheH, depth);
    niche.position.set(facingSign * (width / 2 - 0.05), plinthH, 0);
    niche.rotation.y = (facingSign > 0 ? Math.PI / 2 : -Math.PI / 2);
    buildingGroup.add(niche);

    createWallLantern(facingSign * (width / 2 + 0.1), plinthH + 1.9, -depth * 0.3, buildingGroup);

  } else {
    // Style D: Ruined Arched Hall with Jagged Diagonal Fracture Section
    const archH = Math.min(height * 0.65, 3.8);
    const archW = Math.min(width * 0.7, 2.4);
    const archPortal = createArchedPortal(archW, archH, depth);
    archPortal.position.set(facingSign * (width / 2 - 0.05), plinthH, 0);
    archPortal.rotation.y = (facingSign > 0 ? Math.PI / 2 : -Math.PI / 2);
    buildingGroup.add(archPortal);

    // Jagged diagonal broken section atop the building
    const breakW = width * 0.55;
    const breakH = 1.1;
    const breakBlock = new THREE.Mesh(
      new THREE.BoxGeometry(breakW, breakH, depth * 0.8),
      stoneMaterial
    );
    breakBlock.position.set(-width * 0.2, height + corniceH2 + breakH / 2, 0);
    breakBlock.rotation.z = 0.14;
    breakBlock.castShadow = true;
    buildingGroup.add(breakBlock);

    createWallLantern(facingSign * (width / 2 + 0.1), plinthH + 2.1, depth * 0.25, buildingGroup);
  }

  // 5. Broken Parapet Masonry Blocks on Top (Selected jagged blocks)
  const blockCount = Math.max(3, Math.floor(width / 0.9));
  for (let i = 0; i < blockCount; i++) {
    if (Math.random() > 0.3) { // Natural broken gaps in the crenellations
      const bW = (width / blockCount) * 0.85;
      const bH = 0.4 + Math.random() * 0.6;
      const bD = 0.35 + Math.random() * 0.4;

      const brokenBlock = new THREE.Mesh(
        new THREE.BoxGeometry(bW, bH, bD),
        stoneMaterial
      );
      brokenBlock.position.set(
        -width / 2 + (i + 0.5) * (width / blockCount),
        height + corniceH2 + bH / 2,
        (Math.random() - 0.5) * depth * 0.5
      );
      brokenBlock.rotation.y = (Math.random() - 0.5) * 0.3;
      brokenBlock.rotation.z = (Math.random() - 0.5) * 0.2;
      brokenBlock.castShadow = true;
      brokenBlock.receiveShadow = true;
      buildingGroup.add(brokenBlock);
    }
  }

  scene.add(buildingGroup);
}

// Preserve all 14 original ruin placements and dimensions
createArchitecturalBuilding(-5, -5, 3, 5, 3, 0);
createArchitecturalBuilding(5, -8, 4, 7, 3, 1);
createArchitecturalBuilding(-9, -12, 3, 4, 3, 2);
createArchitecturalBuilding(9, -3, 3, 6, 3, 3);

createArchitecturalBuilding(-14, -4, 5, 7, 5, 0);
createArchitecturalBuilding(14, -7, 5, 8, 5, 1);

createArchitecturalBuilding(-15, -17, 6, 5, 5, 2);
createArchitecturalBuilding(15, -18, 6, 9, 5, 3);

createArchitecturalBuilding(-7, -24, 5, 8, 5, 0);
createArchitecturalBuilding(8, -27, 6, 6, 5, 1);

createArchitecturalBuilding(-18, -30, 7, 10, 6, 2);
createArchitecturalBuilding(18, -32, 7, 7, 6, 3);

createArchitecturalBuilding(-10, -38, 6, 5, 5, 0);
createArchitecturalBuilding(11, -40, 7, 9, 6, 1);

// ========================================
// MONUMENTAL PROCESSIONAL STONE ARCHES
// (Spanning overhead without blocking ground path)
// ========================================

function createOverheadArch(z) {
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, z);

  const span = 6.4;
  const pylonW = 1.0;
  const pylonH = 5.2;

  // Left Stone Pylon (Placed off the road at x = -3.2)
  const leftPylon = new THREE.Mesh(
    new THREE.BoxGeometry(pylonW, pylonH, 1.2),
    stoneMaterial
  );
  leftPylon.position.set(-span / 2, pylonH / 2, 0);
  leftPylon.castShadow = true;
  leftPylon.receiveShadow = true;
  archGroup.add(leftPylon);

  // Right Stone Pylon (Placed off the road at x = +3.2)
  const rightPylon = new THREE.Mesh(
    new THREE.BoxGeometry(pylonW, pylonH, 1.2),
    stoneMaterial
  );
  rightPylon.position.set(span / 2, pylonH / 2, 0);
  rightPylon.castShadow = true;
  rightPylon.receiveShadow = true;
  archGroup.add(rightPylon);

  // Massive Architrave Lintel spanning above walking height (> 4.8m clearance)
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(span + pylonW * 1.5, 0.9, 1.4),
    stoneMaterial
  );
  lintel.position.set(0, pylonH + 0.45, 0);
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  archGroup.add(lintel);

  // Carved Arch Vault curve
  const radius = (span - pylonW) * 0.5;
  const vaultGeo = new THREE.CylinderGeometry(radius, radius, 1.1, 16, 1, false, 0, Math.PI);
  vaultGeo.rotateZ(Math.PI / 2);
  const vault = new THREE.Mesh(vaultGeo, stoneMaterial);
  vault.position.set(0, pylonH - 0.2, 0);
  vault.castShadow = true;
  vault.receiveShadow = true;
  archGroup.add(vault);

  // Warm Lantern mounted under the arch keystone
  createWallLantern(0, pylonH - 0.4, 0.55, archGroup);

  scene.add(archGroup);
}

// Two monumental arches framing the processional street
createOverheadArch(-6.5);
createOverheadArch(-15.5);

// ========================================
// CONTROLLED RUBBLE, BOULDERS & DESERT PLANTS
// ========================================

const rubbleMaterials = [
  new THREE.MeshStandardMaterial({
    map: stonePBR.albedo,
    normalMap: stonePBR.normal,
    roughness: 0.94,
    metalness: 0.04
  }),
  new THREE.MeshStandardMaterial({
    color: 0xaa8c64,
    roughness: 0.92,
    metalness: 0.03
  }),
  new THREE.MeshStandardMaterial({
    color: 0x937852,
    roughness: 0.96,
    metalness: 0.02
  })
];

// Natural multi-faceted rock boulder
function createRockGeometry(radius) {
  const geo = new THREE.DodecahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n = 1.0 + (Math.sin(vx * 3.5) + Math.cos(vy * 3.5) + Math.sin(vz * 3.5)) * 0.15;
    pos.setXYZ(i, vx * n, vy * (n * 0.82), vz * n);
  }
  geo.computeVertexNormals();
  return geo;
}

// Desert scrub foliage
function createDesertShrub(x, z) {
  const shrubGroup = new THREE.Group();
  shrubGroup.position.set(x, 0.1, z);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x6e7855, // Weathered desert olive
    roughness: 0.88
  });

  for (let i = 0; i < 3; i++) {
    const tuft = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.14, 0),
      leafMat
    );
    tuft.position.set(
      (Math.random() - 0.5) * 0.28,
      0.25 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.28
    );
    tuft.castShadow = true;
    shrubGroup.add(tuft);
  }

  scene.add(shrubGroup);
}

function createRubble(x, z, count = 7) {
  for (let i = 0; i < count; i++) {
    const mat = rubbleMaterials[Math.floor(Math.random() * rubbleMaterials.length)];
    const isBoulder = Math.random() > 0.45;

    let mesh;
    if (isBoulder) {
      const radius = 0.25 + Math.random() * 0.4;
      mesh = new THREE.Mesh(createRockGeometry(radius), mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 3.5,
        radius * 0.65,
        z + (Math.random() - 0.5) * 3.5
      );
    } else {
      // Fallen architectural slab / ashlar block
      const w = 0.35 + Math.random() * 0.55;
      const h = 0.2 + Math.random() * 0.35;
      const d = 0.35 + Math.random() * 0.55;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 3.5,
        h / 2,
        z + (Math.random() - 0.5) * 3.5
      );
    }

    mesh.rotation.set(
      Math.random() * 0.4,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.4
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  if (Math.random() > 0.4) {
    createDesertShrub(x + (Math.random() - 0.5) * 2.5, z + (Math.random() - 0.5) * 2.5);
  }
}

function createBrokenWall(x, z, length, rotation = 0) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.95, 0.6),
    stoneMaterial
  );
  wall.position.set(x, 0.48, z);
  wall.rotation.y = rotation;
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  createRubble(x, z, 5);
}

// Rubble and broken wall placements (tucked against buildings, keeping avenue clear)
createRubble(-7, -7, 9);
createRubble(7, -10, 8);
createRubble(-12, -16, 9);
createRubble(12, -20, 10);
createRubble(-17, -27, 10);
createRubble(17, -35, 10);
createRubble(-8, -41, 8);

createBrokenWall(-10, -8, 4, 0.3);
createBrokenWall(10, -15, 5, -0.4);
createBrokenWall(-13, -23, 4, 0.7);
createBrokenWall(13, -29, 5, -0.5);

// ========================================
// DETAILED ANCIENT COLUMNS & FALLEN PILLARS
// ========================================

function createFallenPillar(x, z, length, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const drumCount = Math.floor(length / 1.1);
  for (let i = 0; i < drumCount; i++) {
    const drumLen = length / drumCount;
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, drumLen * 0.92, 18),
      rubbleMaterials[1]
    );
    drum.rotation.z = Math.PI / 2;
    drum.position.set((i - drumCount / 2 + 0.5) * drumLen, 0.4, (Math.random() - 0.5) * 0.1);
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);
  }

  scene.add(group);
  createRubble(x + 1.2, z + 0.5, 5);
}

createFallenPillar(-8, -13, 3, 0.2);
createFallenPillar(11, -23, 4, -0.4);
createFallenPillar(-16, -34, 3.5, 0.7);

createRubble(-4, -20, 12);
createRubble(5, -32, 12);
createRubble(0, -44, 10);

// Six Standing Ancient Pillars (Enhanced with Pedestals, Fluted Shafts & Capitals)
for (let i = 0; i < 6; i++) {
  const pillarGroup = new THREE.Group();
  const px = -3 + i * 1.5;
  const pz = -10;
  pillarGroup.position.set(px, 0, pz);

  // Stepped Square Plinth Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.35, 0.95),
    stoneMaterial
  );
  base.position.y = 0.175;
  base.castShadow = true;
  base.receiveShadow = true;
  pillarGroup.add(base);

  // Fluted Column Shaft
  const shaftHeight = 3.6;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.42, shaftHeight, 20),
    stoneMaterial
  );
  shaft.position.y = 0.35 + shaftHeight / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  pillarGroup.add(shaft);

  // Carved Capital on top
  const capital = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.3, 0.9),
    stoneMaterial
  );
  capital.position.y = 0.35 + shaftHeight + 0.15;
  capital.castShadow = true;
  capital.receiveShadow = true;
  pillarGroup.add(capital);

  // Add lanterns on outer framing pillars
  if (i === 0 || i === 5) {
    createWallLantern(0, 2.2, 0.45, pillarGroup);
  }

  scene.add(pillarGroup);
}

// ========================================
// MONUMENTAL ANCIENT CITY GATE
// ========================================

const gate = new THREE.Group();
scene.add(gate);

// Weathered timber and bronze door texture
function createGateDoorMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#423122';
  ctx.fillRect(0, 0, 512, 1024);

  // Vertical timber planks
  for (let i = 0; i < 6; i++) {
    const x = i * 85;
    ctx.fillStyle = (i % 2 === 0) ? '#4e3a28' : '#3d2b1c';
    ctx.fillRect(x + 2, 0, 81, 1024);
  }

  // Horizontal hammered bronze reinforcing bands
  for (let b = 0; b < 4; b++) {
    const y = 120 + b * 240;
    ctx.fillStyle = '#8a6435';
    ctx.fillRect(0, y, 512, 44);

    // Bronze rivets
    for (let r = 0; r < 8; r++) {
      ctx.fillStyle = '#d4a457';
      ctx.beginPath();
      ctx.arc(32 + r * 64, y + 22, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: stonePBR.normal,
    roughness: 0.75,
    metalness: 0.28
  });
}

const doorMaterial = createGateDoorMaterial();

function makeGateBlock(x, y, z, w, h, d) {
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    stoneMaterial
  );
  block.position.set(x, y, z);
  block.castShadow = true;
  block.receiveShadow = true;
  gate.add(block);
}

// Monumental Stone Pylons & Arch
makeGateBlock(-2.6, 3.2, -20, 1.4, 6.4, 1.8); // Left Pylon
makeGateBlock(2.6, 3.2, -20, 1.4, 6.4, 1.8);  // Right Pylon
makeGateBlock(0, 6.6, -20, 6.8, 1.4, 2.0);    // Massive Architrave Lintel
makeGateBlock(0, 7.5, -20, 5.2, 0.6, 2.2);    // Stepped Upper Crown

// Heavy Reinforced Ancient Doors
function makeDoor(x) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 5.2, 0.45),
    doorMaterial
  );
  door.position.set(x, 2.6, -20);
  door.castShadow = true;
  door.receiveShadow = true;
  gate.add(door);
  return door;
}

const leftDoor = makeDoor(-1);
const rightDoor = makeDoor(1);

// Mysterious Glowing Sun/Rune Emblem
const gateSymbol = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.72),
  new THREE.MeshStandardMaterial({
    color: 0xffd042,
    emissive: 0xff8c00,
    emissiveIntensity: 2.8,
    metalness: 0.8,
    roughness: 0.15
  })
);
gateSymbol.position.set(0, 3.8, -19.9);
gate.add(gateSymbol);

// Stone Braziers with Warm Flickering Fire Lights on each side of the gate
function createBrazier(x, z) {
  const brazierGroup = new THREE.Group();
  brazierGroup.position.set(x, 0, z);

  // Stone Pedestal
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1.8, 12),
    stoneMaterial
  );
  stand.position.y = 0.9;
  stand.castShadow = true;
  stand.receiveShadow = true;
  brazierGroup.add(stand);

  // Bronze Fire Bowl
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.35, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x3d3126, metalness: 0.7, roughness: 0.5 })
  );
  bowl.position.y = 1.9;
  bowl.castShadow = true;
  brazierGroup.add(bowl);

  // Glowing Embers Core
  const fireCore = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.28),
    new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff6600,
      emissiveIntensity: 3.5
    })
  );
  fireCore.position.y = 2.15;
  brazierGroup.add(fireCore);

  // Dynamic Point Light illuminating the Gate
  const fireLight = new THREE.PointLight(0xff8c26, 2.2, 14, 1.6);
  fireLight.position.y = 2.4;
  brazierGroup.add(fireLight);

  gate.add(brazierGroup);
  return { fireCore, fireLight };
}

const brazierLeft = createBrazier(-4.2, -18.8);
const brazierRight = createBrazier(4.2, -18.8);

let gateOpen = false;

// ========================================
// LOCALIZED BRAZIER HEAT EMBERS ONLY
// (NO snow-like particles across the scene!)
// ========================================

const emberCount = 30; // Ultra-sparse, localized strictly above the hot fire braziers
const emberGeo = new THREE.BufferGeometry();
const emberPositions = new Float32Array(emberCount * 3);

for (let i = 0; i < emberCount; i++) {
  const isLeft = i % 2 === 0;
  const bx = isLeft ? -4.2 : 4.2;
  emberPositions[i * 3] = bx + (Math.random() - 0.5) * 0.5;
  emberPositions[i * 3 + 1] = 2.2 + Math.random() * 1.5;
  emberPositions[i * 3 + 2] = -18.8 + (Math.random() - 0.5) * 0.5;
}

emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

const emberMat = new THREE.PointsMaterial({
  size: 0.12,
  color: 0xff8822,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending
});

const emberParticles = new THREE.Points(emberGeo, emberMat);
scene.add(emberParticles);

// ========================================
// ANCIENT ARTIFACTS
// ========================================

const artifacts = [];
let artifactsCollected = 0;

const artifactMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd54f,
  emissive: 0xff9100,
  emissiveIntensity: 2.5,
  metalness: 0.85,
  roughness: 0.2
});

function createArtifact(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 1.2, z);

  // Rotating Gem
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.52),
    artifactMaterial.clone()
  );
  gem.castShadow = true;
  group.add(gem);

  // Concentric mystical ring
  const ringGeo = new THREE.TorusGeometry(0.78, 0.04, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: 0xffa000,
    emissiveIntensity: 1.5,
    metalness: 0.9,
    roughness: 0.1
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Soft localized magical glow
  const glowLight = new THREE.PointLight(0xffaa22, 1.2, 5, 2);
  group.add(glowLight);

  group.userData = { collected: false, gem, ring, glowLight, baseX: x, baseZ: z };
  scene.add(group);
  artifacts.push(group);
}

// Preserve all 5 original artifact coordinates
createArtifact(0, -4);
createArtifact(-12, -5);
createArtifact(12, -10);
createArtifact(0, -16);
createArtifact(15, 5);

// ========================================
// CINEMATIC HUD
// ========================================

// Title
const title = document.createElement('div');
title.textContent = 'UNTOLD: THE LOST CITY';

Object.assign(title.style, {
  position: 'fixed',
  top: '22px',
  left: '0',
  width: '100%',
  textAlign: 'center',
  color: '#fdfbf7',
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: 'clamp(22px, 3.8vw, 36px)',
  fontWeight: '700',
  letterSpacing: '8px',
  textShadow: '0 4px 18px rgba(0, 0, 0, 0.9), 0 0 12px rgba(220, 170, 80, 0.35)',
  pointerEvents: 'none',
  zIndex: '10'
});
document.body.appendChild(title);

// Artifact Counter Panel
const artifactCounter = document.createElement('div');
Object.assign(artifactCounter.style, {
  position: 'fixed',
  top: '78px',
  left: '24px',
  color: '#ffd56b',
  fontSize: '17px',
  fontFamily: "'Outfit', sans-serif",
  fontWeight: '600',
  letterSpacing: '1px',
  textShadow: '0 2px 8px rgba(0,0,0,0.85)',
  zIndex: '10',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});
artifactCounter.innerHTML = `<span style="font-size:22px;">◈</span> Ancient Artifacts: 0 / 5`;
document.body.appendChild(artifactCounter);

// Mission Panel
const missionPanel = document.createElement('div');
Object.assign(missionPanel.style, {
  position: 'fixed',
  top: '118px',
  left: '24px',
  maxWidth: '310px',
  padding: '16px 20px',
  background: 'rgba(13, 19, 28, 0.82)',
  backdropFilter: 'blur(12px)',
  webkitBackdropFilter: 'blur(12px)',
  color: '#e2dad0',
  border: '1px solid rgba(212, 175, 85, 0.4)',
  borderRadius: '10px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(212, 175, 85, 0.08)',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '14px',
  lineHeight: '1.65',
  zIndex: '10'
});

missionPanel.innerHTML =
  '<strong style="color:#ffd56b; font-family:\'Cinzel\',serif; letter-spacing:1px; font-size:15px;">FIRST MISSION</strong><br>' +
  '<span style="color:#b0a89a;">Explore the forgotten ruins of the city.<br>Recover all 5 ancient relics to unseal the monumental gate.</span>';

document.body.appendChild(missionPanel);

// ========================================
// COLLISION DETECTION SYSTEM
// ========================================

const obstacles = [];

function addObstacle(x, z, width, depth, isGate = false) {
  obstacles.push({
    minX: x - width / 2 - 0.6,
    maxX: x + width / 2 + 0.6,
    minZ: z - depth / 2 - 0.6,
    maxZ: z + depth / 2 + 0.6,
    isGate
  });
}

// Building collisions (100% identical to original coordinates & dimensions)
addObstacle(-5, -5, 3, 3);
addObstacle(5, -8, 4, 3);
addObstacle(-9, -12, 3, 3);
addObstacle(9, -3, 3, 3);

addObstacle(-14, -4, 5, 5);
addObstacle(14, -7, 5, 5);

addObstacle(-15, -17, 6, 5);
addObstacle(15, -18, 6, 5);

addObstacle(-7, -24, 5, 5);
addObstacle(8, -27, 6, 5);

addObstacle(-18, -30, 7, 6);
addObstacle(18, -32, 7, 6);

addObstacle(-10, -38, 6, 5);
addObstacle(11, -40, 7, 6);

// Pillar collisions
for (let i = 0; i < 6; i++) {
  addObstacle(-3 + i * 1.5, -10, 1, 1);
}

// Gate entrance collision
addObstacle(0, -20, 4, 1.5, true);

function canMoveTo(x, z) {
  return !obstacles.some((o) => {
    if (o.isGate && gateOpen) {
      return false;
    }
    return x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ;
  });
}

// ========================================
// PLAYER CONTROLS & CAMERA
// ========================================

const keys = {};

let cameraAngle = 0;
let cameraVerticalAngle = 0;
const minCameraVerticalAngle = -0.35;
const maxCameraVerticalAngle = 1.3;
const cameraDistance = 6.6;
const cameraHeight = 2.7;

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === renderer.domElement) {
    cameraAngle -= event.movementX * 0.0028;
    cameraVerticalAngle -= event.movementY * 0.0028;
    cameraVerticalAngle = Math.max(
      minCameraVerticalAngle,
      Math.min(maxCameraVerticalAngle, cameraVerticalAngle)
    );
  }
});

let verticalVelocity = 0;
const gravity = 0.018;
const jumpStrength = 0.32;
let isGrounded = true;

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.code === 'Space' || event.key.startsWith('Arrow')) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

// ========================================
// EXPLORER CHARACTER (MIXAMO FBX / FALLBACK)
// ========================================

const clock = new THREE.Clock();

const player = new THREE.Group();
player.position.set(0, 0, 5);
scene.add(player);

// ── Adventurer outfit palette (used by both the fallback and the FBX) ────────
const skinMat    = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.72, metalness: 0 });
const hairMat    = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.85, metalness: 0 });
const jacketMat  = new THREE.MeshStandardMaterial({ color: 0x6b7a4e, roughness: 0.82, metalness: 0 });
const trousersMat= new THREE.MeshStandardMaterial({ color: 0x9e8c65, roughness: 0.88, metalness: 0 });
const bootsMat   = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.75, metalness: 0.05 });
const beltMat    = new THREE.MeshStandardMaterial({ color: 0x2e1e12, roughness: 0.70, metalness: 0.1 });

// ── Procedural human fallback visible while the FBX loads ────────────────────
function buildFallbackHuman() {
  const g = new THREE.Group();
  function part(geo, mat, px, py, pz, rx=0, ry=0, rz=0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  part(new THREE.SphereGeometry(0.13,16,12),     skinMat,    0,  1.68, 0);          // head
  part(new THREE.SphereGeometry(0.135,16,8,0,Math.PI*2,0,Math.PI*0.55), hairMat, 0, 1.72, 0); // hair
  part(new THREE.CylinderGeometry(0.055,0.065,0.12,10), skinMat, 0, 1.545, 0);     // neck
  part(new THREE.BoxGeometry(0.34,0.48,0.2),    jacketMat,  0,  1.24, 0);          // torso
  part(new THREE.BoxGeometry(0.34,0.05,0.21),   beltMat,    0,  1.00, 0);          // belt
  part(new THREE.CylinderGeometry(0.055,0.05,0.28,10), jacketMat, -0.215,1.27,0, 0,0, 0.18); // L upper arm
  part(new THREE.CylinderGeometry(0.045,0.04,0.27,10), skinMat,  -0.285,1.02,0, 0,0, 0.15); // L forearm
  part(new THREE.SphereGeometry(0.04,10,8),     skinMat,   -0.32, 0.87, 0);        // L hand
  part(new THREE.CylinderGeometry(0.055,0.05,0.28,10), jacketMat,  0.215,1.27,0, 0,0,-0.18); // R upper arm
  part(new THREE.CylinderGeometry(0.045,0.04,0.27,10), skinMat,   0.285,1.02,0, 0,0,-0.15); // R forearm
  part(new THREE.SphereGeometry(0.04,10,8),     skinMat,    0.32, 0.87, 0);        // R hand
  part(new THREE.BoxGeometry(0.22,0.28,0.12),   beltMat,    0,  1.22,-0.17);       // backpack
  part(new THREE.BoxGeometry(0.06,0.18,0.06),   beltMat,    0,  1.06,-0.24);       // pack pouch
  part(new THREE.CylinderGeometry(0.075,0.065,0.38,12), trousersMat, -0.1,0.73,0); // L thigh
  part(new THREE.CylinderGeometry(0.06,0.055,0.36,12),  trousersMat, -0.1,0.37,0); // L shin
  part(new THREE.BoxGeometry(0.11,0.11,0.20),   bootsMat,  -0.1, 0.08, 0.035);    // L boot
  part(new THREE.CylinderGeometry(0.075,0.065,0.38,12), trousersMat,  0.1,0.73,0); // R thigh
  part(new THREE.CylinderGeometry(0.06,0.055,0.36,12),  trousersMat,  0.1,0.37,0); // R shin
  part(new THREE.BoxGeometry(0.11,0.11,0.20),   bootsMat,   0.1, 0.08, 0.035);    // R boot
  // ground the feet
  const tmpBox = new THREE.Box3().setFromObject(g);
  g.position.y = -tmpBox.min.y;
  return g;
}

let fallbackCharacter = buildFallbackHuman();
player.add(fallbackCharacter);

const fbxLoader = new FBXLoader();
let characterMixer = null;
let walkAction = null;
let idleAction = null;
let activeAction = null;

const fbxModelPath = '/models/Start Walking.fbx';

// Build the outfit canvas texture (UV bands: hair→jacket→belt→trousers→boots)
function buildOutfitTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 1024;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#c68642'; cx.fillRect(0,0,512,1024);  // base skin
  cx.fillStyle = '#3b2314'; cx.fillRect(0,0,512,55);    // hair top
  cx.fillStyle = '#6b7a4e'; cx.fillRect(0,55,512,405);  // olive jacket
  cx.fillStyle = '#2e1e12'; cx.fillRect(0,460,512,40);  // belt
  cx.fillStyle = '#9e8c65'; cx.fillRect(0,500,512,390); // khaki trousers
  cx.fillStyle = '#3a2a1c'; cx.fillRect(0,890,512,134); // dark boots
  // cloth noise
  for (let i=0;i<3500;i++) {
    cx.fillStyle=`rgba(0,0,0,${Math.random()*0.055})`;
    cx.fillRect(Math.random()*512,Math.random()*1024,2,2);
  }
  // backpack strap lines
  cx.strokeStyle='#2e1e12'; cx.lineWidth=7; cx.globalAlpha=0.45;
  cx.beginPath(); cx.moveTo(200,70); cx.lineTo(165,410); cx.stroke();
  cx.beginPath(); cx.moveTo(312,70); cx.lineTo(347,410); cx.stroke();
  cx.globalAlpha=1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;  // FBX UVs are pre-flipped
  return tex;
}

fbxLoader.load(
  fbxModelPath,
  (fbx) => {
    // Scale to 1.80 m tall
    const bbox = new THREE.Box3().setFromObject(fbx);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.y > 0) fbx.scale.setScalar(1.80 / size.y);

    // Mixamo Beta faces +Z; rotate so it faces -Z (movement direction)
    fbx.rotation.y = Math.PI;

    // Ground feet precisely at y = 0
    const adjustedBBox = new THREE.Box3().setFromObject(fbx);
    fbx.position.y = -adjustedBBox.min.y;

    // Build the adventurer outfit material once
    const outfitMat = new THREE.MeshStandardMaterial({
      map: buildOutfitTexture(),
      roughness: 0.78,
      metalness: 0.0
    });

    // Apply materials by mesh name
    fbx.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.isMesh) return;

      if (child.name === 'Beta_Joints') {
        // Hide the grey robotic joint-sphere connectors (rigging artefact)
        child.visible = false;
        return;
      }
      // Beta_Surface = full human body + outfit; any other meshes get same mat
      child.material = outfitMat;
      child.material.needsUpdate = true;
    });

    // Animation setup
    if (fbx.animations && fbx.animations.length > 0) {
      characterMixer = new THREE.AnimationMixer(fbx);

      // Lock Hips X/Z so root-motion does not drift the character
      fbx.animations.forEach((clip) => {
        clip.tracks.forEach((track) => {
          if (track.name.endsWith('.position') && track.name.toLowerCase().includes('hips')) {
            const ix = track.values[0], iz = track.values[2];
            for (let i = 0; i < track.values.length; i += 3) {
              track.values[i] = ix;
              track.values[i + 2] = iz;
            }
          }
        });
      });

      // 'mixamo.com' = 2.17 s walk cycle; 'Take 001' = empty
      const walkClip =
        fbx.animations.find(c =>
          c.name.toLowerCase().includes('walk') ||
          c.name.toLowerCase().includes('run')  ||
          c.name.toLowerCase().includes('mixamo') ||
          c.duration > 0.5
        ) || fbx.animations[0];

      const idleClip = fbx.animations.find(c => c.name.toLowerCase().includes('idle'));

      if (walkClip) {
        walkAction = characterMixer.clipAction(walkClip);
        walkAction.play();
        walkAction.paused = true;   // standing pose at start
        activeAction = walkAction;
      }
      if (idleClip) {
        idleAction = characterMixer.clipAction(idleClip);
        idleAction.play();
        activeAction = idleAction;
      }
    }

    // Swap procedural fallback → animated FBX
    if (fallbackCharacter) {
      player.remove(fallbackCharacter);
      fallbackCharacter = null;
    }
    player.add(fbx);
    console.log('Explorer: Mixamo Beta loaded with adventurer outfit. Joints hidden.');
  },
  undefined,
  (error) => {
    console.warn('FBX failed to load; procedural human fallback remains active.', error);
  }
);

// ========================================
// WINDOW RESIZE
// ========================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========================================
// MAIN GAME & RENDER LOOP
// ========================================

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = performance.now() * 0.001;

  // Rotate camera with Q and E
  if (keys['q']) cameraAngle += 0.03;
  if (keys['e']) cameraAngle -= 0.03;

  const speed = keys['shift'] ? 0.22 : 0.12;

  // Jumping and gravity
  if (keys[' '] && isGrounded) {
    verticalVelocity = jumpStrength;
    isGrounded = false;
  }

  if (!isGrounded) {
    verticalVelocity -= gravity;
    player.position.y += verticalVelocity;

    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalVelocity = 0;
      isGrounded = true;
    }
  }

  // Directional movement relative to camera orientation
  let moveX = 0;
  let moveZ = 0;

  if (keys['w'] || keys['arrowup']) moveZ -= speed;
  if (keys['s'] || keys['arrowdown']) moveZ += speed;
  if (keys['a'] || keys['arrowleft']) moveX -= speed;
  if (keys['d'] || keys['arrowright']) moveX += speed;

  const length = Math.hypot(moveX, moveZ);
  if (length > 0) {
    moveX = (moveX / length) * speed;
    moveZ = (moveZ / length) * speed;
  }

  // Collision checks
  const nextX = player.position.x + moveX;
  if (canMoveTo(nextX, player.position.z)) {
    player.position.x = nextX;
  }

  const nextZ = player.position.z + moveZ;
  if (canMoveTo(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }

  // Face movement direction
  if (Math.hypot(moveX, moveZ) > 0) {
    player.rotation.y = Math.atan2(-moveX, -moveZ);
  }

  // Animate explorer character
  const isMoving = Math.hypot(moveX, moveZ) > 0.001;

  if (characterMixer) {
    if (walkAction) {
      if (isMoving) {
        if (idleAction && activeAction !== walkAction) {
          idleAction.fadeOut(0.2);
          walkAction.reset().fadeIn(0.2).play();
          activeAction = walkAction;
        } else {
          walkAction.paused = false;
        }
        walkAction.timeScale = keys['shift'] ? 1.5 : 1.1;
      } else {
        if (idleAction && activeAction !== idleAction) {
          walkAction.fadeOut(0.2);
          idleAction.reset().fadeIn(0.2).play();
          activeAction = idleAction;
        } else if (!idleAction) {
          walkAction.paused = true;
          walkAction.time = 0;
        }
      }
    }
    characterMixer.update(delta);
  }

  // Smooth cinematic third-person camera follow
  const horizontalDistance = cameraDistance * Math.cos(cameraVerticalAngle);
  const targetX = player.position.x - Math.sin(cameraAngle) * horizontalDistance;
  const targetZ = player.position.z + Math.cos(cameraAngle) * horizontalDistance;
  const targetY = player.position.y + cameraHeight + Math.sin(cameraVerticalAngle) * cameraDistance;

  camera.position.x += (targetX - camera.position.x) * 0.12;
  camera.position.z += (targetZ - camera.position.z) * 0.12;
  camera.position.y += (targetY - camera.position.y) * 0.12;

  camera.lookAt(player.position.x, player.position.y + 1.25, player.position.z);

  // Animate ancient artifacts (rotation, floating bob, collection)
  for (const artifact of artifacts) {
    if (artifact.userData.collected) continue;

    const gem = artifact.userData.gem;
    const ring = artifact.userData.ring;

    gem.rotation.y += 0.025;
    gem.rotation.x += 0.012;

    ring.rotation.z += 0.018;
    ring.rotation.x = Math.PI / 2 + Math.sin(time * 2.5) * 0.15;

    artifact.position.y = 1.2 + Math.sin(time * 3 + artifact.position.x) * 0.16;

    const distance = Math.hypot(
      player.position.x - artifact.position.x,
      player.position.z - artifact.position.z
    );

    if (distance < 1.3) {
      artifact.userData.collected = true;
      scene.remove(artifact);
      artifactsCollected++;

      artifactCounter.innerHTML = `<span style="font-size:22px; color:#ffde7a;">◈</span> Ancient Artifacts: ${artifactsCollected} / ${artifacts.length}`;

      if (artifactsCollected === artifacts.length) {
        gateOpen = true;
        missionPanel.innerHTML =
          '<strong style="color:#7CFC98; font-family:\'Cinzel\',serif; letter-spacing:1px; font-size:15px;">MISSION COMPLETE!</strong><br>' +
          '<span style="color:#ffffff;">All 5 ancient relics have been gathered.<br>The Monumental Gate is opening!</span>';
        console.log('THE LOST CITY GATE IS OPENING!');
      } else {
        missionPanel.innerHTML =
          '<strong style="color:#ffd56b; font-family:\'Cinzel\',serif; letter-spacing:1px; font-size:15px;">FIRST MISSION</strong><br>' +
          `<span style="color:#b0a89a;">Explore the forgotten ruins.<br>Relics found: ${artifactsCollected} / ${artifacts.length}</span>`;
      }
    }
  }

  // Gate braziers fire flickering
  brazierLeft.fireLight.intensity = 2.0 + Math.sin(time * 12) * 0.35 + Math.cos(time * 22) * 0.2;
  brazierRight.fireLight.intensity = 2.0 + Math.cos(time * 14) * 0.35 + Math.sin(time * 19) * 0.2;

  // Wall lanterns subtle warm flickering
  for (let i = 0; i < lanterns.length; i++) {
    const l = lanterns[i];
    l.light.intensity = l.baseIntensity + Math.sin(time * 10 + i * 2.3) * 0.25;
  }

  // Localized brazier heat ember sparks drifting upward
  const emberArr = emberParticles.geometry.attributes.position.array;
  for (let i = 0; i < emberCount; i++) {
    emberArr[i * 3 + 1] += 0.015; // Drift upward
    emberArr[i * 3] += (Math.random() - 0.5) * 0.006;

    // Reset when rising above brazier
    if (emberArr[i * 3 + 1] > 3.8) {
      const isLeft = i % 2 === 0;
      const bx = isLeft ? -4.2 : 4.2;
      emberArr[i * 3] = bx + (Math.random() - 0.5) * 0.4;
      emberArr[i * 3 + 1] = 2.15 + Math.random() * 0.2;
      emberArr[i * 3 + 2] = -18.8 + (Math.random() - 0.5) * 0.4;
    }
  }
  emberParticles.geometry.attributes.position.needsUpdate = true;

  // Open the gate when all relics are recovered
  if (gateOpen) {
    leftDoor.position.x = THREE.MathUtils.lerp(leftDoor.position.x, -3.5, 0.04);
    rightDoor.position.x = THREE.MathUtils.lerp(rightDoor.position.x, 3.5, 0.04);
    gateSymbol.material.emissiveIntensity = 2.8 + Math.sin(time * 6) * 1.2;
    gateSymbol.rotation.z += 0.03;
  }

  renderer.render(scene, camera);
}

// Start the game loop
animate();
