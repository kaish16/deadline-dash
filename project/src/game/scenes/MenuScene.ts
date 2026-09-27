import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Animated background grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a2a, 0.5);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Floating particles
    const particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      lifespan: 3000,
      speedX: { min: -20, max: 20 },
      speedY: { min: -30, max: -10 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.3, end: 0 },
      frequency: 200,
      quantity: 1,
      tint: [COLORS.orange, COLORS.magenta, COLORS.purple, COLORS.lime],
    });
    particles.setDepth(1);

    // Title
    const titleY = GAME_HEIGHT / 2 - 120;
    const title = this.add.text(GAME_WIDTH / 2, titleY, 'DEADLINE DASH', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '82px',
      color: '#ff6f00',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    const subtitle = this.add.text(GAME_WIDTH / 2, titleY + 70, 'JOBLESS 2.0', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '36px',
      color: '#b388ff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    // Pulsing title
    this.tweens.add({
      targets: [title, subtitle],
      scale: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Instructions
    const instrY = titleY + 160;
    const instructions = [
      'ARROW KEYS / WASD — MOVE',
      'SPACE — INTERACT WITH TASKS',
      'F — FOCUS MODE (slow time, speed up)',
      '',
      'COMPLETE TASKS. AVOID DEADLINES.',
      'SURVIVE THE FINAL 60 SECONDS.',
      'YOU CANNOT DO EVERYTHING.',
    ];
    instructions.forEach((line, i) => {
      this.add.text(GAME_WIDTH / 2, instrY + i * 28, line, {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        color: i >= 4 ? '#ff5252' : '#f2e9ff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10);
    });

    // Start button
    const btnY = GAME_HEIGHT - 100;
    const btnBg = this.add.graphics();
    const drawBtn = (alpha: number) => {
      btnBg.clear();
      btnBg.fillStyle(0xff6f00, alpha);
      btnBg.fillRoundedRect(GAME_WIDTH / 2 - 140, btnY - 30, 280, 60, 8);
      btnBg.lineStyle(3, 0xffab40, 1);
      btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 140, btnY - 30, 280, 60, 8);
    };
    drawBtn(1);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY, 'START SHIFT', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    const hitZone = this.add.zone(GAME_WIDTH / 2, btnY, 280, 60).setInteractive();
    hitZone.on('pointerover', () => drawBtn(0.85));
    hitZone.on('pointerout', () => drawBtn(1));
    hitZone.on('pointerdown', () => {
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(450, () => this.scene.start('GameScene'));
    });

    // Pulsing button
    this.tweens.add({
      targets: btnText,
      scale: { from: 1, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
