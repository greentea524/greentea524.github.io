// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
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
const pacmanMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 }); // Bright yellow for torch effect
const pacman = new THREE.Mesh(pacmanGeometry, pacmanMaterial);
pacman.position.set(0, 0.5, 0);
scene.add(pacman);

// Dungeon walls (stone-like texture and color)
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x666633 }); // Dull stone brown
const wallGeometry = new THREE.BoxGeometry(1, 1, 10);

// Create a winding dungeon maze layout
const walls = [];
function addWall(x, y, z) {
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(x, y, z);
  scene.add(wall);
  walls.push(wall);
}

// Dungeon maze structure (more winding and complex)
addWall(0, 0.5, -5); // Back wall
addWall(0, 0.5, 5); // Front wall
addWall(-5, 0.5, 0); // Left wall
addWall(5, 0.5, 0); // Right wall
addWall(-3, 0.5, -3); // Inner wall 1
addWall(3, 0.5, 3); // Inner wall 2
addWall(-3, 0.5, 3); // Inner wall 3
addWall(3, 0.5, -3); // Inner wall 4
addWall(-1, 0.5, -1); // Center wall 1
addWall(1, 0.5, 1); // Center wall 2
addWall(0, 0.5, 2); // Vertical divider
addWall(-2, 0.5, 0); // Horizontal divider

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

function addPellet(x, z) {
  const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
  pellet.position.set(x, 0.2, z);
  scene.add(pellet);
  pellets.push(pellet);
}

// Scatter glowing pellets throughout the dungeon
addPellet(-4, -4);
addPellet(-4, 0);
addPellet(-4, 4);
addPellet(0, -4);
addPellet(0, 4);
addPellet(4, -4);
addPellet(4, 0);
addPellet(4, 4);
addPellet(-2, -2);
addPellet(2, 2);

// Camera position (closer and lower for a dungeon perspective)
camera.position.set(0, 3, 8);
camera.lookAt(0, 0, 0);

// Add OrbitControls for mouse rotation
const OrbitControls = THREE.OrbitControls; // Ensure Three.js includes OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // Focus on the center of the maze
controls.enablePan = false; // Disable panning if you want only rotation
controls.enableZoom = false; // Disable zooming if desired
controls.update();

// Movement controls
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  console.log(`Key down: ${e.key}`); // Debug: Log key presses
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  console.log(`Key up: ${e.key}`); // Debug: Log key releases
});

const speed = 0.1;

// Collision detection with walls
function checkWallCollision(newX, newZ) {
  const pacmanBox = new THREE.Box3().setFromObject(pacman);
  pacmanBox.min.x = newX - 0.5;
  pacmanBox.max.x = newX + 0.5;
  pacmanBox.min.z = newZ - 0.5;
  pacmanBox.max.z = newZ + 0.5;

  for (let wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (pacmanBox.intersectsBox(wallBox)) {
      return true;
    }
  }
  return false;
}

// Check for pellet collection
function checkPelletCollision() {
  const pacmanBox = new THREE.Box3().setFromObject(pacman);
  for (let i = pellets.length - 1; i >= 0; i--) {
    const pellet = pellets[i];
    const pelletBox = new THREE.Box3().setFromObject(pellet);
    if (pacmanBox.intersectsBox(pelletBox)) {
      scene.remove(pellet);
      pellets.splice(i, 1); // Remove eaten pellet
    }
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Debug: Log to confirm animation loop is running
  console.log("Animating...");

  // Move Pac-Man based on key presses
  let newX = pacman.position.x;
  let newZ = pacman.position.z;

  if (keys["ArrowUp"]) newZ -= speed;
  if (keys["ArrowDown"]) newZ += speed;
  if (keys["ArrowLeft"]) newX -= speed;
  if (keys["ArrowRight"]) newX += speed;

  // Check for collisions before moving
  if (!checkWallCollision(newX, pacman.position.z)) pacman.position.x = newX;
  if (!checkWallCollision(pacman.position.x, newZ)) pacman.position.z = newZ;

  // Check for pellet collection
  checkPelletCollision();

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
