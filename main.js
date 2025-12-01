import * as THREE from 'three';

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

const FACE_LABELS = ['SHOP', 'EXPERIENCE', 'NEWS', 'ABOUT', 'CONTACT', 'PORTFOLIO'];

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
camera.position.z = 5;

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

// Build the 3x3x3 cube structure
for (let x = 0; x < SEGMENTS; x++) {
  for (let y = 0; y < SEGMENTS; y++) {
    for (let z = 0; z < SEGMENTS; z++) {
      // Only create outer cubes (skip internal)
      const isEdge = x === 0 || x === SEGMENTS - 1 ||
                     y === 0 || y === SEGMENTS - 1 ||
                     z === 0 || z === SEGMENTS - 1;
      if (!isEdge) continue;

      const isCenterFace = (seg) => seg === 1;
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
// RUBIK'S STYLE ROTATION ANIMATION
// ============================================
let isAnimating = false;
const rotationGroup = new THREE.Group();
scene.add(rotationGroup);

// Rotate a slice of the cube (Rubik's style)
function rotateSlice(axis, index, direction = 1) {
  return new Promise((resolve) => {
    if (isAnimating) {
      resolve();
      return;
    }
    isAnimating = true;

    // Find cubes in this slice
    const sliceCubes = smallCubes.filter(cube => {
      const pos = cube.userData;
      if (axis === 'x') return pos.x === index;
      if (axis === 'y') return pos.y === index;
      if (axis === 'z') return pos.z === index;
    });

    // Move to rotation group
    sliceCubes.forEach(cube => {
      cubeGroup.remove(cube);
      rotationGroup.add(cube);
    });

    // Animate rotation
    const targetRotation = (Math.PI / 2) * direction;
    const duration = 600;
    const start = performance.now();

    function animate() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeInOutCubic for smoother start and end
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (axis === 'x') rotationGroup.rotation.x = targetRotation * eased;
      if (axis === 'y') rotationGroup.rotation.y = targetRotation * eased;
      if (axis === 'z') rotationGroup.rotation.z = targetRotation * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Apply rotation to individual cubes and return to main group
        sliceCubes.forEach(cube => {
          cube.position.applyEuler(rotationGroup.rotation);
          cube.rotation.x += rotationGroup.rotation.x;
          cube.rotation.y += rotationGroup.rotation.y;
          cube.rotation.z += rotationGroup.rotation.z;

          // Update userData position
          const roundedPos = {
            x: Math.round(cube.position.x / (SEGMENT_SIZE + GAP) + 1),
            y: Math.round(cube.position.y / (SEGMENT_SIZE + GAP) + 1),
            z: Math.round(cube.position.z / (SEGMENT_SIZE + GAP) + 1),
          };
          cube.userData = roundedPos;

          rotationGroup.remove(cube);
          cubeGroup.add(cube);
        });

        rotationGroup.rotation.set(0, 0, 0);
        isAnimating = false;
        resolve();
      }
    }

    animate();
  });
}

// Perform random Rubik's shuffles as a transition effect
async function rubiksShuffle(count = 3) {
  const axes = ['x', 'y', 'z'];
  for (let i = 0; i < count; i++) {
    const axis = axes[Math.floor(Math.random() * 3)];
    const index = Math.floor(Math.random() * SEGMENTS);
    const direction = Math.random() > 0.5 ? 1 : -1;
    await rotateSlice(axis, index, direction);
  }
}

// ============================================
// DRAG CONTROLS
// ============================================
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let autoRotate = true;

container.addEventListener('pointerdown', (e) => {
  isDragging = true;
  autoRotate = false;
  previousMousePosition = { x: e.clientX, y: e.clientY };
  velocity = { x: 0, y: 0 };
});

container.addEventListener('pointermove', (e) => {
  if (!isDragging) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = e.clientY - previousMousePosition.y;

  targetRotation.y += deltaX * 0.005;
  targetRotation.x += deltaY * 0.005;

  velocity.x = deltaY * 0.005;
  velocity.y = deltaX * 0.005;

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

container.addEventListener('pointerup', () => {
  isDragging = false;
  // Re-enable auto rotate after 3 seconds of no interaction
  setTimeout(() => {
    if (!isDragging) autoRotate = true;
  }, 3000);
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

async function navigateToFace(faceIndex) {
  if (isAnimating) return;

  autoRotate = false;

  // Do a quick Rubik's shuffle for visual flair
  await rubiksShuffle(2);

  // Then rotate the whole cube to show the face
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
function animate() {
  requestAnimationFrame(animate);

  // Smooth rotation interpolation
  const lerpFactor = 0.03;

  if (autoRotate && !isDragging) {
    targetRotation.y += 0.003;
  }

  // Apply momentum when not dragging
  if (!isDragging) {
    targetRotation.x += velocity.x;
    targetRotation.y += velocity.y;
    velocity.x *= 0.95;
    velocity.y *= 0.95;
  }

  currentRotation.x += (targetRotation.x - currentRotation.x) * lerpFactor;
  currentRotation.y += (targetRotation.y - currentRotation.y) * lerpFactor;

  cubeGroup.rotation.x = currentRotation.x;
  cubeGroup.rotation.y = currentRotation.y;

  renderer.render(scene, camera);
}

animate();

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial shuffle for visual interest
setTimeout(() => rubiksShuffle(3), 500);
