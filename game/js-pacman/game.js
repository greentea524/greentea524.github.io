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

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 10, 10);
scene.add(light);

// Pac-Man (a yellow sphere)
const pacmanGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const pacmanMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
const pacman = new THREE.Mesh(pacmanGeometry, pacmanMaterial);
pacman.position.set(0, 0.5, 0);
scene.add(pacman);

// Maze walls (simple flat boxes)
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
const wallGeometry = new THREE.BoxGeometry(1, 1, 10);

// Create a basic maze layout
const walls = [];
function addWall(x, y, z) {
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(x, y, z);
  scene.add(wall);
  walls.push(wall);
}

// Maze structure
addWall(0, 0.5, -5); // Back wall
addWall(0, 0.5, 5); // Front wall
addWall(-5, 0.5, 0); // Left wall
addWall(5, 0.5, 0); // Right wall

// Floor
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Camera position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Movement controls
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

const speed = 0.1;

// Collision detection
function checkCollision(newX, newZ) {
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

  // Check for collisions before moving
  if (!checkCollision(newX, pacman.position.z)) pacman.position.x = newX;
  if (!checkCollision(pacman.position.x, newZ)) pacman.position.z = newZ;

  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
