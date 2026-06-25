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
    color: 0xf85149,
    gloveColor: 0xef4444,
    isBoss: false,
  },
  {
    name: "Street Bruiser",
    tag: "BRU",
    hpMultiplier: 1.1,
    damageBonus: 1,
    color: 0xff7b72,
    gloveColor: 0xb94b4b,
    isBoss: false,
  },
  {
    name: "Ninja Punk",
    tag: "NIN",
    hpMultiplier: 0.95,
    damageBonus: 3,
    color: 0xa371f7,
    gloveColor: 0x7c4dce,
    isBoss: false,
  },
];

const BOSS_FIGHTER = {
  name: "Titan Boss",
  tag: "BOSS",
  hpMultiplier: 1.7,
  damageBonus: 5,
  color: 0xffa657,
  gloveColor: 0xf5a623,
  isBoss: true,
};

class FightRenderer {
  constructor(parentId) {
    this.parentId = parentId;
    this.scene = null;
    this.engine = null;
    this.player = null;
    this.cpu = null;
    this.pendingEnemy = null;
    this.pendingGloveBonus = 0;
    this.useFallbackFighters = false;
    if (typeof BABYLON === "undefined") {
      return;
    }

    const parentEl = document.getElementById(parentId);
    if (!parentEl) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    parentEl.innerHTML = "";
    parentEl.appendChild(canvas);
    this.canvas = canvas;

    this.engine = new BABYLON.Engine(canvas, true, { stencil: true });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = BABYLON.Color4.FromHexString("#0f141bff");

    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      1.2,
      12,
      new BABYLON.Vector3(0, 0.7, 0),
      this.scene
    );
    camera.lowerRadiusLimit = 9;
    camera.upperRadiusLimit = 16;
    camera.lowerBetaLimit = 0.9;
    camera.upperBetaLimit = 1.45;
    camera.wheelDeltaPercentage = 0.01;
    camera.attachControl(canvas, true);
    const hemi = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, -1), this.scene);
    hemi.intensity = 0.85;
    const key = new BABYLON.DirectionalLight("key", new BABYLON.Vector3(-0.2, -1, 0.1), this.scene);
    key.position = new BABYLON.Vector3(0, 8, -3);
    key.intensity = 0.6;

    this.createRingBackground();
    this.loadFighters();

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  createRingBackground() {
    const roomFloor = BABYLON.MeshBuilder.CreateGround("room-floor", { width: 18, height: 9 }, this.scene);
    roomFloor.position.y = -1.02;
    const roomFloorMat = new BABYLON.StandardMaterial("room-floor-mat", this.scene);
    roomFloorMat.diffuseColor = BABYLON.Color3.FromHexString("#121820");
    roomFloor.material = roomFloorMat;

    const ringBase = BABYLON.MeshBuilder.CreateBox("ring-base", { width: 12.5, depth: 5.5, height: 0.35 }, this.scene);
    ringBase.position.y = -0.88;
    const ringBaseMat = new BABYLON.StandardMaterial("ring-base-mat", this.scene);
    ringBaseMat.diffuseColor = BABYLON.Color3.FromHexString("#1e2936");
    ringBase.material = ringBaseMat;

    const ringMat = BABYLON.MeshBuilder.CreateBox("ring-mat", { width: 11.7, depth: 4.7, height: 0.12 }, this.scene);
    ringMat.position.y = -0.63;
    const ringMatMat = new BABYLON.StandardMaterial("ring-mat-mat", this.scene);
    ringMatMat.diffuseColor = BABYLON.Color3.FromHexString("#2d3f54");
    ringMat.material = ringMatMat;

    const postMat = new BABYLON.StandardMaterial("ring-post-mat", this.scene);
    postMat.diffuseColor = BABYLON.Color3.FromHexString("#9aa4b2");
    const ropeMat = new BABYLON.StandardMaterial("ring-rope-mat", this.scene);
    ropeMat.diffuseColor = BABYLON.Color3.FromHexString("#ff5f73");

    const corners = [
      [-5.8, -2.3],
      [5.8, -2.3],
      [-5.8, 2.3],
      [5.8, 2.3],
    ];
    for (let i = 0; i < corners.length; i += 1) {
      const post = BABYLON.MeshBuilder.CreateCylinder(`ring-post-${i}`, { height: 2.2, diameter: 0.24 }, this.scene);
      post.position = new BABYLON.Vector3(corners[i][0], 0.2, corners[i][1]);
      post.material = postMat;
    }

    const createRope = (name, y, a, b) => {
      const rope = BABYLON.MeshBuilder.CreateTube(
        name,
        {
          path: [
            new BABYLON.Vector3(a[0], y, a[1]),
            new BABYLON.Vector3(b[0], y, b[1]),
          ],
          radius: 0.04,
          tessellation: 12,
          cap: BABYLON.Mesh.CAP_ALL,
        },
        this.scene
      );
      rope.material = ropeMat;
    };

    const ropeLevels = [0.2, 0.55, 0.9];
    for (let i = 0; i < ropeLevels.length; i += 1) {
      const y = ropeLevels[i];
      createRope(`rope-front-${i}`, y, [-5.8, -2.3], [5.8, -2.3]);
      createRope(`rope-back-${i}`, y, [-5.8, 2.3], [5.8, 2.3]);
      createRope(`rope-left-${i}`, y, [-5.8, -2.3], [-5.8, 2.3]);
      createRope(`rope-right-${i}`, y, [5.8, -2.3], [5.8, 2.3]);
    }
  }

  async loadSingleFighter(side, positionX, rotationY) {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "https://assets.babylonjs.com/meshes/",
      "Dude.babylon",
      this.scene
    );
    const root = result.meshes[0];
    root.position = new BABYLON.Vector3(positionX, -0.9, 0);
    root.rotation = new BABYLON.Vector3(0, rotationY, 0);
    root.scaling = new BABYLON.Vector3(0.016, 0.016, 0.016);

    for (let i = 0; i < result.meshes.length; i += 1) {
      const mesh = result.meshes[i];
      if (mesh.material) {
        mesh.material = mesh.material.clone(`${mesh.name}-${side}-mat`);
      }
    }

    const skeleton = result.skeletons[0] || null;
    const bones = this.mapBones(skeleton);
    if (!bones.leftUpper || !bones.rightUpper) {
      throw new Error("Missing arm bones in rigged model");
    }
    const baseRot = {};
    const boneKeys = Object.keys(bones);
    for (let i = 0; i < boneKeys.length; i += 1) {
      const key = boneKeys[i];
      if (bones[key]) {
        baseRot[key] = bones[key].getRotation(BABYLON.Space.LOCAL, root).clone();
      }
    }

    return {
      side,
      root,
      meshes: result.meshes,
      skeleton,
      bones,
      baseRot,
      isPunching: false,
      nextHand: "lead",
      baseX: positionX,
      hitDirection: side === "player" ? -1 : 1,
      baseYaw: rotationY,
      leadSide: side === "player" ? "left" : "right",
      rearSide: side === "player" ? "right" : "left",
      colorHex: side === "player" ? "#3fb950" : "#f85149",
      gloveHex: side === "player" ? "#e5536c" : "#ef4444",
    };
  }

  createFallbackFighter(config) {
    const root = new BABYLON.TransformNode(`${config.tag}-fallback-root`, this.scene);
    root.position = new BABYLON.Vector3(config.x, -0.25, 0);
    root.rotation.y = config.baseYaw;

    const torsoMaterial = new BABYLON.StandardMaterial(`${config.tag}-fallback-torso-mat`, this.scene);
    torsoMaterial.diffuseColor = BABYLON.Color3.FromHexString(config.torsoHex);
    const skinMaterial = new BABYLON.StandardMaterial(`${config.tag}-fallback-skin-mat`, this.scene);
    skinMaterial.diffuseColor = BABYLON.Color3.FromHexString("#d8c8b4");
    const gloveMaterial = new BABYLON.StandardMaterial(`${config.tag}-fallback-glove-mat`, this.scene);
    gloveMaterial.diffuseColor = BABYLON.Color3.FromHexString(config.gloveHex);
    const legMaterial = new BABYLON.StandardMaterial(`${config.tag}-fallback-leg-mat`, this.scene);
    legMaterial.diffuseColor = BABYLON.Color3.FromHexString("#7d8590");
    const auraMaterial = new BABYLON.StandardMaterial(`${config.tag}-fallback-aura-mat`, this.scene);
    auraMaterial.diffuseColor = BABYLON.Color3.FromHexString(config.torsoHex);
    auraMaterial.alpha = 0;

    const torso = BABYLON.MeshBuilder.CreateCapsule(`${config.tag}-fallback-torso`, { radius: 0.45, height: 1.45 }, this.scene);
    torso.parent = root;
    torso.position.y = 0.34;
    torso.material = torsoMaterial;

    const head = BABYLON.MeshBuilder.CreateSphere(`${config.tag}-fallback-head`, { diameter: 0.88 }, this.scene);
    head.parent = root;
    head.position.y = 1.45;
    head.material = skinMaterial;

    const legLeft = BABYLON.MeshBuilder.CreateCapsule(`${config.tag}-fallback-leg-left`, { radius: 0.14, height: 0.82 }, this.scene);
    legLeft.parent = root;
    legLeft.position = new BABYLON.Vector3(-0.28, -0.7, 0);
    legLeft.material = legMaterial;
    const legRight = BABYLON.MeshBuilder.CreateCapsule(`${config.tag}-fallback-leg-right`, { radius: 0.14, height: 0.82 }, this.scene);
    legRight.parent = root;
    legRight.position = new BABYLON.Vector3(0.28, -0.7, 0);
    legRight.material = legMaterial;

    const shoulderY = 0.94;
    const rearShoulderX = -0.52 * config.punchDirection;
    const leadShoulderX = 0.52 * config.punchDirection;

    const rearArmPivot = new BABYLON.TransformNode(`${config.tag}-fallback-rear-pivot`, this.scene);
    rearArmPivot.parent = root;
    rearArmPivot.position = new BABYLON.Vector3(rearShoulderX, shoulderY, -0.12);
    rearArmPivot.rotation.z = config.homeArmRotation * -0.72;

    const rearArm = BABYLON.MeshBuilder.CreateCapsule(`${config.tag}-fallback-rear-arm`, { radius: 0.12, height: 0.9 }, this.scene);
    rearArm.parent = rearArmPivot;
    rearArm.position = new BABYLON.Vector3(0, -0.36, 0);
    rearArm.material = skinMaterial;
    const rearGlove = BABYLON.MeshBuilder.CreateSphere(`${config.tag}-fallback-rear-glove`, { diameter: 0.4 }, this.scene);
    rearGlove.parent = rearArmPivot;
    rearGlove.position = new BABYLON.Vector3(0, -0.6, -0.12);
    rearGlove.material = gloveMaterial;

    const leadArmPivot = new BABYLON.TransformNode(`${config.tag}-fallback-lead-pivot`, this.scene);
    leadArmPivot.parent = root;
    leadArmPivot.position = new BABYLON.Vector3(leadShoulderX, shoulderY, 0.12);
    leadArmPivot.rotation.z = config.homeArmRotation;

    const leadArm = BABYLON.MeshBuilder.CreateCapsule(`${config.tag}-fallback-lead-arm`, { radius: 0.12, height: 0.9 }, this.scene);
    leadArm.parent = leadArmPivot;
    leadArm.position = new BABYLON.Vector3(0, -0.36, 0);
    leadArm.material = skinMaterial;
    const leadGlove = BABYLON.MeshBuilder.CreateSphere(`${config.tag}-fallback-lead-glove`, { diameter: 0.46 }, this.scene);
    leadGlove.parent = leadArmPivot;
    leadGlove.position = new BABYLON.Vector3(0, -0.62, 0.17);
    leadGlove.material = gloveMaterial;

    const aura = BABYLON.MeshBuilder.CreateSphere(`${config.tag}-fallback-aura`, { diameter: 2.6, segments: 20 }, this.scene);
    aura.parent = root;
    aura.position.y = 0.45;
    aura.material = auraMaterial;
    aura.isPickable = false;

    return {
      mode: "fallback",
      root,
      meshes: [],
      skeleton: null,
      bones: {},
      baseRot: {},
      torsoMaterial,
      gloveMaterial,
      auraMaterial,
      leadArmPivot,
      rearArmPivot,
      leadGlove,
      baseX: config.x,
      baseYaw: config.baseYaw,
      hitDirection: config.hitDirection,
      leadSide: config.leadSide,
      rearSide: config.rearSide,
      isPunching: false,
      nextHand: "lead",
      colorHex: config.torsoHex,
      gloveHex: config.gloveHex,
    };
  }

  loadFallbackFighters() {
    this.useFallbackFighters = true;
    this.player = this.createFallbackFighter({
      tag: "player",
      x: -3.8,
      baseYaw: Math.PI / 2,
      punchDirection: 1,
      hitDirection: -1,
      homeArmRotation: -0.4,
      torsoHex: "#3fb950",
      gloveHex: "#e5536c",
      leadSide: "left",
      rearSide: "right",
    });
    this.cpu = this.createFallbackFighter({
      tag: "cpu",
      x: 3.8,
      baseYaw: -Math.PI / 2,
      punchDirection: -1,
      hitDirection: 1,
      homeArmRotation: 0.4,
      torsoHex: "#f85149",
      gloveHex: "#ef4444",
      leadSide: "right",
      rearSide: "left",
    });
    this.applyPendingVisuals();
  }

  async loadFighters() {
    try {
      const loaded = await Promise.all([
        this.loadSingleFighter("player", -3.8, Math.PI / 2),
        this.loadSingleFighter("cpu", 3.8, -Math.PI / 2),
      ]);
      this.player = loaded[0];
      this.cpu = loaded[1];
      this.useFallbackFighters = false;
      this.applyPendingVisuals();
    } catch (error) {
      this.loadFallbackFighters();
    }
  }

  mapBones(skeleton) {
    const out = {
      leftUpper: null,
      leftLower: null,
      rightUpper: null,
      rightLower: null,
    };
    if (!skeleton) {
      return out;
    }
    const patterns = [
      { key: "leftUpper", rx: /(left.*arm|upperarm.*left|l.*upperarm|Bip01_L_UpperArm)/i },
      { key: "leftLower", rx: /(left.*forearm|lowerarm.*left|l.*forearm|Bip01_L_Forearm)/i },
      { key: "rightUpper", rx: /(right.*arm|upperarm.*right|r.*upperarm|Bip01_R_UpperArm)/i },
      { key: "rightLower", rx: /(right.*forearm|lowerarm.*right|r.*forearm|Bip01_R_Forearm)/i },
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      const p = patterns[i];
      for (let j = 0; j < skeleton.bones.length; j += 1) {
        const bone = skeleton.bones[j];
        if (p.rx.test(bone.name)) {
          out[p.key] = bone;
          break;
        }
      }
    }
    return out;
  }

  applyPendingVisuals() {
    if (this.pendingEnemy) {
      this.setEnemy(this.pendingEnemy);
    }
    this.setPlayerGloveBonus(this.pendingGloveBonus);
  }

  setFighterTint(fighter, bodyHex, gloveHex, auraStrength) {
    if (!fighter) {
      return;
    }
    fighter.colorHex = bodyHex;
    fighter.gloveHex = gloveHex;
    if (fighter.mode === "fallback") {
      fighter.torsoMaterial.diffuseColor = BABYLON.Color3.FromHexString(bodyHex);
      fighter.gloveMaterial.diffuseColor = BABYLON.Color3.FromHexString(gloveHex);
      fighter.auraMaterial.diffuseColor = BABYLON.Color3.FromHexString(bodyHex);
      fighter.auraMaterial.alpha = auraStrength > 0 ? 0.28 : 0;
      return;
    }
    for (let i = 0; i < fighter.meshes.length; i += 1) {
      const mesh = fighter.meshes[i];
      if (!mesh.material || !mesh.material.diffuseColor) {
        continue;
      }
      const name = mesh.name.toLowerCase();
      if (name.includes("hand") || name.includes("forearm")) {
        mesh.material.diffuseColor = BABYLON.Color3.FromHexString(gloveHex);
      } else if (name.includes("body") || name.includes("shirt") || name.includes("torso")) {
        mesh.material.diffuseColor = BABYLON.Color3.FromHexString(bodyHex);
      } else if (auraStrength > 0) {
        mesh.material.emissiveColor = BABYLON.Color3.FromHexString(bodyHex).scale(auraStrength);
      }
    }
  }

  setEnemy(enemy) {
    this.pendingEnemy = enemy;
    if (!this.cpu) {
      return;
    }
    const bodyHex = `#${enemy.color.toString(16).padStart(6, "0")}`;
    const gloveHex = `#${enemy.gloveColor.toString(16).padStart(6, "0")}`;
    this.setFighterTint(this.cpu, bodyHex, gloveHex, enemy.isBoss ? 0.15 : 0);
  }

  setPlayerGloveBonus(glovesBonus) {
    this.pendingGloveBonus = glovesBonus;
    if (!this.player) {
      return;
    }
    let gloveHex = "#e5536c";
    if (glovesBonus >= 6) {
      gloveHex = "#ffd86b";
    } else if (glovesBonus >= 4) {
      gloveHex = "#ff7b8a";
    } else if (glovesBonus >= 2) {
      gloveHex = "#ff5f73";
    }
    this.setFighterTint(this.player, "#3fb950", gloveHex, 0);
  }

  setBoneRotation(fighter, key, addVec) {
    const bone = fighter.bones[key];
    const base = fighter.baseRot[key];
    if (!bone || !base) {
      return;
    }
    const target = new BABYLON.Vector3(base.x + addVec.x, base.y + addVec.y, base.z + addVec.z);
    bone.setRotation(target, BABYLON.Space.LOCAL, fighter.root);
  }

  applyPose(fighter, pose) {
    this.setBoneRotation(fighter, "leftUpper", pose.leftUpper || BABYLON.Vector3.Zero());
    this.setBoneRotation(fighter, "leftLower", pose.leftLower || BABYLON.Vector3.Zero());
    this.setBoneRotation(fighter, "rightUpper", pose.rightUpper || BABYLON.Vector3.Zero());
    this.setBoneRotation(fighter, "rightLower", pose.rightLower || BABYLON.Vector3.Zero());
  }

  punch(side) {
    const fighter = side === "player" ? this.player : this.cpu;
    if (!fighter || fighter.isPunching) {
      return;
    }
    fighter.isPunching = true;

    const useLead = fighter.nextHand === "lead";
    const handSide = useLead ? fighter.leadSide : fighter.rearSide;
    fighter.nextHand = useLead ? "rear" : "lead";

    const dir = side === "player" ? 1 : -1;
    const jab = useLead;
    const windup = jab ? 0.18 : 0.34;
    const strike = jab ? 0.52 : 0.85;
    const elbowBend = jab ? -0.24 : -0.42;
    const bodyBack = jab ? 0.09 : 0.14;
    const bodyForward = jab ? 0.16 : 0.25;

    const guardPose = {
      leftUpper: new BABYLON.Vector3(0.1, 0, side === "player" ? -0.18 : 0.18),
      leftLower: new BABYLON.Vector3(-0.15, 0, side === "player" ? -0.12 : 0.12),
      rightUpper: new BABYLON.Vector3(0.1, 0, side === "player" ? 0.18 : -0.18),
      rightLower: new BABYLON.Vector3(-0.15, 0, side === "player" ? 0.12 : -0.12),
    };

    const withHand = (phaseUpper, phaseLower) => {
      const pose = {
        leftUpper: guardPose.leftUpper.clone(),
        leftLower: guardPose.leftLower.clone(),
        rightUpper: guardPose.rightUpper.clone(),
        rightLower: guardPose.rightLower.clone(),
      };
      if (handSide === "left") {
        pose.leftUpper = pose.leftUpper.add(phaseUpper);
        pose.leftLower = pose.leftLower.add(phaseLower);
      } else {
        pose.rightUpper = pose.rightUpper.add(phaseUpper);
        pose.rightLower = pose.rightLower.add(phaseLower);
      }
      return pose;
    };

    if (fighter.mode === "fallback") {
      const punchArm = useLead ? fighter.leadArmPivot : fighter.rearArmPivot;
      if (punchArm) {
        punchArm.rotation.z = -0.45 * dir;
      }
    } else {
      this.applyPose(
        fighter,
        withHand(new BABYLON.Vector3(-windup, 0, -0.2 * dir), new BABYLON.Vector3(elbowBend, 0, 0))
      );
    }
    fighter.root.position.x = fighter.baseX - bodyBack * dir;
    fighter.root.rotation.y += 0.04 * dir;

    setTimeout(() => {
      if (fighter.mode === "fallback") {
        const punchArm = useLead ? fighter.leadArmPivot : fighter.rearArmPivot;
        if (punchArm) {
          punchArm.rotation.z = 0.6 * dir;
        }
      } else {
        this.applyPose(fighter, withHand(new BABYLON.Vector3(strike, 0, 0.5 * dir), new BABYLON.Vector3(-0.1, 0, 0)));
      }
      fighter.root.position.x = fighter.baseX + bodyForward * dir;
      fighter.root.rotation.y -= 0.09 * dir;
    }, 70);

    setTimeout(() => {
      if (fighter.mode === "fallback") {
        fighter.leadArmPivot.rotation.z = side === "player" ? -0.4 : 0.4;
        fighter.rearArmPivot.rotation.z = side === "player" ? 0.29 : -0.29;
      } else {
        this.applyPose(fighter, guardPose);
      }
      fighter.root.position.x = fighter.baseX;
      fighter.root.rotation.y = fighter.baseYaw;
    }, 210);

    setTimeout(() => {
      fighter.isPunching = false;
    }, 280);
  }

  hit(side) {
    const fighter = side === "player" ? this.player : this.cpu;
    if (!fighter) {
      return;
    }
    fighter.root.position.x = fighter.baseX + fighter.hitDirection * 0.18;
    setTimeout(() => {
      fighter.root.position.x = fighter.baseX;
    }, 120);
  }
}

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

const renderer = new FightRenderer("fight-canvas");

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

function updateGloveVisual() {
  renderer.setPlayerGloveBonus(glovesBonus);
}

function updateEnemyVisual() {
  cpuNameEl.textContent = currentEnemy.name;
  renderer.setEnemy(currentEnemy);
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

function animatePunch(side) {
  renderer.punch(side);
}

function animateHit(side) {
  renderer.hit(side);
}

function playerPunch() {
  if (isGameOver) {
    return;
  }

  animatePunch("player");
  const playerDamage = getRandomDamage() + getPlayerAttackBonus();
  cpuHp = Math.max(0, cpuHp - playerDamage);
  animateHit("cpu");
  addLog(`Player punches ${currentEnemy.name} for ${playerDamage} damage.`);
  updateUi();

  if (cpuHp === 0) {
    endGame("Player");
    return;
  }

  animatePunch("cpu");
  const cpuDamage = getRandomDamage() + Math.floor(level / 2) + currentEnemy.damageBonus;
  playerHp = Math.max(0, playerHp - cpuDamage);
  animateHit("player");
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
