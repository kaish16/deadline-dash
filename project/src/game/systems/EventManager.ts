import Phaser from 'phaser';
import { GAME_EVENTS, EVENT_INTERVAL_MS, ROUND_LENGTH_MS, type GameEventConfig } from '../config/constants';
import type { TaskManager } from '../entities/Task';
import type { ChaosManager } from './ChaosManager';
import { SoundManager } from './SoundManager';

const NEW_EVENTS: GameEventConfig[] = [
  { key: 'PRINTER_EXPLOSION', label: 'PRINTER HAS CHOSEN VIOLENCE', color: 0xffd180, minTime: 10000, weight: 2 },
  { key: 'BOSS_WALK', label: 'BOSS INCOMING 🚨', color: 0xff5252, minTime: 15000, weight: 2 },
  { key: 'EMERGENCY_MEETING', label: 'THIS MEETING COULD HAVE BEEN AN EMAIL', color: 0x40c4ff, minTime: 12000, weight: 2 },
  { key: 'COFFEE_EMERGENCY', label: 'CAFFEINE REQUIRED', color: 0x76ff03, minTime: 5000, weight: 3 },
  { key: 'SERVER_CRASH', label: 'IT\'S ALWAYS DNS', color: 0xff9100, minTime: 20000, weight: 2 },
  { key: 'CLIENT_ANGRY', label: 'CLIENT IS ANGRY 💀', color: 0xff4081, minTime: 8000, weight: 2 },
  { key: 'OVERTIME', label: 'WELCOME TO OVERTIME', color: 0xc6ff00, minTime: ROUND_LENGTH_MS * 0.5, weight: 2 },
];

interface SecretEvent {
  key: string;
  label: string;
  minTime: number;
}

const SECRET_EVENTS: SecretEvent[] = [
  { key: 'INTERN_TAKEOVER', label: 'THE INTERN HAS TAKEN OVER', minTime: 10000 },
  { key: 'FREE_PIZZA', label: 'FREE PIZZA 🍕', minTime: 20000 },
  { key: 'CEO_ENTERED', label: 'CEO HAS ENTERED THE BUILDING', minTime: 30000 },
  { key: 'PRETEND_WORK', label: '4:20 PM — EVERYONE IS PRETENDING TO WORK', minTime: ROUND_LENGTH_MS * 0.7 },
  { key: 'PRINTER_WORKING', label: 'THE PRINTER IS FINALLY WORKING', minTime: 15000 },
];

// EventManager — fires random events that change the game state.
export class EventManager {
  scene: Phaser.Scene;
  private taskManager: TaskManager;
  private chaos: ChaosManager;
  private timer = 0;
  private elapsed = 0;
  private onEvent: (label: string, color: number) => void;
  private lastEventSecret = false;

  constructor(
    scene: Phaser.Scene,
    taskManager: TaskManager,
    chaos: ChaosManager,
    onEvent: (label: string, color: number) => void,
  ) {
    this.scene = scene;
    this.taskManager = taskManager;
    this.chaos = chaos;
    this.onEvent = onEvent;
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.timer += dt;
    if (this.timer >= EVENT_INTERVAL_MS) {
      this.timer = 0;
      this.fireEvent();
    }
  }

  public wasLastEventSecret(): boolean {
    return this.lastEventSecret;
  }

  private fireEvent(): void {
    // 5% chance for a secret event each cycle
    if (Math.random() < 0.05) {
      const availableSecrets = SECRET_EVENTS.filter((e) => this.elapsed >= e.minTime);
      if (availableSecrets.length > 0) {
        const event = Phaser.Utils.Array.GetRandom(availableSecrets);
        this.fireSecretEvent(event);
        return;
      }
    }

    // Combine normal and new events
    const allEvents = [...GAME_EVENTS, ...NEW_EVENTS];
    const available = allEvents.filter((e) => this.elapsed >= e.minTime);
    if (available.length === 0) return;

    // Weighted random
    const weighted: GameEventConfig[] = [];
    available.forEach((e) => {
      for (let i = 0; i < e.weight; i++) weighted.push(e);
    });
    const event = Phaser.Utils.Array.GetRandom(weighted);

    this.lastEventSecret = false;
    this.onEvent(event.label, event.color);
    this.chaos.addChaos(8);

    this.handleNormalEvent(event);
  }

  private handleNormalEvent(event: GameEventConfig): void {
    switch (event.key) {
      case 'URGENT_EMAIL':
      case 'CLIENT_CALL':
        this.spawnUrgentTasks(1);
        break;
      case 'BOSS_IS_COMING':
      case 'MEETING_MOVED':
        this.chaos.addChaos(15);
        this.spawnUrgentTasks(2);
        break;
      case 'SERVER_DOWN':
        this.chaos.addChaos(12);
        break;
      case 'PRINTER_JAM':
        this.chaos.addChaos(6);
        break;
      case 'NEW_DEADLINE':
        this.spawnUrgentTasks(3);
        break;
        
      // NEW EVENTS
      case 'PRINTER_EXPLOSION':
        this.chaos.addChaos(10);
        SoundManager.play('PRINTER_EVENT');
        this.scene.cameras.main.shake(300, 0.015);
        this.scene.add.particles(1590, 520, 'particle', {
          lifespan: 800,
          speed: { min: 80, max: 250 },
          scale: { start: 1.5, end: 0 },
          alpha: { start: 1, end: 0 },
          quantity: 20,
          tint: [0xffd180, 0xff5252, 0xffffff],
          emitting: false,
        }).explode(20, 1590, 520);
        this.spawnTaskAtRoom('printing', 'URGENT_REQUEST');
        break;
        
      case 'BOSS_WALK':
        this.chaos.addChaos(25);
        SoundManager.play('BOSS_WARNING');
        this.spawnTaskAtRoom('boss', 'PRESENTATION');
        this.spawnUrgentTasks(1);
        break;
        
      case 'EMERGENCY_MEETING':
        this.taskManager.forceSpawn('MEETING');
        this.taskManager.forceSpawn('MEETING');
        break;
        
      case 'COFFEE_EMERGENCY':
        this.chaos.addChaos(15);
        SoundManager.play('COFFEE');
        break;
        
      case 'SERVER_CRASH':
        this.chaos.addChaos(12);
        SoundManager.play('SERVER_CRASH');
        
        // Flicker lights
        let flickerCount = 0;
        const flickerTimer = this.scene.time.addEvent({
          delay: 150,
          repeat: 5,
          callback: () => {
            this.scene.cameras.main.setAlpha(flickerCount % 2 === 0 ? 0.6 : 1);
            flickerCount++;
          }
        });
        
        this.spawnTaskAtRoom('server', 'BUG_FIX');
        this.taskManager.forceSpawn('BUG_FIX');
        break;
        
      case 'CLIENT_ANGRY':
        this.chaos.addChaos(10);
        this.taskManager.forceSpawn('CLIENT_CALL');
        break;
        
      case 'OVERTIME':
        this.chaos.addChaos(5);
        const tm = this.taskManager as any;
        const originalInterval = tm.spawnInterval;
        tm.spawnInterval = 800;
        this.scene.time.delayedCall(8000, () => {
          tm.spawnInterval = tm.bossPhase ? 1100 : 2600;
        });
        break;
    }
  }

  private fireSecretEvent(event: SecretEvent): void {
    this.lastEventSecret = true;
    // Secret events have a special magenta color or gold
    this.onEvent(event.label, 0xff4081);

    switch (event.key) {
      case 'INTERN_TAKEOVER': {
        const gameScene = this.scene as any;
        if (gameScene.score !== undefined) {
          gameScene.score += 500;
          const player = gameScene.player?.sprite;
          if (player) {
            const popup = this.scene.add.text(player.x, player.y - 50, '+500 (INTERN HUSTLE)', {
              fontFamily: 'Impact, "Arial Black", sans-serif',
              fontSize: '22px',
              color: '#c6ff00',
              stroke: '#000000',
              strokeThickness: 3,
            }).setOrigin(0.5).setDepth(player.y + 200);

            this.scene.tweens.add({
              targets: popup,
              y: popup.y - 40,
              alpha: 0,
              duration: 1500,
              ease: 'Power2.easeOut',
              onComplete: () => popup.destroy(),
            });
          }
        }
        break;
      }
      
      case 'FREE_PIZZA':
        this.chaos.reduceChaos(20);
        break;
        
      case 'CEO_ENTERED':
        SoundManager.play('BOSS_WARNING');
        this.taskManager.tasks.forEach((t) => {
          t.timeLeft *= 0.6; // reduce timer by 40%
        });
        break;
        
      case 'PRETEND_WORK':
        // Comedy event - nothing happens mechanically but players panic!
        break;
        
      case 'PRINTER_WORKING': {
        // Complete tasks at the printer (x: 1590, y: 520)
        const printerTasks = this.taskManager.tasks.filter((t) => t.stationX === 1590 && t.stationY === 520);
        printerTasks.forEach((t) => {
          t.complete();
          const tm = this.taskManager as any;
          if (tm.onTaskComplete) {
            tm.onTaskComplete(t);
          }
        });
        break;
      }
    }
  }

  private spawnUrgentTasks(count: number): void {
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        this.taskManager.forceSpawn('URGENT_REQUEST');
      });
    }
  }
  
  private spawnTaskAtRoom(roomId: string, taskType: any): void {
    const tm = this.taskManager as any;
    const originalStations = tm.stations;
    if (!originalStations) return;
    
    // Temporarily filter stations to target room
    tm.stations = originalStations.filter((s: any) => s.room === roomId);
    if (tm.stations.length > 0) {
      tm.forceSpawn(taskType);
    }
    // Restore
    tm.stations = originalStations;
  }
}
