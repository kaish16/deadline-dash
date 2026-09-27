import Phaser from 'phaser';
import {
  PLAYER_SPEED, PLAYER_SPEED_FOCUSED, FOCUS_DURATION_MS, FOCUS_COOLDOWN_MS,
  COLORS, EXHAUSTION_SPEED_PENALTY,
} from '../config/constants';

// Player — top-down character with arrow-key movement, space to interact, F for focus mode.
export class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  facing: 'down' | 'up' | 'left' | 'right' = 'down';
  exhaustion = 0;

  // Focus ability
  focusActive = false;
  focusCooldown = false;
  focusTimer = 0;
  focusCooldownTimer = 0;

  // Visual
  glow: Phaser.GameObjects.Arc;
  trail: Phaser.GameObjects.Particles.ParticleEmitter;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private focusKey!: Phaser.Input.Keyboard.Key;

  // Callbacks
  onInteract: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player').setSize(20, 20).setDepth(y + 100);
    this.sprite.setCollideWorldBounds(true);

    // Glow ring
    this.glow = scene.add.circle(x, y, 24, COLORS.playerGlow, 0.15).setDepth(y + 99);

    // Trail particles
    this.trail = scene.add.particles(0, 0, 'particle', {
      lifespan: 400,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 60,
      quantity: 1,
      tint: COLORS.orange,
      follow: this.sprite,
    });
    this.trail.setDepth(y + 98);

    this.setupInput();
  }

  private setupInput(): void {
    const kb = this.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.focusKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this.interactKey.on('down', () => {
      if (this.onInteract) this.onInteract();
    });
    this.focusKey.on('down', () => this.activateFocus());
  }

  private activateFocus(): void {
    if (this.focusActive || this.focusCooldown) return;
    this.focusActive = true;
    this.focusTimer = FOCUS_DURATION_MS;
    this.focusCooldown = false;
    // Visual desaturation during focus (best-effort — postFX may not exist in all builds)
    const cam = this.scene.cameras.main as unknown as { postFX?: { addColorMatrix?: () => { saturate?: (v: number) => void } } };
    const fx = cam.postFX;
    if (fx) {
      const matrix = fx.addColorMatrix?.();
      matrix?.saturate?.(-0.3);
    }
  }

  update(dt: number): void {
    // Movement
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    // Facing
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      this.facing = dy > 0 ? 'down' : 'up';
    }

    // Speed
    let speed = this.focusActive ? PLAYER_SPEED_FOCUSED : PLAYER_SPEED;
    // Exhaustion penalty
    const penalty = 1 - (this.exhaustion / 100) * EXHAUSTION_SPEED_PENALTY;
    speed *= penalty;

    this.sprite.setVelocity(dx * speed, dy * speed);

    // Flip sprite based on facing
    if (this.facing === 'left') this.sprite.setFlipX(true);
    else if (this.facing === 'right') this.sprite.setFlipX(false);

    // Update depth for y-sorting
    this.sprite.setDepth(this.sprite.y + 100);
    this.glow.setPosition(this.sprite.x, this.sprite.y).setDepth(this.sprite.y + 99);
    this.trail.setDepth(this.sprite.y + 98);

    // Focus mode timers
    if (this.focusActive) {
      this.focusTimer -= dt;
      if (this.focusTimer <= 0) {
        this.focusActive = false;
        this.focusCooldown = true;
        this.focusCooldownTimer = FOCUS_COOLDOWN_MS;
      }
    }
    if (this.focusCooldown) {
      this.focusCooldownTimer -= dt;
      if (this.focusCooldownTimer <= 0) {
        this.focusCooldown = false;
      }
    }

    // Focus visual
    if (this.focusActive) {
      this.sprite.setTexture('player_focus');
      this.glow.setRadius(28).setFillStyle(COLORS.focusTint, 0.25);
    } else {
      this.sprite.setTexture('player');
      this.glow.setRadius(24).setFillStyle(COLORS.playerGlow, 0.15);
    }

    // Exhaustion decay
    this.exhaustion = Math.max(0, this.exhaustion - (1.5 * dt) / 1000);
  }

  addExhaustion(amount: number): void {
    this.exhaustion = Math.min(100, this.exhaustion + amount);
  }

  getFocusProgress(): { active: boolean; cooldown: boolean; cooldownRatio: number; activeRatio: number } {
    return {
      active: this.focusActive,
      cooldown: this.focusCooldown,
      cooldownRatio: this.focusCooldown ? this.focusCooldownTimer / FOCUS_COOLDOWN_MS : 0,
      activeRatio: this.focusActive ? this.focusTimer / FOCUS_DURATION_MS : 0,
    };
  }

  destroy(): void {
    this.trail.destroy();
    this.glow.destroy();
    this.sprite.destroy();
  }
}
