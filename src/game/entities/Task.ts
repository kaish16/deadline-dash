import Phaser from 'phaser';
import {
  TASK_TYPES, TASK_TYPE_KEYS, COLORS, type TaskType, type TaskTypeConfig,
  MAX_ACTIVE_TASKS, BOSS_PHASE_MAX_TASKS,
} from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import type { Player } from './Player';

export type TaskUrgency = 'NORMAL' | 'URGENT' | 'CRITICAL' | 'BOSS';

export interface TaskInteractResult {
  completed: boolean;
  isDeliveryPickup: boolean;
  isMashStep: boolean;
  isPerfect: boolean;
  score: number;
}

// Task — an interactive objective at a station with varied gameplay micro-mechanics.
export class Task {
  scene: Phaser.Scene;
  type: TaskType;
  config: TaskTypeConfig;
  urgency: TaskUrgency;
  stationX: number;
  stationY: number;
  timeLeft: number;
  maxTime: number;
  baseScore: number;
  completed = false;
  expired = false;

  // Multi-step mechanics
  step: 'INITIAL' | 'DELIVERING' = 'INITIAL';
  destX = 0;
  destY = 0;
  mashCount = 0;
  mashGoal = 0;

  // Visuals
  marker: Phaser.GameObjects.Container;
  beam: Phaser.GameObjects.Image;
  diamond: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  urgencyBadge: Phaser.GameObjects.Text;
  timerBar: Phaser.GameObjects.Rectangle;
  timerBg: Phaser.GameObjects.Rectangle;
  ring: Phaser.GameObjects.Image;
  highlight = false;

  private pulseTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    type: TaskType,
    x: number,
    y: number,
    timeMs: number,
    urgency: TaskUrgency = 'NORMAL',
  ) {
    this.scene = scene;
    this.type = type;
    this.config = TASK_TYPES[type];
    this.urgency = urgency;
    this.stationX = x;
    this.stationY = y;

    // Delivery destinations
    if (type === 'DOCUMENT' || type === 'REPORT') {
      // Deliver to Boss Office (1570, 200) or Meeting Room (1070, 200)
      if (x < 1000) {
        this.destX = 1570;
        this.destY = 200;
      } else {
        this.destX = 1070;
        this.destY = 200;
      }
    }

    // Button mash count for frantic tasks
    if (type === 'BUG_FIX' || type === 'URGENT_REQUEST') {
      this.mashGoal = urgency === 'CRITICAL' || urgency === 'BOSS' ? 4 : 3;
    }

    // Adjust time and base score based on urgency tier
    let timeModifier = 1;
    let scoreModifier = 1;

    if (urgency === 'URGENT') {
      timeModifier = 0.8;
      scoreModifier = 1.5;
    } else if (urgency === 'CRITICAL') {
      timeModifier = 0.6;
      scoreModifier = 2.0;
    } else if (urgency === 'BOSS') {
      timeModifier = 0.5;
      scoreModifier = 3.0;
    }

    const calculatedTime = Math.round(timeMs * timeModifier);
    this.maxTime = calculatedTime;
    this.timeLeft = calculatedTime;
    this.baseScore = Math.round(250 * scoreModifier);

    // Container at station position
    this.marker = scene.add.container(x, y - 50).setDepth(y + 200);

    // Color glow by urgency
    let glowColor = this.config.glow;
    if (urgency === 'CRITICAL') glowColor = COLORS.red;
    else if (urgency === 'BOSS') glowColor = 0xff007f;
    else if (urgency === 'URGENT') glowColor = COLORS.orange;

    // Light beam
    this.beam = scene.add.image(0, 25, 'task_beam').setTint(glowColor).setAlpha(0.5);
    this.marker.add(this.beam);

    // Diamond marker
    this.diamond = scene.add.image(0, 0, 'task_marker').setTint(glowColor);
    this.marker.add(this.diamond);

    // Ring
    this.ring = scene.add.image(0, 0, 'ring').setTint(glowColor).setAlpha(0.6).setScale(0.5);
    this.marker.add(this.ring);

    // Label
    let initialLabel = this.config.label;
    if (this.mashGoal > 0) initialLabel = `${this.config.label} [MASH]`;
    else if (this.destX > 0) initialLabel = `${this.config.label} [PICKUP]`;

    this.label = scene.add.text(0, -22, initialLabel, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.marker.add(this.label);

    // Urgency badge
    const badgeText = urgency === 'BOSS' ? '👑 BOSS' : urgency === 'CRITICAL' ? '⚠️ CRITICAL' : urgency === 'URGENT' ? '⚡ URGENT' : '';
    const badgeColor = urgency === 'BOSS' ? '#ff00ff' : urgency === 'CRITICAL' ? '#ff1744' : '#ffab00';
    this.urgencyBadge = scene.add.text(0, -36, badgeText, {
      fontFamily: 'Impact, sans-serif',
      fontSize: '11px',
      color: badgeColor,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.marker.add(this.urgencyBadge);

    // Timer bar
    this.timerBg = scene.add.rectangle(0, 14, 46, 6, 0x000000, 0.7).setOrigin(0.5);
    this.marker.add(this.timerBg);
    this.timerBar = scene.add.rectangle(-23, 14, 46, 6, glowColor).setOrigin(0, 0.5);
    this.marker.add(this.timerBar);

    // Pulse animation
    const pulseDuration = urgency === 'CRITICAL' || urgency === 'BOSS' ? 280 : 500;
    this.pulseTween = scene.tweens.add({
      targets: this.diamond,
      scale: { from: 0.8, to: 1.25 },
      duration: pulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: this.ring,
      scale: { from: 0.5, to: 1.6 },
      alpha: { from: 0.7, to: 0 },
      duration: pulseDuration * 1.5,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  isPerfect(): boolean {
    return this.timeLeft / this.maxTime >= 0.65;
  }

  update(dt: number): void {
    if (this.completed || this.expired) return;
    this.timeLeft -= dt;

    // Timer bar
    const ratio = Math.max(0, this.timeLeft / this.maxTime);
    this.timerBar.width = 46 * ratio;

    // Color shifts to red as time runs out
    if (ratio < 0.3) {
      this.timerBar.fillColor = COLORS.red;
      this.diamond.setTint(COLORS.red);
      this.beam.setTint(COLORS.red);
      if (this.pulseTween) this.pulseTween.timeScale = 2.5;
    } else if (ratio < 0.6) {
      this.timerBar.fillColor = COLORS.orange;
    }

    if (this.highlight) {
      this.diamond.setTint(COLORS.focusTint);
      this.beam.setTint(COLORS.focusTint);
    }
  }

  isNear(px: number, py: number, range = 72): boolean {
    const dx = px - this.stationX;
    const dy = py - this.stationY;
    return dx * dx + dy * dy < range * range;
  }

  interact(player: Player): TaskInteractResult {
    // 1. MASH MECHANIC (Bug fix / Printer jam / Urgent requests)
    if (this.mashGoal > 0) {
      this.mashCount++;
      SoundManager.play('KEYBOARD_CLICK');

      // Pop mini status
      const popup = this.scene.add.text(this.stationX, this.stationY - 40, `MASH ${this.mashCount}/${this.mashGoal}!`, {
        fontFamily: 'Impact, sans-serif',
        fontSize: '18px',
        color: '#ffeb3b',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(this.marker.depth + 10);

      this.scene.tweens.add({
        targets: popup,
        y: popup.y - 25,
        alpha: 0,
        duration: 400,
        onComplete: () => popup.destroy(),
      });

      this.label.setText(`MASH [${this.mashCount}/${this.mashGoal}]`);

      if (this.mashCount < this.mashGoal) {
        return {
          completed: false,
          isDeliveryPickup: false,
          isMashStep: true,
          isPerfect: false,
          score: 50,
        };
      }
    }

    // 2. DELIVERY PIPELINE MECHANIC (Documents & Reports)
    if (this.destX > 0) {
      if (this.step === 'INITIAL') {
        this.step = 'DELIVERING';
        player.setCarrying('document');

        // Move target marker to destination
        this.stationX = this.destX;
        this.stationY = this.destY;
        this.marker.setPosition(this.destX, this.destY - 50);
        this.marker.setDepth(this.destY + 200);

        this.label.setText('DELIVER HERE 📥');
        this.label.setColor('#c6ff00');

        SoundManager.play('SLACK_PING');

        return {
          completed: false,
          isDeliveryPickup: true,
          isMashStep: false,
          isPerfect: false,
          score: 100,
        };
      } else {
        // Drop carried document at destination
        player.setCarrying(null);
      }
    }

    // Task Complete!
    const { isPerfect, score } = this.complete();
    return {
      completed: true,
      isDeliveryPickup: false,
      isMashStep: false,
      isPerfect,
      score,
    };
  }

  complete(): { isPerfect: boolean; score: number } {
    this.completed = true;
    const isPerfect = this.isPerfect();
    const finalScore = isPerfect ? Math.round(this.baseScore * 1.5) : this.baseScore;

    // Burst particles
    const particleCount = this.urgency === 'BOSS' ? 24 : 14;
    this.scene.add.particles(this.stationX, this.stationY, 'particle', {
      lifespan: 600,
      speed: { min: 80, max: 240 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: particleCount,
      tint: [this.config.glow, COLORS.lime, 0xffffff],
      emitting: false,
    }).explode(particleCount, this.stationX, this.stationY);

    if (isPerfect) {
      this.scene.add.particles(this.stationX, this.stationY, 'star_particle', {
        lifespan: 700,
        speed: { min: 60, max: 180 },
        scale: { start: 1, end: 0 },
        quantity: 8,
        emitting: false,
      }).explode(8, this.stationX, this.stationY);
    }

    this.destroy();
    return { isPerfect, score: finalScore };
  }

  expire(): void {
    this.expired = true;
    this.scene.add.particles(this.stationX, this.stationY, 'particle', {
      lifespan: 500,
      speed: { min: 40, max: 140 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 12,
      tint: COLORS.red,
      emitting: false,
    }).explode(12, this.stationX, this.stationY);
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
  stations: { station: { type: string; room: string }; x: number; y: number }[];
  private spawnTimer = 0;
  spawnInterval: number;
  bossPhase = false;
  onTaskComplete: (task: Task, isPerfect: boolean, score: number) => void;
  onTaskExpire: (task: Task) => void;
  private occupied = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    stations: { station: { type: string; room: string }; x: number; y: number }[],
    onTaskComplete: (task: Task, isPerfect: boolean, score: number) => void,
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
    this.spawnInterval = boss ? 1000 : 2600;
  }

  update(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnTask();
    }

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

    const free = this.stations.filter((s) => !this.occupied.has(`${s.x},${s.y}`));
    if (free.length === 0) return;
    const station = Phaser.Utils.Array.GetRandom(free);

    let type: TaskType;
    let urgency: TaskUrgency = 'NORMAL';

    if (this.bossPhase) {
      type = Phaser.Utils.Array.GetRandom(TASK_TYPE_KEYS);
      const roll = Math.random();
      if (roll < 0.25) urgency = 'BOSS';
      else if (roll < 0.6) urgency = 'CRITICAL';
      else urgency = 'URGENT';
    } else {
      const weighted: TaskType[] = [];
      TASK_TYPE_KEYS.forEach((t) => {
        const weight = t === 'URGENT_REQUEST' ? 1 : 3;
        for (let i = 0; i < weight; i++) weighted.push(t);
      });
      type = Phaser.Utils.Array.GetRandom(weighted);

      const roll = Math.random();
      if (roll < 0.15) urgency = 'CRITICAL';
      else if (roll < 0.45) urgency = 'URGENT';
    }

    const config = TASK_TYPES[type];
    const time = this.bossPhase ? config.minBossTime : config.baseTime;

    const task = new Task(this.scene, type, station.x, station.y, time, urgency);
    this.occupied.add(`${station.x},${station.y}`);
    this.tasks.push(task);
  }

  forceSpawn(type: TaskType, urgency: TaskUrgency = 'URGENT'): void {
    const maxTasks = this.bossPhase ? BOSS_PHASE_MAX_TASKS : MAX_ACTIVE_TASKS;
    if (this.tasks.length >= maxTasks + 4) return;
    const free = this.stations.filter((s) => !this.occupied.has(`${s.x},${s.y}`));
    if (free.length === 0) return;
    const station = Phaser.Utils.Array.GetRandom(free);
    const config = TASK_TYPES[type];
    const time = this.bossPhase ? config.minBossTime : config.baseTime;
    const task = new Task(this.scene, type, station.x, station.y, time, urgency);
    this.occupied.add(`${station.x},${station.y}`);
    this.tasks.push(task);
  }

  tryInteract(player: Player): boolean {
    const px = player.sprite.x;
    const py = player.sprite.y;
    let nearest: Task | null = null;
    let nearestDist = Infinity;

    for (const task of this.tasks) {
      if (task.completed || task.expired) continue;
      const dx = px - task.stationX;
      const dy = py - task.stationY;
      const dist = dx * dx + dy * dy;
      if (dist < 78 * 78 && dist < nearestDist) {
        nearest = task;
        nearestDist = dist;
      }
    }

    if (nearest) {
      const res = nearest.interact(player);
      if (res.completed) {
        this.onTaskComplete(nearest, res.isPerfect, res.score);
      }
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
