import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ============================================
// CONFIGURATION
// ============================================
const COLORS = [
  0xff6b6b, // Shop - coral red
  0x4ecdc4, // Experience - teal
  0xffe66d, // News - yellow
  0x95e1d3, // About - mint
  0xdda0dd, // Contact - plum
  0x74b9ff, // Portfolio - sky blue
];

// Rubik's cube face colors (standard scheme)
// Order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
const RUBIKS_COLORS = [
  0x0000ff, // Blue (right +X)
  0x87ceeb, // Light blue (left -X)
  0xff0000, // Red (top +Y)
  0xff8c00, // Orange (bottom -Y)
  0xffcc00, // Yellow-orange (front +Z)
  0xffffff, // White (back -Z)
];

const FACE_LABELS = ['WHY?', 'WHAT?', 'HOW?', 'WHERE?', 'WHEN?', 'WHO?'];

// Cube is made of 3x3x3 = 27 smaller cubes for Rubik's effect
const SEGMENTS = 3;
const GAP = 0.02;
const CUBE_SIZE = 2;
const SEGMENT_SIZE = (CUBE_SIZE - GAP * (SEGMENTS - 1)) / SEGMENTS;
const BEVEL_SIZE = 0.06;

// ============================================
// SCENE SETUP
// ============================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// Adjust camera distance based on screen size to keep cube centered and sized well
function updateCameraForScreenSize() {
  const aspect = window.innerWidth / window.innerHeight;
  const minDimension = Math.min(window.innerWidth, window.innerHeight);

  // On narrow screens (mobile portrait), move camera back
  if (aspect < 1) {
    camera.position.z = 6.5;
  } else if (minDimension < 500) {
    // Landscape mobile - screen is short, bring camera closer
    camera.position.z = 4;
  } else {
    camera.position.z = 5;
  }
}
updateCameraForScreenSize();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ============================================
// POST-PROCESSING
// ============================================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom pass (10%)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.1,   // strength (10%)
  0.4,   // radius
  0.85   // threshold
);
bloomPass.enabled = false; // Only enable in dark mode
composer.addPass(bloomPass);

// Chromatic aberration shader - subtle, 5%
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.012 } // 40% effect
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      // Only apply effect near the center where the cube is
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);
      float mask = smoothstep(0.5, 0.15, dist); // Fade in toward center

      vec2 dir = vUv - center;
      float effectAmount = amount * mask;

      vec4 cr = texture2D(tDiffuse, vUv + dir * effectAmount);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv - dir * effectAmount);

      gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
    }
  `
};

const chromaticPass = new ShaderPass(ChromaticAberrationShader);
chromaticPass.enabled = false;
composer.addPass(chromaticPass);



// ============================================
// CREATE RUBIK'S CUBE
// ============================================
const cubeGroup = new THREE.Group();
const smallCubes = [];

// Create beveled box geometry (flat chamfer)
function createBeveledBox(width, height, depth, bevel) {
  const hw = width / 2, hh = height / 2, hd = depth / 2;
  const b = bevel;

  // Vertices for a box with flat beveled edges
  const vertices = [];
  const indices = [];
  const normals = [];
  const uvs = [];

  // Helper to add a quad
  let vertexIndex = 0;
  function addQuad(v0, v1, v2, v3, normal) {
    const startIndex = vertexIndex;
    vertices.push(...v0, ...v1, ...v2, ...v3);
    normals.push(...normal, ...normal, ...normal, ...normal);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(startIndex, startIndex + 1, startIndex + 2);
    indices.push(startIndex, startIndex + 2, startIndex + 3);
    vertexIndex += 4;
  }

  // Main faces (inset by bevel)
  // Front (+Z)
  addQuad(
    [-hw + b, -hh + b, hd], [hw - b, -hh + b, hd], [hw - b, hh - b, hd], [-hw + b, hh - b, hd],
    [0, 0, 1]
  );
  // Back (-Z)
  addQuad(
    [hw - b, -hh + b, -hd], [-hw + b, -hh + b, -hd], [-hw + b, hh - b, -hd], [hw - b, hh - b, -hd],
    [0, 0, -1]
  );
  // Right (+X)
  addQuad(
    [hw, -hh + b, hd - b], [hw, -hh + b, -hd + b], [hw, hh - b, -hd + b], [hw, hh - b, hd - b],
    [1, 0, 0]
  );
  // Left (-X)
  addQuad(
    [-hw, -hh + b, -hd + b], [-hw, -hh + b, hd - b], [-hw, hh - b, hd - b], [-hw, hh - b, -hd + b],
    [-1, 0, 0]
  );
  // Top (+Y)
  addQuad(
    [-hw + b, hh, hd - b], [hw - b, hh, hd - b], [hw - b, hh, -hd + b], [-hw + b, hh, -hd + b],
    [0, 1, 0]
  );
  // Bottom (-Y)
  addQuad(
    [-hw + b, -hh, -hd + b], [hw - b, -hh, -hd + b], [hw - b, -hh, hd - b], [-hw + b, -hh, hd - b],
    [0, -1, 0]
  );

  // Bevel edges (12 edges)
  const bevelNorm = Math.SQRT1_2;

  // Front top edge
  addQuad(
    [-hw + b, hh - b, hd], [hw - b, hh - b, hd], [hw - b, hh, hd - b], [-hw + b, hh, hd - b],
    [0, bevelNorm, bevelNorm]
  );
  // Front bottom edge
  addQuad(
    [-hw + b, -hh, hd - b], [hw - b, -hh, hd - b], [hw - b, -hh + b, hd], [-hw + b, -hh + b, hd],
    [0, -bevelNorm, bevelNorm]
  );
  // Front left edge
  addQuad(
    [-hw, -hh + b, hd - b], [-hw, hh - b, hd - b], [-hw + b, hh - b, hd], [-hw + b, -hh + b, hd],
    [-bevelNorm, 0, bevelNorm]
  );
  // Front right edge
  addQuad(
    [hw - b, -hh + b, hd], [hw - b, hh - b, hd], [hw, hh - b, hd - b], [hw, -hh + b, hd - b],
    [bevelNorm, 0, bevelNorm]
  );

  // Back top edge
  addQuad(
    [hw - b, hh - b, -hd], [-hw + b, hh - b, -hd], [-hw + b, hh, -hd + b], [hw - b, hh, -hd + b],
    [0, bevelNorm, -bevelNorm]
  );
  // Back bottom edge
  addQuad(
    [hw - b, -hh, -hd + b], [-hw + b, -hh, -hd + b], [-hw + b, -hh + b, -hd], [hw - b, -hh + b, -hd],
    [0, -bevelNorm, -bevelNorm]
  );
  // Back left edge
  addQuad(
    [-hw + b, -hh + b, -hd], [-hw + b, hh - b, -hd], [-hw, hh - b, -hd + b], [-hw, -hh + b, -hd + b],
    [-bevelNorm, 0, -bevelNorm]
  );
  // Back right edge
  addQuad(
    [hw, -hh + b, -hd + b], [hw, hh - b, -hd + b], [hw - b, hh - b, -hd], [hw - b, -hh + b, -hd],
    [bevelNorm, 0, -bevelNorm]
  );

  // Top left edge
  addQuad(
    [-hw, hh - b, -hd + b], [-hw, hh - b, hd - b], [-hw + b, hh, hd - b], [-hw + b, hh, -hd + b],
    [-bevelNorm, bevelNorm, 0]
  );
  // Top right edge
  addQuad(
    [hw - b, hh, -hd + b], [hw - b, hh, hd - b], [hw, hh - b, hd - b], [hw, hh - b, -hd + b],
    [bevelNorm, bevelNorm, 0]
  );
  // Bottom left edge
  addQuad(
    [-hw + b, -hh, -hd + b], [-hw + b, -hh, hd - b], [-hw, -hh + b, hd - b], [-hw, -hh + b, -hd + b],
    [-bevelNorm, -bevelNorm, 0]
  );
  // Bottom right edge
  addQuad(
    [hw, -hh + b, -hd + b], [hw, -hh + b, hd - b], [hw - b, -hh, hd - b], [hw - b, -hh, -hd + b],
    [bevelNorm, -bevelNorm, 0]
  );

  // 8 corner bevels (triangular)
  const cornerNorm = 1 / Math.sqrt(3);
  function addTriangle(v0, v1, v2, normal) {
    const startIndex = vertexIndex;
    vertices.push(...v0, ...v1, ...v2);
    normals.push(...normal, ...normal, ...normal);
    uvs.push(0, 0, 1, 0, 0.5, 1);
    indices.push(startIndex, startIndex + 1, startIndex + 2);
    vertexIndex += 3;
  }

  // Front top right
  addTriangle([hw - b, hh - b, hd], [hw, hh - b, hd - b], [hw - b, hh, hd - b], [cornerNorm, cornerNorm, cornerNorm]);
  // Front top left
  addTriangle([-hw + b, hh, hd - b], [-hw, hh - b, hd - b], [-hw + b, hh - b, hd], [-cornerNorm, cornerNorm, cornerNorm]);
  // Front bottom right
  addTriangle([hw - b, -hh, hd - b], [hw, -hh + b, hd - b], [hw - b, -hh + b, hd], [cornerNorm, -cornerNorm, cornerNorm]);
  // Front bottom left
  addTriangle([-hw + b, -hh + b, hd], [-hw, -hh + b, hd - b], [-hw + b, -hh, hd - b], [-cornerNorm, -cornerNorm, cornerNorm]);
  // Back top right
  addTriangle([hw - b, hh, -hd + b], [hw, hh - b, -hd + b], [hw - b, hh - b, -hd], [cornerNorm, cornerNorm, -cornerNorm]);
  // Back top left
  addTriangle([-hw + b, hh - b, -hd], [-hw, hh - b, -hd + b], [-hw + b, hh, -hd + b], [-cornerNorm, cornerNorm, -cornerNorm]);
  // Back bottom right
  addTriangle([hw - b, -hh + b, -hd], [hw, -hh + b, -hd + b], [hw - b, -hh, -hd + b], [cornerNorm, -cornerNorm, -cornerNorm]);
  // Back bottom left
  addTriangle([-hw + b, -hh, -hd + b], [-hw, -hh + b, -hd + b], [-hw + b, -hh + b, -hd], [-cornerNorm, -cornerNorm, -cornerNorm]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

// Create texture with text for each face
function createFaceTexture(label, color, transparent = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (transparent) {
    // Transparent with subtle border
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 236);
  } else {
    // Solid color background
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
  }

  // Text (only on center segments)
  ctx.fillStyle = transparent ? `#${color.toString(16).padStart(6, '0')}` : 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 36px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create materials for each face
// Order: +X, -X, +Y, -Y, +Z, -Z
function createMaterials(isCenter = false) {
  return COLORS.map((color, i) => {
    if (isCenter) {
      return new THREE.MeshStandardMaterial({
        map: createFaceTexture(FACE_LABELS[i], color),
        roughness: 0.3,
        metalness: 0.1,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.1,
    });
  });
}

// Create a colored dot geometry (extruded cylinder)
const dotRadius = SEGMENT_SIZE * 0.018;
const dotHeight = SEGMENT_SIZE * 0.015;
const dotGeometry = new THREE.CylinderGeometry(dotRadius, dotRadius, dotHeight, 16);

// Helper to create a dot with wireframe outline
function createDot(color, faceIndex) {
  const group = new THREE.Group();
  group.userData.isDot = true;
  group.userData.colorHex = color;
  group.userData.faceIndex = faceIndex; // Which face this dot belongs to originally

  // Extruded dot (cylinder rotated to face outward)
  const dot = new THREE.Mesh(dotGeometry, new THREE.MeshBasicMaterial({ color }));
  dot.rotation.x = Math.PI / 2; // Point cylinder outward
  dot.position.z = dotHeight / 2;

  // Wireframe outline for the dot
  const edges = new THREE.EdgesGeometry(dotGeometry, 15);
  const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  outline.rotation.x = Math.PI / 2;
  outline.position.z = dotHeight / 2;

  group.add(dot);
  group.add(outline);
  return group;
}

// Build the 3x3x3 cube structure
for (let x = 0; x < SEGMENTS; x++) {
  for (let y = 0; y < SEGMENTS; y++) {
    for (let z = 0; z < SEGMENTS; z++) {
      // Only create outer cubes (skip internal)
      const isEdge = x === 0 || x === SEGMENTS - 1 ||
                     y === 0 || y === SEGMENTS - 1 ||
                     z === 0 || z === SEGMENTS - 1;
      if (!isEdge) continue;

      const cubeSize = SEGMENT_SIZE * 0.98;
      const geometry = createBeveledBox(cubeSize, cubeSize, cubeSize, BEVEL_SIZE);

      // Single transparent material with colored edges
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        roughness: 0.1,
        metalness: 0.1,
        clearcoat: 0.3,
        side: THREE.DoubleSide,
      });

      const cube = new THREE.Mesh(geometry, material);

      // Clean white edge lines
      const edges = new THREE.EdgesGeometry(geometry, 15);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      cube.add(wireframe);

      // Add colored dots to outer faces
      const halfSize = cubeSize / 2;
      const dotOffset = halfSize * 0.55; // Position in top-right area of face
      const dotZ = 0.001; // Slight offset to prevent z-fighting

      // +X face (right) - blue (face 0)
      if (x === SEGMENTS - 1) {
        const dot = createDot(RUBIKS_COLORS[0], 0);
        dot.position.set(halfSize + dotZ, dotOffset, -dotOffset);
        dot.rotation.y = Math.PI / 2;
        cube.add(dot);
      }
      // -X face (left) - light blue (face 1)
      if (x === 0) {
        const dot = createDot(RUBIKS_COLORS[1], 1);
        dot.position.set(-halfSize - dotZ, dotOffset, dotOffset);
        dot.rotation.y = -Math.PI / 2;
        cube.add(dot);
      }
      // +Y face (top) - red (face 2)
      if (y === SEGMENTS - 1) {
        const dot = createDot(RUBIKS_COLORS[2], 2);
        dot.position.set(dotOffset, halfSize + dotZ, -dotOffset);
        dot.rotation.x = -Math.PI / 2;
        cube.add(dot);
      }
      // -Y face (bottom) - orange (face 3)
      if (y === 0) {
        const dot = createDot(RUBIKS_COLORS[3], 3);
        dot.position.set(dotOffset, -halfSize - dotZ, dotOffset);
        dot.rotation.x = Math.PI / 2;
        cube.add(dot);
      }
      // +Z face (front) - yellow (face 4)
      if (z === SEGMENTS - 1) {
        const dot = createDot(RUBIKS_COLORS[4], 4);
        dot.position.set(dotOffset, dotOffset, halfSize + dotZ);
        cube.add(dot);
      }
      // -Z face (back) - white (face 5)
      if (z === 0) {
        const dot = createDot(RUBIKS_COLORS[5], 5);
        dot.position.set(-dotOffset, dotOffset, -halfSize - dotZ);
        dot.rotation.y = Math.PI;
        cube.add(dot);
      }

      // Position
      const offset = (SEGMENTS - 1) / 2;
      cube.position.set(
        (x - offset) * (SEGMENT_SIZE + GAP),
        (y - offset) * (SEGMENT_SIZE + GAP),
        (z - offset) * (SEGMENT_SIZE + GAP)
      );

      cube.userData = { x, y, z };
      smallCubes.push(cube);
      cubeGroup.add(cube);
    }
  }
}

scene.add(cubeGroup);

// ============================================
// INTRO ANIMATION - Cubes explode in
// ============================================
let introComplete = false;

function playIntroAnimation() {
  const duration = 2000; // 2 seconds
  const staggerDelay = 50; // delay between each cube starting
  const start = performance.now();

  // Store target positions and set random start positions
  smallCubes.forEach((cube, i) => {
    // Store the final position
    cube.userData.targetPos = cube.position.clone();
    cube.userData.targetRot = cube.quaternion.clone();

    // Random start position - scattered around
    const spread = 8;
    cube.position.set(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread - 5 // Bias toward camera
    );

    // Random start rotation
    cube.quaternion.setFromEuler(new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    ));

    // Store start position for interpolation
    cube.userData.startPos = cube.position.clone();
    cube.userData.startRot = cube.quaternion.clone();
    cube.userData.delay = i * staggerDelay;
  });

  function animateIntro() {
    const elapsed = performance.now() - start;

    let allDone = true;

    smallCubes.forEach((cube) => {
      const cubeElapsed = elapsed - cube.userData.delay;
      if (cubeElapsed < 0) {
        allDone = false;
        return;
      }

      const progress = Math.min(cubeElapsed / duration, 1);

      // easeOutExpo for dramatic slow-down at the end
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      // Interpolate position
      cube.position.lerpVectors(cube.userData.startPos, cube.userData.targetPos, eased);

      // Interpolate rotation
      cube.quaternion.slerpQuaternions(cube.userData.startRot, cube.userData.targetRot, eased);

      if (progress < 1) allDone = false;
    });

    if (!allDone) {
      requestAnimationFrame(animateIntro);
    } else {
      // Clean up userData
      smallCubes.forEach(cube => {
        delete cube.userData.startPos;
        delete cube.userData.startRot;
        delete cube.userData.targetPos;
        delete cube.userData.targetRot;
        delete cube.userData.delay;
      });
      introComplete = true;
      // Initialize materials to default after intro
      applyMaterialPreset(-1);
    }
  }

  requestAnimationFrame(animateIntro);
}

// Start intro after a brief delay
setTimeout(playIntroAnimation, 100);

// ============================================
// RUBIK'S STYLE ROTATION ANIMATION
// ============================================
let isAnimating = false;

// Track move history for solving
let moveHistory = [];
let isSolved = true;
let isDarkMode = false;

// Each face rotates a different slice - like turning a Rubik's cube
// This allows the cube to get properly scrambled
const faceToMove = {
  0: { axis: 'x', index: 2, direction: 1 },  // Shop - rotate right slice
  1: { axis: 'x', index: 0, direction: -1 }, // Experience - rotate left slice
  2: { axis: 'y', index: 2, direction: 1 },  // News - rotate top slice
  3: { axis: 'y', index: 0, direction: -1 }, // About - rotate bottom slice
  4: { axis: 'z', index: 2, direction: 1 },  // Contact - rotate front slice
  5: { axis: 'z', index: 0, direction: -1 }, // Portfolio - rotate back slice
};

// Opposite faces that cancel each other out
const oppositeFace = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };

// Rotate a slice of the cube (Rubik's style)
function rotateSlice(axis, index, direction = 1, recordMove = true) {
  return new Promise((resolve) => {
    if (isAnimating) {
      resolve();
      return;
    }
    isAnimating = true;

    // Record this move for potential solving
    if (recordMove) {
      moveHistory.push({ axis, index, direction });
      isSolved = false;
    }

    // Find cubes in this slice based on their grid position
    const sliceCubes = smallCubes.filter(cube => {
      const pos = cube.userData;
      if (axis === 'x') return pos.x === index;
      if (axis === 'y') return pos.y === index;
      if (axis === 'z') return pos.z === index;
    });

    // Store original positions relative to cubeGroup
    const originalPositions = sliceCubes.map(cube => cube.position.clone());
    const originalQuaternions = sliceCubes.map(cube => cube.quaternion.clone());

    // Animate rotation
    const targetAngle = (Math.PI / 2) * direction;
    const duration = 350;
    const start = performance.now();

    // Create rotation quaternion for incremental updates
    const rotationAxis = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );

    function animateSlice() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic for smooth feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentAngle = targetAngle * eased;

      // Apply rotation to each cube
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(rotationAxis, currentAngle);

      sliceCubes.forEach((cube, i) => {
        // Rotate position around origin
        cube.position.copy(originalPositions[i]).applyQuaternion(rotQuat);
        // Rotate orientation
        cube.quaternion.copy(rotQuat).multiply(originalQuaternions[i]);
      });

      if (progress < 1) {
        requestAnimationFrame(animateSlice);
      } else {
        // Snap positions to grid and update userData
        sliceCubes.forEach(cube => {
          // Round position to nearest grid slot
          const offset = (SEGMENTS - 1) / 2;
          const gridX = Math.round(cube.position.x / (SEGMENT_SIZE + GAP) + offset);
          const gridY = Math.round(cube.position.y / (SEGMENT_SIZE + GAP) + offset);
          const gridZ = Math.round(cube.position.z / (SEGMENT_SIZE + GAP) + offset);

          cube.userData = { x: gridX, y: gridY, z: gridZ };

          // Snap to exact grid position
          cube.position.set(
            (gridX - offset) * (SEGMENT_SIZE + GAP),
            (gridY - offset) * (SEGMENT_SIZE + GAP),
            (gridZ - offset) * (SEGMENT_SIZE + GAP)
          );

          // Snap quaternion to nearest 90-degree rotation
          snapQuaternion(cube.quaternion);
        });

        isAnimating = false;
        resolve();
      }
    }

    animateSlice();
  });
}

// Snap quaternion to nearest 90-degree aligned rotation
function snapQuaternion(q) {
  // Convert to euler, snap each axis to nearest 90 degrees, convert back
  const euler = new THREE.Euler().setFromQuaternion(q);
  euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
  euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
  euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
  q.setFromEuler(euler);
}

// Check if cube is solved by examining dot colors on each face
function checkIfSolved() {
  // Collect all dots and determine which outer face they're on based on world position
  const faceDots = {
    '+x': [], '-x': [],
    '+y': [], '-y': [],
    '+z': [], '-z': []
  };

  const threshold = CUBE_SIZE / 2 - 0.1; // How far from center to be considered on a face

  for (const cube of smallCubes) {
    cube.traverse((child) => {
      if (child.userData && child.userData.isDot) {
        // Get world position of this dot
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        // Determine which face this dot is on based on its world position
        if (worldPos.x > threshold) faceDots['+x'].push(child.userData.colorHex);
        else if (worldPos.x < -threshold) faceDots['-x'].push(child.userData.colorHex);
        else if (worldPos.y > threshold) faceDots['+y'].push(child.userData.colorHex);
        else if (worldPos.y < -threshold) faceDots['-y'].push(child.userData.colorHex);
        else if (worldPos.z > threshold) faceDots['+z'].push(child.userData.colorHex);
        else if (worldPos.z < -threshold) faceDots['-z'].push(child.userData.colorHex);
      }
    });
  }

  // Check each face has 9 dots of the same color
  for (const [face, colors] of Object.entries(faceDots)) {
    if (colors.length !== 9) {
      return false; // Not all dots found
    }
    const firstColor = colors[0];
    if (!colors.every(c => c === firstColor)) {
      return false; // Not all same color
    }
  }

  return true; // All faces solved!
}

let hasBeenMixed = false;

function checkForSolve() {
  if (!hasBeenMixed) {
    hasBeenMixed = true; // First move mixes it
    return false;
  }

  if (checkIfSolved()) {
    // Cube is solved! Toggle dark mode
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);

    // Enable/disable post-processing effects
    bloomPass.enabled = isDarkMode;
    chromaticPass.enabled = isDarkMode;

    // Reset materials to default when solved
    if (isDarkMode) {
      applyMaterialPreset(-1); // Apply default material
    }

    hasBeenMixed = false; // Reset so next solve can trigger
    console.log('🎉 Cube solved! Dark mode:', isDarkMode);
    return true;
  }
  return false;
}

// ============================================
// DRAG CONTROLS (Whole cube rotation)
// ============================================
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let autoRotate = false;

// Raycaster for detecting clicks on cube (for double-tap content)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getIntersectedCube(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Only check the cube meshes themselves, not children (faster)
  const intersects = raycaster.intersectObjects(smallCubes, false);

  if (intersects.length > 0) {
    return { cube: intersects[0].object, point: intersects[0].point, face: intersects[0].face };
  }

  // Also check children if direct check missed (for wireframes/dots clicked)
  const intersectsDeep = raycaster.intersectObjects(smallCubes, true);
  if (intersectsDeep.length > 0) {
    let obj = intersectsDeep[0].object;
    while (obj && !smallCubes.includes(obj)) {
      obj = obj.parent;
    }
    if (obj) {
      return { cube: obj, point: intersectsDeep[0].point, face: intersectsDeep[0].face };
    }
  }

  return null;
}

container.addEventListener('pointerdown', (e) => {
  if (isAnimating || !introComplete) return;

  previousMousePosition = { x: e.clientX, y: e.clientY };
  velocity = { x: 0, y: 0 };

  // Enable dragging anywhere on screen
  isDragging = true;
});

container.addEventListener('pointermove', (e) => {
  if (!isDragging) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = e.clientY - previousMousePosition.y;

  // Rotate whole cube
  targetRotation.y += deltaX * 0.005;
  targetRotation.x += deltaY * 0.005;

  velocity.x = deltaY * 0.005;
  velocity.y = deltaX * 0.005;

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

container.addEventListener('pointerup', () => {
  isDragging = false;
});

container.addEventListener('pointerleave', () => {
  isDragging = false;
});

// ============================================
// FACE NAVIGATION
// ============================================
// Face rotations (euler angles to show each face forward)
const faceRotations = [
  { x: 0, y: -Math.PI / 2 },      // 0: +X (Shop)
  { x: 0, y: Math.PI / 2 },       // 1: -X (Experience)
  { x: -Math.PI / 2, y: 0 },      // 2: +Y (News)
  { x: Math.PI / 2, y: 0 },       // 3: -Y (About)
  { x: 0, y: 0 },                 // 4: +Z (Contact)
  { x: 0, y: Math.PI },           // 5: -Z (Portfolio)
];

let currentFace = -1;

// Map face index to CSS variable names
const faceColorVars = [
  '--why-color',
  '--what-color',
  '--how-color',
  '--where-color',
  '--when-color',
  '--who-color'
];

// Material configurations for each category - EXTREME versions for visibility
const materialPresets = {
  0: { // Why? - Deep Blue Glass
    color: 0x4444ff,
    opacity: 0.5,
    transparent: true,
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 1.0,
    transmission: 0.0
  },
  1: { // What? - Almost Invisible
    color: 0xffffff,
    opacity: 0.05,
    transparent: true,
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 0.3,
    transmission: 0.0
  },
  2: { // How? - Solid Red Metal
    color: 0xff3333,
    opacity: 1.0,
    transparent: false,
    roughness: 0.1,
    metalness: 1.0,
    clearcoat: 1.0,
    transmission: 0.0
  },
  3: { // Where? - Solid Orange Matte
    color: 0xff8800,
    opacity: 1.0,
    transparent: false,
    roughness: 1.0,
    metalness: 0.0,
    clearcoat: 0.0,
    transmission: 0.0
  },
  4: { // When? - Bright Glowing Yellow
    color: 0xffff00,
    opacity: 1.0,
    transparent: false,
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.5,
    transmission: 0.0,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5
  },
  5: { // Who? - Rainbow Iridescent
    color: 0xffccff,
    opacity: 0.8,
    transparent: true,
    roughness: 0.0,
    metalness: 0.3,
    clearcoat: 1.0,
    transmission: 0.0,
    iridescence: 1.0,
    iridescenceIOR: 2.0
  }
};

// Default material settings
const defaultMaterial = {
  color: 0xffffff,
  opacity: 0.15,
  transparent: true,
  roughness: 0.1,
  metalness: 0.1,
  clearcoat: 0.3,
  transmission: 0.0,
  emissive: 0x000000,
  emissiveIntensity: 0,
  iridescence: 0,
  iridescenceIOR: 1.3
};

// Function to apply material preset to all cube pieces
function applyMaterialPreset(presetIndex) {
  const preset = presetIndex >= 0 ? materialPresets[presetIndex] : defaultMaterial;

  console.log('Applying material preset:', presetIndex, preset);

  smallCubes.forEach((cube, idx) => {
    const mat = cube.material;

    // Log first cube material properties before change
    if (idx === 0) {
      console.log('Before - First cube material:', {
        color: mat.color.getHex(),
        opacity: mat.opacity,
        roughness: mat.roughness,
        metalness: mat.metalness,
        transmission: mat.transmission
      });
    }

    // Set transparency mode based on preset
    mat.transparent = preset.transparent !== undefined ? preset.transparent : true;

    // Update all material properties
    mat.color.setHex(preset.color);
    mat.opacity = preset.opacity;
    mat.roughness = preset.roughness;
    mat.metalness = preset.metalness;
    mat.clearcoat = preset.clearcoat;

    // Transmission properties
    mat.transmission = preset.transmission || 0;
    mat.thickness = 1.0;
    mat.ior = 1.5;

    // Emissive properties
    mat.emissive.setHex(preset.emissive || 0x000000);
    mat.emissiveIntensity = preset.emissiveIntensity || 0;

    // Iridescence (if supported)
    if (mat.iridescence !== undefined) {
      mat.iridescence = preset.iridescence || 0;
      mat.iridescenceIOR = preset.iridescenceIOR || 1.3;
    }

    mat.needsUpdate = true;

    // Log first cube material properties after change
    if (idx === 0) {
      console.log('After - First cube material:', {
        color: mat.color.getHex(),
        opacity: mat.opacity,
        roughness: mat.roughness,
        metalness: mat.metalness,
        transmission: mat.transmission
      });
    }
  });

  console.log('Material preset applied to', smallCubes.length, 'cubes');
}

async function navigateToFace(faceIndex) {
  if (isAnimating || !introComplete) return;

  autoRotate = false;
  velocity = { x: 0, y: 0 }; // Stop any momentum

  // Perform the slice rotation
  const move = faceToMove[faceIndex];
  if (move) {
    await rotateSlice(move.axis, move.index, move.direction, false);
  }

  // Check if cube is now solved (after animation completes)
  setTimeout(() => checkForSolve(), 50);

  // Change background color to match category
  const colorVar = faceColorVars[faceIndex];
  const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
  document.body.style.backgroundColor = color;

  // Apply material preset for this category
  applyMaterialPreset(faceIndex);

  // Smoothly rotate the whole cube to show the face
  targetRotation = { ...faceRotations[faceIndex] };
  currentFace = faceIndex;

  // Update active nav button
  document.querySelectorAll('#nav button').forEach((btn, i) => {
    btn.classList.toggle('active', i === faceIndex);
  });
}

// Nav button handlers
document.querySelectorAll('#nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const faceIndex = parseInt(btn.dataset.face);
    navigateToFace(faceIndex);
  });
});

// Double-click/tap to open content
let lastTap = 0;
container.addEventListener('click', (e) => {
  const now = Date.now();
  if (now - lastTap < 300 && currentFace >= 0) {
    // Double tap - show content
    showContent(currentFace);
  }
  lastTap = now;
});

// ============================================
// CONTENT OVERLAY
// ============================================
const overlay = document.getElementById('content-overlay');
const contentInner = document.getElementById('content-inner');
const closeBtn = document.getElementById('close-content');

function showContent(faceIndex) {
  const template = document.getElementById(`face-${faceIndex}-content`);
  if (template) {
    contentInner.innerHTML = '';
    contentInner.appendChild(template.content.cloneNode(true));
    overlay.classList.remove('hidden');
  }
}

closeBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
});

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.classList.add('hidden');
  }
});

// ============================================
// ANIMATION LOOP
// ============================================
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms to prevent huge jumps
  lastTime = now;

  // Smooth rotation interpolation - use delta time for consistent speed
  const lerpFactor = 1 - Math.pow(0.001, deltaTime); // Approximately 0.1 at 60fps

  // Apply momentum when not dragging
  if (!isDragging) {
    targetRotation.x += velocity.x;
    targetRotation.y += velocity.y;
    const damping = Math.pow(0.05, deltaTime); // Frame-rate independent damping
    velocity.x *= damping;
    velocity.y *= damping;
  }

  currentRotation.x += (targetRotation.x - currentRotation.x) * lerpFactor;
  currentRotation.y += (targetRotation.y - currentRotation.y) * lerpFactor;

  cubeGroup.rotation.x = currentRotation.x;
  cubeGroup.rotation.y = currentRotation.y;

  // Use composer for post-processing
  composer.render();
}

animate();

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateCameraForScreenSize();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

// Cube starts solved - user navigation will mix it up
