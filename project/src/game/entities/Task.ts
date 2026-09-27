import Phaser from 'phaser';
import {
  TASK_TYPES, TASK_TYPE_KEYS, COLORS, type TaskType, type TaskTypeConfig,
  MAX_ACTIVE_TASKS, BOSS_PHASE_MAX_TASKS,
} from '../config/constants';

// Task — a timed objective at a station. Player must reach and interact before timer expires.
export class Task {
  scene: Phaser.Scene;
  type: TaskType;
  config: TaskTypeConfig;
  stationX: number;
  stationY: number;
  timeLeft: number;
  maxTime: number;
  completed = false;
  expired = false;

  // Visuals
  marker: Phaser.GameObjects.Container;
  beam: Phaser.GameObjects.Image;
  diamond: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  timerBar: Phaser.GameObjects.Rectangle;
  timerBg: Phaser.GameObjects.Rectangle;
  ring: Phaser.GameObjects.Image;
  highlight = false; // highlighted during focus mode

  private pulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, type: TaskType, x: number, y: number, timeMs: number) {
    this.scene = scene;
    this.type = type;
    this.config = TASK_TYPES[type];
    this.stationX = x;
    this.stationY = y;
    this.maxTime = timeMs;
    this.timeLeft = timeMs;

    // Container at station position
    this.marker = scene.add.container(x, y - 50).setDepth(y + 200);

    // Light beam
    this.beam = scene.add.image(0, 25, 'task_beam').setTint(this.config.glow).setAlpha(0.5);
    this.marker.add(this.beam);

    // Diamond marker
    this.diamond = scene.add.image(0, 0, 'task_marker').setTint(this.config.glow);
    this.marker.add(this.diamond);

    // Ring
    this.ring = scene.add.image(0, 0, 'ring').setTint(this.config.glow).setAlpha(0.6).setScale(0.5);
    this.marker.add(this.ring);

    // Label
    this.label = scene.add.text(0, -20, this.config.label, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.marker.add(this.label);

    // Timer bar
    this.timerBg = scene.add.rectangle(0, 12, 44, 5, 0x000000, 0.6).setOrigin(0.5);
    this.marker.add(this.timerBg);
    this.timerBar = scene.add.rectangle(-22, 12, 44, 5, this.config.glow).setOrigin(0, 0.5);
    this.marker.add(this.timerBar);

    // Pulse animation
    this.pulseTween = scene.tweens.add({
      targets: this.diamond,
      scale: { from: 0.8, to: 1.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: this.ring,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0.6, to: 0 },
      duration: 800,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  update(dt: number): void {
    if (this.completed || this.expired) return;
    this.timeLeft -= dt;

    // Timer bar
    const ratio = Math.max(0, this.timeLeft / this.maxTime);
    this.timerBar.width = 44 * ratio;

    // Color shifts to red as time runs out
    if (ratio < 0.3) {
      this.timerBar.fillColor = COLORS.red;
      this.diamond.setTint(COLORS.red);
      this.beam.setTint(COLORS.red);
      // Frantic pulse
      if (this.pulseTween) this.pulseTween.timeScale = 2;
    } else if (ratio < 0.6) {
      this.timerBar.fillColor = COLORS.orange;
    }

    // Highlight during focus mode
    if (this.highlight) {
      this.diamond.setTint(COLORS.focusTint);
    }
  }

  isNear(px: number, py: number, range = 60): boolean {
    const dx = px - this.stationX;
    const dy = py - this.stationY;
    return dx * dx + dy * dy < range * range;
  }

  complete(): void {
    this.completed = true;
    // Burst particles
    this.scene.add.particles(this.stationX, this.stationY, 'particle', {
      lifespan: 600,
      speed: { min: 80, max: 200 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 12,
      tint: [this.config.glow, COLORS.green, 0xffffff],
      emitting: false,
    }).explode(12, this.stationX, this.stationY);
    this.destroy();
  }

  expire(): void {
    this.expired = true;
    // Red flash particles
    this.scene.add.particles(this.stationX, this.stationY, 'particle', {
      lifespan: 500,
      speed: { min: 40, max: 120 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 8,
      tint: COLORS.red,
      emitting: false,
    }).explode(8, this.stationX, this.stationY);
    this.destroy();
  }

  destroy(): void {
    if (this.pulseTween) this.pulseTween.stop();
    this.marker.destroy();
  }
}

// TaskManager — spawns tasks at stations, manages lifecycle.
export class TaskManager {
  scene: Phaser.Scene;
  tasks: Task[] = [];
  private stations: { station: { type: string; room: string }; x: number; y: number }[];
  private spawnTimer = 0;
  private spawnInterval: number;
  private bossPhase = false;
  private onTaskComplete: (task: Task) => void;
  private onTaskExpire: (task: Task) => void;
  private occupied = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    stations: { station: { type: string; room: string }; x: number; y: number }[],
    onTaskComplete: (task: Task) => void,
    onTaskExpire: (task: Task) => void,
  ) {
    this.scene = scene;
    this.stations = stations;
    this.spawnInterval = 2600;
    this.onTaskComplete = onTaskComplete;
    this.onTaskExpire = onTaskExpire;
  }

  setBossPhase(boss: boolean): void {
    this.bossPhase = boss;
    this.spawnInterval = boss ? 1100 : 2600;
  }

  update(dt: number): void {
    // Spawn
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnTask();
    }

    // Update tasks
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const task = this.tasks[i];
      task.update(dt);
      if (task.completed || task.expired) {
        this.occupied.delete(`${task.stationX},${task.stationY}`);
        this.tasks.splice(i, 1);
      } else if (task.timeLeft <= 0 && !task.expired) {
        task.expire();
        this.occupied.delete(`${task.stationX},${task.stationY}`);
        this.tasks.splice(i, 1);
        this.onTaskExpire(task);
      }
    }
  }

  private spawnTask(): void {
    const maxTasks = this.bossPhase ? BOSS_PHASE_MAX_TASKS : MAX_ACTIVE_TASKS;
    if (this.tasks.length >= maxTasks) return;

    // Find a free station
    const free = this.stations.filter((s) => !this.occupied.has(`${s.x},${s.y}`));
    if (free.length === 0) return;
    const station = Phaser.Utils.Array.GetRandom(free);

    // Pick task type
    let type: TaskType;
    if (this.bossPhase) {
      type = Phaser.Utils.Array.GetRandom(TASK_TYPE_KEYS);
    } else {
      // Weighted: urgent less common early
      const weighted: TaskType[] = [];
      TASK_TYPE_KEYS.forEach((t) => {
        const weight = t === 'URGENT_REQUEST' ? 1 : 3;
        for (let i = 0; i < weight; i++) weighted.push(t);
      });
      type = Phaser.Utils.Array.GetRandom(weighted);
    }

    const config = TASK_TYPES[type];
    const time = this.bossPhase ? config.minBossTime : config.baseTime;

    const task = new Task(this.scene, type, station.x, station.y, time);
    this.occupied.add(`${station.x},${station.y}`);
    this.tasks.push(task);
  }

  // Force-spawn a specific task type (used by random events)
  forceSpawn(type: TaskType): void {
    const maxTasks = this.bossPhase ? BOSS_PHASE_MAX_TASKS : MAX_ACTIVE_TASKS;
    if (this.tasks.length >= maxTasks + 4) return; // allow slight overflow for events
    const free = this.stations.filter((s) => !this.occupied.has(`${s.x},${s.y}`));
    if (free.length === 0) return;
    const station = Phaser.Utils.Array.GetRandom(free);
    const config = TASK_TYPES[type];
    const time = this.bossPhase ? config.minBossTime : config.baseTime;
    const task = new Task(this.scene, type, station.x, station.y, time);
    this.occupied.add(`${station.x},${station.y}`);
    this.tasks.push(task);
  }

  // Try to complete the nearest task in range of the player
  tryInteract(px: number, py: number): boolean {
    let nearest: Task | null = null;
    let nearestDist = Infinity;
    for (const task of this.tasks) {
      if (task.completed || task.expired) continue;
      const dx = px - task.stationX;
      const dy = py - task.stationY;
      const dist = dx * dx + dy * dy;
      if (dist < 70 * 70 && dist < nearestDist) {
        nearest = task;
        nearestDist = dist;
      }
    }
    if (nearest) {
      nearest.complete();
      this.onTaskComplete(nearest);
      return true;
    }
    return false;
  }

  setHighlight(highlight: boolean): void {
    this.tasks.forEach((t) => { t.highlight = highlight; });
  }

  getActiveCount(): number {
    return this.tasks.length;
  }

  destroyAll(): void {
    this.tasks.forEach((t) => t.destroy());
    this.tasks = [];
    this.occupied.clear();
  }
}
