import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, ACHIEVEMENTS, type ResultStats } from '../config/constants';

export class ResultScene extends Phaser.Scene {
  private stats!: ResultStats;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: { stats: ResultStats }): void {
    this.stats = data.stats;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.flash(300, 255, 111, 0);

    // Dramatic zoom-in animation
    this.cameras.main.setZoom(1.3);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: 600,
      ease: 'Power2.easeOut',
    });

    // Title
    const titleText = this.stats.survived ? 'DEADLINE SURVIVED' : 'SHIFT OVER';
    const titleColor = this.stats.survived ? '#c6ff00' : '#ff5252';
    const title = this.add.text(GAME_WIDTH / 2, 80, titleText, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '56px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 400,
      delay: 200,
      ease: 'Power2.easeOut',
    });
    this.tweens.add({
      targets: title,
      scale: { from: 0.8, to: 1 },
      duration: 500,
      delay: 200,
      ease: 'Back.easeOut',
    });

    // Stats rows
    const rows: { label: string; value: string; color: string }[] = [
      { label: 'TASKS COMPLETED', value: `${this.stats.tasksCompleted}`, color: '#c6ff00' },
      { label: 'DEADLINES MISSED', value: `${this.stats.deadlinesMissed}`, color: '#ff5252' },
      { label: 'PRODUCTIVITY', value: `${this.stats.productivity}%`, color: '#ff9100' },
      { label: 'REPUTATION', value: `${this.stats.reputation}%`, color: '#b388ff' },
      { label: 'PEAK STRESS', value: `${this.stats.stress}%`, color: '#ff4081' },
      { label: 'SCORE', value: `${this.stats.score}`, color: '#f2e9ff' },
      { label: 'XP EARNED', value: `+${this.stats.score > 0 ? Math.round(this.stats.score * 0.4) : 0} XP`, color: '#76ff03' },
    ];

    const startY = 160;
    rows.forEach((row, i) => {
      const y = startY + i * 42;
      const label = this.add.text(GAME_WIDTH / 2 - 180, y, row.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        color: '#8a8a9a',
      }).setOrigin(0, 0.5).setAlpha(0);

      const value = this.add.text(GAME_WIDTH / 2 + 180, y, row.value, {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '26px',
        color: row.color,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0);

      this.tweens.add({
        targets: [label, value],
        alpha: 1,
        x: { from: label.x - 20, to: label.x },
        duration: 300,
        delay: 500 + i * 100,
        ease: 'Power2.easeOut',
      });
    });

    // Achievements
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(this.stats));
    const achY = startY + rows.length * 42 + 20;

    this.add.text(GAME_WIDTH / 2, achY, 'ACHIEVEMENTS', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '22px',
      color: '#ffd180',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    this.tweens.add({
      targets: this.children.list[this.children.list.length - 1],
      alpha: 1,
      duration: 300,
      delay: 500 + rows.length * 100 + 200,
    });

    unlocked.forEach((ach, i) => {
      const y = achY + 35 + i * 30;
      const text = this.add.text(GAME_WIDTH / 2, y, `★ ${ach.name} — ${ach.desc}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        color: '#c6ff00',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0).setScale(0.5);

      this.tweens.add({
        targets: text,
        alpha: 1,
        scale: 1,
        duration: 400,
        delay: 800 + rows.length * 100 + i * 120,
        ease: 'Back.easeOut',
      });
    });

    if (unlocked.length === 0) {
      this.add.text(GAME_WIDTH / 2, achY + 35, 'No achievements this round', {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        color: '#5a5a6a',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: this.children.list[this.children.list.length - 1],
        alpha: 1,
        duration: 300,
        delay: 1200,
      });
    }

    // Restart button
    const btnY = GAME_HEIGHT - 60;
    const btnBg = this.add.graphics();
    const drawBtn = (alpha: number) => {
      btnBg.clear();
      btnBg.fillStyle(0xff6f00, alpha);
      btnBg.fillRoundedRect(GAME_WIDTH / 2 - 120, btnY - 25, 240, 50, 6);
      btnBg.lineStyle(2, 0xffab40, 1);
      btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 120, btnY - 25, 240, 50, 6);
    };
    drawBtn(1);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY, 'NEW SHIFT', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: btnText,
      alpha: 1,
      duration: 300,
      delay: 1500,
    });

    const hitZone = this.add.zone(GAME_WIDTH / 2, btnY, 240, 50).setInteractive();
    hitZone.on('pointerover', () => drawBtn(0.8));
    hitZone.on('pointerout', () => drawBtn(1));
    hitZone.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(350, () => this.scene.start('MenuScene'));
    });

    // Confetti for survivors
    if (this.stats.survived) {
      this.time.delayedCall(1000, () => {
        this.add.particles(GAME_WIDTH / 2, -20, 'particle', {
          x: { min: 0, max: GAME_WIDTH },
          lifespan: 4000,
          speedY: { min: 80, max: 200 },
          speedX: { min: -40, max: 40 },
          scale: { start: 1, end: 0 },
          alpha: { start: 1, end: 0 },
          frequency: 80,
          quantity: 3,
          tint: [COLORS.green, COLORS.orange, COLORS.magenta, COLORS.purple, COLORS.lime],
        });
      });
    }
  }
}
