import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

// ChaosManager — drives visual/audio chaos based on the chaos level (0-100).
// Effects: screen shake, light flicker, vignette intensity, scanline overlay, camera flash.
export class ChaosManager {
  scene: Phaser.Scene;
  chaos = 0;
  private lights: Phaser.GameObjects.Arc[] = [];
  private vignette: Phaser.GameObjects.Image;
  private scanlines: Phaser.GameObjects.Image;
  private flickerTimer = 0;
  private shakeTimer = 0;
  private alarmActive = false;
  private alarmText?: Phaser.GameObjects.Text;
  private alarmBg?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const stored = scene.registry.get('lights') as Phaser.GameObjects.Arc[] | undefined;
    this.lights = stored ?? [];

    // Vignette
    this.vignette = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setScrollFactor(0).setDepth(2000).setAlpha(0.3);

    // Scanlines (hidden until high chaos)
    this.scanlines = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scanlines')
      .setScrollFactor(0).setDepth(2001).setAlpha(0);
  }

  addChaos(amount: number): void {
    this.chaos = Math.min(100, this.chaos + amount);
  }

  reduceChaos(amount: number): void {
    this.chaos = Math.max(0, this.chaos - amount);
  }

  update(dt: number): void {
    // Chaos-driven effects
    const level = this.chaos / 100;

    // Vignette intensity
    this.vignette.setAlpha(0.2 + level * 0.5);

    // Scanlines at high chaos
    this.scanlines.setAlpha(Math.max(0, level - 0.5) * 0.5);

    // Light flicker — more frequent at higher chaos
    this.flickerTimer -= dt;
    if (this.flickerTimer <= 0) {
      this.flickerTimer = Phaser.Math.Between(200, 1200) * (1 - level * 0.7);
      this.flickerLights(level);
    }

    // Screen shake
    this.shakeTimer -= dt;
    if (this.shakeTimer <= 0 && level > 0.3) {
      this.shakeTimer = Phaser.Math.Between(500, 2000);
      const intensity = level * 0.012;
      this.scene.cameras.main.shake(200, intensity);
    }

    // Continuous slight shake at very high chaos
    if (level > 0.8) {
      this.scene.cameras.main.shake(50, 0.004);
    }
  }

  private flickerLights(intensity: number): void {
    const count = Math.floor(this.lights.length * (0.1 + intensity * 0.5));
    for (let i = 0; i < count; i++) {
      const light = Phaser.Utils.Array.GetRandom(this.lights);
      if (!light) continue;
      const original = 0.08;
      light.setAlpha(Phaser.Math.FloatBetween(0.2, 0.6));
      this.scene.time.delayedCall(Phaser.Math.Between(40, 120), () => {
        light.setAlpha(original);
      });
    }
  }

  // Show a big alarm banner
  showAlarm(text: string, color: number): void {
    this.alarmActive = true;
    if (this.alarmBg) this.alarmBg.destroy();
    if (this.alarmText) this.alarmText.destroy();

    this.alarmBg = this.scene.add.rectangle(GAME_WIDTH / 2, 60, GAME_WIDTH, 50, color, 0.85)
      .setScrollFactor(0).setDepth(2100);
    this.alarmText = this.scene.add.text(GAME_WIDTH / 2, 60, text, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2101);

    // Flash
    this.scene.tweens.add({
      targets: [this.alarmBg, this.alarmText],
      alpha: { from: 1, to: 0.3 },
      duration: 200,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.scene.tweens.add({
          targets: [this.alarmBg, this.alarmText],
          alpha: 0,
          duration: 300,
          delay: 500,
          onComplete: () => { this.alarmActive = false; },
        });
      },
    });

    // Camera flash
    this.scene.cameras.main.flash(150, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  getChaos(): number {
    return this.chaos;
  }

  getPeakChaos(): number {
    return this.peakChaos;
  }

  private peakChaos = 0;

  trackPeak(): void {
    this.peakChaos = Math.max(this.peakChaos, this.chaos);
  }
}
