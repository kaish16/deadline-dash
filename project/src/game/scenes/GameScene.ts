import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT,
  ROUND_LENGTH_MS, BOSS_PHASE_MS,
  COLORS, STAT_MAX,
  EXHAUSTION_PER_TASK, EXHAUSTION_DECAY_PER_SEC,
  REPUTATION_LOSS_PER_MISS, PRODUCTIVITY_PER_TASK,
  CHAOS_PER_ACTIVE_TASK, CHAOS_DECAY_PER_SEC,
  calculateScore, calculateXp, type ResultStats,
} from '../config/constants';
import { OfficeMap } from '../systems/OfficeMap';
import { Player } from '../entities/Player';
import { TaskManager } from '../entities/Task';
import { NPCManager } from '../entities/NPC';
import { ChaosManager } from '../systems/ChaosManager';
import { EventManager } from '../systems/EventManager';
import { HUD } from '../systems/HUD';

export class GameScene extends Phaser.Scene {
  private officeMap!: OfficeMap;
  private player!: Player;
  private taskManager!: TaskManager;
  private npcManager!: NPCManager;
  private chaos!: ChaosManager;
  private eventManager!: EventManager;
  private hud!: HUD;

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

    // Player at center of cubicles
    this.player = new Player(this, 360, 300);
    this.physics.add.collider(this.player.sprite, wallBodies);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setLerp(0.1, 0.1);

    // Task manager
    const stations = this.officeMap.getStations();
    this.taskManager = new TaskManager(
      this,
      stations as never,
      (task) => this.onTaskComplete(task),
      (task) => this.onTaskExpire(task),
    );

    // NPCs
    this.npcManager = new NPCManager(this, wallBodies, 14);

    // Chaos
    this.chaos = new ChaosManager(this);

    // Events
    this.eventManager = new EventManager(
      this,
      this.taskManager,
      this.chaos,
      (label, color) => this.onGameEvent(label, color),
    );

    // HUD
    this.hud = new HUD(this);

    // Player interaction
    this.player.onInteract = () => {
      const ok = this.taskManager.tryInteract(this.player.sprite.x, this.player.sprite.y);
      if (!ok) {
        // Visual feedback for empty interaction
        this.add.tween({
          targets: this.player.glow,
          scale: { from: 1.3, to: 1 },
          duration: 200,
        });
      }
    };

    // Intro fade
    this.cameras.main.fadeIn(500);

    // Start with a few tasks
    this.time.delayedCall(500, () => {
      for (let i = 0; i < 3; i++) {
        this.taskManager.forceSpawn('EMAIL');
      }
    });
  }

  update(_time: number, deltaMs: number): void {
    if (this.gameOver) return;

    const dt = deltaMs * this.timeScale;

    // Elapsed time
    this.elapsed += dt;

    // Check round end
    if (this.elapsed >= ROUND_LENGTH_MS) {
      this.endGame(true);
      return;
    }

    // Boss phase
    if (!this.bossPhase && this.elapsed >= ROUND_LENGTH_MS - BOSS_PHASE_MS) {
      this.bossPhase = true;
      this.taskManager.setBossPhase(true);
      this.hud.showBossBanner();
      this.chaos.addChaos(20);
      this.cameras.main.flash(300, 255, 82, 82);
    }

    // Focus mode affects time scale
    this.timeScale = this.player.focusActive ? 0.4 : 1;

    // Player update (always real-time for movement feel)
    this.player.update(deltaMs);

    // Task manager
    this.taskManager.update(dt);

    // Highlight tasks during focus
    this.taskManager.setHighlight(this.player.focusActive);

    // NPCs
    this.npcManager.update(deltaMs);

    // Chaos: based on active tasks
    const activeTasks = this.taskManager.getActiveCount();
    this.chaos.addChaos(activeTasks * CHAOS_PER_ACTIVE_TASK * (dt / 1000));
    this.chaos.reduceChaos(CHAOS_DECAY_PER_SEC * (dt / 1000));
    this.chaos.update(deltaMs);
    this.chaos.trackPeak();

    // Events
    this.eventManager.update(dt);

    // Exhaustion decay
    // (handled in Player.update)

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

    // Check reputation failure
    if (this.reputation <= 0) {
      this.endGame(false);
    }
  }

  private onTaskComplete(task: { type: string }): void {
    this.tasksCompleted++;
    this.productivity = Math.min(STAT_MAX, this.productivity + PRODUCTIVITY_PER_TASK);
    this.reputation = Math.min(STAT_MAX, this.reputation + 3);
    this.player.addExhaustion(EXHAUSTION_PER_TASK);
    this.score += 250;

    // Score popup
    const popup = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, '+250', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#c6ff00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(this.player.sprite.y + 200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private onTaskExpire(_task: { type: string }): void {
    this.deadlinesMissed++;
    this.reputation = Math.max(0, this.reputation - REPUTATION_LOSS_PER_MISS);
    this.score = Math.max(0, this.score - 180);
    this.chaos.addChaos(10);

    // Screen flash red
    this.cameras.main.flash(100, 255, 82, 82);

    // Penalty popup
    const popup = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, 'MISSED!', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#ff5252',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(this.player.sprite.y + 200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
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

    // Stop player input
    this.input.keyboard?.shutdown();

    // Calculate final stats
    const stress = Math.round(this.chaos.getPeakChaos());
    const finalScore = calculateScore({
      tasksCompleted: this.tasksCompleted,
      deadlinesMissed: this.deadlinesMissed,
      productivity: Math.round(this.productivity),
      reputation: Math.round(this.reputation),
      stress,
      score: 0,
      survived,
    });

    const stats: ResultStats = {
      tasksCompleted: this.tasksCompleted,
      deadlinesMissed: this.deadlinesMissed,
      productivity: Math.round(this.productivity),
      reputation: Math.round(this.reputation),
      stress,
      score: finalScore,
      survived,
    };

    // Dramatic transition
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.shake(300, 0.02);

    this.time.delayedCall(700, () => {
      this.scene.start('ResultScene', { stats });
    });
  }

  shutdown(): void {
    this.taskManager?.destroyAll();
    this.player?.destroy();
    this.npcManager?.destroyAll();
  }
}
