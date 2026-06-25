const BASE_CPU_HP = 100;
const MIN_DAMAGE = 8;
const MAX_DAMAGE = 20;
const XP_PER_WIN = 40;
const GOLD_PER_WIN = 25;
const POTION_COST = 20;
const GLOVES_COST = 50;
const POTION_HEAL = 30;
const STORAGE_KEY = "js-boxing-save-v1";
const BOSS_FIGHT_INTERVAL = 4;

const CLASSES = {
  brawler: { label: "Brawler", maxHp: 120, attackBonus: 2 },
  speedster: { label: "Speedster", maxHp: 95, attackBonus: 4 },
  tank: { label: "Tank", maxHp: 145, attackBonus: 0 },
};

const CPU_FIGHTERS = [
  {
    name: "Scrap Bot",
    tag: "BOT",
    hpMultiplier: 1,
    damageBonus: 0,
    color: "#f85149",
    gloveColor: "#ef4444",
    isBoss: false,
  },
  {
    name: "Street Bruiser",
    tag: "BRU",
    hpMultiplier: 1.1,
    damageBonus: 1,
    color: "#ff7b72",
    gloveColor: "#b94b4b",
    isBoss: false,
  },
  {
    name: "Ninja Punk",
    tag: "NIN",
    hpMultiplier: 0.95,
    damageBonus: 3,
    color: "#a371f7",
    gloveColor: "#7c4dce",
    isBoss: false,
  },
];

const BOSS_FIGHTER = {
  name: "Titan Boss",
  tag: "BOSS",
  hpMultiplier: 1.7,
  damageBonus: 5,
  color: "#ffa657",
  gloveColor: "#f5a623",
  isBoss: true,
};

const menuScreenEl = document.getElementById("menu-screen");
const gameScreenEl = document.getElementById("game-screen");
const newGameBtn = document.getElementById("new-game-btn");
const loadGameBtn = document.getElementById("load-game-btn");
const playerHpEl = document.getElementById("player-hp");
const cpuHpEl = document.getElementById("cpu-hp");
const playerBarEl = document.getElementById("player-bar");
const cpuBarEl = document.getElementById("cpu-bar");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const punchBtn = document.getElementById("punch-btn");
const autoBtn = document.getElementById("auto-btn");
const shopBtn = document.getElementById("shop-btn");
const usePotionBtn = document.getElementById("use-potion-btn");
const nextBtn = document.getElementById("restart-btn");
const shopPanelEl = document.getElementById("shop-panel");
const buyPotionBtn = document.getElementById("buy-potion-btn");
const buyGlovesBtn = document.getElementById("buy-gloves-btn");
const classSelectEl = document.getElementById("class-select");
const applyClassBtn = document.getElementById("apply-class-btn");
const classNameEl = document.getElementById("class-name");
const levelEl = document.getElementById("level");
const xpEl = document.getElementById("xp");
const xpNextEl = document.getElementById("xp-next");
const goldEl = document.getElementById("gold");
const potionsEl = document.getElementById("potions");
const atkBonusEl = document.getElementById("atk-bonus");
const fightNumberEl = document.getElementById("fight-number");
const enemyTypeEl = document.getElementById("enemy-type");
const cpuNameEl = document.getElementById("cpu-name");
const playerBoxerEl = document.getElementById("player-boxer");
const cpuBoxerEl = document.getElementById("cpu-boxer");
const cpuFaceEl = document.getElementById("cpu-face");
const gloveBadgeEl = document.getElementById("glove-badge");
const fightStageEl = document.querySelector(".fight-stage");

let selectedClass = "brawler";
let level = 1;
let xp = 0;
let gold = 0;
let potions = 0;
let glovesBonus = 0;
let fightNumber = 1;
let autoFightEnabled = false;
let playerMaxHp = CLASSES[selectedClass].maxHp;
let cpuMaxHp = BASE_CPU_HP;
let playerHp = playerMaxHp;
let cpuHp = cpuMaxHp;
let isGameOver = false;
let currentEnemy = CPU_FIGHTERS[0];
let autoFightTimer = null;

function hasSave() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

function refreshLoadButton() {
  loadGameBtn.disabled = !hasSave();
}

function showMenu() {
  gameScreenEl.classList.add("hidden");
  menuScreenEl.classList.remove("hidden");
  refreshLoadButton();
}

function showGame() {
  menuScreenEl.classList.add("hidden");
  gameScreenEl.classList.remove("hidden");
  shopPanelEl.classList.add("hidden");
  shopBtn.textContent = "Shop";
  setAutoButtonState();
}

function getXpToNextLevel() {
  return level * 100;
}

function getRandomDamage() {
  return Math.floor(Math.random() * (MAX_DAMAGE - MIN_DAMAGE + 1)) + MIN_DAMAGE;
}

function getPlayerAttackBonus() {
  return CLASSES[selectedClass].attackBonus + glovesBonus;
}

function isBossFight() {
  return fightNumber % BOSS_FIGHT_INTERVAL === 0;
}

function getEnemyForFight() {
  if (isBossFight()) {
    return BOSS_FIGHTER;
  }
  const normalFightIndex = fightNumber - 1 - Math.floor((fightNumber - 1) / BOSS_FIGHT_INTERVAL);
  return CPU_FIGHTERS[normalFightIndex % CPU_FIGHTERS.length];
}

function setAutoButtonState() {
  autoBtn.textContent = autoFightEnabled ? "Auto: On" : "Auto: Off";
  autoBtn.setAttribute("aria-pressed", autoFightEnabled ? "true" : "false");
}

function clearAutoFightLoop() {
  if (autoFightTimer) {
    clearInterval(autoFightTimer);
    autoFightTimer = null;
  }
}

function maybeStartAutoFightLoop() {
  if (!autoFightEnabled || isGameOver || autoFightTimer) {
    return;
  }
  autoFightTimer = setInterval(() => {
    playerPunch();
    if (isGameOver) {
      clearAutoFightLoop();
    }
  }, 700);
}

function getGloveTier() {
  if (glovesBonus >= 6) {
    return 3;
  }
  if (glovesBonus >= 4) {
    return 2;
  }
  if (glovesBonus >= 2) {
    return 1;
  }
  return 0;
}

function updateGloveVisual() {
  const tier = getGloveTier();
  playerBoxerEl.classList.remove("upgrade-1", "upgrade-2", "upgrade-3");
  if (tier > 0) {
    playerBoxerEl.classList.add(`upgrade-${tier}`);
  }
  gloveBadgeEl.textContent = `+${glovesBonus}`;
}

function updateEnemyVisual() {
  cpuNameEl.textContent = currentEnemy.name;
  cpuFaceEl.textContent = currentEnemy.tag;
  cpuBoxerEl.classList.toggle("boss", currentEnemy.isBoss);
  cpuBoxerEl.style.setProperty("--fighter-color", currentEnemy.color);
  cpuBoxerEl.style.setProperty("--glove-color", currentEnemy.gloveColor);
}

function updateUi() {
  playerHpEl.textContent = playerHp;
  cpuHpEl.textContent = cpuHp;
  playerBarEl.style.width = `${(playerHp / playerMaxHp) * 100}%`;
  cpuBarEl.style.width = `${(cpuHp / cpuMaxHp) * 100}%`;

  classNameEl.textContent = CLASSES[selectedClass].label;
  levelEl.textContent = level;
  xpEl.textContent = xp;
  xpNextEl.textContent = getXpToNextLevel();
  goldEl.textContent = gold;
  potionsEl.textContent = potions;
  atkBonusEl.textContent = getPlayerAttackBonus();
  fightNumberEl.textContent = fightNumber;
  enemyTypeEl.textContent = currentEnemy.isBoss ? "Boss" : "Normal";
  classSelectEl.value = selectedClass;
  setAutoButtonState();
  updateGloveVisual();
  updateEnemyVisual();
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  logEl.prepend(item);
}

function saveProgress() {
  const saveData = {
    selectedClass,
    level,
    xp,
    gold,
    potions,
    glovesBonus,
    fightNumber,
    autoFightEnabled,
    playerHp,
    cpuHp,
    cpuMaxHp,
    isGameOver,
    statusText: statusEl.textContent,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  refreshLoadButton();
}

function loadProgress() {
  const rawSave = localStorage.getItem(STORAGE_KEY);
  if (!rawSave) {
    return false;
  }

  let data;
  try {
    data = JSON.parse(rawSave);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    refreshLoadButton();
    return false;
  }

  selectedClass = CLASSES[data.selectedClass] ? data.selectedClass : "brawler";
  level = Number.isFinite(data.level) && data.level > 0 ? Math.floor(data.level) : 1;
  xp = Number.isFinite(data.xp) && data.xp >= 0 ? Math.floor(data.xp) : 0;
  gold = Number.isFinite(data.gold) && data.gold >= 0 ? Math.floor(data.gold) : 0;
  potions = Number.isFinite(data.potions) && data.potions >= 0 ? Math.floor(data.potions) : 0;
  glovesBonus =
    Number.isFinite(data.glovesBonus) && data.glovesBonus >= 0 ? Math.floor(data.glovesBonus) : 0;
  fightNumber = Number.isFinite(data.fightNumber) && data.fightNumber > 0 ? Math.floor(data.fightNumber) : 1;
  autoFightEnabled = Boolean(data.autoFightEnabled);
  playerMaxHp = CLASSES[selectedClass].maxHp + (level - 1) * 10;
  currentEnemy = getEnemyForFight();
  cpuMaxHp =
    Number.isFinite(data.cpuMaxHp) && data.cpuMaxHp > 0
      ? Math.floor(data.cpuMaxHp)
      : Math.floor((BASE_CPU_HP + (level - 1) * 10) * currentEnemy.hpMultiplier);
  playerHp =
    Number.isFinite(data.playerHp) && data.playerHp >= 0
      ? Math.min(playerMaxHp, Math.floor(data.playerHp))
      : playerMaxHp;
  cpuHp = Number.isFinite(data.cpuHp) && data.cpuHp >= 0 ? Math.min(cpuMaxHp, Math.floor(data.cpuHp)) : cpuMaxHp;
  isGameOver = Boolean(data.isGameOver);

  punchBtn.disabled = isGameOver;
  nextBtn.disabled = !isGameOver;
  statusEl.textContent = data.statusText || "Save loaded.";
  updateUi();
  maybeStartAutoFightLoop();
  return true;
}

function awardVictoryRewards() {
  const rewardMultiplier = currentEnemy.isBoss ? 2 : 1;
  const xpGain = XP_PER_WIN * rewardMultiplier;
  const goldGain = GOLD_PER_WIN * rewardMultiplier;
  xp += xpGain;
  gold += goldGain;
  addLog(`Rewards: +${xpGain} XP, +${goldGain} gold.`);
  while (xp >= getXpToNextLevel()) {
    xp -= getXpToNextLevel();
    level += 1;
    playerMaxHp += 10;
    playerHp = playerMaxHp;
    addLog(`Level up! You are now level ${level}. Max HP +10.`);
  }
}

function endGame(winner) {
  isGameOver = true;
  punchBtn.disabled = true;
  nextBtn.disabled = false;
  clearAutoFightLoop();
  if (winner === "Player") {
    awardVictoryRewards();
  }
  statusEl.textContent = `${winner} wins! Press Next for next round.`;
  updateUi();
  saveProgress();
}

function animatePunch(boxerEl) {
  boxerEl.classList.add("punch");
  setTimeout(() => {
    boxerEl.classList.remove("punch");
  }, 170);
}

function animateHit(targetBoxerEl) {
  targetBoxerEl.classList.add("hit");
  fightStageEl.classList.add("impact");
  setTimeout(() => {
    targetBoxerEl.classList.remove("hit");
    fightStageEl.classList.remove("impact");
  }, 180);
}

function playerPunch() {
  if (isGameOver) {
    return;
  }

  animatePunch(playerBoxerEl);
  const playerDamage = getRandomDamage() + getPlayerAttackBonus();
  cpuHp = Math.max(0, cpuHp - playerDamage);
  animateHit(cpuBoxerEl);
  addLog(`Player punches ${currentEnemy.name} for ${playerDamage} damage.`);
  updateUi();

  if (cpuHp === 0) {
    endGame("Player");
    return;
  }

  animatePunch(cpuBoxerEl);
  const cpuDamage = getRandomDamage() + Math.floor(level / 2) + currentEnemy.damageBonus;
  playerHp = Math.max(0, playerHp - cpuDamage);
  animateHit(playerBoxerEl);
  addLog(`${currentEnemy.name} hits back for ${cpuDamage} damage.`);
  updateUi();

  if (playerHp === 0) {
    endGame(currentEnemy.name);
  } else {
    statusEl.textContent = currentEnemy.isBoss ? "Boss fight in progress!" : "Fight in progress!";
    saveProgress();
  }
}

function startRound(advanceFightNumber) {
  clearAutoFightLoop();
  if (advanceFightNumber) {
    if (!isGameOver) {
      return;
    }
    fightNumber += 1;
  }

  currentEnemy = getEnemyForFight();
  cpuMaxHp = Math.floor((BASE_CPU_HP + (level - 1) * 10) * currentEnemy.hpMultiplier);
  playerHp = playerMaxHp;
  cpuHp = cpuMaxHp;
  isGameOver = false;
  punchBtn.disabled = false;
  nextBtn.disabled = true;
  shopPanelEl.classList.add("hidden");
  shopBtn.textContent = "Shop";
  logEl.innerHTML = "";

  if (currentEnemy.isBoss) {
    statusEl.textContent = `Boss fight! ${currentEnemy.name} enters the ring.`;
  } else {
    statusEl.textContent = `${currentEnemy.name} steps into the ring.`;
  }
  updateUi();
  maybeStartAutoFightLoop();
  saveProgress();
}

function toggleAutoFight() {
  autoFightEnabled = !autoFightEnabled;
  setAutoButtonState();
  if (autoFightEnabled) {
    if (isGameOver) {
      statusEl.textContent = "Auto enabled. Press Next to continue.";
    } else {
      statusEl.textContent = "Auto fight running...";
      maybeStartAutoFightLoop();
    }
  } else {
    clearAutoFightLoop();
    if (!isGameOver) {
      statusEl.textContent = "Auto fight stopped. Throw a punch!";
    }
  }
  saveProgress();
}

function toggleShop() {
  const isHidden = shopPanelEl.classList.contains("hidden");
  shopPanelEl.classList.toggle("hidden");
  shopBtn.textContent = isHidden ? "Close Shop" : "Shop";
}

function usePotion() {
  if (potions <= 0) {
    statusEl.textContent = "No potions left.";
    return;
  }
  if (playerHp === playerMaxHp) {
    statusEl.textContent = "HP is already full.";
    return;
  }
  potions -= 1;
  playerHp = Math.min(playerMaxHp, playerHp + POTION_HEAL);
  addLog(`Used potion and healed ${POTION_HEAL} HP.`);
  statusEl.textContent = "Potion used.";
  updateUi();
  saveProgress();
}

function buyPotion() {
  if (gold < POTION_COST) {
    statusEl.textContent = "Not enough gold for potion.";
    return;
  }
  gold -= POTION_COST;
  potions += 1;
  addLog("Bought 1 potion.");
  statusEl.textContent = "Potion purchased.";
  updateUi();
  saveProgress();
}

function buyGloves() {
  if (gold < GLOVES_COST) {
    statusEl.textContent = "Not enough gold for gloves.";
    return;
  }
  gold -= GLOVES_COST;
  glovesBonus += 2;
  addLog("Bought gloves upgrade. Attack +2.");
  statusEl.textContent = "Gloves upgraded.";
  updateUi();
  saveProgress();
}

function applyClass() {
  const nextClass = classSelectEl.value;
  if (nextClass === selectedClass) {
    return;
  }
  selectedClass = nextClass;
  playerMaxHp = CLASSES[selectedClass].maxHp + (level - 1) * 10;
  playerHp = playerMaxHp;
  addLog(`Class changed to ${CLASSES[selectedClass].label}. HP fully restored.`);
  statusEl.textContent = `${CLASSES[selectedClass].label} selected.`;
  updateUi();
  saveProgress();
}

function resetProgress() {
  selectedClass = "brawler";
  level = 1;
  xp = 0;
  gold = 0;
  potions = 0;
  glovesBonus = 0;
  fightNumber = 1;
  autoFightEnabled = false;
  playerMaxHp = CLASSES[selectedClass].maxHp;
  playerHp = playerMaxHp;
  currentEnemy = getEnemyForFight();
  cpuMaxHp = Math.floor(BASE_CPU_HP * currentEnemy.hpMultiplier);
  cpuHp = cpuMaxHp;
  isGameOver = false;
}

function startNewGame() {
  clearAutoFightLoop();
  localStorage.removeItem(STORAGE_KEY);
  resetProgress();
  showGame();
  startRound(false);
}

function startLoadedGame() {
  clearAutoFightLoop();
  if (!loadProgress()) {
    return;
  }
  showGame();
  addLog("Loaded saved progression.");
}

function goToNextRound() {
  startRound(true);
}

newGameBtn.addEventListener("click", startNewGame);
loadGameBtn.addEventListener("click", startLoadedGame);
punchBtn.addEventListener("click", playerPunch);
autoBtn.addEventListener("click", toggleAutoFight);
shopBtn.addEventListener("click", toggleShop);
usePotionBtn.addEventListener("click", usePotion);
nextBtn.addEventListener("click", goToNextRound);
buyPotionBtn.addEventListener("click", buyPotion);
buyGlovesBtn.addEventListener("click", buyGloves);
applyClassBtn.addEventListener("click", applyClass);

resetProgress();
updateUi();
showMenu();
