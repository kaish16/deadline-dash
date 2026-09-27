import Phaser from 'phaser';
import {
  PLAYER_SPEED, PLAYER_SPEED_FOCUSED, FOCUS_DURATION_MS, FOCUS_COOLDOWN_MS,
  COLORS, EXHAUSTION_SPEED_PENALTY,
} from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

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

  // Coffee Boost
  coffeeBoost = false;
  coffeeTimer = 0;

  // Carrying pipeline items (Overcooked style)
  carryingItem: 'document' | 'coffee' | null = null;
  private carriedSprite: Phaser.GameObjects.Image | null = null;

  // Dash ability (Subway Surfers speed burst)
  dashActive = false;
  dashCooldown = false;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private readonly DASH_SPEED = 520;
  private readonly DASH_DURATION_MS = 220;
  private readonly DASH_COOLDOWN_MS = 1800;

  // Slip hazard (puddle collision)
  isSlipping = false;
  private slipTimer = 0;
  private slipVx = 0;
  private slipVy = 0;

  // "Look Busy" stealth mechanic (B key)
  isLookingBusy = false;
  private lookBusySprite: Phaser.GameObjects.Image | null = null;

  // Combo tier visual
  currentCombo = 0;

  // Visual
  glow: Phaser.GameObjects.Arc;
  trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private footstepTimer = 0;
  private walkBob = 0;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private focusKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private busyKey!: Phaser.Input.Keyboard.Key;

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
    this.dashKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.busyKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    this.interactKey.on('down', () => {
      this.playInteractAnimation();
      if (this.onInteract) this.onInteract();
    });
    this.focusKey.on('down', () => this.activateFocus());
    this.dashKey.on('down', () => this.tryDash());
  }

  tryDash(): void {
    if (this.dashActive || this.dashCooldown || this.isSlipping) return;
    this.dashActive = true;
    this.dashTimer = this.DASH_DURATION_MS;
    this.dashCooldown = true;
    this.dashCooldownTimer = this.DASH_COOLDOWN_MS;

    SoundManager.play('FOCUS_ACTIVATE');
    // Dash burst particles
    this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
      lifespan: 300,
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      quantity: 12,
      tint: [COLORS.orange, 0xffffff],
      emitting: false,
    }).explode(12, this.sprite.x, this.sprite.y);
  }

  setCarrying(item: 'document' | 'coffee' | null): void {
    this.carryingItem = item;
    if (this.carriedSprite) {
      this.carriedSprite.destroy();
      this.carriedSprite = null;
    }

    if (item === 'document') {
      this.carriedSprite = this.scene.add.image(this.sprite.x, this.sprite.y - 24, 'carried_document')
        .setDepth(this.sprite.depth + 10);
    } else if (item === 'coffee') {
      this.carriedSprite = this.scene.add.image(this.sprite.x, this.sprite.y - 24, 'carried_coffee')
        .setDepth(this.sprite.depth + 10);
    }
  }

  triggerSlip(): void {
    if (this.isSlipping) return;
    this.isSlipping = true;
    this.slipTimer = 700;
    SoundManager.play('TASK_FAIL');

    // Random slide direction
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.slipVx = Math.cos(angle) * 320;
    this.slipVy = Math.sin(angle) * 320;

    // Spin animation
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 720,
      duration: 650,
      ease: 'Cubic.easeOut',
    });

    // If carrying document, papers scatter!
    if (this.carryingItem === 'document') {
      this.setCarrying(null);
      for (let p = 0; p < 6; p++) {
        const paper = this.scene.add.image(this.sprite.x, this.sprite.y, 'paper_sheet').setDepth(this.sprite.depth + 20);
        this.scene.tweens.add({
          targets: paper,
          x: paper.x + Phaser.Math.Between(-80, 80),
          y: paper.y + Phaser.Math.Between(-60, 60),
          rotation: Phaser.Math.FloatBetween(-3, 3),
          alpha: 0,
          duration: 1200,
          onComplete: () => paper.destroy(),
        });
      }
    }
  }

  private playInteractAnimation(): void {
    // Punch / squash feedback
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.25,
      scaleY: 0.85,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private activateFocus(): void {
    if (this.focusActive || this.focusCooldown) return;
    this.focusActive = true;
    this.focusTimer = FOCUS_DURATION_MS;
    this.focusCooldown = false;
    SoundManager.play('FOCUS_ACTIVATE');
  }

  applyCoffeeBoost(durationMs = 7000): void {
    this.coffeeBoost = true;
    this.coffeeTimer = durationMs;
    this.exhaustion = Math.max(0, this.exhaustion - 50); // Restores energy!
    SoundManager.play('COFFEE');

    // Coffee sparkle burst
    this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
      lifespan: 500,
      speed: { min: 40, max: 120 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 15,
      tint: [0x76ff03, 0xffeb3b, 0xffffff],
      emitting: false,
    }).explode(15, this.sprite.x, this.sprite.y);
  }

  setCombo(combo: number): void {
    this.currentCombo = combo;
  }

  update(dt: number): void {
    // Slipping state (hit coffee puddle)
    if (this.isSlipping) {
      this.slipTimer -= dt;
      this.slipVx *= 0.96;
      this.slipVy *= 0.96;
      this.sprite.setVelocity(this.slipVx, this.slipVy);
      if (this.slipTimer <= 0) {
        this.isSlipping = false;
        this.sprite.angle = 0;
      }
      this.updateVisuals(dt, false);
      return;
    }

    // Dash state
    if (this.dashActive) {
      this.dashTimer -= dt;
      let dashDirX = 0;
      let dashDirY = 0;
      if (this.facing === 'left') dashDirX = -1;
      else if (this.facing === 'right') dashDirX = 1;
      else if (this.facing === 'up') dashDirY = -1;
      else dashDirY = 1;

      this.sprite.setVelocity(dashDirX * this.DASH_SPEED, dashDirY * this.DASH_SPEED);
      if (this.dashTimer <= 0) {
        this.dashActive = false;
      }
      this.updateVisuals(dt, true);
      return;
    }

    if (this.dashCooldown) {
      this.dashCooldownTimer -= dt;
      if (this.dashCooldownTimer <= 0) {
        this.dashCooldown = false;
      }
    }

    // Look Busy mode (Hold B)
    if (this.busyKey.isDown) {
      this.isLookingBusy = true;
      this.sprite.setVelocity(0, 0);
      if (!this.lookBusySprite) {
        this.lookBusySprite = this.scene.add.image(this.sprite.x, this.sprite.y - 36, 'look_busy_screen')
          .setDepth(this.sprite.depth + 15).setScale(0.85);
      } else {
        this.lookBusySprite.setPosition(this.sprite.x, this.sprite.y - 36);
        this.lookBusySprite.setVisible(true);
      }
      this.updateVisuals(dt, false);
      return;
    } else {
      this.isLookingBusy = false;
      if (this.lookBusySprite) {
        this.lookBusySprite.setVisible(false);
      }
    }

    // Normal Movement
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    const isMoving = dx !== 0 || dy !== 0;

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

    // Speed calculation
    let speed = this.focusActive ? PLAYER_SPEED_FOCUSED : PLAYER_SPEED;
    if (this.coffeeBoost) {
      speed += 80;
    }
    // Exhaustion penalty
    const penalty = 1 - (this.exhaustion / 100) * EXHAUSTION_SPEED_PENALTY;
    speed *= penalty;

    this.sprite.setVelocity(dx * speed, dy * speed);
    this.updateVisuals(dt, isMoving);
  }

  private updateVisuals(dt: number, isMoving: boolean): void {
    // Walking animation bob
    if (isMoving) {
      this.walkBob += dt * 0.015;
      this.sprite.rotation = Math.sin(this.walkBob) * 0.08;

      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 320;
        SoundManager.play('FOOTSTEP');
      }
    } else {
      this.sprite.rotation = 0;
    }

    // Flip sprite based on facing
    if (this.facing === 'left') this.sprite.setFlipX(true);
    else if (this.facing === 'right') this.sprite.setFlipX(false);

    // Update depth for y-sorting
    this.sprite.setDepth(this.sprite.y + 100);
    this.glow.setPosition(this.sprite.x, this.sprite.y).setDepth(this.sprite.y + 99);
    this.trail.setDepth(this.sprite.y + 98);

    // Carried item positioning
    if (this.carriedSprite) {
      const carryBob = Math.sin(this.walkBob) * 3;
      this.carriedSprite.setPosition(this.sprite.x, this.sprite.y - 24 + carryBob);
      this.carriedSprite.setDepth(this.sprite.depth + 10);
    }

    // Coffee timer
    if (this.coffeeBoost) {
      this.coffeeTimer -= dt;
      if (this.coffeeTimer <= 0) {
        this.coffeeBoost = false;
      }
    }

    // Focus mode timers
    if (this.focusActive) {
      this.focusTimer -= dt;
      if (this.focusTimer <= 0) {
        this.focusActive = false;
        this.focusCooldown = true;
        this.focusCooldownTimer = FOCUS_COOLDOWN_MS;
        SoundManager.play('FOCUS_END');
      }
    }
    if (this.focusCooldown) {
      this.focusCooldownTimer -= dt;
      if (this.focusCooldownTimer <= 0) {
        this.focusCooldown = false;
      }
    }

    // Visual appearance switching
    if (this.focusActive) {
      this.sprite.setTexture('player_focus');
      this.glow.setRadius(32).setFillStyle(COLORS.focusTint, 0.35);
    } else if (this.coffeeBoost) {
      this.sprite.setTexture('player');
      this.glow.setRadius(30).setFillStyle(0x76ff03, 0.3);
    } else if (this.currentCombo >= 5) {
      this.sprite.setTexture('player');
      this.glow.setRadius(28).setFillStyle(0xffd700, 0.3); // Golden aura
    } else if (this.exhaustion >= 70) {
      this.sprite.setTexture('player_tired');
      this.glow.setRadius(20).setFillStyle(COLORS.red, 0.2);
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
    if (this.carriedSprite) {
      this.carriedSprite.destroy();
      this.carriedSprite = null;
    }
    if (this.lookBusySprite) {
      this.lookBusySprite.destroy();
      this.lookBusySprite = null;
    }
    this.trail.destroy();
    this.glow.destroy();
    this.sprite.destroy();
  }
}
