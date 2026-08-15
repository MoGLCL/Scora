"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  RotateCcw,
  Trophy,
  Heart,
  Terminal,
  ArrowRight,
  Briefcase,
  Users,
  Volume2,
  VolumeX,
  Play,
  AlertTriangle,
  Award,
  Bomb,
  Cpu
} from "lucide-react";

// Web Audio API Synthesizer
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (this.ctx || typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) this.ctx = new AudioCtx();
  }

  playPlayerLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playEnemyLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.09);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(25, now + 0.22);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playGiftCollect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.001, now + i * 0.04 + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.06);
    });
  }

  playRocketBlast() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playLockWarning() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(990, now);
    osc.frequency.setValueAtTime(1200, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

const sounds = new SoundEngine();

const WEAPON_LEVEL_NAMES = [
  "Lv.1: Single-Thread Sync IO",
  "Lv.2: Multi-Thread Async / Await",
  "Lv.3: Distributed Worker Nodes",
  "Lv.4: Parallel GPU Computing",
  "Lv.5: Hyper-Scale Cluster Core",
];

export default function NotFound() {
  const [soundOn, setSoundOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = Number(localStorage.getItem("scora_chicken_highscore"));
      return Number.isFinite(saved) ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [superBombs, setSuperBombs] = useState(3);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);
  const [bossName, setBossName] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const triggerRocketRef = useRef<(() => void) | null>(null);
  const highScoreRef = useRef(highScore);

  const toggleSound = () => {
    sounds.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  const saveHighScore = useCallback((finalScore: number) => {
    if (finalScore > highScoreRef.current) {
      highScoreRef.current = finalScore;
      setHighScore(finalScore);
      try {
        localStorage.setItem("scora_chicken_highscore", String(finalScore));
      } catch {
        // Ignore
      }
    }
  }, []);

  const handleStartGame = () => {
    setScore(0);
    setWeaponLevel(1);
    setSuperBombs(3);
    setLives(3);
    setWave(1);
    setBossHp(null);
    setBossMaxHp(null);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Smart Adaptive Tactical AI Engine Loop
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Player Object
    const player = {
      x: width / 2,
      y: height - 55,
      lastX: width / 2,
      lastY: height - 55,
      vx: 0,
      vy: 0,
      width: 46,
      height: 40,
      invulnerableTimer: 2.0,
    };

    interface Bullet {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      damage: number;
    }

    interface Rocket {
      x: number;
      y: number;
      vx: number;
      vy: number;
    }

    interface EnemyBullet {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
    }

    interface Enemy {
      id: number;
      originX: number;
      originY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      label: string;
      hp: number;
      maxHp: number;
      color: string;
      type: "beetle" | "drone" | "interceptor" | "heavy" | "boss";
      isBoss?: boolean;
      points: number;
      shootTimer: number;
      diveTimer: number;
      isDiving: boolean;
      diveSide: number;
      dodgeCooldown: number;
      orbitAngle?: number;
      orbitRadius?: number;
      sinePhase?: number;
    }

    interface Gift {
      x: number;
      y: number;
      type: "weapon" | "food" | "bomb" | "heart";
      label: string;
      color: string;
    }

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
    }

    // Boss Lock Beam State
    let bossLockTimer = 0;
    let bossLockX = width / 2;
    let bossLockY = height - 55;
    let isBossCharging = false;

    let bullets: Bullet[] = [];
    let rockets: Rocket[] = [];
    let enemyBullets: EnemyBullet[] = [];
    let enemies: Enemy[] = [];
    let gifts: Gift[] = [];
    let particles: Particle[] = [];
    const stars: { x: number; y: number; s: number; alpha: number }[] = [];

    // Background Stars
    for (let i = 0; i < 55; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        s: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }

    let localScore = 0;
    let localWeapon = 1;
    let localBombs = 3;
    let localLives = 3;
    let localWave = 1;
    let formationOffset = 0;
    let formationDir = 1;
    let waveClearTimer = 0;
    let pincerAttackTimer = 4.0;

    let isShooting = false;
    let lastShotTime = 0;
    let mouseX = player.x;
    let mouseY = player.y;

    // Right-Click Rocket Launcher Trigger
    const fireRocket = () => {
      if (localBombs <= 0) return;
      localBombs -= 1;
      setSuperBombs(localBombs);
      sounds.playRocketBlast();

      rockets.push({
        x: player.x,
        y: player.y - 20,
        vx: 0,
        vy: -15,
      });

      for (let i = 0; i < 35; i++) {
        particles.push({
          x: player.x,
          y: player.y - 10,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: "#F59E0B",
          size: Math.random() * 4 + 3,
          alpha: 1,
        });
      }
    };

    triggerRocketRef.current = fireRocket;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        fireRocket();
      } else if (e.button === 0) {
        isShooting = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isShooting = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cRect = canvas.getBoundingClientRect();
      mouseX = e.clientX - cRect.left;
      mouseY = e.clientY - cRect.top;
    };

    const handleTouchStart = (e: TouchEvent) => {
      isShooting = true;
      if (e.touches.length > 0) {
        const cRect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - cRect.left;
        mouseY = e.touches[0].clientY - cRect.top;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const cRect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - cRect.left;
        mouseY = e.touches[0].clientY - cRect.top;
      }
    };

    const handleTouchEnd = () => {
      isShooting = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        isShooting = true;
      }
      if (e.code === "KeyB" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        fireRocket();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isShooting = false;
      }
    };

    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Wave Formations State
    let currentWaveFormation = "grid";
    let globalOrbitAngle = 0;

    // Spawn Diverse Swarm Formations like Chicken Invaders
    const spawnWave = (currentWaveNum: number) => {
      enemies = [];
      const isBossWave = currentWaveNum % 3 === 0;

      if (isBossWave) {
        currentWaveFormation = "boss";
        const fatalExceptions = [
          "FATAL: OutOfMemoryError (Heap Dump)",
          "PANIC: Deadlock in DB Connection Pool",
          "CRITICAL: Infinite Loop Stack Overflow",
          "SECURITY: Remote Code Execution Exploit",
          "FATAL: Kubernetes Pod CrashLoopBackOff",
          "CASCADE: 504 Gateway Timeout Spike"
        ];
        const bossIndex = Math.floor((currentWaveNum / 3 - 1) % fatalExceptions.length);
        const bName = fatalExceptions[bossIndex];
        const bHp = 70 + currentWaveNum * 40;
        setBossName(bName);
        setBossHp(bHp);
        setBossMaxHp(bHp);

        enemies.push({
          id: 9999,
          originX: width / 2,
          originY: 100,
          x: width / 2,
          y: -100,
          vx: 0,
          vy: 0,
          width: 240,
          height: 75,
          label: bName,
          hp: bHp,
          maxHp: bHp,
          color: "#EF4444",
          type: "boss",
          isBoss: true,
          points: 600,
          shootTimer: 0.5,
          diveTimer: 9999,
          isDiving: false,
          diveSide: 0,
          dodgeCooldown: 0,
        });
      } else {
        setBossHp(null);
        setBossMaxHp(null);

        // Diverse Formations Cycle (Grid -> V-Shape -> Rotating Circle -> Twin Columns -> Sine Snake -> Diamond Fortress)
        const nonBossIndex = ((currentWaveNum - 1) - Math.floor((currentWaveNum - 1) / 3)) % 6;
        const formations = ["grid", "v_shape", "circle", "twin_columns", "sine_snake", "diamond"];
        currentWaveFormation = formations[nonBossIndex];

        const bugConfigs: { label: string; color: string; type: Enemy["type"] }[] = [
          { label: "TypeError: undefined()", color: "#EF4444", type: "beetle" },
          { label: "MemoryLeak: DOM Tree", color: "#F59E0B", type: "drone" },
          { label: "404: Route Not Found", color: "#3B82F6", type: "interceptor" },
          { label: "SyntaxError: token <", color: "#EC4899", type: "heavy" },
          { label: "NullPointerException", color: "#8B5CF6", type: "beetle" },
          { label: "CORS Policy Block", color: "#06B6D4", type: "drone" },
        ];

        const baseHp = 2 + Math.floor(currentWaveNum * 0.8);

        if (currentWaveFormation === "v_shape") {
          // V-Formation / Arrowhead
          const count = 11;
          const mid = Math.floor(count / 2);
          for (let i = 0; i < count; i++) {
            const distFromMid = Math.abs(i - mid);
            const cfg = bugConfigs[i % bugConfigs.length];
            const ox = width / 2 + (i - mid) * 55;
            const oy = 60 + distFromMid * 32;
            enemies.push({
              id: i + 1,
              originX: ox,
              originY: oy,
              x: ox,
              y: -50 - distFromMid * 25,
              vx: 0,
              vy: 0,
              width: 78,
              height: 32,
              label: cfg.label,
              hp: baseHp,
              maxHp: baseHp,
              color: cfg.color,
              type: cfg.type,
              points: 35 * currentWaveNum,
              shootTimer: Math.random() * 1.5 + 0.6,
              diveTimer: Math.random() * 5 + 3,
              isDiving: false,
              diveSide: i < mid ? -1 : 1,
              dodgeCooldown: 0,
            });
          }
        } else if (currentWaveFormation === "circle") {
          // Rotating Swarm Ring
          const count = 12;
          const radius = Math.min(135, width * 0.3);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const cfg = bugConfigs[i % bugConfigs.length];
            enemies.push({
              id: i + 1,
              originX: width / 2 + Math.cos(angle) * radius,
              originY: 135 + Math.sin(angle) * radius,
              x: width / 2,
              y: -50,
              vx: 0,
              vy: 0,
              width: 78,
              height: 32,
              label: cfg.label,
              hp: baseHp,
              maxHp: baseHp,
              color: cfg.color,
              type: cfg.type,
              points: 35 * currentWaveNum,
              shootTimer: Math.random() * 1.4 + 0.6,
              diveTimer: Math.random() * 5 + 3,
              isDiving: false,
              diveSide: Math.cos(angle) < 0 ? -1 : 1,
              dodgeCooldown: 0,
              orbitAngle: angle,
              orbitRadius: radius,
            });
          }
        } else if (currentWaveFormation === "twin_columns") {
          // Twin Heavy Side Columns
          const perCol = 6;
          for (let col = 0; col < 2; col++) {
            const colX = col === 0 ? 85 : width - 85;
            for (let r = 0; r < perCol; r++) {
              const cfg = bugConfigs[(col * perCol + r) % bugConfigs.length];
              enemies.push({
                id: col * perCol + r + 1,
                originX: colX,
                originY: 55 + r * 44,
                x: colX,
                y: -50 - r * 30,
                vx: 0,
                vy: 0,
                width: 78,
                height: 32,
                label: cfg.label,
                hp: baseHp + 1,
                maxHp: baseHp + 1,
                color: cfg.color,
                type: "heavy",
                points: 40 * currentWaveNum,
                shootTimer: Math.random() * 1.3 + 0.5,
                diveTimer: Math.random() * 4 + 2.5,
                isDiving: false,
                diveSide: col === 0 ? -1 : 1,
                dodgeCooldown: 0,
              });
            }
          }
        } else if (currentWaveFormation === "sine_snake") {
          // Sinusoidal Snake Stream
          const count = 12;
          for (let i = 0; i < count; i++) {
            const cfg = bugConfigs[i % bugConfigs.length];
            enemies.push({
              id: i + 1,
              originX: (width / (count + 1)) * (i + 1),
              originY: 90,
              x: (width / (count + 1)) * (i + 1),
              y: -50 - i * 20,
              vx: 0,
              vy: 0,
              width: 78,
              height: 32,
              label: cfg.label,
              hp: baseHp,
              maxHp: baseHp,
              color: cfg.color,
              type: cfg.type,
              points: 30 * currentWaveNum,
              shootTimer: Math.random() * 1.5 + 0.6,
              diveTimer: Math.random() * 5 + 3,
              isDiving: false,
              diveSide: i % 2 === 0 ? -1 : 1,
              dodgeCooldown: 0,
              sinePhase: i * 0.5,
            });
          }
        } else if (currentWaveFormation === "diamond") {
          // Diamond Fortress Cluster
          const diamondOffsets = [
            { x: 0, y: 0 },
            { x: -50, y: 35 }, { x: 50, y: 35 },
            { x: -100, y: 70 }, { x: 0, y: 70 }, { x: 100, y: 70 },
            { x: -50, y: 105 }, { x: 50, y: 105 },
            { x: 0, y: 140 },
          ];
          diamondOffsets.forEach((pos, idx) => {
            const cfg = bugConfigs[idx % bugConfigs.length];
            enemies.push({
              id: idx + 1,
              originX: width / 2 + pos.x,
              originY: 55 + pos.y,
              x: width / 2 + pos.x,
              y: -50 - pos.y,
              vx: 0,
              vy: 0,
              width: 78,
              height: 32,
              label: cfg.label,
              hp: baseHp + (pos.x === 0 && pos.y === 70 ? 2 : 0),
              maxHp: baseHp + (pos.x === 0 && pos.y === 70 ? 2 : 0),
              color: cfg.color,
              type: cfg.type,
              points: 40 * currentWaveNum,
              shootTimer: Math.random() * 1.4 + 0.5,
              diveTimer: Math.random() * 5 + 3,
              isDiving: false,
              diveSide: pos.x < 0 ? -1 : 1,
              dodgeCooldown: 0,
            });
          });
        } else {
          // Classic Grid Formation (3 rows of 6)
          const rows = 3;
          const cols = 6;
          const spacingX = Math.min(84, (width - 60) / cols);
          const startX = width / 2 - ((cols - 1) * spacingX) / 2;
          const startY = 65;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cfg = bugConfigs[(r * cols + c) % bugConfigs.length];
              enemies.push({
                id: r * cols + c + 1,
                originX: startX + c * spacingX,
                originY: startY + r * 48,
                x: startX + c * spacingX,
                y: -50 - r * 35,
                vx: 0,
                vy: 0,
                width: 78,
                height: 32,
                label: cfg.label,
                hp: baseHp,
                maxHp: baseHp,
                color: cfg.color,
                type: cfg.type,
                points: 30 * currentWaveNum,
                shootTimer: Math.random() * 1.5 + 0.6,
                diveTimer: Math.random() * 5 + 3,
                isDiving: false,
                diveSide: c < 3 ? -1 : 1,
                dodgeCooldown: 0,
              });
            }
          }
        }
      }
    };

    spawnWave(localWave);

    const createExplosion = (x: number, y: number, color: string, count = 18) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 5 + 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color,
          size: Math.random() * 3.5 + 2,
          alpha: 1,
        });
      }
    };

    let lastTime = performance.now();

    // ── MAIN ENGINE LOOP WITH SMART TACTICAL AI ──
    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Track Player Velocity (for Predictive Aiming by smart AI)
      player.lastX = player.x;
      player.lastY = player.y;
      player.x += (mouseX - player.x) * 0.25;
      player.y += (mouseY - player.y) * 0.25;
      player.x = Math.max(28, Math.min(width - 28, player.x));
      player.y = Math.max(height * 0.35, Math.min(height - 30, player.y));
      player.vx = (player.x - player.lastX) / dt;
      player.vy = (player.y - player.lastY) / dt;

      if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= dt;
      }

      // Manual Shooting Logic
      if (isShooting && currentTime - lastShotTime > 130) {
        lastShotTime = currentTime;
        sounds.playPlayerLaser();

        const baseDmg = 1;
        if (localWeapon === 1) {
          bullets.push({ x: player.x, y: player.y - 18, vx: 0, vy: -13, color: "#10B981", damage: baseDmg });
        } else if (localWeapon === 2) {
          bullets.push({ x: player.x - 8, y: player.y - 15, vx: 0, vy: -13, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x + 8, y: player.y - 15, vx: 0, vy: -13, color: "#10B981", damage: baseDmg });
        } else if (localWeapon === 3) {
          bullets.push({ x: player.x, y: player.y - 18, vx: 0, vy: -13, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x - 12, y: player.y - 14, vx: -2.8, vy: -12.5, color: "#34D399", damage: baseDmg });
          bullets.push({ x: player.x + 12, y: player.y - 14, vx: 2.8, vy: -12.5, color: "#34D399", damage: baseDmg });
        } else if (localWeapon === 4) {
          bullets.push({ x: player.x - 12, y: player.y - 15, vx: -1.2, vy: -14, color: "#34D399", damage: baseDmg });
          bullets.push({ x: player.x - 4, y: player.y - 18, vx: 0, vy: -14, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x + 4, y: player.y - 18, vx: 0, vy: -14, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x + 12, y: player.y - 15, vx: 1.2, vy: -14, color: "#34D399", damage: baseDmg });
        } else {
          bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -15, color: "#F59E0B", damage: 1.6 });
          bullets.push({ x: player.x - 10, y: player.y - 16, vx: -1.5, vy: -14.5, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x + 10, y: player.y - 16, vx: 1.5, vy: -14.5, color: "#10B981", damage: baseDmg });
          bullets.push({ x: player.x - 18, y: player.y - 12, vx: -3.8, vy: -13.5, color: "#34D399", damage: baseDmg });
          bullets.push({ x: player.x + 18, y: player.y - 12, vx: 3.8, vy: -13.5, color: "#34D399", damage: baseDmg });
        }
      }

      // Update Player Bullets
      bullets.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
      });
      bullets = bullets.filter((b) => b.y > -20 && b.x > 0 && b.x < width);

      // Update Super Rockets (Right-Click)
      rockets.forEach((r) => {
        r.y += r.vy;
        particles.push({
          x: r.x + (Math.random() - 0.5) * 6,
          y: r.y + 12,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 2,
          color: "#F59E0B",
          size: Math.random() * 4 + 2,
          alpha: 0.8,
        });

        enemies.forEach((enemy) => {
          const rDist = Math.hypot(r.x - enemy.x, r.y - enemy.y);
          if (rDist < 45) {
            r.y = -100;
            createExplosion(r.x, r.y, "#F59E0B", 45);
            sounds.playExplosion();

            enemies.forEach((e2) => {
              const aoeDist = Math.hypot(r.x - e2.x, r.y - e2.y);
              if (aoeDist < 130) {
                e2.hp -= 25;
                if (e2.isBoss) setBossHp(e2.hp);
                if (e2.hp <= 0) {
                  localScore += e2.points;
                  setScore(localScore);
                }
              }
            });
          }
        });
      });
      rockets = rockets.filter((r) => r.y > -30);

      // Update Enemy Projectiles
      enemyBullets.forEach((eb) => {
        eb.x += eb.vx;
        eb.y += eb.vy;

        if (player.invulnerableTimer <= 0) {
          const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
          if (dist < 22) {
            eb.y = height + 100;
            sounds.playExplosion();
            createExplosion(player.x, player.y, "#EF4444", 30);
            localLives -= 1;
            setLives(localLives);
            localWeapon = Math.max(1, localWeapon - 1);
            setWeaponLevel(localWeapon);
            player.invulnerableTimer = 2.5;

            if (localLives <= 0) {
              setIsGameOver(true);
              setIsPlaying(false);
              saveHighScore(localScore);
              return;
            }
          }
        }
      });
      enemyBullets = enemyBullets.filter((eb) => eb.y < height + 20 && eb.x > -20 && eb.x < width + 20);

      // Oscillating Swarm Formation
      formationOffset += formationDir * (55 + localWave * 6) * dt;
      if (Math.abs(formationOffset) > 45) {
        formationDir *= -1;
      }

      // ── SMART AI: COORDINATED PINCER ATTACKS ──
      pincerAttackTimer -= dt;
      if (pincerAttackTimer <= 0 && enemies.length >= 2 && !enemies.some((e) => e.isBoss)) {
        pincerAttackTimer = Math.random() * 5 + 3.5;
        // Select one left wing and one right wing enemy for simultaneous pincer dive
        const leftEnemy = enemies.find((e) => !e.isDiving && e.x < width / 2);
        const rightEnemy = enemies.find((e) => !e.isDiving && e.x >= width / 2);
        if (leftEnemy) {
          leftEnemy.isDiving = true;
          leftEnemy.diveSide = -1;
        }
        if (rightEnemy) {
          rightEnemy.isDiving = true;
          rightEnemy.diveSide = 1;
        }
      }

      // ── SMART AI: BOSS TARGET-LOCK RAILGUN CHARGING ──
      const activeBoss = enemies.find((e) => e.isBoss);
      if (activeBoss) {
        bossLockTimer += dt;
        if (bossLockTimer > 3.0 && !isBossCharging) {
          isBossCharging = true;
          bossLockX = player.x;
          bossLockY = player.y;
          sounds.playLockWarning();
        }

        if (isBossCharging && bossLockTimer > 4.0) {
          isBossCharging = false;
          bossLockTimer = 0;
          sounds.playEnemyLaser();

          // Fire Hyper-Speed Precision Railgun Burst at locked position
          const railAngle = Math.atan2(bossLockY - (activeBoss.y + 30), bossLockX - activeBoss.x);
          for (let i = 0; i < 3; i++) {
            enemyBullets.push({
              x: activeBoss.x + (i - 1) * 12,
              y: activeBoss.y + 30,
              vx: Math.cos(railAngle) * 8.5,
              vy: Math.sin(railAngle) * 8.5,
              color: "#EF4444",
            });
          }
        }
      }

      // ── SMART AI: ENEMY DODGING, PREDICTIVE AIMING & FLANKING ──
      globalOrbitAngle += 0.9 * dt;

      enemies.forEach((enemy) => {
        enemy.dodgeCooldown -= dt;

        // 1. SMART REACTIVE DODGING (Avoid incoming player bullets)
        if (enemy.dodgeCooldown <= 0 && !enemy.isBoss) {
          const incomingBullet = bullets.find(
            (b) => Math.abs(b.x - enemy.x) < 26 && b.y > enemy.y && b.y < enemy.y + 80
          );
          if (incomingBullet) {
            const dodgeDir = incomingBullet.x > enemy.x ? -1 : 1;
            enemy.x += dodgeDir * 32;
            enemy.dodgeCooldown = 0.8;
          }
        }

        // 2. MOVEMENT & FORMATION TRAJECTORIES
        if (!enemy.isDiving) {
          if (currentWaveFormation === "circle" && enemy.orbitAngle !== undefined && enemy.orbitRadius !== undefined) {
            const curAngle = enemy.orbitAngle + globalOrbitAngle;
            const targetX = width / 2 + Math.cos(curAngle) * enemy.orbitRadius + formationOffset * 0.4;
            const targetY = 135 + Math.sin(curAngle) * enemy.orbitRadius;
            enemy.x += (targetX - enemy.x) * 0.12;
            enemy.y += (targetY - enemy.y) * 0.12;
          } else if (currentWaveFormation === "sine_snake" && enemy.sinePhase !== undefined) {
            const waveY = 85 + Math.sin(currentTime * 0.003 + enemy.sinePhase) * 35;
            const targetX = enemy.originX + formationOffset;
            enemy.x += (targetX - enemy.x) * 0.12;
            enemy.y += (waveY - enemy.y) * 0.12;
          } else {
            enemy.x += (enemy.originX + formationOffset - enemy.x) * 0.12;
            enemy.y += (enemy.originY - enemy.y) * 0.08;
          }

          enemy.diveTimer -= dt;
          if (enemy.diveTimer <= 0 && !enemy.isBoss) {
            enemy.isDiving = true;
          }
        } else {
          // Pincer / Intercept Dive Curve
          enemy.y += 5.2 + localWave * 0.4;
          const flankTargetX = player.x + enemy.diveSide * 40;
          enemy.x += (flankTargetX - enemy.x) * 0.04;

          if (enemy.y > height + 30) {
            enemy.y = -40;
            enemy.isDiving = false;
            enemy.diveTimer = Math.random() * 6 + 4;
          }
        }

        // 3. SMART PREDICTIVE SHOOTING (Lead shots ahead of moving player)
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.isBoss ? Math.random() * 0.5 + 0.35 : Math.random() * 1.8 + 0.8;
          sounds.playEnemyLaser();

          if (enemy.isBoss) {
            // Boss 5-way spread barrage
            enemyBullets.push({ x: enemy.x, y: enemy.y + 30, vx: 0, vy: 5.5, color: "#EF4444" });
            enemyBullets.push({ x: enemy.x - 35, y: enemy.y + 25, vx: -2.4, vy: 5, color: "#F59E0B" });
            enemyBullets.push({ x: enemy.x + 35, y: enemy.y + 25, vx: 2.4, vy: 5, color: "#F59E0B" });
            enemyBullets.push({ x: enemy.x - 70, y: enemy.y + 20, vx: -4.2, vy: 4.5, color: "#EC4899" });
            enemyBullets.push({ x: enemy.x + 70, y: enemy.y + 20, vx: 4.2, vy: 4.5, color: "#EC4899" });
          } else {
            // Predictive Aim: Calculate lead intercept based on player velocity
            const bulletSpeed = 5.0 + localWave * 0.2;
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            const timeToTarget = dist / bulletSpeed;

            // Target where player will be in `timeToTarget` seconds
            const predictedX = player.x + (player.vx || 0) * timeToTarget * 0.75;
            const predictedY = player.y + (player.vy || 0) * timeToTarget * 0.75;
            const angle = Math.atan2(predictedY - enemy.y, predictedX - enemy.x);

            enemyBullets.push({
              x: enemy.x,
              y: enemy.y + 16,
              vx: Math.cos(angle) * bulletSpeed,
              vy: Math.sin(angle) * bulletSpeed,
              color: enemy.color,
            });
          }
        }

        // Bullet vs Enemy Collision
        bullets.forEach((b) => {
          if (
            b.x > enemy.x - enemy.width / 2 &&
            b.x < enemy.x + enemy.width / 2 &&
            b.y > enemy.y - enemy.height / 2 &&
            b.y < enemy.y + enemy.height / 2
          ) {
            b.y = -100;
            enemy.hp -= b.damage;
            createExplosion(b.x, b.y, b.color, 4);

            if (enemy.isBoss) {
              setBossHp(enemy.hp);
            }

            if (enemy.hp <= 0) {
              sounds.playExplosion();
              createExplosion(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 55 : 22);
              localScore += enemy.points;
              setScore(localScore);

              const dropChance = Math.random();
              if (dropChance < 0.36 || enemy.isBoss) {
                const heartChance = localLives < 3 ? 0.30 : 0.12;
                let gPick: Gift["type"] = "food";
                let gLabel = "CACHE_HIT";
                let gColor = "#F59E0B";

                if (Math.random() < heartChance || (enemy.isBoss && localLives < 3)) {
                  gPick = "heart";
                  gLabel = "+LIFE";
                  gColor = "#EF4444";
                } else {
                  const subRand = Math.random();
                  if (subRand < 0.45) {
                    gPick = "weapon";
                    gLabel = "PATCH";
                    gColor = "#10B981";
                  } else if (subRand < 0.75) {
                    gPick = "food";
                    gLabel = "CACHE_HIT";
                    gColor = "#F59E0B";
                  } else {
                    gPick = "bomb";
                    gLabel = "KILL_9";
                    gColor = "#3B82F6";
                  }
                }

                gifts.push({
                  x: enemy.x,
                  y: enemy.y,
                  type: gPick,
                  label: gLabel,
                  color: gColor,
                });
              }
            }
          }
        });

        // Player vs Enemy Collision
        if (player.invulnerableTimer <= 0) {
          const pDist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          if (pDist < 28) {
            createExplosion(player.x, player.y, "#EF4444", 25);
            sounds.playExplosion();
            enemy.hp = 0;
            localLives -= 1;
            setLives(localLives);
            localWeapon = Math.max(1, localWeapon - 1);
            setWeaponLevel(localWeapon);
            player.invulnerableTimer = 2.5;

            if (localLives <= 0) {
              setIsGameOver(true);
              setIsPlaying(false);
              saveHighScore(localScore);
              return;
            }
          }
        }
      });

      enemies = enemies.filter((e) => e.hp > 0);

      // Check for Wave Clear
      if (enemies.length === 0) {
        waveClearTimer += dt;
        if (waveClearTimer > 1.2) {
          waveClearTimer = 0;
          localWave += 1;
          setWave(localWave);
          spawnWave(localWave);
        }
      }

      // Update Falling Gifts
      gifts.forEach((g) => {
        g.y += 2.4;
        const dist = Math.hypot(g.x - player.x, g.y - player.y);
        if (dist < 32) {
          sounds.playGiftCollect();
          createExplosion(g.x, g.y, g.color, 14);
          g.y = height + 100;

          if (g.type === "heart") {
            localLives = Math.min(3, localLives + 1);
            setLives(localLives);
            localScore += 50;
            setScore(localScore);
            sounds.playGiftCollect();
            for (let i = 0; i < 20; i++) {
              particles.push({
                x: player.x,
                y: player.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: "#EF4444",
                size: Math.random() * 4 + 2,
                alpha: 1,
              });
            }
          } else if (g.type === "weapon") {
            localWeapon = Math.min(5, localWeapon + 1);
            setWeaponLevel(localWeapon);
          } else if (g.type === "food") {
            localScore += 100;
            setScore(localScore);
          } else if (g.type === "bomb") {
            localBombs = Math.min(5, localBombs + 1);
            setSuperBombs(localBombs);
          }
        }
      });
      gifts = gifts.filter((g) => g.y < height + 50);

      // Update Particles
      particles.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.028;
      });
      particles = particles.filter((pt) => pt.alpha > 0);

      // ────────────────── RENDER CANVAS ──────────────────
      ctx.clearRect(0, 0, width, height);

      // 1. Stars Background
      stars.forEach((st) => {
        st.y += 1.8;
        if (st.y > height) st.y = 0;
        ctx.fillStyle = `rgba(16, 185, 129, ${st.alpha})`;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      });

      // 2. Boss Laser Lock Targeting Line
      if (isBossCharging && activeBoss) {
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(activeBoss.x, activeBoss.y + 30);
        ctx.lineTo(bossLockX, bossLockY);
        ctx.stroke();

        // Crosshair reticle at target
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(bossLockX, bossLockY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Normal Bullets
      bullets.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(b.x - 2, b.y - 7, 4, 14, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Super Rockets
      rockets.forEach((r) => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.fillStyle = "#F59E0B";
        ctx.shadowColor = "#F59E0B";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(6, 8);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // 5. Enemy Glowing Projectiles
      enemyBullets.forEach((eb) => {
        ctx.fillStyle = eb.color;
        ctx.shadowColor = eb.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Gifts (PATCH / CACHE_HIT / KILL_9 / +LIFE)
      gifts.forEach((g) => {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 14;

        if (g.type === "heart") {
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(0, -3, -12, -3, -12, 4);
          ctx.bezierCurveTo(-12, 10, 0, 16, 0, 18);
          ctx.bezierCurveTo(0, 16, 12, 10, 12, 4);
          ctx.bezierCurveTo(12, -3, 0, -3, 0, 3);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 9px monospace, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("+LIFE", 0, -6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 9px monospace, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(g.label, 0, 3);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // 7. Cyber Enemies & Boss
      enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.isBoss) {
          ctx.shadowColor = "#EF4444";
          ctx.shadowBlur = 18;

          ctx.fillStyle = "#1E1B2E";
          ctx.strokeStyle = "#EF4444";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 35);
          ctx.lineTo(110, 10);
          ctx.lineTo(85, -30);
          ctx.lineTo(0, -20);
          ctx.lineTo(-85, -30);
          ctx.lineTo(-110, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#DC2626";
          ctx.fillRect(-105, 5, 14, 25);
          ctx.fillRect(91, 5, 14, 25);

          ctx.fillStyle = Math.random() > 0.5 ? "#EF4444" : "#F59E0B";
          ctx.beginPath();
          ctx.arc(0, 5, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 11px monospace, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(enemy.label, 0, -5);
        } else {
          ctx.shadowColor = enemy.color;
          ctx.shadowBlur = 10;

          if (enemy.type === "beetle") {
            ctx.fillStyle = "#111827";
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = enemy.color;
            ctx.fillRect(-18, 10, 5, 8);
            ctx.fillRect(13, 10, 5, 8);
          } else if (enemy.type === "interceptor") {
            ctx.fillStyle = "#0F172A";
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 15);
            ctx.lineTo(34, -12);
            ctx.lineTo(0, -6);
            ctx.lineTo(-34, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (enemy.type === "drone") {
            ctx.fillStyle = "#18181B";
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 14);
            ctx.lineTo(30, 4);
            ctx.lineTo(30, -10);
            ctx.lineTo(0, -14);
            ctx.lineTo(-30, -10);
            ctx.lineTo(-30, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = "#1E1B4B";
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-36, -14, 72, 28, 6);
            ctx.fill();
            ctx.stroke();
          }

          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 9px monospace, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(enemy.label, 0, -18);
        }

        // Enemy HP Bar
        if (enemy.maxHp > 1) {
          const hpWidth = enemy.width * 0.75;
          const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(-hpWidth / 2, -enemy.height / 2 - 10, hpWidth, 4);
          ctx.fillStyle = "#10B981";
          ctx.fillRect(-hpWidth / 2, -enemy.height / 2 - 10, hpWidth * hpPct, 4);
        }

        ctx.restore();
      });

      // 8. Particles
      particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 9. Player Vessel
      ctx.save();
      ctx.translate(player.x, player.y);

      if (player.invulnerableTimer > 0 && Math.floor(currentTime / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      ctx.fillStyle = Math.random() > 0.5 ? "#10B981" : "#38BDF8";
      ctx.beginPath();
      ctx.moveTo(-7, 14);
      ctx.lineTo(0, 28 + Math.random() * 10);
      ctx.lineTo(7, 14);
      ctx.fill();

      ctx.fillStyle = "#05291A";
      ctx.strokeStyle = "#34D399";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#34D399";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(22, 14);
      ctx.lineTo(10, 8);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-22, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#34D399";
      ctx.beginPath();
      ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying, saveHighScore]);

  const getRank = (s: number) => {
    if (s >= 1000) return { title: "10x Principal Cloud Architect", desc: "كودك عالي الاعتمادية وخالٍ تماماً من أي Fatal Exceptions في بيئة الإنتاج!" };
    if (s >= 500) return { title: "Senior Staff Systems Engineer", desc: "نجحت في حماية بيئة الإنتاج والتغلب على ذكاء الأخطاء البرمجية التكتيكية!" };
    if (s >= 200) return { title: "Mid-Level Software Engineer", desc: "تم إصلاح معظم استثناءات الذاكرة وتضاربات الـ Git بنجاح!" };
    return { title: "Junior Software Developer", desc: "حاول مرة أخرى لتجاوز تكتيكات الذكاء الاصطناعي للأخطاء ومنع انهيار الخادم!" };
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl select-none" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-12 w-full flex-1 space-y-8">
        
        {/* TOP HERO BANNER */}
        <div className="rounded-[32px] bg-gradient-to-b from-[#E8FAF0] via-white to-white border border-[#D1E3D6] p-8 md:p-12 text-center space-y-6 shadow-sm relative overflow-hidden">
          
          <div className="absolute top-2 left-6 text-[11px] font-mono text-[#056B38]/30 select-none text-left hidden sm:block">
            git checkout -b feature/lost-page<br />
            fatal: 404_PAGE_NOT_FOUND (status: 404)<br />
            rollback completed: production is safe.
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-black text-[#056B38] border border-[#D1E3D6] shadow-2xs">
            <Terminal className="w-4 h-4 text-[#056B38]" />
            <span>HTTP 404 · PRODUCTION EXCEPTION</span>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            <div className="text-[72px] md:text-[96px] font-black font-heading text-[#05291A] tracking-tighter leading-none flex items-center justify-center gap-2">
              <span>4</span>
              <span className="text-[#056B38] animate-bounce">0</span>
              <span>4</span>
            </div>

            <h1 className="text-[28px] md:text-[40px] font-extrabold text-[#05291A] font-heading leading-tight">
              الصفحة المطلوبة غير موجودة أو تم نقلها
            </h1>

            <p className="text-[14px] md:text-[16px] text-[#526B5E] leading-relaxed max-w-2xl mx-auto">
              يبدو أن المسار المطلوب تم حذفه أو تغييره أثناء تحديثات النظام البرمجية. يمكنك الرجوع للصفحة الرئيسية أو استكشاف أقسام المنصة أدناه.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="h-[48px] px-7 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <span>العودة للصفحة الرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/projects"
              className="h-[48px] px-7 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <Briefcase className="w-4 h-4 text-[#056B38]" />
              <span>استكشف المشاريع المفتوحة</span>
            </Link>

            <Link
              href="/developers"
              className="h-[48px] px-7 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <Users className="w-4 h-4 text-[#056B38]" />
              <span>دليل المطورين المعتمدين</span>
            </Link>
          </div>
        </div>

        {/* SMART TACTICAL AI CODE DEFENDER MINI-GAME */}
        <div className="rounded-[32px] border-2 border-[#056B38]/40 bg-[#041F14] text-white p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#056B38] text-white font-bold flex items-center justify-center shadow-lg border border-emerald-400/30">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-[20px] font-extrabold text-white font-heading flex items-center gap-2">
                  <span>Scora Engine: Tactical AI & Hardcore Bug Defender</span>
                </h2>
                <p className="text-[12px] text-emerald-200/80">
                  ذكاء اصطناعي تكتيكي: تصويب استباقي (Predictive Aim) · مراوغة الطلقات · هجمات كماشة ثنائية · ليزر تثبيت الهدف!
                </p>
              </div>
            </div>

            {/* Sound & Super Bomb Button */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => triggerRocketRef.current?.()}
                className="h-[38px] px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95 font-mono"
                title="إطلاق صاروخ بالضغط على كليك يمين أو هذا الزر"
              >
                <Bomb className="w-4 h-4 text-amber-400" />
                <span>صاروخ كليك يمين ({superBombs})</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="h-[38px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
                <span>{soundOn ? "صوت مفعل" : "صامت"}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-[13px] font-bold">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-neutral-300">أعلى رقم:</span>
                <span className="text-amber-400 font-black font-mono">{highScore}</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-emerald-200/70">السكور الحالي</div>
              <div className="text-[22px] font-black text-white font-heading font-mono">{score}</div>
            </div>

            <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-emerald-200/70">المرحلة الحالية</div>
              <div className="text-[20px] font-black text-emerald-400 font-heading font-mono">Wave {wave}</div>
            </div>

            <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-emerald-200/70">مستوى السلاح والمحرك</div>
              <div className="text-[13px] font-bold text-amber-300 font-mono mt-1 truncate">
                {WEAPON_LEVEL_NAMES[weaponLevel - 1] || WEAPON_LEVEL_NAMES[0]}
              </div>
            </div>

            <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-emerald-200/70">محاولات السيرفر (Lives)</div>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    className={`w-5 h-5 transition-transform ${
                      h <= lives ? "text-red-500 fill-red-500 scale-110" : "text-neutral-700 fill-neutral-800 opacity-40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Fatal Crash Health Bar */}
          {bossHp !== null && bossMaxHp !== null && (
            <div className="space-y-1 bg-red-950/40 p-3 rounded-2xl border border-red-500/40 animate-pulse">
              <div className="flex items-center justify-between text-[12px] font-bold text-red-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>{bossName}</span>
                </span>
                <span>{bossHp} / {bossMaxHp} HP</span>
              </div>
              <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-150"
                  style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Interactive Hardcore Arcade Canvas */}
          <div className="relative h-[440px] md:h-[520px] w-full rounded-2xl bg-[#02130C] border border-emerald-800/50 overflow-hidden flex items-center justify-center">
            
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair block"
            />

            {/* OVERLAY: START SCREEN */}
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-20">
                <div className="text-center space-y-5 max-w-md">
                  <div className="w-16 h-16 rounded-3xl bg-[#056B38] text-white flex items-center justify-center mx-auto shadow-xl border border-emerald-400/40 animate-bounce">
                    <Play className="w-8 h-8 fill-white ml-0.5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[24px] font-black text-white font-heading">
                      تحدي الذكاء الاصطناعي التكتيكي
                    </h3>
                    <p className="text-[13px] text-emerald-200/80 leading-relaxed">
                      الأعداء الآن يقرأون مسار حركتك ويراوغون طلقاتك وينفذون هجمات كماشة من الأطراف. <strong>كليك شمال للضرب</strong>، <strong>كليك يمين لإطلاق الصواريخ</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="h-[52px] px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#041F14] text-[16px] font-black transition-all inline-flex items-center gap-2 shadow-xl cursor-pointer active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>ابدأ المعركة التكتيكية</span>
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: GAME OVER SCREEN */}
            {isGameOver && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95">
                <div className="text-center space-y-5 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/40">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                      FINAL SYSTEM AUDIT REPORT
                    </div>
                    <h3 className="text-[24px] font-black text-white font-heading">
                      {getRank(score).title}
                    </h3>
                    <p className="text-[13px] text-emerald-200/80">
                      {getRank(score).desc}
                    </p>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-[15px] font-bold mt-2 font-mono">
                      <span className="text-neutral-300">السكور: <strong className="text-white text-[20px]">{score}</strong></span>
                      <span className="text-emerald-400">Wave: <strong className="text-emerald-300 text-[20px]">{wave}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleStartGame}
                      className="h-[48px] px-8 rounded-full bg-[#056B38] hover:bg-emerald-600 text-white text-[14px] font-bold transition-all inline-flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>إعادة تشغيل الخادم</span>
                    </button>

                    <Link
                      href="/projects"
                      className="h-[48px] px-6 rounded-full bg-white/10 hover:bg-white/20 text-white text-[14px] font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                      <span>استكشف المشاريع</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Controls Instructions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-emerald-200/70 border-t border-white/10 pt-4 font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <span>كليك شمال: إطلاق نار عادي</span>
              <span><strong>كليك يمين (Right-Click): إطلاق صاروخ التدمير الشامل</strong></span>
              <span><strong>+LIFE: استعادة فرصة حياة جديدة</strong></span>
              <span>PATCH: ترقية السلاح</span>
              <span>احذر: ليزر تثبيت الهدف من الـ Boss يطلق مقذوفات فائقة السرعة</span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Scora Tactical AI Engine v6.0
            </div>
          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
