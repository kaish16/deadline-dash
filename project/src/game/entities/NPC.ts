import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/constants';

// NPC — wandering coworker. Moves randomly, occasionally interrupts the player.
export class NPC {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  private wanderTimer = 0;
  private vx = 0;
  private vy = 0;
  private baseSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, textureKey).setSize(20, 20).setDepth(y + 50);
    this.sprite.setCollideWorldBounds(true);
    this.baseSpeed = Phaser.Math.Between(60, 120);
    this.pickDirection();
  }

  private pickDirection(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.wanderTimer = Phaser.Math.Between(1500, 4000);
    if (this.vx < -5) this.sprite.setFlipX(true);
    else if (this.vx > 5) this.sprite.setFlipX(false);
  }

  update(dt: number): void {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      // 30% chance to pause
      if (Math.random() < 0.3) {
        this.vx = 0;
        this.vy = 0;
        this.wanderTimer = Phaser.Math.Between(1000, 2500);
      } else {
        this.pickDirection();
      }
    }
    this.sprite.setVelocity(this.vx, this.vy);
    this.sprite.setDepth(this.sprite.y + 50);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

// NPCManager — spawns and manages multiple NPCs across the office.
export class NPCManager {
  scene: Phaser.Scene;
  npcs: NPC[] = [];
  private wallBodies: Phaser.GameObjects.Rectangle[];

  constructor(scene: Phaser.Scene, wallBodies: Phaser.GameObjects.Rectangle[], count = 12) {
    this.scene = scene;
    this.wallBodies = wallBodies;
    for (let i = 0; i < count; i++) {
      this.spawnNPC();
    }
  }

  private spawnNPC(): void {
    const x = Phaser.Math.Between(80, WORLD_WIDTH - 80);
    const y = Phaser.Math.Between(80, WORLD_HEIGHT - 80);
    const tex = `npc_${Phaser.Math.Between(0, 5)}`;
    const npc = new NPC(this.scene, x, y, tex);
    // Collide with walls
    this.scene.physics.add.collider(npc.sprite, this.wallBodies);
    this.npcs.push(npc);
  }

  update(dt: number): void {
    this.npcs.forEach((n) => n.update(dt));
  }

  setSpeedMultiplier(mult: number): void {
    this.npcs.forEach((n) => { n['baseSpeed'] = n['baseSpeed'] * mult; });
  }

  destroyAll(): void {
    this.npcs.forEach((n) => n.destroy());
    this.npcs = [];
  }
}
