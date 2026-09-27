import Phaser from 'phaser';
import {
  WORLD_WIDTH, WORLD_HEIGHT,
  ROUND_LENGTH_MS, BOSS_PHASE_MS,
  COLORS, STAT_MAX,
  EXHAUSTION_PER_TASK,
  REPUTATION_LOSS_PER_MISS, PRODUCTIVITY_PER_TASK,
  CHAOS_PER_ACTIVE_TASK, CHAOS_DECAY_PER_SEC,
  calculateScore, type ResultStats,
} from '../config/constants';
import { OfficeMap } from '../systems/OfficeMap';
import { Player } from '../entities/Player';
import { TaskManager, Task } from '../entities/Task';
import { NPCManager } from '../entities/NPC';
import { ChaosManager } from '../systems/ChaosManager';
import { EventManager } from '../systems/EventManager';
import { HUD } from '../systems/HUD';
import { SlangSystem } from '../systems/SlangSystem';
import { ComboSystem } from '../systems/ComboSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { SoundManager } from '../systems/SoundManager';

export class GameScene extends Phaser.Scene {
  private officeMap!: OfficeMap;
  private player!: Player;
  private taskManager!: TaskManager;
  private npcManager!: NPCManager;
  private chaos!: ChaosManager;
  private eventManager!: EventManager;
  private hud!: HUD;
  private slang!: SlangSystem;
  private comboSystem!: ComboSystem;
  private achievementSystem!: AchievementSystem;

  // Physical arcade hazards
  private puddles: Phaser.Physics.Arcade.Image[] = [];
  private chairs: Phaser.Physics.Arcade.Image[] = [];
  private roomba!: Phaser.Physics.Arcade.Image;
  private bossWarningCooldown = 0;

  // Stats
  private elapsed = 0;
  private productivity = 50;
  private reputation = 75;
  private score = 0;
  private tasksCompleted = 0;
  private deadlinesMissed = 0;
  private bossPhase = false;
  private gameOver = false;

  // Time scale for focus mode
  private timeScale = 1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.floor);

    // Build office
    this.officeMap = new OfficeMap(this);
    const wallBodies = this.officeMap.getWallBodies();

    // Systems
    this.slang = new SlangSystem(this);
    this.comboSystem = new ComboSystem(this);
    this.achievementSystem = new AchievementSystem(this);

    // Player at center of cubicles (must be created before hazards and overlaps)
    this.player = new Player(this, 360, 300);
    this.physics.add.collider(this.player.sprite, wallBodies);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setLerp(0.1, 0.1);

    // Spawn physical hazards: Slippery Coffee Puddles
    this.spawnPuddles();

    // Spawn kickable rolling office chairs
    this.spawnRollingChairs(wallBodies);

    // Spawn Roomba robot vacuum
    this.spawnRoomba(wallBodies);

    // Player vs Chairs collider
    this.physics.add.collider(this.player.sprite, this.chairs);

    // Puddle slip trigger
    this.physics.add.overlap(this.player.sprite, this.puddles, () => {
      if (!this.player.isSlipping) {
        this.player.triggerSlip();
        this.slang.showCustom('SLIPPED! ☕', this.player.sprite.x, this.player.sprite.y - 30, '#ff5252');
      }
    });

    // Task manager
    const stations = this.officeMap.getStations();
    this.taskManager = new TaskManager(
      this,
      stations as never,
      (task, isPerfect, taskScore) => this.onTaskComplete(task, isPerfect, taskScore),
      (task) => this.onTaskExpire(task),
    );

    // NPCs with personality
    this.npcManager = new NPCManager(this, wallBodies, 14);

    // Chair vs NPC physics
    this.npcManager.npcs.forEach((npc) => {
      this.physics.add.collider(npc.sprite, this.chairs, () => {
        if (Math.random() < 0.2) {
          npc.showSpeech('WATCH OUT! 🪑', 1500, '#ffd180');
        }
      });
    });

    // Chaos
    this.chaos = new ChaosManager(this);

    // Events
    this.eventManager = new EventManager(
      this,
      this.taskManager,
      this.chaos,
      (label, color) => this.onGameEvent(label, color),
    );

    // Hook NPC and slang reactions to events
    this.eventManager.onNPCReaction = (key) => this.npcManager.notifyEvent(key);
    this.eventManager.onSecretTriggered = () => {
      this.achievementSystem.onSecretEvent();
      this.slang.showCustom('ABSOLUTE CINEMA 🎬', this.player.sprite.x, this.player.sprite.y - 40, '#ffd700');
    };
    this.eventManager.onSlangReaction = (cat) => {
      this.slang.show(cat, this.player.sprite.x, this.player.sprite.y);
    };

    // HUD
    this.hud = new HUD(this);

    // Player interaction handler
    this.player.onInteract = () => {
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      // 1. Check if near coffee machine (Cafeteria: x: 920, y: 480)
      const coffeeDistSq = (px - 920) ** 2 + (py - 480) ** 2;
      if (coffeeDistSq < 75 * 75) {
        this.player.applyCoffeeBoost();
        this.achievementSystem.onCoffeeUsed();
        this.slang.showCustom('CAFFEINE OVERDRIVE ☕', px, py - 40, '#76ff03');
        return;
      }

      // 2. Deliver coffee to thirsty coworker if carrying coffee
      if (this.player.carryingItem === 'coffee') {
        const nearbyNpc = this.npcManager.npcs.find((n) => {
          const d = (n.sprite.x - px) ** 2 + (n.sprite.y - py) ** 2;
          return d < 70 * 70;
        });
        if (nearbyNpc) {
          this.player.setCarrying(null);
          this.chaos.reduceChaos(15);
          this.score += 300;
          nearbyNpc.showSpeech('THANK YOU! NEEDED THIS ☕', 2500, '#76ff03');
          this.slang.showCustom('TEAM PLAYER +300', px, py - 40, '#c6ff00');
          SoundManager.play('PERFECT_COMPLETE');
          return;
        }
      }

      // 3. Try interactive task system (handles mashing, delivery, and instant tasks)
      const ok = this.taskManager.tryInteract(this.player);
      if (!ok) {
        SoundManager.play('INTERACT_EMPTY');
        this.add.tween({
          targets: this.player.glow,
          scale: { from: 1.3, to: 1 },
          duration: 200,
        });
      }
    };

    // Intro fade
    this.cameras.main.fadeIn(500);

    // Initial task spawn
    this.time.delayedCall(500, () => {
      for (let i = 0; i < 3; i++) {
        this.taskManager.forceSpawn('EMAIL', 'NORMAL');
      }
    });
  }

  private spawnPuddles(): void {
    const puddleLocs = [
      { x: 420, y: 390 },
      { x: 980, y: 390 },
      { x: 1040, y: 560 },
      { x: 1540, y: 390 },
      { x: 1980, y: 390 },
      { x: 620, y: 220 },
    ];

    puddleLocs.forEach((loc) => {
      const puddle = this.physics.add.image(loc.x, loc.y, 'coffee_puddle')
        .setDepth(15)
        .setScale(1.1);
      (puddle.body as Phaser.Physics.Arcade.Body).setSize(32, 20);
      puddle.setImmovable(true);
      this.puddles.push(puddle);
    });
  }

  private spawnRollingChairs(wallBodies: Phaser.GameObjects.Rectangle[]): void {
    const chairLocs = [
      { x: 260, y: 160 },
      { x: 440, y: 160 },
      { x: 260, y: 320 },
      { x: 440, y: 320 },
      { x: 740, y: 340 },
      { x: 1240, y: 340 },
      { x: 1720, y: 340 },
      { x: 1480, y: 490 },
    ];

    chairLocs.forEach((loc) => {
      const chair = this.physics.add.image(loc.x, loc.y, 'rolling_chair')
        .setDepth(loc.y + 40)
        .setCollideWorldBounds(true)
        .setBounce(0.65)
        .setDrag(180);
      (chair.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
      this.physics.add.collider(chair, wallBodies);
      this.chairs.push(chair);
    });
  }

  private spawnRoomba(wallBodies: Phaser.GameObjects.Rectangle[]): void {
    this.roomba = this.physics.add.image(600, 390, 'hazard_roomba')
      .setDepth(390)
      .setCollideWorldBounds(true)
      .setBounce(1)
      .setVelocity(110, 0);
    (this.roomba.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
    this.physics.add.collider(this.roomba, wallBodies);

    // Overlap with player bumps player back slightly
    if (this.player?.sprite) {
      this.physics.add.overlap(this.player.sprite, this.roomba, () => {
        SoundManager.play('FOOTSTEP');
        const dx = this.player.sprite.x - this.roomba.x;
        const dy = this.player.sprite.y - this.roomba.y;
        this.player.sprite.x += Math.sign(dx || 1) * 12;
        this.player.sprite.y += Math.sign(dy || 1) * 12;
        if (Math.random() < 0.3) {
          this.slang.showCustom('BUMPED BY ROOMBA 🤖', this.player.sprite.x, this.player.sprite.y - 30, '#ffd180');
        }
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.gameOver) return;

    const dt = deltaMs * this.timeScale;
    this.elapsed += dt;

    // Check round end (6:00 PM)
    if (this.elapsed >= ROUND_LENGTH_MS) {
      this.endGame(true);
      return;
    }

    // Day/Night progression
    const dayProgress = Math.min(1, this.elapsed / ROUND_LENGTH_MS);
    this.officeMap.updateDayNight(dayProgress);

    // Boss phase trigger at 5:00 PM (final 60s)
    if (!this.bossPhase && this.elapsed >= ROUND_LENGTH_MS - BOSS_PHASE_MS) {
      this.bossPhase = true;
      this.taskManager.setBossPhase(true);
      this.hud.showBossBanner();
      this.chaos.addChaos(25);
      this.cameras.main.flash(400, 255, 23, 68);
      SoundManager.play('BOSS_WARNING');
      SoundManager.play('FINAL_HOUR');
      if (this.player?.sprite) {
        this.slang.show('BOSS', this.player.sprite.x, this.player.sprite.y);
      }
      this.npcManager.triggerMassPanic('FINAL HOUR!! 🔥');
    }

    // Focus mode affects time scale
    this.timeScale = this.player.focusActive ? 0.4 : 1;

    // Player update (dash, slip, look busy)
    this.player.update(deltaMs);

    // Boss Proximity & "Look Busy" Stealth Mechanic
    this.updateBossStealth(dt);

    // Update chairs depth
    this.chairs.forEach((c) => c.setDepth(c.y + 40));

    // Task manager update
    this.taskManager.update(dt);
    this.taskManager.setHighlight(this.player.focusActive);

    // Systems updates
    this.npcManager.update(deltaMs);
    this.comboSystem.update(dt);
    this.achievementSystem.update(dt, this.taskManager.getActiveCount());
    this.slang.update();

    // Chaos logic
    const activeTasks = this.taskManager.getActiveCount();
    this.chaos.addChaos(activeTasks * CHAOS_PER_ACTIVE_TASK * (dt / 1000));
    this.chaos.reduceChaos(CHAOS_DECAY_PER_SEC * (dt / 1000));
    this.chaos.update(deltaMs);
    this.chaos.trackPeak();

    // Random events update
    this.eventManager.update(dt);

    // Update HUD
    this.hud.update({
      elapsed: this.elapsed,
      productivity: this.productivity,
      reputation: this.reputation,
      exhaustion: this.player.exhaustion,
      chaos: this.chaos.getChaos(),
      taskCount: activeTasks,
      score: this.score,
      focus: this.player.getFocusProgress(),
    });

    // Check reputation loss defeat
    if (this.reputation <= 0) {
      this.endGame(false);
    }
  }

  private updateBossStealth(dt: number): void {
    if (!this.npcManager?.bossNPC?.sprite || !this.player?.sprite) return;
    this.bossWarningCooldown -= dt;

    const boss = this.npcManager.bossNPC.sprite;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const distSq = (boss.x - px) ** 2 + (boss.y - py) ** 2;

    if (distSq < 130 * 130 && this.bossWarningCooldown <= 0) {
      this.bossWarningCooldown = 7000;

      if (this.player.isLookingBusy) {
        // Player fooled the boss with fake spreadsheet!
        this.npcManager.bossNPC.showSpeech('EXCELLENT HUSTLE 👍', 2500, '#00e676', 0x0a2e14);
        this.score += 200;
        this.slang.showCustom('ACTED NATURAL +200 🔥', px, py - 40, '#00e676');
        SoundManager.play('PERFECT_COMPLETE');
      } else if (!this.player.carryingItem) {
        // Boss catches player walking empty-handed!
        this.npcManager.bossNPC.showSpeech('WHY ARE YOU LOITERING?! 👔', 2500, '#ff1744', 0x3d0a0f);
        this.chaos.addChaos(10);
        this.slang.show('BOSS', px, py - 40);
        SoundManager.play('BOSS_WARNING');
      }
    }
  }

  private onTaskComplete(task: Task, isPerfect: boolean, taskBaseScore: number): void {
    this.tasksCompleted++;
    this.productivity = Math.min(STAT_MAX, this.productivity + PRODUCTIVITY_PER_TASK);
    this.reputation = Math.min(STAT_MAX, this.reputation + 4);
    this.player.addExhaustion(EXHAUSTION_PER_TASK);

    // Combo evaluation
    const timeLeftRatio = task.maxTime > 0 ? task.timeLeft / task.maxTime : 0;
    const comboResult = this.comboSystem.onTaskComplete(timeLeftRatio);
    this.player.setCombo(comboResult.combo);

    // Achievements evaluation
    this.achievementSystem.onTaskComplete(task.urgency !== 'NORMAL', isPerfect);
    this.achievementSystem.onComboReached(comboResult.combo);

    // Score calculation
    const addedScore = Math.round((taskBaseScore + comboResult.bonusScore) * comboResult.multiplier);
    this.score += addedScore;

    // Audio & juicy game feel
    if (isPerfect) {
      SoundManager.play('PERFECT_COMPLETE', comboResult.multiplier);
      this.cameras.main.shake(120, 0.006);
    } else {
      SoundManager.play('TASK_COMPLETE', comboResult.multiplier);
    }

    // Slang popup
    if (comboResult.combo >= 4) {
      this.slang.show('STREAK', this.player.sprite.x, this.player.sprite.y, comboResult.combo);
    } else {
      this.slang.show('COMPLETE', this.player.sprite.x, this.player.sprite.y);
    }

    // Floating score animation
    const scoreString = isPerfect ? `+${addedScore} PERFECT!` : `+${addedScore}`;
    const scoreColor = isPerfect ? '#ffeb3b' : '#c6ff00';
    const popup = this.add.text(task.stationX, task.stationY - 30, scoreString, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: isPerfect ? '24px' : '20px',
      color: scoreColor,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2600);

    this.tweens.add({
      targets: popup,
      y: popup.y - 50,
      scale: { from: 1.3, to: 1 },
      alpha: 0,
      duration: 900,
      ease: 'Power2.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private onTaskExpire(_task?: Task): void {
    this.deadlinesMissed++;
    this.reputation = Math.max(0, this.reputation - REPUTATION_LOSS_PER_MISS);
    this.score = Math.max(0, this.score - 180);
    this.chaos.addChaos(12);

    // Combo break
    this.comboSystem.onTaskMiss();
    this.player.setCombo(0);
    this.achievementSystem.onTaskMiss();

    // Audio & screen flash
    SoundManager.play('TASK_FAIL');
    this.cameras.main.flash(150, 255, 82, 82);
    this.cameras.main.shake(200, 0.01);

    // Slang reaction
    this.slang.show('MISS', this.player.sprite.x, this.player.sprite.y);

    // Negative score popup
    const popup = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, '-180 MISSED!', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '22px',
      color: '#ff5252',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2600);

    this.tweens.add({
      targets: popup,
      y: popup.y - 45,
      alpha: 0,
      duration: 850,
      ease: 'Power2.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private onGameEvent(label: string, color: number): void {
    this.chaos.showAlarm(label, color);
  }

  private endGame(survived: boolean): void {
    if (this.gameOver) return;
    this.gameOver = true;

    // Stop keyboard input
    this.input.keyboard?.shutdown();

    if (survived) {
      this.achievementSystem.onBossPhaseComplete();
      SoundManager.play('WORKDAY_COMPLETE');
    } else {
      SoundManager.play('GAME_OVER');
    }

    const stress = Math.round(this.chaos.getPeakChaos());
    const finalScore = calculateScore({
      tasksCompleted: this.tasksCompleted,
      deadlinesMissed: this.deadlinesMissed,
      productivity: Math.round(this.productivity),
      reputation: Math.round(this.reputation),
      stress,
      score: 0,
      survived,
    }) + this.score;

    const stats: ResultStats = {
      tasksCompleted: this.tasksCompleted,
      deadlinesMissed: this.deadlinesMissed,
      productivity: Math.round(this.productivity),
      reputation: Math.round(this.reputation),
      stress,
      score: finalScore,
      survived,
    };

    // Unlocked achievements from run
    const unlockedAchievements = this.achievementSystem.getUnlocked();

    // Cinematic office shutdown
    if (survived) {
      const banner = this.add.text(this.cameras.main.scrollX + 640, this.cameras.main.scrollY + 360, 'WORKDAY COMPLETE\n6:00 PM', {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '64px',
        color: '#c6ff00',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      }).setOrigin(0.5).setDepth(4000).setScale(0);

      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });
    }

    // Fade out to ResultScene
    this.time.delayedCall(survived ? 2200 : 800, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(650, () => {
        this.scene.start('ResultScene', { stats, unlockedAchievements });
      });
    });
  }

  shutdown(): void {
    this.taskManager?.destroyAll();
    this.player?.destroy();
    this.npcManager?.destroyAll();
    this.slang?.destroy();
    this.comboSystem?.destroy();
    this.achievementSystem?.destroy();
    this.puddles.forEach((p) => p.destroy());
    this.chairs.forEach((c) => c.destroy());
    this.roomba?.destroy();
  }
}
