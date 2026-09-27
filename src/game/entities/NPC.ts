import Phaser from 'phaser';

export type NPCRole = 'typist' | 'rusher' | 'coffee_drinker' | 'phone_talker' | 'boss';

const PHONE_LINES = [
  'BUY! SELL!',
  'PER MY LAST EMAIL',
  'LET\'S CIRCLE BACK',
  'TOUCH BASE EOD',
  'UNMUTE YOUR MIC',
  'CAN YOU HEAR ME?',
  'SYNERGY IS KEY',
];

const COFFEE_LINES = [
  'NEED CAFFEINE',
  'ESP-DEPRESSO',
  'MIND RUNNING SLOW',
  'ONE MORE CUP',
];

// NPC — Coworker with specific role and speech reactions
export class NPC {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  role: NPCRole;
  private wanderTimer = 0;
  private vx = 0;
  private vy = 0;
  private baseSpeed: number;
  private speechContainer: Phaser.GameObjects.Container | null = null;
  private speechTimer = 0;
  private actionTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, role: NPCRole = 'typist') {
    this.scene = scene;
    this.role = role;
    this.sprite = scene.physics.add.sprite(x, y, textureKey).setSize(20, 20).setDepth(y + 50);
    this.sprite.setCollideWorldBounds(true);

    if (role === 'boss') {
      this.baseSpeed = 70;
      this.sprite.setScale(1.2);
    } else if (role === 'rusher') {
      this.baseSpeed = 160;
    } else if (role === 'phone_talker') {
      this.baseSpeed = 40;
    } else if (role === 'coffee_drinker') {
      this.baseSpeed = 90;
    } else {
      // typist
      this.baseSpeed = 0; // mostly stays at desk
    }

    this.actionTimer = Phaser.Math.Between(3000, 9000);
    this.pickDirection();
  }

  private pickDirection(): void {
    if (this.role === 'typist') {
      this.vx = 0;
      this.vy = 0;
      this.wanderTimer = Phaser.Math.Between(4000, 8000);
      return;
    }

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.wanderTimer = Phaser.Math.Between(1500, 3500);

    if (this.vx < -5) this.sprite.setFlipX(true);
    else if (this.vx > 5) this.sprite.setFlipX(false);
  }

  showSpeech(text: string, durationMs = 2000, color = '#ffffff', bgColor = 0x1a1a28): void {
    if (this.speechContainer) {
      this.speechContainer.destroy();
      this.speechContainer = null;
    }

    const container = this.scene.add.container(this.sprite.x, this.sprite.y - 36).setDepth(this.sprite.y + 300);

    const txt = this.scene.add.text(0, 0, text, {
      fontFamily: 'Impact, sans-serif',
      fontSize: '12px',
      color: color,
    }).setOrigin(0.5);

    const pad = 6;
    const w = txt.width + pad * 2;
    const h = txt.height + pad * 2;

    const bg = this.scene.add.rectangle(0, 0, w, h, bgColor, 0.95)
      .setStrokeStyle(1.5, 0xffffff, 0.9);

    container.add([bg, txt]);
    this.speechContainer = container;

    // Pop-in animation
    container.setScale(0);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });

    this.scene.time.delayedCall(durationMs, () => {
      if (this.speechContainer === container) {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          scale: 0.5,
          duration: 200,
          onComplete: () => {
            container.destroy();
            if (this.speechContainer === container) {
              this.speechContainer = null;
            }
          },
        });
      }
    });
  }

  update(dt: number): void {
    this.wanderTimer -= dt;
    this.actionTimer -= dt;

    if (this.wanderTimer <= 0) {
      if (this.role === 'typist') {
        // Subtle bobbing like typing
        this.sprite.y += (Math.random() > 0.5 ? 1 : -1);
        this.wanderTimer = Phaser.Math.Between(2000, 5000);
      } else if (Math.random() < 0.25) {
        this.vx = 0;
        this.vy = 0;
        this.wanderTimer = Phaser.Math.Between(1000, 2500);
      } else {
        this.pickDirection();
      }
    }

    // Role-specific occasional actions / speech
    if (this.actionTimer <= 0) {
      this.actionTimer = Phaser.Math.Between(8000, 20000);
      if (this.role === 'phone_talker') {
        const line = Phaser.Utils.Array.GetRandom(PHONE_LINES);
        this.showSpeech(line, 2200, '#40c4ff', 0x0d2838);
      } else if (this.role === 'coffee_drinker') {
        const line = Phaser.Utils.Array.GetRandom(COFFEE_LINES);
        this.showSpeech(line, 2200, '#76ff03', 0x163810);
      } else if (this.role === 'boss') {
        this.showSpeech('WHERE IS THAT REPORT?', 2500, '#ff1744', 0x3a0d18);
      }
    }

    this.sprite.setVelocity(this.vx, this.vy);
    this.sprite.setDepth(this.sprite.y + 50);

    if (this.speechContainer) {
      this.speechContainer.setPosition(this.sprite.x, this.sprite.y - 36);
      this.speechContainer.setDepth(this.sprite.y + 300);
    }
  }

  panic(text = 'AAAHH!! 🔥', duration = 2500): void {
    this.baseSpeed = 220;
    this.pickDirection();
    this.showSpeech(text, duration, '#ff1744', 0x3d0a0f);
  }

  destroy(): void {
    if (this.speechContainer) {
      this.speechContainer.destroy();
      this.speechContainer = null;
    }
    this.sprite.destroy();
  }
}

// NPCManager — Spawns and orchestrates coworkers across office zones
export class NPCManager {
  scene: Phaser.Scene;
  npcs: NPC[] = [];
  bossNPC: NPC | null = null;
  private wallBodies: Phaser.GameObjects.Rectangle[];

  constructor(scene: Phaser.Scene, wallBodies: Phaser.GameObjects.Rectangle[], _count = 14) {
    this.scene = scene;
    this.wallBodies = wallBodies;
    this.spawnOfficePopulation();
  }

  private spawnOfficePopulation(): void {
    // 1. Desk Typists at Cubicles (sitting at desks)
    const deskCoords = [
      { x: 180, y: 120 }, { x: 360, y: 120 }, { x: 540, y: 120 },
      { x: 180, y: 280 }, { x: 360, y: 280 }, { x: 540, y: 280 },
    ];
    deskCoords.forEach((coord, i) => {
      const npc = new NPC(this.scene, coord.x, coord.y, `npc_${i % 6}`, 'typist');
      this.scene.physics.add.collider(npc.sprite, this.wallBodies);
      this.npcs.push(npc);
    });

    // 2. Document rushers running across hallways
    const rusher1 = new NPC(this.scene, 700, 320, 'npc_2', 'rusher');
    const rusher2 = new NPC(this.scene, 1300, 480, 'npc_4', 'rusher');
    [rusher1, rusher2].forEach((n) => {
      this.scene.physics.add.collider(n.sprite, this.wallBodies);
      this.npcs.push(n);
    });

    // 3. Coffee drinkers in cafeteria
    const coffeeNpc = new NPC(this.scene, 1020, 520, 'npc_3', 'coffee_drinker');
    this.scene.physics.add.collider(coffeeNpc.sprite, this.wallBodies);
    this.npcs.push(coffeeNpc);

    // 4. Phone arguers in stairwell
    const phoneNpc = new NPC(this.scene, 2000, 500, 'npc_1', 'phone_talker');
    this.scene.physics.add.collider(phoneNpc.sprite, this.wallBodies);
    this.npcs.push(phoneNpc);

    // 5. Boss patrolling office
    this.bossNPC = new NPC(this.scene, 1550, 180, 'boss_sprite', 'boss');
    this.scene.physics.add.collider(this.bossNPC.sprite, this.wallBodies);
    this.npcs.push(this.bossNPC);
  }

  triggerMassPanic(speech = 'EVERYONE PANIC!!'): void {
    this.npcs.forEach((npc) => {
      npc.panic(speech);
    });
  }

  notifyEvent(eventKey: string): void {
    if (eventKey.includes('PRINTER')) {
      const nearby = this.npcs.find((n) => n.role === 'rusher' || Math.random() < 0.3);
      if (nearby) nearby.showSpeech('NOT THE PRINTER AGAIN!!', 2500, '#ffd180', 0x3d280f);
    } else if (eventKey.includes('SERVER')) {
      const nearby = this.npcs.find((n) => n.role === 'typist');
      if (nearby) nearby.showSpeech('WHO PUSHED TO PROD?!', 2500, '#ff5252', 0x3d0a0f);
    } else if (eventKey.includes('BOSS')) {
      const nearby = this.npcs.find((n) => n.role === 'typist');
      if (nearby) nearby.showSpeech('ACT NATURAL!!', 2500, '#ff4081', 0x3a0d24);
    } else if (eventKey.includes('COFFEE')) {
      const nearby = this.npcs.find((n) => n.role === 'coffee_drinker');
      if (nearby) nearby.showSpeech('I CALL DIBS ON COFFEE!', 2200, '#76ff03', 0x163810);
    }
  }

  update(dt: number): void {
    this.npcs.forEach((n) => n.update(dt));
  }

  setSpeedMultiplier(mult: number): void {
    this.npcs.forEach((n) => {
      n['baseSpeed'] = n['baseSpeed'] * mult;
    });
  }

  destroyAll(): void {
    this.npcs.forEach((n) => n.destroy());
    this.npcs = [];
    this.bossNPC = null;
  }
}
