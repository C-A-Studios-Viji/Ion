"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type CrystalKey =
  | "malachite"
  | "amethyst"
  | "quartz"
  | "obsidian"
  | "citrine"
  | "fluorite"
  | "corrupted";

type ItemKey = "soul" | "royalBattery" | "obsidianMagazine" | "citrineRush" | "persKey" | "crystalWard";
type EnemyKind = "entity" | "sound" | "prism" | "mimic" | "wraith" | "blob" | "crawler" | "watcher" | "haidini";

type Screen =
  | "start"
  | "tutorial"
  | "pause"
  | "dead"
  | "win"
  | "crafter"
  | "infusionsmith"
  | "archive"
  | "pershub"
  | "inventory"
  | "banish"
  | null;

type CrystalInfo = {
  label: string;
  short: string;
  color: number;
  css: string;
  effect: string;
  target: "GUN" | "LIGHT" | "SUIT" | "BOTH";
};

type HudState = {
  room: number;
  roomName: string;
  tier: string;
  ammo: number;
  maxAmmo: number;
  battery: number;
  flashlightOn: boolean;
  crystals: Record<CrystalKey, number>;
  discovered: CrystalKey[];
  gunInfusion: CrystalKey | null;
  lightInfusion: CrystalKey | null;
  keys: number;
  objective: string;
  prompt: string;
  entityDistance: number;
  grinRoom: number;
  grinTeleportIn: number;
  grinWarning: boolean;
  grinWarningIn: number;
  hiding: boolean;
  chaseLevel: number;
  blobDistance: number;
  deathReason: string;
  haidIniActive: boolean;
  inventory: Record<ItemKey, number>;
  basdinos: number;
  wardCharges: number;
  speedBoostRooms: number;
};

type Pickup = {
  object: THREE.Group;
  kind: "crystal" | "ammo" | "battery";
  crystal?: CrystalKey;
  mandatory?: boolean;
};

type Station = {
  object: THREE.Group;
  kind: "crafter" | "infusionsmith" | "archive" | "resonator" | "trapdoor" | "pershub";
  activated?: boolean;
};

type Enemy = {
  object: THREE.Group;
  kind: EnemyKind;
  speed: number;
  alive: boolean;
  teleportTimer: number;
  revealOnly?: boolean;
  phase: number;
  wanderTarget: THREE.Vector3;
  wanderTimer: number;
};

type Hazard = {
  object: THREE.Group;
  radius: number;
  phase: number;
  cooldown: number;
};

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  roomGroup: THREE.Group;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  room: number;
  roomName: string;
  tier: number;
  player: THREE.Vector3;
  verticalVelocity: number;
  grounded: boolean;
  yaw: number;
  pitch: number;
  keysDown: Set<string>;
  touchMove: { x: number; y: number; sprint: boolean };
  lastTouchLook: { x: number; y: number; id: number } | null;
  flashlight: THREE.SpotLight;
  luxuryLight: THREE.PointLight;
  flashTarget: THREE.Object3D;
  flashlightOn: boolean;
  battery: number;
  ammo: number;
  maxAmmo: number;
  crystals: Record<CrystalKey, number>;
  discovered: Set<CrystalKey>;
  gunInfusion: CrystalKey | null;
  lightInfusion: CrystalKey | null;
  accessKeys: number;
  pickups: Pickup[];
  stations: Station[];
  enemies: Enemy[];
  hazards: Hazard[];
  obstacles: THREE.Box3[];
  flickerLights: THREE.PointLight[];
  hiddenObjects: THREE.Object3D[];
  door: THREE.Group | null;
  doorPanels: THREE.Mesh[];
  doorUnlocked: boolean;
  doorOpening: boolean;
  doorProgress: number;
  doorPers: THREE.Group | null;
  doorRedLight: THREE.PointLight | null;
  doorCreaked: boolean;
  requiredResonators: number;
  activeResonators: number;
  mandatoryCrystal: CrystalKey | null;
  mandatoryCollected: boolean;
  objective: string;
  prompt: string;
  nearest: { kind: "pickup" | "station" | "door"; index?: number } | null;
  running: boolean;
  dead: boolean;
  won: boolean;
  cameraMode: boolean;
  spawnGrace: number;
  roomSpawnTimer: number;
  roomEntitySpawned: boolean;
  grinRoom: number;
  grinTeleportTimer: number;
  grinTargetRoom: number;
  grinWarningTimer: number;
  grinIncoming: boolean;
  hiding: boolean;
  haidIniActive: boolean;
  persHubActive: boolean;
  persActor: THREE.Group | null;
  persLight: THREE.PointLight | null;
  inventory: Record<ItemKey, number>;
  basdinos: number;
  basdinoModels: THREE.Group[];
  wardCharges: number;
  speedBoostRooms: number;
  banishedUntil: Partial<Record<EnemyKind, number>>;
  chaseRoom: boolean;
  chaseLevel: number;
  lastFrame: number;
  hudTimer: number;
  footstepTimer: number;
  gunKick: number;
  transition: number;
  transitionDirection: number;
  gunModel: THREE.Group;
  clock: THREE.Clock;
  audio: AudioEngine | null;
  checkpoint: SaveData | null;
};

type SaveData = {
  room: number;
  ammo: number;
  battery: number;
  crystals: Record<CrystalKey, number>;
  discovered: CrystalKey[];
  gunInfusion: CrystalKey | null;
  lightInfusion: CrystalKey | null;
  accessKeys: number;
  maxAmmo: number;
  inventory?: Record<ItemKey, number>;
  basdinos?: number;
  wardCharges?: number;
  speedBoostRooms?: number;
  banishedUntil?: Partial<Record<EnemyKind, number>>;
};

type ActionApi = {
  start: (fresh?: boolean) => void;
  resume: () => void;
  interact: () => void;
  fire: () => void;
  toggleLight: () => void;
  jump: () => void;
  close: () => void;
  craft: (id: string) => void;
  infuse: (key: CrystalKey) => void;
  synthesizeFluorite: () => void;
  buyPersItem: () => void;
  buyBasdino: () => void;
  openInventory: () => void;
  useItem: (key: ItemKey) => void;
  banish: (kind: EnemyKind) => void;
  restartCheckpoint: () => void;
  touchMoveStart: (x: number, y: number, id: number) => void;
  touchMoveUpdate: (x: number, y: number, id: number) => void;
  touchMoveEnd: (id: number) => void;
  touchLookStart: (x: number, y: number, id: number) => void;
  touchLookUpdate: (x: number, y: number, id: number) => void;
  touchLookEnd: (id: number) => void;
  setSprint: (value: boolean) => void;
};

const CRYSTAL_KEYS: CrystalKey[] = [
  "malachite",
  "amethyst",
  "quartz",
  "obsidian",
  "citrine",
  "fluorite",
  "corrupted",
];
const FOUND_CRYSTAL_KEYS: CrystalKey[] = CRYSTAL_KEYS.filter((key) => key !== "fluorite");

const EMPTY_INVENTORY = (): Record<ItemKey, number> => ({
  soul: 0, royalBattery: 0, obsidianMagazine: 0, citrineRush: 0, persKey: 0, crystalWard: 0,
});

const ITEMS: Record<ItemKey, { label: string; note: string; color: string }> = {
  soul: { label: "Soul of Sadist", note: "Choose one entity class to banish for 15 rooms.", color: "#ff3159" },
  royalBattery: { label: "Royal Battery", note: "Instantly restores the luxury flashlight to full charge.", color: "#ffe5a4" },
  obsidianMagazine: { label: "Obsidian Magazine", note: "Loads six armour-piercing rounds.", color: "#9b86c4" },
  citrineRush: { label: "Citrine Rush", note: "Grants a major speed boost for five rooms.", color: "#ffd55f" },
  persKey: { label: "Pers Master Key", note: "Adds two pressure-door bypass keys.", color: "#ff5c72" },
  crystalWard: { label: "Crystal Ward", note: "Stores one emergency contact shield.", color: "#68f1df" },
};

const CRYSTALS: Record<CrystalKey, CrystalInfo> = {
  malachite: {
    label: "Malachite",
    short: "MAL",
    color: 0x17db82,
    css: "#20e28d",
    effect: "Toxic ammunition that briefly destabilises hostile crystal tissue.",
    target: "GUN",
  },
  amethyst: {
    label: "Amethyst",
    short: "AME",
    color: 0x9c63ff,
    css: "#a77bff",
    effect: "Psychic rounds stun lesser entities and disrupt teleports.",
    target: "GUN",
  },
  quartz: {
    label: "Quartz",
    short: "QTZ",
    color: 0xdff8ff,
    css: "#dff8ff",
    effect: "A stronger, wider flashlight beam with slower battery drain.",
    target: "LIGHT",
  },
  obsidian: {
    label: "Obsidian",
    short: "OBS",
    color: 0x291b43,
    css: "#736099",
    effect: "High-impact rounds destroy lesser entities instantly.",
    target: "GUN",
  },
  citrine: {
    label: "Citrine",
    short: "CIT",
    color: 0xffc83d,
    css: "#ffd55f",
    effect: "Routes surplus energy into movement and flashlight output.",
    target: "SUIT",
  },
  fluorite: {
    label: "Fluorite",
    short: "FLU",
    color: 0x4fe4d2,
    css: "#68f1df",
    effect: "Reveals hidden specimens, false walls, and dormant mimics.",
    target: "LIGHT",
  },
  corrupted: {
    label: "Corrupted",
    short: "ERR",
    color: 0xff165d,
    css: "#ff356f",
    effect: "Extreme output with unstable drain, interference, and distortion.",
    target: "BOTH",
  },
};

const EMPTY_COUNTS = (): Record<CrystalKey, number> => ({
  malachite: 0,
  amethyst: 0,
  quartz: 0,
  obsidian: 0,
  citrine: 0,
  fluorite: 0,
  corrupted: 0,
});

const MILESTONES: Record<number, CrystalKey> = {
  3: "malachite",
  8: "amethyst",
  16: "quartz",
  28: "obsidian",
  42: "citrine",
  75: "corrupted",
};

const TIERS = [
  "CONTAINMENT",
  "RESONANCE",
  "FRACTURE",
  "BLACKOUT",
  "INVERSION",
  "BREACH",
  "COLLAPSE",
  "ION",
];

const ROOM_NAMES = [
  "Malachite Caves",
  "Amethyst Caverns",
  "Quartz Tunnels",
  "Storage Vaults",
  "Corrupted Laboratory",
  "Sublevel Transit",
  "Crystal Nursery",
  "Resonance Gallery",
];

const TUTORIAL_STEPS = [
  {
    number: "01",
    label: "MOVE & SEARCH",
    title: "Every room has a way through.",
    body: "Move carefully, search the physical environment and approach glowing items or machinery. The prompt at the centre tells you when something can be used.",
    desktop: "WASD MOVE · SHIFT SPRINT · MOUSE LOOK · E INTERACT",
    touch: "LEFT PAD MOVE · RIGHT PAD LOOK · USE TO INTERACT",
  },
  {
    number: "02",
    label: "LIGHT & SUPPLIES",
    title: "Your flashlight is powerful—not permanent.",
    body: "The wider flashlight illuminates caves and reveals danger, but its battery drains while active. Collect cells, ammunition and crystals before pushing deeper.",
    desktop: "F TOGGLE FLASHLIGHT · WATCH BATTERY AND AMMO",
    touch: "LIGHT TOGGLE · WATCH BATTERY AND AMMO",
  },
  {
    number: "03",
    label: "THE GRIN & TRAPDOORS",
    title: "Red flashes mean you have ten seconds.",
    body: "Before the Grin enters your room, the screen flashes red for ten seconds. Find the floor trapdoor in every room and press interact to hide. The sealed hatch grants contact immunity until you climb out. Trapdoors jam during Blob chases.",
    desktop: "RED FLASH · FIND HATCH · E TO HIDE OR EXIT",
    touch: "RED FLASH · FIND HATCH · USE TO HIDE OR EXIT",
  },
  {
    number: "04",
    label: "HAID-INI",
    title: "The orange stripes follow you underground.",
    body: "Haid-Ini is slow, but it can enter every trapdoor and cannot be harmed by gunfire. When it appears, tune all 30 resonators around the room to overload and banish it.",
    desktop: "KEEP MOVING · E TUNE ×30 · DO NOT HIDE",
    touch: "KEEP MOVING · USE TO TUNE ×30 · DO NOT HIDE",
  },
  {
    number: "05",
    label: "CRYSTAL WHIRLPOOLS",
    title: "The whirlpools are escape routes.",
    body: "Enter the bright centre of a stable crystal whirlpool to be thrown forward through the room. In chase halls, they launch you over difficult parkour sections.",
    desktop: "RUN INTO THE CORE · STEER WHILE AIRBORNE",
    touch: "RUN INTO THE CORE · STEER WHILE AIRBORNE",
  },
  {
    number: "06",
    label: "BLOB CHASES",
    title: "Every 25th room becomes a chase.",
    body: "The overlit evacuation hall seals behind you as the Blob advances. Jump barriers and use whirlpools to escape. Every later chase is longer, tighter and faster.",
    desktop: "SPACE JUMP · SHIFT SPRINT · KEEP MOVING",
    touch: "JUMP · HOLD RUN · KEEP MOVING",
  },
  {
    number: "07",
    label: "FLUORITE & PERS HUB",
    title: "The main currency cannot be found.",
    body: "At an Infusionsmith, combine one Malachite, Amethyst, Quartz and Corrupted crystal to synthesize Fluorite. After the first chase, Room 32 contains Pers Hub: trade Fluorite for random inventory items or spend ten on a Basdino companion.",
    desktop: "SYNTHESIZE FLUORITE · VISIT PERS AT ROOM 32",
    touch: "SYNTHESIZE FLUORITE · VISIT PERS AT ROOM 32",
  },
  {
    number: "08",
    label: "INVENTORY & BASDINOS",
    title: "Carry miracles. Never trust them.",
    body: "Open the new inventory to use Pers items. A Soul of Sadist lets you choose an entity to banish. Basdinos follow you and sacrifice themselves to absorb one otherwise-fatal contact.",
    desktop: "CLICK INVENTORY · CHOOSE ITEMS · REACH ROOM 200",
    touch: "TAP INVENTORY · CHOOSE ITEMS · REACH ROOM 200",
  },
];

const INITIAL_HUD: HudState = {
  room: 1,
  roomName: "Intake Corridor",
  tier: "CONTAINMENT",
  ammo: 6,
  maxAmmo: 8,
  battery: 100,
  flashlightOn: true,
  crystals: EMPTY_COUNTS(),
  discovered: [],
  gunInfusion: null,
  lightInfusion: null,
  keys: 0,
  objective: "Reach the pressure door",
  prompt: "",
  entityDistance: 99,
  grinRoom: 88,
  grinTeleportIn: 8,
  grinWarning: false,
  grinWarningIn: 0,
  hiding: false,
  chaseLevel: 0,
  blobDistance: 99,
  deathReason: "CONTACT LOST",
  haidIniActive: false,
  inventory: EMPTY_INVENTORY(),
  basdinos: 0,
  wardCharges: 0,
  speedBoostRooms: 0,
};

class AudioEngine {
  context: AudioContext;
  master: GainNode;
  entityGain: GainNode;
  entityPanner: PannerNode;
  entityOsc: OscillatorNode;
  humGain: GainNode;

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.24;
    this.master.connect(this.context.destination);
    const hum = this.context.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 43;
    this.humGain = this.context.createGain();
    this.humGain.gain.value = 0.085;
    hum.connect(this.humGain).connect(this.master);
    hum.start();
    this.entityOsc = this.context.createOscillator();
    this.entityOsc.type = "sawtooth";
    this.entityOsc.frequency.value = 31;
    this.entityGain = this.context.createGain();
    this.entityGain.gain.value = 0;
    this.entityPanner = this.context.createPanner();
    this.entityPanner.panningModel = "HRTF";
    this.entityPanner.distanceModel = "inverse";
    this.entityPanner.refDistance = 1;
    this.entityPanner.maxDistance = 30;
    this.entityPanner.rolloffFactor = 1.8;
    this.entityOsc.connect(this.entityGain).connect(this.entityPanner).connect(this.master);
    this.entityOsc.start();
  }

  resume() { void this.context.resume(); }

  setEntity(position: THREE.Vector3, distance: number, active: boolean) {
    const t = this.context.currentTime;
    this.entityPanner.positionX.setTargetAtTime(position.x, t, 0.05);
    this.entityPanner.positionY.setTargetAtTime(position.y, t, 0.05);
    this.entityPanner.positionZ.setTargetAtTime(position.z, t, 0.05);
    const gain = active ? Math.max(0.012, 0.38 * (1 - Math.min(distance, 22) / 22)) : 0;
    this.entityGain.gain.setTargetAtTime(gain, t, 0.06);
    this.entityOsc.frequency.setTargetAtTime(27 + Math.max(0, 13 - distance) * 1.7, t, 0.1);
  }

  setListener(position: THREE.Vector3, forward: THREE.Vector3) {
    const listener = this.context.listener;
    const t = this.context.currentTime;
    listener.positionX.setTargetAtTime(position.x, t, 0.02);
    listener.positionY.setTargetAtTime(position.y, t, 0.02);
    listener.positionZ.setTargetAtTime(position.z, t, 0.02);
    listener.forwardX.setTargetAtTime(forward.x, t, 0.02);
    listener.forwardY.setTargetAtTime(forward.y, t, 0.02);
    listener.forwardZ.setTargetAtTime(forward.z, t, 0.02);
    listener.upX.setTargetAtTime(0, t, 0.02);
    listener.upY.setTargetAtTime(1, t, 0.02);
    listener.upZ.setTargetAtTime(0, t, 0.02);
  }

  pulse(kind: "shot" | "step" | "pickup" | "door" | "teleport" | "error") {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const settings = {
      shot: [118, 36, 0.16, "square"],
      step: [74, 48, 0.07, "sine"],
      pickup: [660, 1040, 0.18, "sine"],
      door: [52, 24, 0.42, "sawtooth"],
      teleport: [240, 28, 0.28, "sawtooth"],
      error: [96, 78, 0.15, "square"],
    }[kind] as [number, number, number, OscillatorType];
    osc.type = settings[3];
    osc.frequency.setValueAtTime(settings[0], now);
    osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
    filter.type = "lowpass";
    filter.frequency.value = kind === "pickup" ? 2400 : 780;
    gain.gain.setValueAtTime(kind === "shot" ? 0.5 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings[2]);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + settings[2] + 0.02);
  }

  creak() {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(82, now);
    osc.frequency.exponentialRampToValueAtTime(19, now + 1.35);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 1.35);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(now); osc.stop(now + 1.45);
  }

  jumpscare() {
    const now = this.context.currentTime;
    const length = Math.floor(this.context.sampleRate * 0.9);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const noise = this.context.createBufferSource(); noise.buffer = buffer;
    const filter = this.context.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.setValueAtTime(1850, now); filter.Q.value = 0.72;
    const gain = this.context.createGain(); gain.gain.setValueAtTime(0.001, now); gain.gain.exponentialRampToValueAtTime(0.72, now + 0.018); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
    noise.connect(filter).connect(gain).connect(this.master); noise.start(now); noise.stop(now + 0.9);
    [63, 91, 147].forEach((frequency, index) => {
      const osc = this.context.createOscillator(); const voice = this.context.createGain();
      osc.type = index === 2 ? "square" : "sawtooth"; osc.frequency.setValueAtTime(frequency * 2.7, now); osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.62);
      voice.gain.setValueAtTime(0.34 / (index + 1), now); voice.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(voice).connect(this.master); osc.start(now); osc.stop(now + 0.72);
    });
  }
}

function seeded(seed: number) {
  let value = Math.abs(Math.floor(seed)) + 1;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function ancestorOf(object: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}

export default function IonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const actionRef = useRef<ActionApi | null>(null);
  const screenRef = useRef<Screen>("start");
  const [screen, setScreen] = useState<Screen>("start");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [toast, setToast] = useState("FACILITY LINK ESTABLISHED");
  const [touchCapable, setTouchCapable] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const showScreen = (value: Screen) => {
    screenRef.current = value;
    setScreen(value);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglUnavailable(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010306);
    scene.fog = new THREE.FogExp2(0x03090b, 0.047);
    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 100);
    scene.add(camera);
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0, -0.08, -12);
    camera.add(flashTarget);
    const flashlight = new THREE.SpotLight(0xe5f9ff, 92, 31, 0.44, 0.64, 1.35);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(768, 768);
    flashlight.position.set(0.08, -0.08, 0);
    flashlight.target = flashTarget;
    camera.add(flashlight);
    const luxuryLight = new THREE.PointLight(0xd8f5ff, 0, 14, 1.8);
    luxuryLight.position.set(0, 1.15, -0.6);
    camera.add(luxuryLight);
    const gunModel = createGunModel();
    gunModel.position.set(0.43, -0.38, -0.72);
    gunModel.rotation.set(-0.05, -0.05, 0);
    camera.add(gunModel);
    const runtime: Runtime = {
      renderer, scene, camera, roomGroup, roomWidth: 17, roomLength: 25, roomHeight: 6,
      room: 1, roomName: "Intake Corridor", tier: 0, player: new THREE.Vector3(0, 1.65, 8),
      verticalVelocity: 0, grounded: true,
      yaw: 0, pitch: 0, keysDown: new Set(), touchMove: { x: 0, y: 0, sprint: false }, lastTouchLook: null,
      flashlight, luxuryLight, flashTarget, flashlightOn: true, battery: 100, ammo: 6, maxAmmo: 8,
      crystals: EMPTY_COUNTS(), discovered: new Set(), gunInfusion: null, lightInfusion: null,
      accessKeys: 0, pickups: [], stations: [], enemies: [], hazards: [], obstacles: [], flickerLights: [], hiddenObjects: [],
      door: null, doorPanels: [], doorUnlocked: false, doorOpening: false, doorProgress: 0,
      doorPers: null, doorRedLight: null, doorCreaked: false,
      requiredResonators: 0, activeResonators: 0, mandatoryCrystal: null, mandatoryCollected: false,
      objective: "Reach the pressure door", prompt: "", nearest: null,
      running: false, dead: false, won: false, cameraMode: false, spawnGrace: 2,
      roomSpawnTimer: 5, roomEntitySpawned: false, chaseRoom: false, chaseLevel: 0,
      grinRoom: -1, grinTeleportTimer: 0, grinTargetRoom: -1, grinWarningTimer: 0, grinIncoming: false, hiding: false, haidIniActive: false,
      persHubActive: false, persActor: null, persLight: null, inventory: EMPTY_INVENTORY(), basdinos: 0, basdinoModels: [],
      wardCharges: 0, speedBoostRooms: 0, banishedUntil: {},
      lastFrame: performance.now(), hudTimer: 0, footstepTimer: 0, gunKick: 0, transition: 0, transitionDirection: 0,
      gunModel, clock: new THREE.Clock(), audio: null, checkpoint: null,
    };
    runtimeRef.current = runtime;

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x10171a, roughness: 0.62, metalness: 0.28 });
    const caveMaterial = new THREE.MeshStandardMaterial({ color: 0x101817, roughness: 0.72, metalness: 0.12 });
    const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x020205, roughness: 0.18, metalness: 0.62 });

    function updateHud(force = false) {
      if (!force && runtime.hudTimer < 0.09) return;
      runtime.hudTimer = 0;
      const grin = runtime.enemies.find((enemy) => enemy.kind === "entity" && enemy.alive);
      const entityDistance = grin ? grin.object.position.distanceTo(runtime.player) : 99;
      const blob = runtime.enemies.find((enemy) => enemy.kind === "blob" && enemy.alive);
      const blobDistance = blob ? blob.object.position.distanceTo(runtime.player) : 99;
      setHud({ room: runtime.room, roomName: runtime.roomName, tier: TIERS[runtime.tier] ?? "ION",
        ammo: runtime.ammo, maxAmmo: runtime.maxAmmo, battery: runtime.battery, flashlightOn: runtime.flashlightOn,
        crystals: { ...runtime.crystals }, discovered: [...runtime.discovered], gunInfusion: runtime.gunInfusion,
        lightInfusion: runtime.lightInfusion, keys: runtime.accessKeys,
        objective: runtime.objective, prompt: runtime.prompt, entityDistance,
        grinRoom: runtime.grinRoom, grinTeleportIn: runtime.grinTeleportTimer,
        grinWarning: runtime.grinIncoming, grinWarningIn: runtime.grinWarningTimer, hiding: runtime.hiding,
        chaseLevel: runtime.chaseLevel, blobDistance, haidIniActive: runtime.haidIniActive,
        inventory: { ...runtime.inventory }, basdinos: runtime.basdinos, wardCharges: runtime.wardCharges,
        speedBoostRooms: runtime.speedBoostRooms,
        deathReason: runtime.dead ? runtime.objective : "CONTACT LOST" });
    }

    function notify(message: string) {
      setToast(message);
      window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 2600);
    }

    function addMesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3,
      rotation?: THREE.Euler, parent: THREE.Object3D = runtime.roomGroup) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      if (rotation) mesh.rotation.copy(rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function addBloodSplatters(rand: () => number, room: number) {
      if (room < 3) return;
      const bloodMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3d0208, emissive: 0x120002, emissiveIntensity: 0.08,
        roughness: 0.3, metalness: 0.05, clearcoat: 0.72, clearcoatRoughness: 0.22, side: THREE.DoubleSide });
      const severeRoom = /Corrupted|Laborator|Storage|Quarantine/.test(runtime.roomName);
      const floorCount = Math.min(9, 1 + Math.floor(runtime.tier * 0.8) + (severeRoom ? 3 : 0) + (rand() < 0.38 ? 1 : 0));
      const wallCount = Math.min(6, Math.floor(runtime.tier * 0.65) + (severeRoom ? 2 : 0) + (rand() < 0.24 ? 1 : 0));

      for (let i = 0; i < floorCount; i += 1) {
        const centerX = (rand() - 0.5) * (runtime.roomWidth - 4);
        const centerZ = (rand() - 0.5) * (runtime.roomLength - 5);
        const blotCount = 3 + Math.floor(rand() * 5);
        for (let blot = 0; blot < blotCount; blot += 1) {
          const radius = (0.11 + rand() * 0.5) * (severeRoom ? 1.25 : 1);
          const stain = addMesh(new THREE.CircleGeometry(radius, 9 + Math.floor(rand() * 7)), bloodMaterial.clone(),
            new THREE.Vector3(centerX + (rand() - 0.5) * 0.72, 0.012 + blot * 0.0004, centerZ + (rand() - 0.5) * 0.72),
            new THREE.Euler(-Math.PI / 2, 0, rand() * Math.PI));
          stain.scale.set(0.65 + rand() * 1.15, 0.38 + rand() * 0.82, 1);
          stain.castShadow = false;
        }
      }

      for (let i = 0; i < wallCount; i += 1) {
        const side = rand() < 0.5 ? -1 : 1;
        const wallX = side * (runtime.roomWidth / 2 - 0.258);
        const wallZ = (rand() - 0.5) * (runtime.roomLength - 5);
        const wallY = 0.7 + rand() * Math.max(1.2, runtime.roomHeight - 2);
        const blotCount = 4 + Math.floor(rand() * 5);
        for (let blot = 0; blot < blotCount; blot += 1) {
          const radius = 0.07 + rand() * 0.28;
          const stain = addMesh(new THREE.CircleGeometry(radius, 8 + Math.floor(rand() * 6)), bloodMaterial.clone(),
            new THREE.Vector3(wallX, wallY + (rand() - 0.5) * 0.72, wallZ + (rand() - 0.5) * 0.9),
            new THREE.Euler(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, rand() * Math.PI));
          stain.scale.set(0.45 + rand() * 1.1, 0.5 + rand() * 1.25, 1);
          stain.castShadow = false;
        }
        const drip = addMesh(new THREE.PlaneGeometry(0.05 + rand() * 0.08, 0.35 + rand() * 0.9), bloodMaterial.clone(),
          new THREE.Vector3(wallX, Math.max(0.2, wallY - 0.36), wallZ + (rand() - 0.5) * 0.28),
          new THREE.Euler(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0));
        drip.castShadow = false;
      }
    }

    function createCrystal(key: CrystalKey, size = 1, collectible = false) {
      const group = new THREE.Group();
      const info = CRYSTALS[key];
      const material = new THREE.MeshPhysicalMaterial({ color: info.color, emissive: info.color,
        emissiveIntensity: key === "obsidian" ? 0.18 : key === "corrupted" ? 1.4 : 0.52,
        roughness: key === "malachite" ? 0.48 : 0.18, metalness: key === "obsidian" ? 0.68 : 0.08,
        transmission: key === "quartz" || key === "amethyst" ? 0.2 : 0, thickness: 0.7,
        transparent: key === "quartz" || key === "amethyst", opacity: key === "quartz" ? 0.78 : 0.94 });
      const rand = seeded(key.length * 91 + Math.floor(size * 17));
      if (key === "malachite") {
        for (let i = 0; i < 13; i += 1) {
          const radius = (0.14 + rand() * 0.24) * size;
          const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
          sphere.position.set((rand() - 0.5) * size, rand() * 0.72 * size, (rand() - 0.5) * size);
          sphere.scale.y = 0.72 + rand() * 0.8;
          sphere.castShadow = true;
          group.add(sphere);
        }
      } else if (key === "fluorite") {
        for (let i = 0; i < 5; i += 1) {
          const edge = size * (0.28 + rand() * 0.32);
          const cube = new THREE.Mesh(new THREE.BoxGeometry(edge, edge, edge), material);
          cube.position.set((rand() - 0.5) * size, rand() * 0.6 * size, (rand() - 0.5) * size);
          cube.rotation.set(rand(), rand(), rand()); cube.castShadow = true; group.add(cube);
        }
      } else {
        const shards = key === "obsidian" ? 6 : 8;
        for (let i = 0; i < shards; i += 1) {
          const height = size * (0.45 + rand() * 0.9);
          const radius = size * (0.09 + rand() * 0.14);
          const shard = new THREE.Mesh(new THREE.ConeGeometry(radius, height, key === "obsidian" ? 5 : 6), material);
          shard.position.set((rand() - 0.5) * size, height * 0.5, (rand() - 0.5) * size);
          shard.rotation.set((rand() - 0.5) * 0.32, rand() * Math.PI, (rand() - 0.5) * 0.32);
          shard.castShadow = true; group.add(shard);
        }
      }
      group.scale.setScalar(collectible ? 0.72 : 1);
      group.userData.crystal = key;
      return group;
    }

    function createWhirlpool() {
      const group = new THREE.Group();
      const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), coreMaterial); core.rotation.x = -Math.PI / 2; core.position.y = 0.025; group.add(core);
      for (let i = 0; i < 5; i += 1) {
        const ringMaterial = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x55f7ff : 0x3aff9d, transparent: true, opacity: 0.62 - i * 0.05 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82 + i * 0.38, 0.045 + i * 0.008, 7, 42), ringMaterial);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.04 + i * 0.012; ring.userData.vortexRing = i % 2 ? -1 : 1; group.add(ring);
      }
      const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x0e6f74, emissive: 0x35ffd0, emissiveIntensity: 1.45, roughness: 0.24, metalness: 0.42 });
      for (let i = 0; i < 16; i += 1) {
        const angle = (i / 16) * Math.PI * 2; const radius = 1.1 + (i % 4) * 0.34;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.09 + (i % 3) * 0.03, 0.5 + (i % 5) * 0.12, 5), shardMaterial);
        shard.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius); shard.rotation.z = 0.75; shard.rotation.y = -angle; shard.userData.vortexShard = true; group.add(shard);
      }
      const light = new THREE.PointLight(0x42ffe0, 15, 7.5, 2); light.position.y = 0.45; group.add(light);
      return group;
    }

    function createStation(kind: Station["kind"], color: number) {
      const group = new THREE.Group();
      const casing = new THREE.MeshStandardMaterial({ color: 0x0d1417, metalness: 0.75, roughness: 0.3 });
      const screenMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.2 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.25, 0.72), casing); body.position.y = 0.63; body.castShadow = true; group.add(body);
      const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.48, 0.04), screenMaterial); screenMesh.position.set(0, 0.78, 0.39); group.add(screenMesh);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 0.32, 8), casing); base.position.y = 0.16; group.add(base);
      group.userData.station = kind;
      return group;
    }

    function createTrapdoor() {
      const group = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: 0x151b1d, metalness: 0.88, roughness: 0.34 });
      const warning = new THREE.MeshStandardMaterial({ color: 0x54202a, emissive: 0x26030b, emissiveIntensity: 0.45, metalness: 0.5, roughness: 0.38 });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 1.65), steel); frame.position.y = 0.055; group.add(frame);
      const voidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 1.24), new THREE.MeshBasicMaterial({ color: 0x000000 })); voidMesh.position.y = 0.125; group.add(voidMesh);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.1, 1.2), warning); lid.position.set(0, 0.19, 0); lid.castShadow = true; lid.userData.trapdoorLid = true; group.add(lid);
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.55, 10), steel); hinge.position.set(0, 0.25, 0.58); hinge.rotation.z = Math.PI / 2; group.add(hinge);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 7, 16, Math.PI), steel); handle.position.set(0, 0.27, -0.28); handle.rotation.x = Math.PI / 2; group.add(handle);
      [-0.7, 0.7].forEach((x) => { const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 1.05), warning); stripe.position.set(x, 0.255, 0); stripe.rotation.y = 0.34; group.add(stripe); });
      group.userData.station = "trapdoor";
      return group;
    }

    function createPersModel() {
      const group = new THREE.Group();
      const coat = new THREE.MeshPhysicalMaterial({ color: 0x5b0714, emissive: 0x350006, emissiveIntensity: 0.75, roughness: 0.28, clearcoat: 0.7 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd9a843, emissive: 0x5b2400, emissiveIntensity: 0.8, metalness: 0.82, roughness: 0.2 });
      const shadow = new THREE.MeshStandardMaterial({ color: 0x090306, roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.25, 6, 12), coat); body.position.y = 1.35; group.add(body);
      const cape = new THREE.Mesh(new THREE.ConeGeometry(0.82, 2.15, 10, 1, true), coat); cape.position.set(0, 1.2, 0.26); cape.rotation.x = 0.08; group.add(cape);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 12), shadow); head.position.y = 2.45; group.add(head);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.34, 7), gold); crown.position.y = 2.86; group.add(crown);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 18), gold); collar.position.y = 2.12; collar.rotation.x = Math.PI / 2; group.add(collar);
      [-1, 1].forEach((side) => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.88, 4, 7), coat); arm.position.set(side * 0.48, 1.55, 0); arm.rotation.z = side * 0.25; arm.userData.persArm = side; group.add(arm); });
      group.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = true; });
      return group;
    }

    function createBasdinoModel(index: number) {
      const group = new THREE.Group();
      const hide = new THREE.MeshPhysicalMaterial({ color: 0x245e4b, emissive: 0x0b291f, emissiveIntensity: 0.7, roughness: 0.38, clearcoat: 0.55 });
      const crystal = new THREE.MeshStandardMaterial({ color: 0x68f1df, emissive: 0x29a995, emissiveIntensity: 1.8, roughness: 0.16 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), hide); body.position.y = 0.42; body.scale.set(1.45, 0.8, 0.78); group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), hide); head.position.set(0, 0.62, -0.42); group.add(head);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), crystal); crest.position.set(0, 0.96, -0.35); group.add(crest);
      [-1, 1].forEach((side) => { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 3, 6), hide); leg.position.set(side * 0.22, 0.18, 0); leg.userData.basdinoLeg = side + index * 2; group.add(leg); });
      const light = new THREE.PointLight(0x68f1df, 7, 3.5); light.position.y = 0.75; group.add(light);
      group.scale.setScalar(0.82); return group;
    }

    function addPersHub() {
      const group = new THREE.Group();
      group.position.set(0, 0, -2.8);
      const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.78, 0.32, 16), new THREE.MeshStandardMaterial({ color: 0x17040a, metalness: 0.78, roughness: 0.25 }));
      dais.position.y = 0.16; group.add(dais);
      const actor = createPersModel(); actor.position.y = 0.32; actor.userData.persActor = true; group.add(actor);
      const light = new THREE.PointLight(0xff173f, 56, 13, 1.25); light.position.set(0, 2.4, 0); group.add(light);
      runtime.roomGroup.add(group); runtime.stations.push({ object: group, kind: "pershub", activated: false });
      runtime.persActor = actor; runtime.persLight = light;
      runtime.obstacles.push(new THREE.Box3().setFromCenterAndSize(group.position.clone().add(new THREE.Vector3(0, 0.7, 0)), new THREE.Vector3(2.8, 1.4, 2.8)));
    }

    function addBasdinoCompanions() {
      runtime.basdinoModels.forEach((model) => runtime.roomGroup.remove(model));
      runtime.basdinoModels = [];
      for (let index = 0; index < Math.min(runtime.basdinos, 5); index += 1) {
        const model = createBasdinoModel(index); model.position.copy(runtime.player).add(new THREE.Vector3((index - 2) * 0.55, -1.65, 2 + index * 0.45));
        runtime.roomGroup.add(model); runtime.basdinoModels.push(model);
      }
    }

    function createEntityModel(kind: Enemy["kind"]) {
      const group = new THREE.Group();
      if (kind === "entity") {
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.7, 5, 10), blackMaterial);
        torso.position.y = 1.45; torso.scale.set(0.62, 1, 0.52); group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.69, 22, 16), blackMaterial);
        head.position.y = 2.78; head.scale.set(1.06, 0.92, 0.72); group.add(head);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        [-0.29, 0.29].forEach((x) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), eyeMaterial);
          eye.position.set(x, 2.93, -0.57); eye.scale.set(1, 1.35, 0.35); group.add(eye);
        });
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), eyeMaterial);
        mouth.position.set(0, 2.58, -0.58); mouth.rotation.x = Math.PI; mouth.scale.set(1.05, 0.45, 0.25); group.add(mouth);
        const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.75 });
        for (let i = 0; i < 18; i += 1) {
          const x = -0.44 + (i % 9) * 0.11; const top = i < 9;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.18 + (i % 3) * 0.025, 5), toothMaterial);
          tooth.position.set(x, top ? 2.68 : 2.49, -0.765); tooth.rotation.z = top ? Math.PI : 0; group.add(tooth);
        }
        [-1, 1].forEach((side) => {
          const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.65, 4, 7), blackMaterial);
          arm.position.set(side * 0.54, 1.25, 0); arm.rotation.z = side * 0.13; arm.userData.limb = side; group.add(arm);
        });
      } else if (kind === "blob") {
        const flesh = new THREE.MeshPhysicalMaterial({ color: 0xb94c59, emissive: 0x3a070d, emissiveIntensity: 0.48,
          roughness: 0.22, metalness: 0.04, clearcoat: 0.82, clearcoatRoughness: 0.18 });
        const wetFlesh = new THREE.MeshPhysicalMaterial({ color: 0xe5858d, emissive: 0x46080d, emissiveIntensity: 0.32,
          roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(1.78, 28, 22), flesh); body.position.y = 1.78; body.scale.set(1.28, 1.18, 0.82); group.add(body);
        const eyeWhite = new THREE.MeshPhysicalMaterial({ color: 0xd7a5b0, roughness: 0.08, clearcoat: 1 });
        const irisMaterial = new THREE.MeshPhysicalMaterial({ color: 0x512a48, emissive: 0x260d22, emissiveIntensity: 0.65, roughness: 0.12, clearcoat: 1 });
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x080108 });
        [-0.72, 0.72].forEach((x) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.57, 20, 16), eyeWhite); eye.position.set(x, 2.28, -1.3); eye.scale.z = 0.44; group.add(eye);
          const iris = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), irisMaterial); iris.position.set(x, 2.28, -1.57); iris.scale.z = 0.22; group.add(iris);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), pupilMaterial); pupil.position.set(x, 2.28, -1.66); pupil.scale.z = 0.16; group.add(pupil);
        });
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.92, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ color: 0x130006 }));
        mouth.position.set(0, 1.1, -1.4); mouth.rotation.x = Math.PI; mouth.scale.set(0.92, 1.05, 0.3); group.add(mouth);
        const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xffeee0, roughness: 0.42 });
        for (let i = 0; i < 16; i += 1) {
          const x = -0.7 + (i % 8) * 0.2; const top = i < 8;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34 + (i % 3) * 0.07, 6), toothMaterial);
          tooth.position.set(x, top ? 1.48 : 0.72, -1.77); tooth.rotation.z = top ? Math.PI : 0; group.add(tooth);
        }
        const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.15, 5, 10), wetFlesh); tongue.position.set(0, 0.72, -1.84); tongue.rotation.x = -0.18; group.add(tongue);
        for (let i = 0; i < 10; i += 1) {
          const angle = (i / 10) * Math.PI * 2;
          const tendril = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 1.2 + (i % 4) * 0.28, 4, 7), wetFlesh);
          tendril.position.set(Math.cos(angle) * 1.52, 1.2 + Math.sin(i * 2.1) * 0.35, Math.sin(angle) * 0.72);
          tendril.rotation.z = Math.cos(angle) * 1.08; tendril.rotation.x = Math.sin(angle) * 0.6; tendril.userData.tendril = i; group.add(tendril);
        }
      } else if (kind === "haidini") {
        const orange = new THREE.MeshPhysicalMaterial({ color: 0xff6a00, emissive: 0x5a1600, emissiveIntensity: 0.42, roughness: 0.38, clearcoat: 0.45 });
        const stripe = new THREE.MeshStandardMaterial({ color: 0x120807, roughness: 0.55, metalness: 0.08 });
        const bone = new THREE.MeshStandardMaterial({ color: 0xffd7a3, emissive: 0x4c1b02, emissiveIntensity: 0.28, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.8, 7, 14), orange); body.position.y = 1.18; body.rotation.z = Math.PI / 2; body.scale.set(0.9, 1.25, 0.72); group.add(body);
        for (let i = 0; i < 7; i += 1) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.64 - Math.abs(i - 3) * 0.025, 0.075, 7, 22), stripe);
          band.position.set(-0.92 + i * 0.31, 1.18, 0); band.rotation.y = Math.PI / 2; band.scale.z = 0.72; group.add(band);
        }
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.92, 5, 10), orange); neck.position.set(0, 1.82, -0.72); neck.rotation.x = -0.52; group.add(neck);
        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.78, 6, 12), orange); head.position.set(0, 2.35, -1.12); head.rotation.x = Math.PI / 2; head.scale.set(0.9, 1.15, 0.82); group.add(head);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.72), stripe); muzzle.position.set(0, 2.14, -1.63); muzzle.rotation.x = -0.08; group.add(muzzle);
        [-0.22, 0.22].forEach((x) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 9), bone); eye.position.set(x, 2.5, -1.47); group.add(eye);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 9, 7), new THREE.MeshBasicMaterial({ color: 0x170000 })); pupil.position.set(x, 2.5, -1.57); group.add(pupil);
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.48, 6), stripe); ear.position.set(x * 1.35, 2.82, -1.05); ear.rotation.z = x < 0 ? 0.24 : -0.24; group.add(ear);
        });
        for (let i = 0; i < 9; i += 1) {
          const mane = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), stripe); mane.position.set(0, 2.66 - i * 0.17, -0.72 + i * 0.12); mane.rotation.x = -0.82; group.add(mane);
        }
        [-0.48, 0.48].forEach((x, sideIndex) => [-0.55, 0.55].forEach((z, legIndex) => {
          const limbIndex = sideIndex * 2 + legIndex;
          const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 1.02, 5, 8), orange); leg.position.set(x, 0.54, z); leg.userData.limb = limbIndex; group.add(leg);
          const legBand = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.045, 6, 14), stripe); legBand.position.set(x, 0.55, z); legBand.rotation.x = Math.PI / 2; group.add(legBand);
          const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.38), stripe); hoof.position.set(x, 0.09, z - 0.05); group.add(hoof);
        }));
        const warningLight = new THREE.PointLight(0xff5a00, 9, 6, 2); warningLight.position.set(0, 1.8, -0.8); group.add(warningLight);
      } else if (kind === "crawler") {
        const carapace = new THREE.MeshPhysicalMaterial({ color: 0x13080b, emissive: 0x26030a, emissiveIntensity: 0.42, roughness: 0.32, clearcoat: 0.7 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), carapace); body.position.y = 0.38; body.scale.set(1.5, 0.55, 1); group.add(body);
        for (let i = 0; i < 8; i += 1) {
          const side = i < 4 ? -1 : 1; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.85, 5), blackMaterial);
          leg.position.set(side * 0.52, 0.2, ((i % 4) - 1.5) * 0.2); leg.rotation.z = side * 1.08; leg.userData.limb = i; group.add(leg);
        }
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff1947 })); eye.position.set(0, 0.43, -0.5); group.add(eye);
      } else if (kind === "watcher") {
        const shell = new THREE.MeshPhysicalMaterial({ color: 0x172126, emissive: 0x173a44, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.52 });
        const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 2), shell); body.position.y = 1.5; body.scale.set(0.75, 1.7, 0.55); group.add(body);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), new THREE.MeshBasicMaterial({ color: 0xf2fcff })); iris.position.set(0, 1.58, -0.47); iris.scale.z = 0.25; group.add(iris);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0x05070a })); pupil.position.set(0, 1.58, -0.69); pupil.scale.z = 0.2; group.add(pupil);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.035, 7, 28), shell); halo.position.y = 1.5; halo.rotation.x = Math.PI / 2; group.add(halo);
      } else if (kind === "sound") {
        const body = createCrystal("obsidian", 1.4); body.rotation.z = Math.PI / 2; body.position.y = 0.6; group.add(body);
        for (let i = 0; i < 6; i += 1) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.85, 5), blackMaterial);
          leg.position.set((i < 3 ? -1 : 1) * 0.42, 0.25, ((i % 3) - 1) * 0.22); leg.rotation.z = (i < 3 ? -1 : 1) * 0.72; group.add(leg);
        }
      } else if (kind === "prism" || kind === "mimic") {
        const crystal = createCrystal(kind === "prism" ? "amethyst" : "quartz", 1.1);
        crystal.position.y = kind === "prism" ? 1.15 : 0; group.add(crystal);
        if (kind === "prism") { const glow = new THREE.PointLight(0x9c63ff, 11, 4.5); glow.position.y = 1.2; group.add(glow); }
      } else {
        const wraithMaterial = new THREE.MeshStandardMaterial({ color: 0xdcefff, emissive: 0x8ad7ff, emissiveIntensity: 2,
          transparent: true, opacity: 0, wireframe: true });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.65, 4, 10), wraithMaterial); body.position.y = 1.4; group.add(body);
        group.userData.wraithMaterial = wraithMaterial;
      }
      group.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = true; });
      return group;
    }

    function addEnemy(kind: Enemy["kind"], rand: () => number) {
      const object = createEntityModel(kind);
      object.position.set((rand() - 0.5) * (runtime.roomWidth - 4), 0, -runtime.roomLength * 0.18 + (rand() - 0.5) * 7);
      runtime.roomGroup.add(object);
      runtime.enemies.push({ object, kind, speed: kind === "entity" ? Math.min(10.5, 5.1 + runtime.room * 0.023) : kind === "blob" ? 4 : kind === "haidini" ? 0.78 + runtime.tier * 0.03 : kind === "crawler" ? 4.2 + runtime.tier * 0.24 : kind === "watcher" ? 3.3 + runtime.tier * 0.2 : 2 + runtime.tier * 0.28,
        alive: true, teleportTimer: 10, revealOnly: kind === "wraith", phase: rand() * Math.PI * 2,
        wanderTarget: new THREE.Vector3((rand() - 0.5) * (runtime.roomWidth - 4), 0, (rand() - 0.5) * (runtime.roomLength - 5)), wanderTimer: 1.5 + rand() * 2.5 });
    }

    function addBlobChase() {
      const object = createEntityModel("blob");
      object.position.set(0, 0, runtime.roomLength / 2 + 2.2); object.scale.setScalar(0.92 + runtime.chaseLevel * 0.035);
      runtime.roomGroup.add(object);
      runtime.enemies.push({ object, kind: "blob", speed: 3.55 + runtime.chaseLevel * 0.19, alive: true, teleportTimer: 99, phase: 0,
        wanderTarget: new THREE.Vector3(), wanderTimer: 99 });
    }

    function roomIdentity(room: number) {
      if (room === 1) return "Intake Corridor";
      if (room === 200) return "Extraction Room";
      if (room === 32) return "Pers Hub";
      if (room === 5 || room % 22 === 0) return "Crystal Crafter’s Workshop";
      if (room === 8 || room % 24 === 0) return "Infusionsmith Chamber";
      if (room === 13 || room % 27 === 0) return "Resonance Maintenance Bay";
      if (room % 25 === 0) return "Overlit Evacuation Run";
      if (room === 6 || room % 31 === 0) return "Crystal Archive";
      return ROOM_NAMES[(room * 5 + Math.floor(room / 7)) % ROOM_NAMES.length];
    }

    function clearRoom() {
      runtime.roomGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => material.dispose());
        }
      });
      runtime.roomGroup.clear();
      runtime.pickups = []; runtime.stations = []; runtime.enemies = []; runtime.hazards = []; runtime.obstacles = [];
      runtime.flickerLights = []; runtime.hiddenObjects = []; runtime.door = null; runtime.doorPanels = [];
      runtime.doorPers = null; runtime.doorRedLight = null; runtime.persActor = null; runtime.persLight = null; runtime.basdinoModels = [];
    }

    function buildDoor() {
      const group = new THREE.Group(); group.position.set(0, 0, -runtime.roomLength / 2 + 0.02);
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x151c20, metalness: 0.9, roughness: 0.24 });
      const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x222a2e, metalness: 0.74, roughness: 0.32 });
      const glowMaterial = new THREE.MeshStandardMaterial({ color: runtime.doorUnlocked ? 0x25ff9b : 0xff234f,
        emissive: runtime.doorUnlocked ? 0x25ff9b : 0xff234f, emissiveIntensity: 3.2 });
      addMesh(new THREE.BoxGeometry(5.3, 0.35, 0.45), frameMaterial, new THREE.Vector3(0, 4.5, 0), undefined, group);
      addMesh(new THREE.BoxGeometry(0.35, 4.7, 0.45), frameMaterial, new THREE.Vector3(-2.48, 2.2, 0), undefined, group);
      addMesh(new THREE.BoxGeometry(0.35, 4.7, 0.45), frameMaterial, new THREE.Vector3(2.48, 2.2, 0), undefined, group);
      const left = addMesh(new THREE.BoxGeometry(2.36, 4.1, 0.24), panelMaterial, new THREE.Vector3(-1.19, 2.12, 0), undefined, group);
      const right = addMesh(new THREE.BoxGeometry(2.36, 4.1, 0.24), panelMaterial, new THREE.Vector3(1.19, 2.12, 0), undefined, group);
      runtime.doorPanels = [left, right];
      const strip = addMesh(new THREE.BoxGeometry(0.12, 3.35, 0.08), glowMaterial, new THREE.Vector3(0, 2.15, 0.19), undefined, group);
      strip.userData.doorIndicator = true; strip.userData.liftingStrip = true;
      const pers = createPersModel(); pers.position.set(3.55, 0, 0.65); pers.rotation.y = -Math.PI / 2; pers.visible = false; group.add(pers);
      const redLight = new THREE.PointLight(0xff1238, 0, 12, 1.3); redLight.position.set(0, 2.3, 1.2); group.add(redLight);
      runtime.roomGroup.add(group); runtime.door = group; runtime.doorPers = pers; runtime.doorRedLight = redLight; runtime.doorCreaked = false;
    }

    function updateDoorIndicator() {
      runtime.door?.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.doorIndicator) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color.set(runtime.doorUnlocked ? 0x25ff9b : 0xff234f);
          material.emissive.set(runtime.doorUnlocked ? 0x25ff9b : 0xff234f);
        }
      });
    }

    function makePickup(kind: Pickup["kind"], position: THREE.Vector3, crystal?: CrystalKey, mandatory = false) {
      let object: THREE.Group;
      if (kind === "crystal" && crystal) object = createCrystal(crystal, 1, true);
      else {
        object = new THREE.Group(); const color = kind === "ammo" ? 0xff6b38 : 0x67e8ff;
        const material = new THREE.MeshStandardMaterial({ color: 0x151a1c, metalness: 0.8, roughness: 0.25 });
        const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 });
        object.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.38), material));
        object.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.4), glow));
      }
      object.position.copy(position); object.userData.baseY = position.y; runtime.roomGroup.add(object);
      runtime.pickups.push({ object, kind, crystal, mandatory }); return object;
    }

    function addStation(kind: Station["kind"], position: THREE.Vector3, color: number) {
      const object = createStation(kind, color); object.position.copy(position); object.rotation.y = position.x < 0 ? Math.PI / 2 : -Math.PI / 2;
      runtime.roomGroup.add(object); runtime.stations.push({ object, kind, activated: false });
      runtime.obstacles.push(new THREE.Box3().setFromCenterAndSize(position.clone().add(new THREE.Vector3(0, 0.7, 0)), new THREE.Vector3(1.6, 1.6, 1.1)));
      return object;
    }

    function addTrapdoor() {
      const object = createTrapdoor();
      object.position.set(runtime.roomWidth / 2 - 2.05, 0.01, runtime.roomLength / 2 - 4.4);
      runtime.roomGroup.add(object); runtime.stations.push({ object, kind: "trapdoor", activated: false });
      return object;
    }

    function buildChaseCourse(rand: () => number) {
      const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0xd9e5e4, emissive: 0x657675, emissiveIntensity: 0.32, metalness: 0.72, roughness: 0.27 });
      const warningMaterial = new THREE.MeshStandardMaterial({ color: 0xffb21f, emissive: 0xff5a00, emissiveIntensity: 1.15, roughness: 0.35 });
      const count = 4 + runtime.chaseLevel * 2;
      for (let i = 0; i < count; i += 1) {
        const progress = (i + 1) / (count + 1);
        const z = runtime.roomLength / 2 - 10 - progress * (runtime.roomLength - 22);
        const height = Math.min(1.16, 0.68 + (i % 3) * 0.13 + runtime.chaseLevel * 0.025);
        const split = runtime.chaseLevel >= 3 && i % 3 === 1;
        if (split) {
          const gapSide = i % 2 ? -1 : 1;
          const width = runtime.roomWidth * 0.63;
          const x = -gapSide * (runtime.roomWidth - width) / 2;
          const barrier = addMesh(new THREE.BoxGeometry(width, height, 0.7), barrierMaterial, new THREE.Vector3(x, height / 2, z));
          runtime.obstacles.push(new THREE.Box3().setFromObject(barrier));
        } else {
          const barrier = addMesh(new THREE.BoxGeometry(runtime.roomWidth - 1.6, height, 0.72), barrierMaterial, new THREE.Vector3(0, height / 2, z));
          runtime.obstacles.push(new THREE.Box3().setFromObject(barrier));
        }
        for (let stripe = -3; stripe <= 3; stripe += 1) {
          const marker = addMesh(new THREE.BoxGeometry(0.42, 0.07, 0.76), warningMaterial, new THREE.Vector3(stripe * 1.35, height + 0.045, z));
          marker.rotation.y = 0.32;
        }
        if ((i === 1 || i === Math.floor(count * 0.62)) && runtime.chaseLevel >= 2) {
          const whirlpool = createWhirlpool(); whirlpool.position.set((rand() - 0.5) * 2.4, 0, z + 4.2);
          runtime.roomGroup.add(whirlpool); runtime.hazards.push({ object: whirlpool, radius: 3.8, phase: rand() * Math.PI * 2, cooldown: 0 });
        }
      }
    }

    function buildRoom(room: number) {
      const previousRoom = runtime.room;
      clearRoom(); const rand = seeded(room * 1931 + 71); runtime.room = room;
      if (room > previousRoom && runtime.speedBoostRooms > 0) runtime.speedBoostRooms -= 1;
      runtime.tier = Math.min(7, Math.floor((room - 1) / 25)); runtime.roomName = roomIdentity(room);
      runtime.chaseRoom = room % 25 === 0 && room < 200; runtime.chaseLevel = runtime.chaseRoom ? room / 25 : 0;
      runtime.persHubActive = room === 32;
      runtime.haidIniActive = !runtime.chaseRoom && !runtime.persHubActive && room >= 30 && room < 200 && (room % 30 === 0 || rand() < 0.055 + runtime.tier * 0.006);
      if ((runtime.banishedUntil.haidini ?? 0) >= room) runtime.haidIniActive = false;
      if (runtime.haidIniActive) runtime.roomName = "Haid-Ini Resonance Lockdown";
      runtime.roomWidth = runtime.chaseRoom ? Math.max(10.8, 15.5 - runtime.chaseLevel * 0.42) : Math.max(11.6, 18 - runtime.tier * 0.72 + rand() * 2.2);
      runtime.roomLength = runtime.chaseRoom ? 64 + runtime.chaseLevel * 8 : 23 + rand() * 6 + runtime.tier * 0.35;
      runtime.roomHeight = runtime.chaseRoom ? 8.2 : Math.max(4.7, 7 - runtime.tier * 0.24 + rand());
      runtime.doorOpening = false; runtime.doorProgress = 0; runtime.mandatoryCrystal = MILESTONES[room] ?? null;
      runtime.mandatoryCollected = !runtime.mandatoryCrystal || runtime.discovered.has(runtime.mandatoryCrystal);
      runtime.requiredResonators = runtime.haidIniActive ? 30 : !runtime.persHubActive && room > 2 && room % 4 === 0 && room % 25 !== 0 ? Math.min(4, 2 + Math.floor(runtime.tier / 2)) : 0;
      runtime.activeResonators = 0;
      runtime.doorUnlocked = room === 1 || room === 200 || (runtime.requiredResonators === 0 && runtime.mandatoryCollected);
      runtime.hiding = false;
      const grinRoll = !runtime.chaseRoom && !runtime.haidIniActive && !runtime.persHubActive && room < 200
        && (runtime.banishedUntil.entity ?? 0) < room && rand() < 0.07;
      runtime.grinRoom = grinRoll ? room : -1; runtime.grinTargetRoom = runtime.grinRoom;
      runtime.grinIncoming = grinRoll; runtime.grinWarningTimer = grinRoll ? 10 : 0; runtime.grinTeleportTimer = 0;
      runtime.spawnGrace = 2.2; runtime.roomSpawnTimer = 0.12; runtime.roomEntitySpawned = !grinRoll;
      runtime.verticalVelocity = 0; runtime.grounded = true; runtime.cameraMode = false; runtime.player.set(0, 1.65, runtime.roomLength / 2 - 3.4); runtime.yaw = 0; runtime.pitch = 0;
      const cave = /Caves|Caverns|Tunnels|Nursery|Gallery/.test(runtime.roomName);
      const corruption = runtime.tier / 7;
      const fogColor = new THREE.Color().setRGB(0.008 + corruption * 0.035, 0.025 - corruption * 0.012, 0.03 + corruption * 0.025);
      scene.background = runtime.chaseRoom ? new THREE.Color(0xb7c8c8) : fogColor.clone().multiplyScalar(0.34);
      scene.fog = new THREE.FogExp2(runtime.chaseRoom ? 0xd9eded : fogColor, runtime.chaseRoom ? 0.008 : 0.039 + runtime.tier * 0.0068);
      renderer.toneMappingExposure = runtime.chaseRoom ? 1.22 : Math.max(0.52, 0.76 - runtime.tier * 0.028);
      const floorMaterial = cave ? caveMaterial.clone() : baseMaterial.clone(); floorMaterial.color.offsetHSL(0, 0, -runtime.tier * 0.008);
      addMesh(new THREE.PlaneGeometry(runtime.roomWidth, runtime.roomLength), floorMaterial, new THREE.Vector3(), new THREE.Euler(-Math.PI / 2, 0, 0));
      addMesh(new THREE.PlaneGeometry(runtime.roomWidth, runtime.roomLength), floorMaterial.clone(), new THREE.Vector3(0, runtime.roomHeight, 0), new THREE.Euler(Math.PI / 2, 0, 0));
      const wallMat = cave ? caveMaterial.clone() : baseMaterial.clone();
      addMesh(new THREE.BoxGeometry(0.5, runtime.roomHeight, runtime.roomLength), wallMat, new THREE.Vector3(-runtime.roomWidth / 2, runtime.roomHeight / 2, 0));
      addMesh(new THREE.BoxGeometry(0.5, runtime.roomHeight, runtime.roomLength), wallMat.clone(), new THREE.Vector3(runtime.roomWidth / 2, runtime.roomHeight / 2, 0));
      addMesh(new THREE.BoxGeometry(runtime.roomWidth, runtime.roomHeight, 0.45), wallMat.clone(), new THREE.Vector3(0, runtime.roomHeight / 2, runtime.roomLength / 2));
      // Build around the opening: a solid end wall would hide the animated gate.
      const openingWidth = 4.8;
      const openingHeight = 4.3;
      const sideWidth = (runtime.roomWidth - openingWidth) / 2;
      [-1, 1].forEach((side) => {
        addMesh(new THREE.BoxGeometry(sideWidth, runtime.roomHeight, 0.45), wallMat.clone(),
          new THREE.Vector3(side * (openingWidth / 2 + sideWidth / 2), runtime.roomHeight / 2, -runtime.roomLength / 2));
      });
      addMesh(new THREE.BoxGeometry(openingWidth, runtime.roomHeight - openingHeight, 0.45), wallMat.clone(),
        new THREE.Vector3(0, openingHeight + (runtime.roomHeight - openingHeight) / 2, -runtime.roomLength / 2));
      // A short passage makes the empty doorway visible once the gate lifts.
      addMesh(new THREE.PlaneGeometry(openingWidth, 4), floorMaterial.clone(),
        new THREE.Vector3(0, 0, -runtime.roomLength / 2 - 2), new THREE.Euler(-Math.PI / 2, 0, 0));
      addBloodSplatters(rand, room);
      addTrapdoor();
      runtime.roomGroup.add(new THREE.HemisphereLight(runtime.chaseRoom ? 0xffffff : 0x6c8290, runtime.chaseRoom ? 0x637477 : 0x020405, runtime.chaseRoom ? 1.05 : 0.17));
      const lampCount = runtime.chaseRoom ? 14 + runtime.chaseLevel * 2 : Math.max(1, 4 - Math.floor(runtime.tier / 2));
      for (let i = 0; i < lampCount; i += 1) {
        const z = runtime.roomLength / 2 - 4 - i * (runtime.roomLength - 8) / Math.max(1, lampCount - 1);
        const light = new THREE.PointLight(runtime.chaseRoom ? 0xf2ffff : i % 3 === 0 && runtime.tier > 2 ? 0xff355f : 0xb6e2ee, runtime.chaseRoom ? 35 : 15, runtime.chaseRoom ? 14 : 9, 1.5);
        light.position.set((rand() - 0.5) * 2, runtime.roomHeight - 0.42, z); light.castShadow = i < 2;
        runtime.roomGroup.add(light); runtime.flickerLights.push(light);
        const lamp = addMesh(new THREE.BoxGeometry(runtime.chaseRoom ? 4.2 : 1.4, 0.11, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xc8e3e4, emissive: 0xeaffff, emissiveIntensity: runtime.chaseRoom ? 5.5 : 2.8 }), light.position.clone().add(new THREE.Vector3(0, 0.16, 0)));
        lamp.rotation.y = i % 2 ? 0.08 : -0.08;
      }
      const formationKey: CrystalKey = runtime.roomName.includes("Malachite") ? "malachite"
        : runtime.roomName.includes("Amethyst") ? "amethyst" : runtime.roomName.includes("Quartz") ? "quartz"
          : runtime.roomName.includes("Corrupted") || runtime.tier > 5 ? "corrupted"
            : FOUND_CRYSTAL_KEYS[Math.floor(rand() * Math.min(FOUND_CRYSTAL_KEYS.length, 2 + runtime.tier))];
      const formationCount = 6 + Math.floor(rand() * 5) + runtime.tier;
      for (let i = 0; i < formationCount; i += 1) {
        const side = rand() < 0.5 ? -1 : 1;
        const key = rand() < 0.72 ? formationKey : FOUND_CRYSTAL_KEYS[Math.floor(rand() * Math.min(FOUND_CRYSTAL_KEYS.length, 2 + runtime.tier))];
        const object = createCrystal(key, 0.6 + rand() * 1.25);
        object.position.set(side * (runtime.roomWidth / 2 - 0.55 - rand() * 0.8), 0, (rand() - 0.5) * (runtime.roomLength - 4));
        object.rotation.y = rand() * Math.PI; runtime.roomGroup.add(object);
        if (i < 4) { const glow = new THREE.PointLight(CRYSTALS[key].color, 5 + rand() * 5, 4.2); glow.position.copy(object.position).add(new THREE.Vector3(0, 0.8, 0)); runtime.roomGroup.add(glow); }
      }
      if (cave) {
        for (let i = 0; i < 18; i += 1) {
          const side = rand() < 0.5 ? -1 : 1;
          const rock = addMesh(new THREE.DodecahedronGeometry(0.65 + rand() * 1.25, 1), caveMaterial.clone(),
            new THREE.Vector3(side * (runtime.roomWidth / 2 - rand() * 0.8), 0.3 + rand() * (runtime.roomHeight - 0.6), (rand() - 0.5) * runtime.roomLength));
          rock.scale.set(0.7 + rand(), 0.8 + rand() * 1.6, 0.7 + rand());
        }
      } else {
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x252c2e, metalness: 0.86, roughness: 0.3 });
        [-1, 1].forEach((side) => addMesh(new THREE.CylinderGeometry(0.12, 0.12, runtime.roomLength - 1, 10), pipeMaterial,
          new THREE.Vector3(side * (runtime.roomWidth / 2 - 0.68), runtime.roomHeight - 0.62, 0), new THREE.Euler(Math.PI / 2, 0, 0)));
      }
      if (runtime.roomName.includes("Storage")) {
        for (let i = 0; i < 8; i += 1) {
          const x = (i % 2 ? 1 : -1) * (runtime.roomWidth / 2 - 2.15); const z = -7 + Math.floor(i / 2) * 4;
          const size = new THREE.Vector3(1.55, 1.2 + rand() * 0.8, 1.45);
          const crate = addMesh(new THREE.BoxGeometry(size.x, size.y, size.z), baseMaterial.clone(), new THREE.Vector3(x, size.y / 2, z));
          runtime.obstacles.push(new THREE.Box3().setFromObject(crate).expandByScalar(0.28));
        }
      }
      const collectibleCount = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < collectibleCount; i += 1) {
        let key = formationKey;
        if (runtime.mandatoryCrystal && i === 0) key = runtime.mandatoryCrystal;
        else if (rand() > 0.52) key = FOUND_CRYSTAL_KEYS[Math.floor(rand() * Math.min(FOUND_CRYSTAL_KEYS.length, 2 + runtime.tier))];
        const position = new THREE.Vector3((rand() - 0.5) * (runtime.roomWidth - 5), 0.35, (rand() - 0.5) * (runtime.roomLength - 7));
        makePickup("crystal", position, key, runtime.mandatoryCrystal === key && i === 0);
      }
      if (room >= 4 && room !== 200 && (rand() < 0.62 + runtime.tier * 0.045 || room % 5 === 0)) {
        const whirlpoolCount = Math.min(3, 1 + Math.floor(runtime.tier / 3));
        for (let i = 0; i < whirlpoolCount; i += 1) {
          const whirlpool = createWhirlpool();
          const x = (rand() - 0.5) * Math.max(3, runtime.roomWidth - 7);
          const z = (rand() - 0.5) * Math.max(6, runtime.roomLength - 11);
          whirlpool.position.set(x, 0, z); whirlpool.rotation.y = rand() * Math.PI;
          runtime.roomGroup.add(whirlpool); runtime.hazards.push({ object: whirlpool, radius: 4.1 + runtime.tier * 0.12, phase: rand() * Math.PI * 2, cooldown: 0 });
        }
      }
      if (rand() < 0.34) makePickup("ammo", new THREE.Vector3((rand() - 0.5) * 7, 0.26, (rand() - 0.5) * 9));
      if (rand() < 0.26) makePickup("battery", new THREE.Vector3((rand() - 0.5) * 7, 0.26, (rand() - 0.5) * 9));
      if (runtime.requiredResonators > 0) {
        for (let i = 0; i < runtime.requiredResonators; i += 1) {
          const x = (i % 2 ? 1 : -1) * (runtime.roomWidth / 2 - 1.25);
          const z = -runtime.roomLength / 2 + 4 + i * ((runtime.roomLength - 8) / Math.max(1, runtime.requiredResonators - 1));
          const resonator = createStation("resonator", runtime.haidIniActive ? 0xff6a00 : 0xff375f); resonator.scale.setScalar(runtime.haidIniActive ? 0.44 : 0.62); resonator.position.set(x, 0, z);
          resonator.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; runtime.roomGroup.add(resonator);
          runtime.stations.push({ object: resonator, kind: "resonator", activated: false });
        }
      }
      if (runtime.roomName === "Crystal Crafter’s Workshop") addStation("crafter", new THREE.Vector3(-runtime.roomWidth / 2 + 1.4, 0, -1), 0x22e59b);
      if (runtime.roomName === "Infusionsmith Chamber") addStation("infusionsmith", new THREE.Vector3(runtime.roomWidth / 2 - 1.4, 0, -1), 0xa56bff);
      if (runtime.roomName === "Crystal Archive") addStation("archive", new THREE.Vector3(runtime.roomWidth / 2 - 1.4, 0, -1), 0xffcb54);
      if (runtime.persHubActive) addPersHub();
      buildDoor();
      const chase = runtime.chaseRoom;
      if (chase) { buildChaseCourse(rand); if ((runtime.banishedUntil.blob ?? 0) < room) addBlobChase(); runtime.doorUnlocked = true; runtime.doorOpening = true; }
      if (runtime.haidIniActive) addEnemy("haidini", rand);
      const canSpawn = (kind: EnemyKind) => !runtime.persHubActive && (runtime.banishedUntil[kind] ?? 0) < room;
      if (room > 14 && !chase && !runtime.haidIniActive && canSpawn("sound") && rand() < 0.16 + runtime.tier * 0.05) addEnemy("sound", rand);
      if (room > 32 && !chase && !runtime.haidIniActive && canSpawn("prism") && rand() < 0.14 + runtime.tier * 0.035) addEnemy("prism", rand);
      if (room > 48 && !chase && !runtime.haidIniActive && canSpawn("mimic") && rand() < 0.13 + runtime.tier * 0.025) addEnemy("mimic", rand);
      if (room > 18 && !chase && !runtime.haidIniActive && canSpawn("crawler") && rand() < 0.2 + runtime.tier * 0.045) addEnemy("crawler", rand);
      if (room > 55 && !chase && !runtime.haidIniActive && canSpawn("watcher") && rand() < 0.15 + runtime.tier * 0.04) addEnemy("watcher", rand);
      if (room > 105 && !chase && !runtime.haidIniActive && rand() < 0.2 + runtime.tier * 0.035) { const extra = rand() < 0.5 ? "crawler" : "watcher"; if (canSpawn(extra)) addEnemy(extra, rand); }
      addBasdinoCompanions();
      if (chase) runtime.objective = `BLOB CHASE ${runtime.chaseLevel}/7 · RUN TO THE EXIT`;
      else if (runtime.haidIniActive) runtime.objective = "HAID-INI · Tune resonators 0/30";
      else if (runtime.persHubActive) runtime.objective = "Trade Fluorite with Noble Pers";
      else if (runtime.mandatoryCrystal && !runtime.mandatoryCollected) runtime.objective = `Recover ${CRYSTALS[runtime.mandatoryCrystal].label} specimen`;
      else if (runtime.requiredResonators > 0) runtime.objective = `Tune resonators 0/${runtime.requiredResonators}`;
      else if (room === 200) runtime.objective = "Extraction signal acquired";
      else runtime.objective = "Reach the pressure door";
      if (chase) {
        runtime.checkpoint = snapshot();
        try { localStorage.setItem("ion-checkpoint", JSON.stringify(runtime.checkpoint)); } catch { /* best effort */ }
        notify(`CHASE ${runtime.chaseLevel}/7 · THE BLOB IS BEHIND YOU`);
      }
      updateDoorIndicator(); updateHud(true); notify(grinRoll ? "7% GRIN ROLL HIT · BREACH IN 10 SECONDS" : `ROOM ${String(room).padStart(3, "0")} · ${runtime.roomName.toUpperCase()}`);
      if (room === 200) {
        if (runtime.discovered.size === CRYSTAL_KEYS.length) {
          runtime.won = true; runtime.running = false; showScreen("win"); if (document.pointerLockElement) document.exitPointerLock();
        } else { runtime.doorUnlocked = false; runtime.objective = `Extraction denied · ${runtime.discovered.size}/7 infusions`; }
      }
    }

    function snapshot(): SaveData {
      return { room: runtime.room, ammo: runtime.ammo, battery: runtime.battery, crystals: { ...runtime.crystals },
        discovered: [...runtime.discovered], gunInfusion: runtime.gunInfusion, lightInfusion: runtime.lightInfusion,
        accessKeys: runtime.accessKeys, maxAmmo: runtime.maxAmmo, inventory: { ...runtime.inventory }, basdinos: runtime.basdinos,
        wardCharges: runtime.wardCharges, speedBoostRooms: runtime.speedBoostRooms, banishedUntil: { ...runtime.banishedUntil } };
    }
    function applySave(save: SaveData) {
      runtime.ammo = save.ammo; runtime.battery = save.battery; runtime.crystals = { ...save.crystals };
      runtime.discovered = new Set(save.discovered); runtime.gunInfusion = save.gunInfusion; runtime.lightInfusion = save.lightInfusion;
      runtime.accessKeys = save.accessKeys;
      runtime.maxAmmo = save.maxAmmo; runtime.inventory = save.inventory ? { ...save.inventory } : EMPTY_INVENTORY();
      runtime.basdinos = save.basdinos ?? 0; runtime.wardCharges = save.wardCharges ?? 0; runtime.speedBoostRooms = save.speedBoostRooms ?? 0;
      runtime.banishedUntil = { ...(save.banishedUntil ?? {}) }; runtime.checkpoint = save; buildRoom(save.room);
    }
    function resetRun() {
      runtime.ammo = 6; runtime.maxAmmo = 8; runtime.battery = 100; runtime.crystals = EMPTY_COUNTS(); runtime.discovered.clear();
      runtime.gunInfusion = null; runtime.lightInfusion = null; runtime.accessKeys = 0;
      runtime.grinRoom = -1; runtime.grinTargetRoom = -1; runtime.grinTeleportTimer = 0; runtime.grinWarningTimer = 0; runtime.grinIncoming = false; runtime.hiding = false;
      runtime.inventory = EMPTY_INVENTORY(); runtime.basdinos = 0; runtime.wardCharges = 0; runtime.speedBoostRooms = 0; runtime.banishedUntil = {};
      runtime.checkpoint = null; runtime.dead = false; runtime.won = false; buildRoom(1);
    }
    function start(fresh = false) {
      if (fresh) resetRun(); if (!runtime.audio) runtime.audio = new AudioEngine(); runtime.audio.resume();
      runtime.running = true; runtime.dead = false; showScreen(null);
      if (!window.matchMedia("(pointer: coarse)").matches) void canvas.requestPointerLock(); updateHud(true);
    }
    function resume() {
      if (runtime.dead || runtime.won) return; runtime.running = true; runtime.cameraMode = false; showScreen(null); runtime.audio?.resume();
      if (!window.matchMedia("(pointer: coarse)").matches) void canvas.requestPointerLock();
    }
    function kill(reason: string) {
      if (runtime.dead || runtime.spawnGrace > 0) return;
      if (runtime.wardCharges > 0) {
        runtime.wardCharges -= 1; runtime.spawnGrace = 4;
        runtime.enemies.forEach((enemy) => { if (enemy.alive) enemy.object.position.add(enemy.object.position.clone().sub(runtime.player).setY(0).normalize().multiplyScalar(6)); });
        runtime.audio?.pulse("teleport"); notify("CRYSTAL WARD SHATTERED · CONTACT NEGATED"); updateHud(true); return;
      }
      if (runtime.basdinos > 0) {
        runtime.basdinos -= 1; const model = runtime.basdinoModels.pop(); if (model) runtime.roomGroup.remove(model); runtime.spawnGrace = 4;
        runtime.enemies.forEach((enemy) => { if (enemy.alive) enemy.object.position.add(enemy.object.position.clone().sub(runtime.player).setY(0).normalize().multiplyScalar(7)); });
        runtime.audio?.pulse("teleport"); notify("BASDINO SACRIFICED ITSELF · BONUS LIFE USED"); updateHud(true); return;
      }
      runtime.dead = true; runtime.running = false; runtime.objective = reason;
      runtime.audio?.jumpscare(); document.body.dataset.jumpscare = "true"; showScreen("dead");
      window.setTimeout(() => { delete document.body.dataset.jumpscare; }, 1250);
      if (document.pointerLockElement) document.exitPointerLock(); updateHud(true);
    }
    function removeEnemy(enemy: Enemy) { enemy.alive = false; runtime.roomGroup.remove(enemy.object); }
    function fire() {
      if (!runtime.running || runtime.cameraMode || screenRef.current) return;
      if (runtime.hiding) { runtime.audio?.pulse("error"); notify("TRAPDOOR SEALED · FIRING BLOCKED"); return; }
      if (runtime.ammo <= 0) { runtime.audio?.pulse("error"); notify("CHAMBER EMPTY · CRAFT AMMUNITION"); return; }
      runtime.ammo -= 1; runtime.gunKick = 1; runtime.audio?.pulse("shot");
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(), camera);
      const targets = runtime.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => {
        const meshes: THREE.Object3D[] = []; enemy.object.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child); }); return meshes;
      });
      const hit = ray.intersectObjects(targets, false)[0];
      if (hit) {
        const enemy = runtime.enemies.find((candidate) => candidate.alive && ancestorOf(hit.object, candidate.object));
        if (enemy) { if (enemy.kind === "blob") { notify("THE BLOB ABSORBED THE IMPACT · RUN"); }
          else if (enemy.kind === "haidini") { notify("HAID-INI IGNORES GUNFIRE · TUNE ALL 30 RESONATORS"); }
          else if (enemy.kind === "entity") {
            removeEnemy(enemy); runtime.grinRoom = -1; runtime.grinTargetRoom = -1;
            runtime.grinTeleportTimer = 0; runtime.grinWarningTimer = 0; runtime.grinIncoming = false; runtime.roomEntitySpawned = true;
            runtime.audio?.pulse("teleport"); notify("GRIN DISPERSED · NO SIGNAL");
          }
          else { removeEnemy(enemy); notify(runtime.gunInfusion === "obsidian" ? "OBSIDIAN IMPACT · TARGET SHATTERED" : "HOSTILE DISPERSED"); } }
      }
      updateHud(true);
    }
    function toggleLight() {
      if (runtime.battery <= 0 && !runtime.flashlightOn) { notify("BATTERY DEPLETED"); runtime.audio?.pulse("error"); return; }
      runtime.flashlightOn = !runtime.flashlightOn; runtime.flashlight.visible = runtime.flashlightOn; runtime.luxuryLight.visible = runtime.flashlightOn; updateHud(true);
    }
    function jump() {
      if (!runtime.running || runtime.cameraMode || runtime.hiding || !runtime.grounded) return;
      runtime.verticalVelocity = 6.7; runtime.grounded = false; runtime.audio?.pulse("step");
    }
    function collect(index: number) {
      const pickup = runtime.pickups[index]; if (!pickup || !pickup.object.parent) return;
      runtime.roomGroup.remove(pickup.object); runtime.pickups.splice(index, 1); runtime.audio?.pulse("pickup");
      if (pickup.kind === "crystal" && pickup.crystal) {
        runtime.crystals[pickup.crystal] += 1; const first = !runtime.discovered.has(pickup.crystal); runtime.discovered.add(pickup.crystal);
        if (pickup.mandatory || pickup.crystal === runtime.mandatoryCrystal) runtime.mandatoryCollected = true;
        notify(first ? `${CRYSTALS[pickup.crystal].label.toUpperCase()} DISCOVERED · INFUSION UNLOCKED` : `${CRYSTALS[pickup.crystal].label.toUpperCase()} +1`);
      } else if (pickup.kind === "ammo") { runtime.ammo = Math.min(runtime.maxAmmo, runtime.ammo + 3); notify("3 ROUNDS RECOVERED"); }
      else if (pickup.kind === "battery") { runtime.battery = Math.min(100, runtime.battery + 32); notify("BATTERY CELL +32%"); }
      refreshObjective(); updateHud(true);
    }
    function refreshObjective() {
      if (runtime.haidIniActive && runtime.activeResonators < 30) runtime.objective = `HAID-INI · Tune resonators ${runtime.activeResonators}/30`;
      else if (runtime.mandatoryCrystal && !runtime.mandatoryCollected) runtime.objective = `Recover ${CRYSTALS[runtime.mandatoryCrystal].label} specimen`;
      else if (runtime.requiredResonators > runtime.activeResonators) runtime.objective = `Tune resonators ${runtime.activeResonators}/${runtime.requiredResonators}`;
      else { runtime.doorUnlocked = true; runtime.objective = "Pressure door unlocked"; updateDoorIndicator(); }
    }
    function openStation(kind: Station["kind"], station?: Station) {
      if (kind === "trapdoor") {
        if (!station) return;
        if (runtime.chaseRoom) { runtime.audio?.pulse("error"); notify("TRAPDOOR JAMMED · BLOB CHASE ACTIVE"); return; }
        runtime.hiding = !runtime.hiding; station.activated = runtime.hiding;
        station.object.traverse((child) => {
          if (child.userData.trapdoorLid) { child.rotation.x = runtime.hiding ? -1.18 : 0; child.position.z = runtime.hiding ? 0.48 : 0; }
        });
        runtime.player.set(station.object.position.x, runtime.hiding ? 0.46 : 1.65, station.object.position.z);
        runtime.verticalVelocity = 0; runtime.flashlight.visible = !runtime.hiding && runtime.flashlightOn; runtime.luxuryLight.visible = !runtime.hiding && runtime.flashlightOn; runtime.gunModel.visible = !runtime.hiding;
        runtime.audio?.pulse("door"); notify(runtime.hiding ? runtime.haidIniActive ? "TRAPDOOR BREACHED · HAID-INI CAN ENTER" : "TRAPDOOR SEALED · CONTACT IMMUNITY ACTIVE" : "TRAPDOOR OPENED · IMMUNITY ENDED"); updateHud(true);
        return;
      }
      if (kind === "resonator") {
        if (station && !station.activated) { station.activated = true; runtime.activeResonators += 1;
          station.object.traverse((child) => { if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) child.material.emissive?.set(0x37ffb2); });
          runtime.audio?.pulse("pickup");
          if (runtime.haidIniActive && runtime.activeResonators >= 30) {
            runtime.enemies.filter((enemy) => enemy.kind === "haidini" && enemy.alive).forEach(removeEnemy);
            runtime.haidIniActive = false; notify("30/30 · HAID-INI BANISHED BY RESONANCE OVERLOAD");
          } else notify(`RESONATOR ${runtime.activeResonators}/${runtime.requiredResonators} TUNED`);
          refreshObjective(); updateHud(true); }
        return;
      }
      runtime.running = false; showScreen(kind); if (document.pointerLockElement) document.exitPointerLock();
    }
    function interact() {
      if (!runtime.running || runtime.cameraMode || screenRef.current) return; const nearest = runtime.nearest; if (!nearest) return;
      if (nearest.kind === "pickup" && nearest.index !== undefined) collect(nearest.index);
      if (nearest.kind === "station" && nearest.index !== undefined) { const station = runtime.stations[nearest.index]; if (station) openStation(station.kind, station); }
      if (nearest.kind === "door") {
        if (runtime.haidIniActive && runtime.activeResonators < 30) { runtime.audio?.pulse("error"); notify("HAID-INI LOCKDOWN · CRYSTAL KEYS REJECTED"); return; }
        if (!runtime.doorUnlocked && runtime.accessKeys > 0) { runtime.accessKeys -= 1; runtime.doorUnlocked = true; updateDoorIndicator(); notify("CRYSTAL KEY ACCEPTED"); }
        if (runtime.doorUnlocked) { runtime.doorOpening = true; runtime.audio?.pulse("door"); runtime.objective = "Proceed to the next room"; }
        else { runtime.audio?.pulse("error"); notify(runtime.objective.toUpperCase()); }
      }
    }
    function hasCost(cost: Partial<Record<CrystalKey, number>>) { return Object.entries(cost).every(([key, value]) => runtime.crystals[key as CrystalKey] >= (value ?? 0)); }
    function spend(cost: Partial<Record<CrystalKey, number>>) { Object.entries(cost).forEach(([key, value]) => { runtime.crystals[key as CrystalKey] -= value ?? 0; }); }
    function craft(id: string) {
      const recipes: Record<string, { cost: Partial<Record<CrystalKey, number>>; make: () => void; label: string }> = {
        ammo: { cost: { malachite: 1 }, make: () => { runtime.ammo = Math.min(runtime.maxAmmo, runtime.ammo + 4); }, label: "4 TOXIC ROUNDS" },
        battery: { cost: { quartz: 1 }, make: () => { runtime.battery = Math.min(100, runtime.battery + 55); }, label: "BATTERY CELL" },
        key: { cost: { malachite: 1, amethyst: 1 }, make: () => { runtime.accessKeys += 1; }, label: "CRYSTAL KEY" },
        capacity: { cost: { obsidian: 1, citrine: 1 }, make: () => { runtime.maxAmmo = Math.min(16, runtime.maxAmmo + 2); runtime.ammo += 2; }, label: "CHAMBER UPGRADE" },
      };
      const recipe = recipes[id]; if (!recipe || !hasCost(recipe.cost)) { runtime.audio?.pulse("error"); notify("INSUFFICIENT CRYSTAL MASS"); return; }
      spend(recipe.cost); recipe.make(); runtime.audio?.pulse("pickup"); notify(`${recipe.label} CRAFTED`); updateHud(true);
    }
    function infuse(key: CrystalKey) {
      if (!runtime.discovered.has(key)) { notify("INFUSION SCHEMA NOT DISCOVERED"); return; }
      const target = CRYSTALS[key].target; if (target === "GUN" || target === "BOTH") runtime.gunInfusion = key;
      if (target === "LIGHT" || target === "SUIT" || target === "BOTH") runtime.lightInfusion = key;
      if (key === "fluorite") runtime.hiddenObjects.forEach((object) => { object.visible = true; });
      notify(`${CRYSTALS[key].label.toUpperCase()} ${target} INFUSION ACTIVE`); runtime.audio?.pulse("pickup"); updateHud(true);
    }
    function synthesizeFluorite() {
      const cost = { malachite: 1, amethyst: 1, quartz: 1, corrupted: 1 } satisfies Partial<Record<CrystalKey, number>>;
      if (!hasCost(cost)) { runtime.audio?.pulse("error"); notify("NEED 1 MAL · 1 AME · 1 QTZ · 1 ERR"); return; }
      spend(cost); runtime.crystals.fluorite += 1; runtime.discovered.add("fluorite"); runtime.audio?.pulse("pickup");
      notify("FLUORITE SYNTHESIZED · MAIN CURRENCY +1"); updateHud(true);
    }
    function buyPersItem() {
      if (runtime.crystals.fluorite < 1) { runtime.audio?.pulse("error"); notify("PERS REQUIRES 1 FLUORITE"); return; }
      runtime.crystals.fluorite -= 1;
      const pool: ItemKey[] = ["soul", "royalBattery", "obsidianMagazine", "citrineRush", "persKey", "crystalWard"];
      const item = pool[Math.floor(Math.random() * pool.length)]; runtime.inventory[item] += 1;
      runtime.audio?.pulse("pickup"); notify(`PERS GRANTED · ${ITEMS[item].label.toUpperCase()}`); updateHud(true);
    }
    function buyBasdino() {
      if (runtime.crystals.fluorite < 10) { runtime.audio?.pulse("error"); notify("BASDINO BOND COSTS 10 FLUORITE"); return; }
      runtime.crystals.fluorite -= 10; runtime.basdinos += 1; addBasdinoCompanions();
      runtime.audio?.pulse("pickup"); notify("BASDINO BONDED · ONE SACRIFICIAL BONUS LIFE"); updateHud(true);
    }
    function openInventory() { runtime.running = false; showScreen("inventory"); if (document.pointerLockElement) document.exitPointerLock(); }
    function useItem(key: ItemKey) {
      if (runtime.inventory[key] <= 0) return;
      if (key === "soul") { showScreen("banish"); return; }
      runtime.inventory[key] -= 1;
      if (key === "royalBattery") runtime.battery = 100;
      if (key === "obsidianMagazine") runtime.ammo = Math.min(runtime.maxAmmo, runtime.ammo + 6);
      if (key === "citrineRush") runtime.speedBoostRooms = Math.max(runtime.speedBoostRooms, 5);
      if (key === "persKey") runtime.accessKeys += 2;
      if (key === "crystalWard") runtime.wardCharges += 1;
      runtime.audio?.pulse("pickup"); notify(`${ITEMS[key].label.toUpperCase()} ACTIVATED`); updateHud(true);
    }
    function banish(kind: EnemyKind) {
      if (runtime.inventory.soul <= 0) { showScreen("inventory"); return; }
      runtime.inventory.soul -= 1; runtime.banishedUntil[kind] = runtime.room + 15;
      runtime.enemies.filter((enemy) => enemy.kind === kind && enemy.alive).forEach(removeEnemy);
      if (kind === "entity") { runtime.grinRoom = -1; runtime.grinIncoming = false; runtime.grinWarningTimer = 0; runtime.roomEntitySpawned = true; }
      if (kind === "haidini") { runtime.haidIniActive = false; runtime.requiredResonators = 0; runtime.activeResonators = 0; refreshObjective(); }
      if (kind === "blob") { runtime.doorUnlocked = true; runtime.doorOpening = true; }
      runtime.audio?.pulse("teleport"); notify(`${kind.toUpperCase()} BANISHED FOR 15 ROOMS`); showScreen("inventory"); updateHud(true);
    }
    function close() { runtime.cameraMode = false; runtime.running = true; showScreen(null); if (!window.matchMedia("(pointer: coarse)").matches) void canvas.requestPointerLock(); }
    function restartCheckpoint() {
      runtime.dead = false; let save = runtime.checkpoint;
      if (!save) { try { const raw = localStorage.getItem("ion-checkpoint"); if (raw) save = JSON.parse(raw) as SaveData; } catch { save = null; } }
      if (save) applySave(save); else resetRun(); start(false);
    }
    function touchMoveStart(x: number, y: number, id: number) { runtime.touchMove.x = 0; runtime.touchMove.y = 0; canvas.dataset.moveStart = `${id},${x},${y}`; }
    function touchMoveUpdate(x: number, y: number, id: number) {
      const parts = (canvas.dataset.moveStart ?? "").split(",").map(Number); if (parts[0] !== id) return;
      runtime.touchMove.x = THREE.MathUtils.clamp((x - parts[1]) / 54, -1, 1); runtime.touchMove.y = THREE.MathUtils.clamp((y - parts[2]) / 54, -1, 1);
    }
    function touchMoveEnd(id: number) { const parts = (canvas.dataset.moveStart ?? "").split(",").map(Number); if (parts[0] === id) { runtime.touchMove.x = 0; runtime.touchMove.y = 0; canvas.dataset.moveStart = ""; } }
    function touchLookStart(x: number, y: number, id: number) { runtime.lastTouchLook = { x, y, id }; }
    function touchLookUpdate(x: number, y: number, id: number) {
      if (!runtime.lastTouchLook || runtime.lastTouchLook.id !== id) return;
      runtime.yaw -= (x - runtime.lastTouchLook.x) * 0.0042; runtime.pitch -= (y - runtime.lastTouchLook.y) * 0.0036;
      runtime.pitch = THREE.MathUtils.clamp(runtime.pitch, -1.25, 1.25); runtime.lastTouchLook = { x, y, id };
    }
    function touchLookEnd(id: number) { if (runtime.lastTouchLook?.id === id) runtime.lastTouchLook = null; }

    actionRef.current = { start, resume, interact, fire, toggleLight, jump, close, craft, infuse, synthesizeFluorite,
      buyPersItem, buyBasdino, openInventory, useItem, banish, restartCheckpoint,
      touchMoveStart, touchMoveUpdate, touchMoveEnd, touchLookStart, touchLookUpdate, touchLookEnd,
      setSprint: (value) => { runtime.touchMove.sprint = value; } };

    function findInteraction() {
      let bestDistance = 2.25; runtime.nearest = null; runtime.prompt = "";
      runtime.pickups.forEach((pickup, index) => {
        if (!pickup.object.visible) return; const distance = pickup.object.position.distanceTo(runtime.player);
        if (distance < bestDistance) { bestDistance = distance; runtime.nearest = { kind: "pickup", index };
          runtime.prompt = pickup.kind === "crystal" && pickup.crystal ? `E  COLLECT ${CRYSTALS[pickup.crystal].label.toUpperCase()}` : `E  TAKE ${pickup.kind.toUpperCase()}`; }
      });
      runtime.stations.forEach((station, index) => {
        const distance = station.object.position.distanceTo(runtime.player);
        if (distance < bestDistance) { bestDistance = distance; runtime.nearest = { kind: "station", index };
          runtime.prompt = station.kind === "trapdoor" ? runtime.chaseRoom ? "TRAPDOOR JAMMED · KEEP RUNNING" : runtime.haidIniActive ? runtime.hiding ? "E  EXIT · HAID-INI CAN ENTER" : "E  HIDE · UNSAFE FROM HAID-INI" : runtime.hiding ? "E  EXIT TRAPDOOR" : "E  HIDE IN TRAPDOOR"
            : station.kind === "resonator" ? station.activated ? "RESONATOR STABLE" : "E  TUNE RESONATOR"
            : `E  USE ${station.kind.replace("infusionsmith", "INFUSIONSMITH").toUpperCase()}`; }
      });
      if (runtime.door) {
        const distance = new THREE.Vector3(0, 1.6, -runtime.roomLength / 2 + 1).distanceTo(runtime.player);
        if (distance < bestDistance) { runtime.nearest = { kind: "door" };
          runtime.prompt = runtime.doorUnlocked ? runtime.doorOpening ? "PRESSURE DOOR OPENING" : "E  OPEN PRESSURE DOOR"
            : runtime.accessKeys > 0 ? "E  USE CRYSTAL KEY" : `LOCKED · ${runtime.objective.toUpperCase()}`; }
      }
    }
    function updateMovement(dt: number) {
      if (runtime.hiding) {
        camera.position.set(runtime.player.x, 0.43, runtime.player.z); camera.rotation.order = "YXZ"; camera.rotation.set(runtime.pitch, runtime.yaw, 0);
        runtime.gunModel.visible = false; runtime.flashlight.visible = false; runtime.luxuryLight.visible = false; runtime.footstepTimer = 0;
        runtime.audio?.setListener(camera.position, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
        return;
      }
      const forwardInput = (runtime.keysDown.has("KeyW") ? 1 : 0) - (runtime.keysDown.has("KeyS") ? 1 : 0) - runtime.touchMove.y;
      const sideInput = (runtime.keysDown.has("KeyD") ? 1 : 0) - (runtime.keysDown.has("KeyA") ? 1 : 0) + runtime.touchMove.x;
      const moving = Math.abs(forwardInput) + Math.abs(sideInput) > 0.08;
      const sprinting = moving && (runtime.keysDown.has("ShiftLeft") || runtime.keysDown.has("ShiftRight") || runtime.touchMove.sprint);
      const activeInfusions = new Set([runtime.gunInfusion, runtime.lightInfusion].filter(Boolean));
      const infusionBoost = 1 + activeInfusions.size * 0.08 + (activeInfusions.has("citrine") ? 0.17 : 0);
      const itemBoost = runtime.speedBoostRooms > 0 ? 1.35 : 1;
      const speed = (sprinting ? 5.1 : 3.15) * infusionBoost * itemBoost;
      const forward = new THREE.Vector3(-Math.sin(runtime.yaw), 0, -Math.cos(runtime.yaw));
      const right = new THREE.Vector3(Math.cos(runtime.yaw), 0, -Math.sin(runtime.yaw));
      const move = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput)); if (move.lengthSq() > 1) move.normalize();
      const next = runtime.player.clone().addScaledVector(move, speed * dt); const radius = 0.34;
      runtime.verticalVelocity -= 16.5 * dt; next.y += runtime.verticalVelocity * dt;
      if (next.y <= 1.65) { next.y = 1.65; runtime.verticalVelocity = 0; runtime.grounded = true; }
      next.x = THREE.MathUtils.clamp(next.x, -runtime.roomWidth / 2 + 0.72, runtime.roomWidth / 2 - 0.72);
      const minZ = runtime.doorProgress > 0.82 && Math.abs(next.x) < 2.0 ? -runtime.roomLength / 2 - 1.6 : -runtime.roomLength / 2 + 0.72;
      next.z = THREE.MathUtils.clamp(next.z, minZ, runtime.roomLength / 2 - 0.72);
      const playerBox = new THREE.Box3().setFromCenterAndSize(next.clone().add(new THREE.Vector3(0, -0.45, 0)), new THREE.Vector3(radius * 2, 1.5, radius * 2));
      if (!runtime.obstacles.some((box) => box.intersectsBox(playerBox))) runtime.player.copy(next);
      else runtime.player.y = next.y;
      camera.position.copy(runtime.player); camera.rotation.order = "YXZ"; camera.rotation.set(runtime.pitch, runtime.yaw, 0);
      runtime.audio?.setListener(runtime.player, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
      const bob = moving ? Math.sin(performance.now() * (sprinting ? 0.014 : 0.009)) * 0.018 : 0;
      camera.position.y += bob; runtime.gunModel.position.y = -0.38 - bob * 1.9; runtime.gunModel.position.z = -0.72 + runtime.gunKick * 0.14;
      runtime.gunKick = Math.max(0, runtime.gunKick - dt * 8.5);
      if (moving) { runtime.footstepTimer -= dt; if (runtime.footstepTimer <= 0) { runtime.audio?.pulse("step"); runtime.footstepTimer = sprinting ? 0.29 : 0.46; } }
      else runtime.footstepTimer = 0;
      if (runtime.flashlightOn) {
        const drainScale = runtime.lightInfusion === "quartz" ? 0.43 : runtime.lightInfusion === "corrupted" ? 2.25 : 1;
        runtime.battery = Math.max(0, runtime.battery - dt * 0.42 * drainScale);
        if (runtime.battery <= 0) { runtime.flashlightOn = false; runtime.flashlight.visible = false; notify("FLASHLIGHT BATTERY DEPLETED"); }
      }
      const lightStrength = runtime.lightInfusion === "quartz" ? 148 : runtime.lightInfusion === "citrine" ? 118 : runtime.lightInfusion === "corrupted" ? 178 : 92;
      runtime.flashlight.intensity = lightStrength * (0.72 + runtime.battery / 360);
      runtime.flashlight.distance = runtime.lightInfusion === "quartz" ? 42 : 31;
      runtime.flashlight.angle = runtime.lightInfusion === "quartz" ? 0.56 : 0.44; runtime.flashlight.penumbra = 0.64;
      runtime.luxuryLight.intensity = 0;
      renderer.toneMappingExposure = runtime.chaseRoom ? 1.22 : Math.max(0.52, 0.76 - runtime.tier * 0.028);
      if (runtime.transition <= 0 && runtime.player.z < -runtime.roomLength / 2 - 0.82 && runtime.doorProgress > 0.82) { runtime.transition = 1; runtime.transitionDirection = 1; }
    }
    function updateEnemies(dt: number) {
      const movingFast = runtime.keysDown.has("ShiftLeft") || runtime.keysDown.has("ShiftRight") || runtime.touchMove.sprint;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); let mainDistance = 99;
      runtime.enemies.forEach((enemy) => {
        if (!enemy.alive) return; enemy.phase += dt; const toPlayer = runtime.player.clone().sub(enemy.object.position); toPlayer.y = 0; const distance = toPlayer.length();
        if (enemy.kind === "entity" || enemy.kind === "blob" || enemy.kind === "haidini") mainDistance = Math.min(mainDistance, distance);
        if (enemy.kind === "wraith") { const material = enemy.object.userData.wraithMaterial as THREE.MeshStandardMaterial; material.opacity = runtime.cameraMode ? 0.72 : 0; }
        if (runtime.spawnGrace > 0) return;
        let shouldMove = true;
        if (enemy.kind === "sound") shouldMove = movingFast || runtime.footstepTimer > 0.15;
        if (enemy.kind === "mimic" && distance > 3.4) shouldMove = false;
        if (enemy.kind === "wraith" && !runtime.cameraMode) shouldMove = runtime.tier > 3;
        if (enemy.kind === "prism") { const directionToEnemy = enemy.object.position.clone().sub(camera.position).normalize(); const lit = runtime.flashlightOn && forward.dot(directionToEnemy) > 0.91;
          shouldMove = lit; enemy.speed = lit ? 4.8 + runtime.tier * 0.35 : 0.45; }
        if (enemy.kind === "watcher") { const directionToEnemy = enemy.object.position.clone().sub(camera.position).normalize(); const lit = runtime.flashlightOn && forward.dot(directionToEnemy) > 0.89;
          shouldMove = !lit; enemy.speed = lit ? 0 : 3.3 + runtime.tier * 0.2; }
        let movementTarget = toPlayer;
        let movementSpeed = enemy.speed;
        if (enemy.kind === "entity") {
          enemy.wanderTimer -= dt;
          const toWander = enemy.wanderTarget.clone().sub(enemy.object.position); toWander.y = 0;
          if (enemy.wanderTimer <= 0 || toWander.length() < 0.7) {
            enemy.wanderTarget.set((Math.random() - 0.5) * (runtime.roomWidth - 3.5), 0, (Math.random() - 0.5) * (runtime.roomLength - 4));
            enemy.wanderTimer = 2.1 + Math.random() * 3.8;
          }
          const hunting = distance < Math.max(5.5, 8.5 - runtime.tier * 0.35) || movingFast;
          movementTarget = hunting ? toPlayer : enemy.wanderTarget.clone().sub(enemy.object.position);
          movementTarget.y = 0; movementSpeed = hunting ? enemy.speed : 1.25 + runtime.tier * 0.13;
        }
        if (shouldMove && movementTarget.length() > 0.02) {
          enemy.object.position.add(movementTarget.normalize().multiplyScalar(movementSpeed * dt));
          const lookAt = enemy.kind === "entity" && movementTarget !== toPlayer ? enemy.wanderTarget : runtime.player;
          enemy.object.lookAt(lookAt.x, enemy.object.position.y + 1.1, lookAt.z);
          if (enemy.kind === "entity" || enemy.kind === "blob" || enemy.kind === "haidini") enemy.object.rotateY(Math.PI);
        }
        if (enemy.kind === "entity") {
          enemy.object.position.y = Math.sin(enemy.phase * 4.2) * 0.045;
          enemy.object.children.forEach((child) => { if (child.userData.limb) child.rotation.x = Math.sin(enemy.phase * 7 + child.userData.limb) * 0.36; });
        } else if (enemy.kind === "blob") {
          const pulse = 1 + Math.sin(enemy.phase * 5.2) * 0.035; const baseScale = 0.92 + runtime.chaseLevel * 0.035;
          enemy.object.scale.set(baseScale * pulse, baseScale / pulse, baseScale * pulse);
          enemy.object.children.forEach((child) => { if (child.userData.tendril !== undefined) child.rotation.x += Math.sin(enemy.phase * 6 + child.userData.tendril) * dt * 0.22; });
        } else if (enemy.kind === "haidini") {
          enemy.object.position.y = Math.max(0, Math.sin(enemy.phase * 2.4) * 0.025);
          enemy.object.children.forEach((child) => { if (child.userData.limb !== undefined) child.rotation.x = Math.sin(enemy.phase * 3.2 + child.userData.limb * 1.7) * 0.18; });
        } else if (enemy.kind === "prism") { enemy.object.position.y = 0.32 + Math.sin(enemy.phase * 2.8) * 0.22; enemy.object.rotation.y += dt * 1.8; }
        else if (enemy.kind === "watcher") { enemy.object.position.y = 0.18 + Math.sin(enemy.phase * 2.4) * 0.18; enemy.object.rotation.z = Math.sin(enemy.phase * 1.7) * 0.08; }
        else if (enemy.kind === "crawler") { enemy.object.position.y = Math.max(0, Math.sin(enemy.phase * 10) * 0.025); enemy.object.children.forEach((child) => { if (child.userData.limb !== undefined) child.rotation.x = Math.sin(enemy.phase * 13 + child.userData.limb) * 0.42; }); }
        else if (enemy.kind === "sound") enemy.object.position.y = Math.max(0, Math.sin(enemy.phase * 8) * 0.04);
        const lethalDistance = enemy.kind === "blob" ? 2.05 : enemy.kind === "haidini" ? 1.08 : enemy.kind === "entity" ? 0.92 : enemy.kind === "wraith" ? 0.7 : 0.62;
        if (distance < lethalDistance && (!runtime.hiding || enemy.kind === "haidini")) kill(enemy.kind === "blob" ? "THE BLOB CONSUMED YOU" : enemy.kind === "haidini" ? "HAID-INI ENTERED THE TRAPDOOR" : enemy.kind === "entity" ? "THE ENTITY MADE CONTACT" : `${enemy.kind.toUpperCase()} ENTITY BREACHED YOUR SUIT`);
      });
      const main = runtime.enemies.find((enemy) => (enemy.kind === "entity" || enemy.kind === "blob" || enemy.kind === "haidini") && enemy.alive);
      runtime.audio?.setEntity(main?.object.position ?? new THREE.Vector3(), mainDistance, Boolean(main));
    }
    function updateWorld(dt: number) {
      runtime.spawnGrace = Math.max(0, runtime.spawnGrace - dt);
      if (runtime.chaseRoom || runtime.haidIniActive || runtime.persHubActive) {
        runtime.enemies.filter((enemy) => enemy.kind === "entity" && enemy.alive).forEach(removeEnemy);
        runtime.grinIncoming = false; runtime.grinWarningTimer = 0; runtime.roomEntitySpawned = true;
      } else if (runtime.room < 200 && runtime.grinIncoming) {
        runtime.grinWarningTimer = Math.max(0, runtime.grinWarningTimer - dt);
        if (runtime.grinWarningTimer <= 0) {
          runtime.grinIncoming = false; runtime.grinRoom = runtime.room; runtime.roomEntitySpawned = false; runtime.roomSpawnTimer = 0.12; runtime.grinTeleportTimer = 0;
          runtime.audio?.pulse("teleport"); notify(runtime.hiding ? "GRIN ENTERED · TRAPDOOR HOLDING" : "BREACH COMPLETE · THE GRIN IS HERE");
          document.body.dataset.glitch = "true"; window.setTimeout(() => { delete document.body.dataset.glitch; }, 300);
        }
      }
      if (runtime.room !== 200 && !runtime.chaseRoom) {
        if (!runtime.roomEntitySpawned) {
          runtime.roomSpawnTimer -= dt;
          if (runtime.roomSpawnTimer <= 0) {
            addEnemy("entity", Math.random);
            const roomEntity = runtime.enemies[runtime.enemies.length - 1];
            if (roomEntity?.kind === "entity") roomEntity.object.position.set((Math.random() - 0.5) * Math.max(2, runtime.roomWidth - 5), 0,
              Math.min(runtime.roomLength / 2 - 1, runtime.player.z + 6.5));
            runtime.roomEntitySpawned = true; runtime.spawnGrace = Math.max(runtime.spawnGrace, 0.65);
            runtime.audio?.pulse("teleport"); notify("THE GRIN IS IN THIS ROOM");
            document.body.dataset.glitch = "true"; window.setTimeout(() => { delete document.body.dataset.glitch; }, 280);
          }
        }
      }
      runtime.hazards.forEach((hazard, index) => {
        hazard.cooldown = Math.max(0, hazard.cooldown - dt);
        hazard.phase += dt * (1.6 + runtime.tier * 0.08);
        hazard.object.rotation.y += dt * (index % 2 ? -0.72 : 0.72);
        hazard.object.children.forEach((child) => {
          if (child.userData.vortexRing) child.rotation.z += dt * child.userData.vortexRing * (1.2 + index * 0.12);
          if (child.userData.vortexShard) child.rotation.y += dt * 1.8;
        });
        const delta = hazard.object.position.clone().sub(runtime.player); delta.y = 0; const distance = delta.length();
        if (distance < hazard.radius && distance > 0.01) {
          const force = Math.pow(1 - distance / hazard.radius, 1.2) * 4.6;
          runtime.player.add(delta.normalize().multiplyScalar(force * dt));
          if (distance < 0.78 && hazard.cooldown <= 0) {
            const launchDistance = runtime.chaseRoom ? 11 + runtime.chaseLevel * 1.25 : 8;
            const minimumZ = -runtime.roomLength / 2 + 1.4; let targetZ = Math.max(minimumZ, runtime.player.z - launchDistance);
            for (let attempt = 0; attempt < 5; attempt += 1) {
              const landingBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(runtime.player.x, 1.2, targetZ), new THREE.Vector3(0.72, 2.1, 0.72));
              if (!runtime.obstacles.some((box) => box.intersectsBox(landingBox))) break;
              targetZ = Math.max(minimumZ, targetZ - 1.15);
            }
            runtime.player.z = targetZ;
            runtime.verticalVelocity = runtime.chaseRoom ? 7.8 : 5.8; runtime.grounded = false; hazard.cooldown = 2.6;
            runtime.audio?.pulse("teleport"); notify("WHIRLPOOL TRANSIT · FORWARD LAUNCH");
            document.body.dataset.glitch = "true"; window.setTimeout(() => { delete document.body.dataset.glitch; }, 260);
          }
        }
      });
      runtime.pickups.forEach((pickup, index) => { pickup.object.rotation.y += dt * (0.3 + index * 0.03); pickup.object.position.y = (pickup.object.userData.baseY ?? 0.3) + Math.sin(performance.now() * 0.0018 + index) * 0.08; });
      runtime.basdinoModels.forEach((model, index) => {
        const side = index % 2 ? 1 : -1; const back = 1.65 + Math.floor(index / 2) * 0.75;
        const target = runtime.player.clone().add(new THREE.Vector3(side * (0.75 + index * 0.12), -1.65, back).applyAxisAngle(new THREE.Vector3(0, 1, 0), runtime.yaw));
        model.position.lerp(target, Math.min(1, dt * 4.2)); model.lookAt(runtime.player.x, model.position.y + 0.3, runtime.player.z);
        model.position.y = Math.sin(performance.now() * 0.005 + index) * 0.04;
        model.children.forEach((child) => { if (child.userData.basdinoLeg !== undefined) child.rotation.x = Math.sin(performance.now() * 0.012 + child.userData.basdinoLeg) * 0.35; });
      });
      if (runtime.persActor) {
        runtime.persActor.rotation.y += dt * 1.25;
        runtime.persActor.position.y = 0.32 + Math.sin(performance.now() * 0.0025) * 0.1;
        runtime.persActor.children.forEach((child) => { if (child.userData.persArm !== undefined) child.rotation.x = Math.sin(performance.now() * 0.003 + child.userData.persArm) * 0.45; });
      }
      if (runtime.persLight) runtime.persLight.intensity = 42 + Math.sin(performance.now() * 0.009) * 18;
      runtime.flickerLights.forEach((light, index) => { const failure = Math.sin(performance.now() * 0.019 + index * 9.4) > 0.91 + runtime.tier * 0.006;
        light.intensity = failure ? 0.35 : 12 + Math.sin(performance.now() * 0.003 + index) * 3; });
      if (runtime.doorOpening) {
        if (!runtime.doorCreaked) { runtime.doorCreaked = true; runtime.audio?.creak(); if (runtime.doorPers) runtime.doorPers.visible = true; }
        runtime.doorProgress = Math.min(1, runtime.doorProgress + dt * 0.2);
        const easedLift = THREE.MathUtils.smootherstep(runtime.doorProgress, 0, 1);
        const lift = easedLift * (runtime.roomHeight + 2.8);
        runtime.doorPanels.forEach((panel, index) => {
          panel.position.set(index === 0 ? -1.19 : 1.19, 2.12 + lift, 0);
          const material = panel.material as THREE.MeshStandardMaterial;
          material.transparent = true;
          material.opacity = Math.max(0, 1 - Math.max(0, runtime.doorProgress - 0.34) / 0.66);
          material.depthWrite = material.opacity > 0.08;
          panel.visible = runtime.doorProgress < 0.985;
        });
        runtime.door?.children.forEach((child) => {
          if (child.userData.liftingStrip) {
            child.position.y = 2.15 + lift;
            child.visible = runtime.doorProgress < 0.985;
          }
        });
        if (runtime.doorPers) {
          runtime.doorPers.position.x = 3.55 - Math.sin(runtime.doorProgress * Math.PI) * 1.5;
          runtime.doorPers.rotation.y = -Math.PI / 2 + runtime.doorProgress * Math.PI * 0.55;
          runtime.doorPers.children.forEach((child) => { if (child.userData.persArm !== undefined) child.rotation.x = -runtime.doorProgress * 1.15; });
        }
        if (runtime.doorRedLight) runtime.doorRedLight.intensity = 64 * Math.sin(runtime.doorProgress * Math.PI) + 12;
      }
      findInteraction();
    }
    function renderCameraMode() {
      const t = performance.now() * 0.001; camera.position.set(Math.sin(t * 0.17) * 0.2, runtime.roomHeight - 0.75, runtime.roomLength / 2 - 1.4);
      camera.lookAt(0, 1.25, -runtime.roomLength / 3); runtime.gunModel.visible = false; runtime.flashlight.visible = false; runtime.luxuryLight.visible = false;
    }
    function animate(now: number) {
      const dt = Math.min(0.05, (now - runtime.lastFrame) / 1000 || 0.016); runtime.lastFrame = now; runtime.hudTimer += dt;
      if (runtime.transition > 0) { runtime.transition -= dt * 1.65; if (runtime.transition <= 0) { const nextRoom = runtime.room + 1; runtime.transitionDirection = 0; buildRoom(nextRoom); } }
      if (runtime.running && !runtime.dead && !runtime.won) {
        if (runtime.cameraMode) renderCameraMode(); else { runtime.gunModel.visible = true; runtime.flashlight.visible = runtime.flashlightOn; runtime.luxuryLight.visible = runtime.flashlightOn; updateMovement(dt); }
        updateWorld(dt); updateEnemies(dt); updateHud();
      } else if (!runtime.cameraMode) { camera.position.copy(runtime.player); camera.rotation.order = "YXZ"; camera.rotation.set(runtime.pitch, runtime.yaw, 0); }
      renderer.render(scene, camera); requestAnimationFrame(animate);
    }
    function onResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6)); renderer.setSize(window.innerWidth, window.innerHeight); }
    function onKeyDown(event: KeyboardEvent) { runtime.keysDown.add(event.code); if (event.repeat) return; if (event.code === "KeyE") interact(); if (event.code === "KeyF") toggleLight(); if (event.code === "Space") { event.preventDefault(); jump(); } }
    function onKeyUp(event: KeyboardEvent) { runtime.keysDown.delete(event.code); }
    function onMouseMove(event: MouseEvent) { if (document.pointerLockElement !== canvas || !runtime.running || runtime.cameraMode) return; runtime.yaw -= event.movementX * 0.0021; runtime.pitch -= event.movementY * 0.0019; runtime.pitch = THREE.MathUtils.clamp(runtime.pitch, -1.25, 1.25); }
    function onMouseDown(event: MouseEvent) { if (event.button === 0 && document.pointerLockElement === canvas) fire(); }
    function onPointerLock() { if (!document.pointerLockElement && runtime.running && !screenRef.current && !runtime.cameraMode && !window.matchMedia("(pointer: coarse)").matches) { runtime.running = false; showScreen("pause"); } }
    setTouchCapable(window.matchMedia("(pointer: coarse)").matches);
    window.addEventListener("resize", onResize); window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove); window.addEventListener("mousedown", onMouseDown); document.addEventListener("pointerlockchange", onPointerLock);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    buildRoom(1); requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("resize", onResize); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mousedown", onMouseDown); document.removeEventListener("pointerlockchange", onPointerLock);
      renderer.dispose(); runtime.audio?.context.close().catch(() => undefined); runtimeRef.current = null;
    };
  }, []);

  const act = actionRef.current;
  const currentInfusion = hud.gunInfusion ?? hud.lightInfusion;
  const discoveredPercent = Math.round((hud.discovered.length / CRYSTAL_KEYS.length) * 100);
  const inventoryCount = Object.values(hud.inventory).reduce((sum, count) => sum + count, 0);
  const grinRoomGap = hud.grinRoom < 0 ? 999 : Math.abs(hud.grinRoom - hud.room);
  const grinBars = hud.grinWarning ? 8 : hud.grinRoom === hud.room
    ? hud.entityDistance < 2.5 ? 8 : hud.entityDistance < 4 ? 7 : hud.entityDistance < 6 ? 6 : hud.entityDistance < 9 ? 5 : hud.entityDistance < 13 ? 4 : 3
    : grinRoomGap === 1 ? 3 : grinRoomGap <= 3 ? 2 : grinRoomGap <= 8 ? 1 : 0;
  const grinStatus = hud.grinWarning ? `BREACH IN ${Math.ceil(hud.grinWarningIn)}S` : hud.grinRoom === hud.room
    ? hud.entityDistance < 90 ? `${hud.entityDistance.toFixed(1)} M · CONTACT` : "MATERIALIZING"
    : grinRoomGap === 1 ? "ONE ROOM AWAY" : grinRoomGap >= 999 ? "NO SIGNAL" : `${grinRoomGap} ROOMS AWAY`;

  return (
    <main className={`ion-shell ${hud.entityDistance < 8 ? "entity-near" : ""} ${hud.grinWarning ? "grin-warning" : ""} ${hud.hiding ? "trapdoor-hidden" : ""}`}>
      <canvas ref={canvasRef} className="ion-canvas" aria-label="ION 3D survival-horror game" />
      <div className="fog-layer" /><div className="scanlines" /><div className="vignette" />
      <div className="crosshair" aria-hidden="true"><i /><b /></div>
      {!screen ? <>
        <section className="hud hud-top-left" aria-label="Location"><span className="eyebrow">ROOM {String(hud.room).padStart(3, "0")} / 200</span><strong>{hud.roomName}</strong><small>{hud.tier} · {hud.objective}</small></section>
        <section className="hud hud-top-right" aria-label="Equipment inventory">
          <div className="equipment-line"><span>ION RIFLE</span><strong>{String(hud.ammo).padStart(2, "0")}<i>/ {hud.maxAmmo}</i></strong></div>
          <div className="battery-line"><span>FLASHLIGHT</span><div><i style={{ width: `${hud.battery}%` }} /></div><strong>{Math.ceil(hud.battery)}%</strong></div>
          <div className="infusion-line"><span>INFUSION</span><strong style={{ color: currentInfusion ? CRYSTALS[currentInfusion].css : undefined }}>{currentInfusion ? CRYSTALS[currentInfusion].label.toUpperCase() : "NONE"}</strong></div>
          <div className="infusion-line"><span>BASDINOS / WARDS</span><strong>{hud.basdinos} / {hud.wardCharges}</strong></div>
          <div className={`grin-meter ${grinBars >= 6 ? "critical" : grinBars >= 3 ? "warning" : ""}`}>
            <div><span>GRIN PROXIMITY</span><strong>{grinStatus}</strong></div>
            <div className="grin-bars" aria-label={`${grinBars} of 8 proximity bars`}>{Array.from({ length: 8 }, (_, index) => <i className={index < grinBars ? "active" : ""} key={index} />)}</div>
            <small>{hud.grinWarning ? "FIND A TRAPDOOR NOW" : "7% SPAWN ROLL EACH ROOM"}</small>
          </div>
        </section>
        <button className="inventory-toggle" onClick={() => actionRef.current?.openInventory()}>INVENTORY <b>{inventoryCount}</b></button>
        <section className="hud crystal-rack" aria-label="Collected crystals">
          {CRYSTAL_KEYS.map((key) => <div className={hud.discovered.includes(key) ? "found" : "unknown"} key={key}><i style={{ background: CRYSTALS[key].css }} /><span>{CRYSTALS[key].short}</span><b>{hud.crystals[key]}</b></div>)}
        </section>
        {hud.chaseLevel > 0 && <div className="chase-alert"><span>BLOB CHASE · LEVEL {hud.chaseLevel}/7</span><strong>{hud.blobDistance.toFixed(1)} M BEHIND</strong><i /></div>}
        {hud.hiding && <div className="trapdoor-status"><span>TRAPDOOR SEALED</span><strong>{hud.haidIniActive ? "HAID-INI CAN ENTER · MOVE" : "CONTACT IMMUNITY ACTIVE"}</strong><small>E · EXIT HIDING PLACE</small></div>}
        {hud.prompt && !screen && <div className="interaction-prompt">{hud.prompt}</div>}{toast && <div className="toast">{toast}</div>}
      </> : null}
      {screen === "start" && <section className="title-screen overlay-panel">
        <div className="title-mark"><span>UNDERGROUND RESEARCH COMPLEX · SIGNAL 07</span><h1>I<span>O</span>N</h1><p>Crystal light is beautiful. It is not safe.</p></div>
        <div className="mission-brief"><p>Reach <strong>Room 200</strong>. Recover every infusion. Survive contact.</p><div className="rules-grid">
          <span><b>7% GRIN ROLL</b> gives 10 seconds to hide</span><span><b>FLUORITE</b> is synthesized currency for Pers</span><span><b>ROOM 25×</b> starts a Blob chase · Hub at 32</span></div></div>
        <button className="primary-button" onClick={() => { setTutorialStep(0); showScreen("tutorial"); }}>START TUTORIAL</button>
        <div className="controls-copy">{touchCapable ? "LEFT PAD MOVE · RIGHT SIDE LOOK · USE THE ACTION BUTTONS" : "WASD MOVE · MOUSE LOOK · SPACE JUMP · CLICK FIRE · E INTERACT · F LIGHT · SHIFT RUN"}</div>
        <small className={`headphones ${webglUnavailable ? "danger" : ""}`}>{webglUnavailable ? "ION REQUIRES WEBGL 2 · OPEN ON A DEVICE WITH 3D GRAPHICS ENABLED" : "HEADPHONES RECOMMENDED · ONE-TOUCH DEATH · CHECKPOINTS EVERY 25 ROOMS"}</small>
      </section>}
      {screen === "tutorial" && <section className="tutorial-screen overlay-panel">
        <div className="tutorial-shell">
          <header className="tutorial-header"><span>ION FIELD INDUCTION · {TUTORIAL_STEPS[tutorialStep].number} / {String(TUTORIAL_STEPS.length).padStart(2, "0")}</span><button disabled={webglUnavailable} onClick={() => actionRef.current?.start(true)}>SKIP TRAINING</button></header>
          <div className="tutorial-visual" data-step={tutorialStep}>
            <div className="tutorial-symbol">{TUTORIAL_STEPS[tutorialStep].number}</div>
          </div>
          <article className="tutorial-copy"><small>{TUTORIAL_STEPS[tutorialStep].label}</small><h2>{TUTORIAL_STEPS[tutorialStep].title}</h2><p>{TUTORIAL_STEPS[tutorialStep].body}</p><div className="tutorial-control"><b>CONTROLS</b> · {touchCapable ? TUTORIAL_STEPS[tutorialStep].touch : TUTORIAL_STEPS[tutorialStep].desktop}</div></article>
          <footer className="tutorial-footer">
            <div className="tutorial-dots">{TUTORIAL_STEPS.map((step, index) => <i key={step.number} className={index === tutorialStep ? "active" : index < tutorialStep ? "done" : ""} />)}</div>
            <div className="tutorial-actions">
              {tutorialStep > 0 && <button onClick={() => setTutorialStep((step) => step - 1)}>BACK</button>}
              <button className="primary" disabled={webglUnavailable && tutorialStep === TUTORIAL_STEPS.length - 1} onClick={() => tutorialStep === TUTORIAL_STEPS.length - 1 ? actionRef.current?.start(true) : setTutorialStep((step) => step + 1)}>{tutorialStep === TUTORIAL_STEPS.length - 1 ? (webglUnavailable ? "3D UNAVAILABLE" : "ENTER FACILITY") : "NEXT"}</button>
            </div>
          </footer>
        </div>
      </section>}
      {screen === "pause" && <section className="pause-screen overlay-panel compact-panel"><span className="eyebrow">FACILITY LINK SUSPENDED</span><h2>PAUSED</h2><p>Room {String(hud.room).padStart(3, "0")} · {hud.roomName}</p><button className="primary-button" onClick={() => actionRef.current?.resume()}>RESUME DESCENT</button><button className="text-button" onClick={() => actionRef.current?.start(true)}>RESTART FROM ROOM 001</button></section>}
      {screen === "dead" && <section className="death-screen overlay-panel compact-panel"><div className="jumpscare-face" aria-hidden="true"><i /><i /><b>{Array.from({ length: 22 }, (_, index) => <span key={index} />)}</b></div><div className="death-copy"><span className="eyebrow danger">VITAL SIGNAL TERMINATED</span><h2>IT FOUND YOU</h2><p>{hud.deathReason}</p><div className="death-room">ROOM {String(hud.room).padStart(3, "0")}</div><button className="primary-button danger-button" onClick={() => actionRef.current?.restartCheckpoint()}>RETURN TO CHECKPOINT</button><button className="text-button" onClick={() => actionRef.current?.start(true)}>NEW DESCENT</button></div></section>}
      {screen === "win" && <section className="win-screen overlay-panel"><span className="eyebrow">EXTRACTION ROOM · SIGNAL RESTORED</span><h2>YOU REACHED<br /><strong>ROOM 200</strong></h2><p>Every infusion is stable. The blast doors open. Something below them keeps smiling.</p><div className="completion-ring" style={{ "--completion": `${discoveredPercent}%` } as React.CSSProperties}><span>7 / 7</span><small>INFUSIONS</small></div><button className="primary-button" onClick={() => actionRef.current?.start(true)}>DESCEND AGAIN</button></section>}
      {screen === "crafter" && <MenuShell title="CRYSTAL CRAFTER" subtitle="Convert finite specimens into survival equipment" onClose={() => actionRef.current?.close()}><div className="recipe-grid">
        <Recipe name="Toxic rounds ×4" cost="1 MAL" note="Restores rifle ammunition" onClick={() => actionRef.current?.craft("ammo")} />
        <Recipe name="Battery cell" cost="1 QTZ" note="Restores 55% charge" onClick={() => actionRef.current?.craft("battery")} />
        <Recipe name="Crystal key" cost="1 MAL · 1 AME" note="Bypasses one locked pressure door" onClick={() => actionRef.current?.craft("key")} />
        <Recipe name="Chamber upgrade" cost="1 OBS · 1 CIT" note="Permanent +2 maximum ammunition" onClick={() => actionRef.current?.craft("capacity")} />
      </div></MenuShell>}
      {screen === "infusionsmith" && <MenuShell title="INFUSIONSMITH" subtitle="Only one gun and one light-channel infusion can remain stable" onClose={() => actionRef.current?.close()}><div className="infusion-grid">
        <button className="infusion-card unlocked fluorite-forge" onClick={() => actionRef.current?.synthesizeFluorite()} style={{ "--crystal": CRYSTALS.fluorite.css } as React.CSSProperties}><i /><span>CURRENCY SYNTHESIS</span><strong>CREATE FLUORITE</strong><p>Infuse 1 Malachite + 1 Amethyst + 1 Quartz + 1 Corrupted crystal. Fluorite cannot be found in rooms.</p></button>
        {CRYSTAL_KEYS.map((key) => { const unlocked = hud.discovered.includes(key); const active = hud.gunInfusion === key || hud.lightInfusion === key; return <button key={key} className={`infusion-card ${unlocked ? "unlocked" : "locked"} ${active ? "active" : ""}`} onClick={() => actionRef.current?.infuse(key)} disabled={!unlocked} style={{ "--crystal": CRYSTALS[key].css } as React.CSSProperties}><i /><span>{CRYSTALS[key].target}</span><strong>{unlocked ? CRYSTALS[key].label : "UNDISCOVERED"}</strong><p>{unlocked ? CRYSTALS[key].effect : "Recover the mineral specimen to decode this schema."}</p></button>; })}
      </div></MenuShell>}
      {screen === "pershub" && <MenuShell title="PERS HUB" subtitle="Room 032 · Noble Pers trades only in synthesized Fluorite" onClose={() => actionRef.current?.close()}><div className="pers-layout">
        <article className="pers-offer"><span>1 FLUORITE</span><h3>ROYAL DRAW</h3><p>Pers grants one random inventory item: a Soul of Sadist, Royal Battery, Obsidian Magazine, Citrine Rush, Master Key, or Crystal Ward.</p><button onClick={() => actionRef.current?.buyPersItem()}>TRADE WITH PERS</button></article>
        <article className="pers-offer basdino-offer"><span>10 FLUORITE</span><h3>BASDINO BOND</h3><p>A loyal Basdino follows you through the facility and sacrifices itself to absorb one fatal contact.</p><button onClick={() => actionRef.current?.buyBasdino()}>BOND BASDINO</button></article>
        <aside className="pers-balance"><small>CURRENCY</small><strong>{hud.crystals.fluorite}</strong><span>FLUORITE</span><small>COMPANIONS</small><strong>{hud.basdinos}</strong><span>BASDINOS</span></aside>
      </div></MenuShell>}
      {screen === "inventory" && <MenuShell title="FIELD INVENTORY" subtitle={`${inventoryCount} carried items · ${hud.basdinos} Basdino bonus lives · ${hud.wardCharges} active wards`} onClose={() => actionRef.current?.close()}><div className="inventory-grid">
        {(Object.keys(ITEMS) as ItemKey[]).map((key) => <button key={key} className="item-card" disabled={hud.inventory[key] <= 0} onClick={() => actionRef.current?.useItem(key)} style={{ "--item": ITEMS[key].color } as React.CSSProperties}><span>{hud.inventory[key]} OWNED</span><strong>{ITEMS[key].label}</strong><p>{ITEMS[key].note}</p><i>{key === "soul" ? "CHOOSE TARGET" : "USE ITEM"}</i></button>)}
      </div></MenuShell>}
      {screen === "banish" && <MenuShell title="SOUL OF SADIST" subtitle="Choose one entity class to erase for the next 15 rooms" onClose={() => showScreen("inventory")}><div className="banish-grid">
        {(["entity", "blob", "haidini", "crawler", "watcher", "sound", "prism", "mimic"] as EnemyKind[]).map((kind) => <button key={kind} onClick={() => actionRef.current?.banish(kind)}><span>SELECT TARGET</span><strong>{kind === "entity" ? "THE GRIN" : kind === "sound" ? "SOUND HUNTER" : kind.toUpperCase()}</strong><i>BANISH 15 ROOMS</i></button>)}
      </div></MenuShell>}
      {screen === "archive" && <MenuShell title="CRYSTAL ARCHIVE" subtitle={`${hud.discovered.length}/7 mineral records recovered`} onClose={() => actionRef.current?.close()}><div className="archive-layout"><div className="archive-list">
        {CRYSTAL_KEYS.map((key) => <article key={key} className={hud.discovered.includes(key) ? "" : "redacted"}><i style={{ background: CRYSTALS[key].css }} /><div><strong>{hud.discovered.includes(key) ? CRYSTALS[key].label : "████████"}</strong><p>{hud.discovered.includes(key) ? CRYSTALS[key].effect : "RECORD CORRUPTED"}</p></div></article>)}
      </div><div className="entity-file"><span>ENTITY FILE · ION-00 / ION-25 / ION-30</span><h3>THE GRIN · BLOB · HAID-INI · CRAWLER · WATCHER</h3><p>The Grin broadcasts a ten-second red breach warning. Haid-Ini is a slow orange-striped hunter that enters trapdoors and ignores gunfire; tuning all 30 resonators is the only way to banish it. The Blob owns every 25th room.</p><ul><li>Trapdoors stop the Grin, but never Haid-Ini</li><li>Haid-Ini can only be stopped by 30 tuned resonators</li><li>Trapdoors jam during Blob chases</li><li>Watchers freeze inside the flashlight beam</li></ul></div></div></MenuShell>}
      {touchCapable && !screen && <div className="touch-controls" aria-label="Touch game controls">
        <div className="move-pad" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); act?.touchMoveStart(e.clientX, e.clientY, e.pointerId); }} onPointerMove={(e) => act?.touchMoveUpdate(e.clientX, e.clientY, e.pointerId)} onPointerUp={(e) => act?.touchMoveEnd(e.pointerId)} onPointerCancel={(e) => act?.touchMoveEnd(e.pointerId)}><i /><span>MOVE</span></div>
        <div className="look-pad" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); act?.touchLookStart(e.clientX, e.clientY, e.pointerId); }} onPointerMove={(e) => act?.touchLookUpdate(e.clientX, e.clientY, e.pointerId)} onPointerUp={(e) => act?.touchLookEnd(e.pointerId)} onPointerCancel={(e) => act?.touchLookEnd(e.pointerId)}><span>LOOK</span></div>
        <div className="touch-actions"><button onPointerDown={() => act?.fire()}>FIRE</button><button onPointerDown={() => act?.interact()}>USE</button><button onPointerDown={() => act?.toggleLight()}>LIGHT</button><button onPointerDown={() => act?.jump()}>JUMP</button><button onPointerDown={() => act?.setSprint(true)} onPointerUp={() => act?.setSprint(false)} onPointerCancel={() => act?.setSprint(false)}>RUN</button></div>
      </div>}
    </main>
  );
}

function createGunModel() {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x080b0d, metalness: 0.78, roughness: 0.24 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x111416, metalness: 0.18, roughness: 0.75 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x293136, emissive: 0x19333b, emissiveIntensity: 0.45, metalness: 0.74 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.35, 10), black); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.52); group.add(barrel);
  const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.92, 12), accent); reservoir.rotation.x = Math.PI / 2; reservoir.position.set(0, -0.035, -0.25); group.add(reservoir);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.5), black); receiver.position.set(0, 0.04, 0.22); group.add(receiver);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.17), grip); handle.position.set(0, -0.21, 0.29); handle.rotation.x = -0.24; group.add(handle);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.5), grip); stock.position.set(0, -0.05, 0.66); stock.rotation.x = 0.08; group.add(stock);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.18), accent); sight.position.set(0, 0.18, 0.05); group.add(sight);
  group.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = true; }); return group;
}

function MenuShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return <section className="system-screen"><header><div><span className="eyebrow">ION FACILITY SYSTEM</span><h2>{title}</h2><p>{subtitle}</p></div><button aria-label="Close system" onClick={onClose}>×</button></header><div className="system-content">{children}</div></section>;
}

function Recipe({ name, cost, note, onClick }: { name: string; cost: string; note: string; onClick: () => void }) {
  return <button className="recipe-card" onClick={onClick}><span>{cost}</span><strong>{name}</strong><p>{note}</p><i>CRAFT</i></button>;
}
