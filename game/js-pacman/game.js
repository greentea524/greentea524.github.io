// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ambient and directional lighting for a dungeon feel
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Dim ambient light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(0, 5, 10);
scene.add(directionalLight);

// Pac-Man (a yellow sphere with a torch-like glow)
const pacmanGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const pacmanMaterial = new THREE.MeshPhongMaterial({
  color: 0xffff00,
  emissive: 0x886600,
  emissiveIntensity: 0.7,
}); // Bright yellow for torch effect
const pacman = new THREE.Mesh(pacmanGeometry, pacmanMaterial);
pacman.position.set(-7, 0.5, -7);
scene.add(pacman);

function addGhostEye(ghostMesh, offsetX) {
  const eyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 12),
    new THREE.MeshPhongMaterial({ color: 0xffffff }),
  );
  eyeWhite.position.set(offsetX, 0.12, 0.33);

  const eyePupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.034, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0x111111 }),
  );
  eyePupil.position.set(0, -0.01, 0.05);

  eyeWhite.add(eyePupil);
  ghostMesh.add(eyeWhite);
}

function createGhost(color) {
  const ghostMesh = new THREE.Group();
  const ghostBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 18, 18),
    new THREE.MeshPhongMaterial({
      color,
      emissive: 0x33060a,
      emissiveIntensity: 0.35,
    }),
  );
  ghostBody.scale.y = 1.08;
  ghostMesh.add(ghostBody);
  addGhostEye(ghostMesh, -0.12);
  addGhostEye(ghostMesh, 0.12);
  ghostMesh.position.set(7, 0.5, 7);
  scene.add(ghostMesh);
  return ghostMesh;
}

const mouthGroup = new THREE.Group();
mouthGroup.position.set(0, 0.53, 0.03);
pacman.add(mouthGroup);

function createMouthJaw() {
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.045, 0.34),
    new THREE.MeshPhongMaterial({
      color: 0x080808,
      emissive: 0x050505,
      emissiveIntensity: 0.35,
    }),
  );
  jaw.position.set(0, 0, 0.16);
  return jaw;
}

const upperJaw = createMouthJaw();
const lowerJaw = createMouthJaw();
mouthGroup.add(upperJaw);
mouthGroup.add(lowerJaw);

let mouthChompPhase = 0;
let mouthChompBoost = 0;

function addPacmanEye(offsetX) {
  const eyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 16),
    new THREE.MeshPhongMaterial({ color: 0xffffff }),
  );
  eyeWhite.position.set(offsetX, 0.18, 0.43);

  const eyePupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 12),
    new THREE.MeshPhongMaterial({ color: 0x111111 }),
  );
  eyePupil.position.set(0, -0.005, 0.055);

  eyeWhite.add(eyePupil);
  pacman.add(eyeWhite);
}

addPacmanEye(-0.16);
addPacmanEye(0.16);

const pacmanLight = new THREE.PointLight(0xffee88, 0.8, 6);
pacmanLight.position.set(0, 0.8, 0);
pacman.add(pacmanLight);

// Dungeon walls (stone-like texture and color)
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x666633 }); // Dull stone brown
const wallThickness = 0.4;
const mapHalfSize = 8;
const playAreaMin = -7.4;
const playAreaMax = 7.4;
const spawnX = -7;
const spawnZ = -7;
const gridMin = -Math.floor(playAreaMax);
const gridMax = Math.floor(playAreaMax);

function randomizeWallColor() {
  // Keep colors vivid but readable against the dark floor.
  const hue = Math.random();
  const saturation = randomBetween(0.35, 0.75);
  const lightness = randomBetween(0.35, 0.58);
  wallMaterial.color.setHSL(hue, saturation, lightness);
}

// Create a winding dungeon maze layout
const walls = [];
function addWall(x, y, z, width = 1, depth = 1) {
  const wallGeometry = new THREE.BoxGeometry(width, 1, depth);
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(x, y, z);
  scene.add(wall);
  wall.userData.box = new THREE.Box3().setFromObject(wall);
  walls.push(wall);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clearMazeWalls() {
  for (let i = walls.length - 1; i >= 0; i--) {
    scene.remove(walls[i]);
    walls.splice(i, 1);
  }
}

function createWallBox(x, z, width, depth, padding = 0) {
  return new THREE.Box3(
    new THREE.Vector3(x - width / 2 - padding, 0, z - depth / 2 - padding),
    new THREE.Vector3(x + width / 2 + padding, 1, z + depth / 2 + padding),
  );
}

function canPlaceWall(x, z, width, depth, padding = 0.45) {
  const candidate = createWallBox(x, z, width, depth, padding);
  const spawnSafeZone = createWallBox(spawnX, spawnZ, 2.8, 2.8, 0.25);

  if (candidate.intersectsBox(spawnSafeZone)) {
    return false;
  }

  for (let i = 0; i < walls.length; i++) {
    const expanded = walls[i].userData.box.clone().expandByScalar(padding);
    if (candidate.intersectsBox(expanded)) {
      return false;
    }
  }

  return true;
}

function tryAddMirroredWall(x, z, width, depth) {
  const mirrorX = -x;

  if (Math.abs(x) < 0.15) {
    if (!canPlaceWall(0, z, width, depth)) return false;
    addWall(0, 0.5, z, width, depth);
    return true;
  }

  if (
    !canPlaceWall(x, z, width, depth) ||
    !canPlaceWall(mirrorX, z, width, depth)
  ) {
    return false;
  }

  addWall(x, 0.5, z, width, depth);
  addWall(mirrorX, 0.5, z, width, depth);
  return true;
}

function buildRandomLabyrinth() {
  clearMazeWalls();

  // Outer border walls
  addWall(0, 0.5, -mapHalfSize, mapHalfSize * 2, wallThickness);
  addWall(0, 0.5, mapHalfSize, mapHalfSize * 2, wallThickness);
  addWall(-mapHalfSize, 0.5, 0, wallThickness, mapHalfSize * 2);
  addWall(mapHalfSize, 0.5, 0, wallThickness, mapHalfSize * 2);

  // Keep a recognizable center house, then randomize surrounding labyrinth pieces.
  addWall(0, 0.5, -1.2, 2.8, wallThickness);
  addWall(0, 0.5, 1.2, 2.8, wallThickness);
  addWall(-1.4, 0.5, 0, wallThickness, 2.0);
  addWall(1.4, 0.5, 0, wallThickness, 2.0);

  // Horizontal mirrored bars
  let horizontalAdded = 0;
  for (let i = 0; i < 80 && horizontalAdded < 8; i++) {
    const x = randomBetween(-6.8, -1.6);
    const z = Math.round(randomBetween(-6.6, 6.6) * 2) / 2;
    const width = Math.round(randomBetween(2.2, 4.6) * 10) / 10;
    if (tryAddMirroredWall(x, z, width, wallThickness)) {
      horizontalAdded++;
    }
  }

  // Vertical mirrored bars
  let verticalAdded = 0;
  for (let i = 0; i < 80 && verticalAdded < 8; i++) {
    const x = randomBetween(-6.9, -1.4);
    const z = randomBetween(-6.2, 6.2);
    const depth = Math.round(randomBetween(2.2, 4.2) * 10) / 10;
    if (tryAddMirroredWall(x, z, wallThickness, depth)) {
      verticalAdded++;
    }
  }

  // A couple of center connectors to improve the labyrinth feel.
  if (Math.random() > 0.35 && canPlaceWall(0, -6.1, 4.0, wallThickness)) {
    addWall(0, 0.5, -6.1, 4.0, wallThickness);
  }
  if (Math.random() > 0.35 && canPlaceWall(0, 6.1, 4.0, wallThickness)) {
    addWall(0, 0.5, 6.1, 4.0, wallThickness);
  }
}

// Dungeon floor (stone tiles)
const floorGeometry = new THREE.PlaneGeometry(16, 16);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 }); // Dark stone gray
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Pellets (glowing orbs in the dungeon)
const pelletGeometry = new THREE.SphereGeometry(0.2, 16, 16);
const pelletMaterial = new THREE.MeshPhongMaterial({
  color: 0x00ff00,
  emissive: 0x00ff00,
  emissiveIntensity: 0.5,
}); // Glowing green for dungeon treasure
const pellets = [];
const pelletScoreValue = 10;
const scoreStorageKey = "jsPacmanPersistentScore";

function loadPersistedScore() {
  try {
    const savedScore = localStorage.getItem(scoreStorageKey);
    const parsed = Number.parseInt(savedScore ?? "0", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    return 0;
  }
}

function persistScore() {
  try {
    localStorage.setItem(scoreStorageKey, String(score));
  } catch (error) {
    // Ignore storage failures so gameplay continues.
  }
}

let score = loadPersistedScore();
let isStartingNewGame = false;
let isGameOver = false;
let roundTimeoutId = null;

const baseGhostSpeed = 0.06;
const ghostDirections = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
];
const ghostColors = [0xff4d5a, 0x5ad3ff, 0xffa64d, 0xff66da, 0x99ff66];
const ghostSpawnPreferences = [
  { x: gridMax, z: gridMax },
  { x: gridMax, z: gridMin },
  { x: gridMin, z: gridMax },
  { x: 0, z: gridMax },
  { x: gridMax, z: 0 },
];
let ghosts = [];
let ghostCount = 1;
const maxGhostCount = 5;

const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "fixed";
scoreDisplay.style.top = "12px";
scoreDisplay.style.left = "12px";
scoreDisplay.style.color = "#ffffff";
scoreDisplay.style.fontFamily = "Arial, sans-serif";
scoreDisplay.style.fontSize = "20px";
scoreDisplay.style.fontWeight = "bold";
scoreDisplay.style.textShadow = "0 1px 3px rgba(0, 0, 0, 0.8)";
scoreDisplay.style.zIndex = "10";
document.body.appendChild(scoreDisplay);

const statusDisplay = document.createElement("div");
statusDisplay.style.position = "fixed";
statusDisplay.style.top = "44px";
statusDisplay.style.left = "12px";
statusDisplay.style.color = "#ff8080";
statusDisplay.style.fontFamily = "Arial, sans-serif";
statusDisplay.style.fontSize = "22px";
statusDisplay.style.fontWeight = "bold";
statusDisplay.style.textShadow = "0 1px 3px rgba(0, 0, 0, 0.8)";
statusDisplay.style.zIndex = "10";
statusDisplay.style.display = "none";
document.body.appendChild(statusDisplay);

const resetButton = document.createElement("button");
resetButton.textContent = "Reset";
resetButton.style.position = "fixed";
resetButton.style.top = "12px";
resetButton.style.right = "12px";
resetButton.style.padding = "8px 12px";
resetButton.style.background = "#ffd54d";
resetButton.style.color = "#1b1b1b";
resetButton.style.border = "none";
resetButton.style.borderRadius = "6px";
resetButton.style.fontFamily = "Arial, sans-serif";
resetButton.style.fontSize = "14px";
resetButton.style.fontWeight = "bold";
resetButton.style.cursor = "pointer";
resetButton.style.zIndex = "10";
document.body.appendChild(resetButton);

function setStatusMessage(message = "") {
  if (!message) {
    statusDisplay.style.display = "none";
    statusDisplay.textContent = "";
    return;
  }
  statusDisplay.textContent = message;
  statusDisplay.style.display = "block";
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

updateScoreDisplay();

function addPellet(x, z) {
  const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
  pellet.position.set(x, 0.2, z);
  scene.add(pellet);
  pellets.push(pellet);
}

function isBlockedAt(newX, newZ) {
  const pacmanBox = new THREE.Box3(
    new THREE.Vector3(newX - 0.3, 0, newZ - 0.3),
    new THREE.Vector3(newX + 0.3, 1, newZ + 0.3),
  );

  for (let wall of walls) {
    if (pacmanBox.intersectsBox(wall.userData.box)) {
      return true;
    }
  }
  return false;
}

function findNearestWalkableTile(preferredX, preferredZ) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let z = gridMin; z <= gridMax; z++) {
    for (let x = gridMin; x <= gridMax; x++) {
      if (isBlockedAt(x, z)) continue;
      const distance = Math.abs(x - preferredX) + Math.abs(z - preferredZ);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, z };
      }
    }
  }

  return best || { x: spawnX, z: spawnZ };
}

function clearGhosts() {
  for (let i = 0; i < ghosts.length; i++) {
    scene.remove(ghosts[i].mesh);
  }
  ghosts = [];
}

function resetGhosts() {
  clearGhosts();

  for (let i = 0; i < ghostCount; i++) {
    const mesh = createGhost(ghostColors[i % ghostColors.length]);
    const preferred = ghostSpawnPreferences[i % ghostSpawnPreferences.length];
    const tile = findNearestWalkableTile(preferred.x, preferred.z);
    mesh.position.set(tile.x, 0.5, tile.z);

    ghosts.push({
      mesh,
      direction: Math.random() > 0.5 ? { x: -1, z: 0 } : { x: 0, z: -1 },
      speed: baseGhostSpeed + Math.min(0.03, i * 0.004),
    });
  }
}

function chooseGhostDirection(ghostState) {
  const options = ghostDirections.filter((dir) => {
    const candidateX = ghostState.mesh.position.x + dir.x * 0.45;
    const candidateZ = ghostState.mesh.position.z + dir.z * 0.45;
    return !isBlockedAt(candidateX, candidateZ);
  });

  if (options.length === 0) {
    return { x: -ghostState.direction.x, z: -ghostState.direction.z };
  }

  // Favor forward direction, but allow random turns at intersections.
  const forward = options.find(
    (dir) =>
      dir.x === ghostState.direction.x && dir.z === ghostState.direction.z,
  );
  if (forward && Math.random() > 0.25) {
    return forward;
  }

  return options[Math.floor(Math.random() * options.length)];
}

function updateGhostMovement() {
  for (let i = 0; i < ghosts.length; i++) {
    const ghostState = ghosts[i];
    const canKeepMoving = !isBlockedAt(
      ghostState.mesh.position.x + ghostState.direction.x * 0.45,
      ghostState.mesh.position.z + ghostState.direction.z * 0.45,
    );

    if (!canKeepMoving || Math.random() < 0.025) {
      ghostState.direction = chooseGhostDirection(ghostState);
    }

    const nextX =
      ghostState.mesh.position.x + ghostState.direction.x * ghostState.speed;
    const nextZ =
      ghostState.mesh.position.z + ghostState.direction.z * ghostState.speed;

    if (!isBlockedAt(nextX, ghostState.mesh.position.z)) {
      ghostState.mesh.position.x = nextX;
    } else {
      ghostState.direction = chooseGhostDirection(ghostState);
    }

    if (!isBlockedAt(ghostState.mesh.position.x, nextZ)) {
      ghostState.mesh.position.z = nextZ;
    } else {
      ghostState.direction = chooseGhostDirection(ghostState);
    }

    if (
      Math.abs(ghostState.direction.x) > 0.001 ||
      Math.abs(ghostState.direction.z) > 0.001
    ) {
      ghostState.mesh.rotation.y = Math.atan2(
        ghostState.direction.x,
        ghostState.direction.z,
      );
    }
  }
}

function checkGhostCollision() {
  for (let i = 0; i < ghosts.length; i++) {
    const ghostState = ghosts[i];
    const dx = pacman.position.x - ghostState.mesh.position.x;
    const dz = pacman.position.z - ghostState.mesh.position.z;
    if (dx * dx + dz * dz < 0.52) {
      return true;
    }
  }
  return false;
}

function setGameOver() {
  isGameOver = true;
  setStatusMessage("Game Over");
}

function buildReachablePelletPositions() {
  const walkable = new Set();

  for (let z = gridMin; z <= gridMax; z++) {
    for (let x = gridMin; x <= gridMax; x++) {
      if (!isBlockedAt(x, z)) {
        walkable.add(`${x},${z}`);
      }
    }
  }

  const start = {
    x: Math.round(pacman.position.x),
    z: Math.round(pacman.position.z),
  };
  let startKey = `${start.x},${start.z}`;

  if (!walkable.has(startKey)) {
    const firstWalkable = walkable.values().next().value;
    if (!firstWalkable) return [];
    startKey = firstWalkable;
  }

  const queue = [startKey];
  const visited = new Set([startKey]);

  while (queue.length > 0) {
    const key = queue.shift();
    const [x, z] = key.split(",").map(Number);

    const neighbors = [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ];

    neighbors.forEach(([nx, nz]) => {
      if (nx < gridMin || nx > gridMax || nz < gridMin || nz > gridMax) return;
      const neighborKey = `${nx},${nz}`;
      if (!walkable.has(neighborKey) || visited.has(neighborKey)) return;
      visited.add(neighborKey);
      queue.push(neighborKey);
    });
  }

  const [startX, startZ] = startKey.split(",").map(Number);
  const candidates = [];

  visited.forEach((key) => {
    const [x, z] = key.split(",").map(Number);
    if (x === startX && z === startZ) return;

    candidates.push([x, z]);
  });

  // Randomize reachable tiles and keep a balanced subset for each round.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = temp;
  }

  const pelletCount = Math.max(30, Math.floor(candidates.length * 0.42));
  return candidates.slice(0, pelletCount);
}

let pelletPositions = buildReachablePelletPositions();

function spawnPellets() {
  for (let i = pellets.length - 1; i >= 0; i--) {
    scene.remove(pellets[i]);
    pellets.splice(i, 1);
  }

  pelletPositions = buildReachablePelletPositions();

  pelletPositions.forEach(([x, z]) => {
    addPellet(x, z);
  });
}

function resetRound() {
  pacman.position.set(spawnX, 0.5, spawnZ);
  randomizeWallColor();
  buildRandomLabyrinth();
  resetGhosts();
  spawnPellets();
}

function resetGame(resetScore = false) {
  if (roundTimeoutId) {
    clearTimeout(roundTimeoutId);
    roundTimeoutId = null;
  }

  isStartingNewGame = false;
  isGameOver = false;
  ghostCount = 1;
  setStatusMessage("");

  if (resetScore) {
    score = 0;
    persistScore();
  }

  updateScoreDisplay();
  resetRound();
}

// Scatter glowing pellets throughout the dungeon
resetRound();

// Camera position (top-down view)
camera.position.set(0, 18, 0.01);
camera.lookAt(0, 0, 0);

// Add OrbitControls for mouse rotation
const OrbitControls = THREE.OrbitControls; // Ensure Three.js includes OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // Focus on the center of the maze
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;
controls.update();

// Movement controls
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Virtual joystick: maps thumb offset to the same arrow keys the game loop reads.
const joystick = document.getElementById("joystick");
const joystickThumb = document.getElementById("joystickThumb");
if (joystick && joystickThumb) {
  const maxRadius = 38; // px the thumb can travel from center
  const deadzone = 0.3; // fraction of maxRadius before a direction activates
  let activePointerId = null;

  const clearJoystickKeys = () => {
    keys["ArrowUp"] = false;
    keys["ArrowDown"] = false;
    keys["ArrowLeft"] = false;
    keys["ArrowRight"] = false;
  };

  const updateJoystick = (clientX, clientY) => {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    keys["ArrowLeft"] = nx < -deadzone;
    keys["ArrowRight"] = nx > deadzone;
    keys["ArrowUp"] = ny < -deadzone;
    keys["ArrowDown"] = ny > deadzone;
  };

  joystick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    activePointerId = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    updateJoystick(e.clientX, e.clientY);
  });

  joystick.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    updateJoystick(e.clientX, e.clientY);
  });

  const endJoystick = (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    activePointerId = null;
    joystickThumb.style.transform = "translate(0px, 0px)";
    clearJoystickKeys();
  };

  joystick.addEventListener("pointerup", endJoystick);
  joystick.addEventListener("pointercancel", endJoystick);
}

const speed = 0.1;
resetButton.addEventListener("click", () => {
  resetGame(true);
});

// Collision detection with walls
function checkWallCollision(newX, newZ) {
  return isBlockedAt(newX, newZ);
}

// Check for pellet collection
function checkPelletCollision() {
  for (let i = pellets.length - 1; i >= 0; i--) {
    const pellet = pellets[i];
    const dx = pacman.position.x - pellet.position.x;
    const dz = pacman.position.z - pellet.position.z;
    if (dx * dx + dz * dz < 0.45) {
      scene.remove(pellet);
      pellets.splice(i, 1); // Remove eaten pellet
      score += pelletScoreValue;
      mouthChompBoost = 0.9;
      persistScore();
      updateScoreDisplay();
    }
  }
}

function startNewGame() {
  if (isGameOver || isStartingNewGame) return;

  isStartingNewGame = true;

  roundTimeoutId = setTimeout(() => {
    roundTimeoutId = null;
    if (isGameOver) {
      isStartingNewGame = false;
      return;
    }

    ghostCount = Math.min(maxGhostCount, ghostCount + 1);
    updateScoreDisplay();
    resetRound();
    isStartingNewGame = false;
  }, 600);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Move Pac-Man based on key presses
  const previousX = pacman.position.x;
  const previousZ = pacman.position.z;
  let newX = pacman.position.x;
  let newZ = pacman.position.z;

  if (!isGameOver) {
    if (keys["ArrowUp"]) newZ -= speed;
    if (keys["ArrowDown"]) newZ += speed;
    if (keys["ArrowLeft"]) newX -= speed;
    if (keys["ArrowRight"]) newX += speed;
  }

  // Keep player inside play area
  newX = Math.max(playAreaMin, Math.min(playAreaMax, newX));
  newZ = Math.max(playAreaMin, Math.min(playAreaMax, newZ));

  // Check for collisions before moving
  if (!isGameOver) {
    if (!checkWallCollision(newX, pacman.position.z)) pacman.position.x = newX;
    if (!checkWallCollision(pacman.position.x, newZ)) pacman.position.z = newZ;
  }

  const movedX = pacman.position.x - previousX;
  const movedZ = pacman.position.z - previousZ;
  const isMoving = Math.abs(movedX) > 0.0001 || Math.abs(movedZ) > 0.0001;

  if (isMoving) {
    pacman.rotation.y = Math.atan2(movedX, movedZ);
  }

  if (isMoving || mouthChompBoost > 0) {
    mouthChompPhase += 0.38;
  }
  mouthChompBoost = Math.max(0, mouthChompBoost - 0.03);

  const chompWave = (Math.sin(mouthChompPhase) + 1) * 0.5;
  const minOpen = isMoving ? 0.08 : 0.03;
  const dynamicOpen = isMoving ? 0.44 * chompWave : 0;
  const pelletBoostOpen = mouthChompBoost * 0.24;
  const mouthOpenAngle = Math.min(
    0.72,
    minOpen + dynamicOpen + pelletBoostOpen,
  );
  upperJaw.rotation.y = mouthOpenAngle;
  lowerJaw.rotation.y = -mouthOpenAngle;

  if (!isGameOver) {
    updateGhostMovement();
    if (checkGhostCollision()) {
      setGameOver();
    }
  }

  // Check for pellet collection
  if (!isGameOver) {
    checkPelletCollision();
  }

  if (pellets.length === 0 && !isStartingNewGame && !isGameOver) {
    startNewGame();
  }

  // Update controls (required for OrbitControls)
  controls.update();

  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.update(); // Update controls on resize
});
