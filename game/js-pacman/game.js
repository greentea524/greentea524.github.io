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
pacman.position.set(-4, 0.5, -4);
scene.add(pacman);

const pacmanLight = new THREE.PointLight(0xffee88, 0.8, 6);
pacmanLight.position.set(0, 0.8, 0);
pacman.add(pacmanLight);

// Dungeon walls (stone-like texture and color)
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x666633 }); // Dull stone brown
const wallThickness = 0.4;

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

// Dungeon maze structure with consistent corridor widths
addWall(0, 0.5, -5, 10, wallThickness); // Back wall
addWall(0, 0.5, 5, 10, wallThickness); // Front wall
addWall(-5, 0.5, 0, wallThickness, 10); // Left wall
addWall(5, 0.5, 0, wallThickness, 10); // Right wall

addWall(-2, 0.5, -2, wallThickness, 4); // Vertical segment top-left
addWall(2, 0.5, 2, wallThickness, 4); // Vertical segment bottom-right
addWall(-2, 0.5, 2, 4, wallThickness); // Horizontal segment bottom-left
addWall(2, 0.5, -2, 4, wallThickness); // Horizontal segment top-right
addWall(0, 0.5, 0, 1.2, 1.2); // Center pillar

// Dungeon floor (stone tiles)
const floorGeometry = new THREE.PlaneGeometry(10, 10);
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
let score = 0;
let isStartingNewGame = false;

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

const pelletPositions = [
  [-4, -4],
  [-4, 0],
  [-4, 4],
  [0, -4],
  [0, 4],
  [4, -4],
  [4, 0],
  [4, 4],
  [-3, -2],
  [3, 2],
];

function spawnPellets() {
  for (let i = pellets.length - 1; i >= 0; i--) {
    scene.remove(pellets[i]);
    pellets.splice(i, 1);
  }

  pelletPositions.forEach(([x, z]) => {
    addPellet(x, z);
  });
}

// Scatter glowing pellets throughout the dungeon
spawnPellets();

// Camera position (top-down view)
camera.position.set(0, 12, 0.01);
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

const mobileButtons = document.querySelectorAll(".ctrlBtn");
mobileButtons.forEach((button) => {
  const moveKey = button.dataset.key;
  if (!moveKey) return;

  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys[moveKey] = true;
  });

  const releaseMove = (e) => {
    e.preventDefault();
    keys[moveKey] = false;
  };

  button.addEventListener("pointerup", releaseMove);
  button.addEventListener("pointercancel", releaseMove);
  button.addEventListener("pointerleave", releaseMove);
});

const speed = 0.1;

// Collision detection with walls
function checkWallCollision(newX, newZ) {
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
      updateScoreDisplay();
    }
  }
}

function startNewGame() {
  isStartingNewGame = true;

  setTimeout(() => {
    score = 0;
    updateScoreDisplay();
    pacman.position.set(-4, 0.5, -4);
    spawnPellets();
    isStartingNewGame = false;
  }, 600);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Move Pac-Man based on key presses
  let newX = pacman.position.x;
  let newZ = pacman.position.z;

  if (keys["ArrowUp"]) newZ -= speed;
  if (keys["ArrowDown"]) newZ += speed;
  if (keys["ArrowLeft"]) newX -= speed;
  if (keys["ArrowRight"]) newX += speed;

  // Keep player inside play area
  newX = Math.max(-4.4, Math.min(4.4, newX));
  newZ = Math.max(-4.4, Math.min(4.4, newZ));

  // Check for collisions before moving
  if (!checkWallCollision(newX, pacman.position.z)) pacman.position.x = newX;
  if (!checkWallCollision(pacman.position.x, newZ)) pacman.position.z = newZ;

  // Check for pellet collection
  checkPelletCollision();

  if (pellets.length === 0 && !isStartingNewGame) {
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
