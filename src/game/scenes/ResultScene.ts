import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, type ResultStats } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';
import type { GameAchievement } from '../systems/AchievementSystem';

interface ResultData {
  stats: ResultStats;
  unlockedAchievements?: GameAchievement[];
}

export class ResultScene extends Phaser.Scene {
  private stats!: ResultStats;
  private achievements: GameAchievement[] = [];

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.stats = data.stats;
    this.achievements = data.unlockedAchievements || [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.flash(300, 255, 111, 0);

    // Zoom-in arcade entrance
    this.cameras.main.setZoom(1.25);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: 500,
      ease: 'Power2.easeOut',
    });

    // Determine performance rank
    let rank = 'B';
    let rankTitle = 'SOLID WORKER 💼';
    let rankColor = '#ffd180';

    if (!this.stats.survived) {
      rank = 'F';
      rankTitle = 'TERMINATED 💀 (BACK TO JOB HUNTING)';
      rankColor = '#ff5252';
    } else if (this.stats.score >= 7000 && this.stats.deadlinesMissed <= 1) {
      rank = 'S';
      rankTitle = 'OFFICE DEITY 👑 (FAST TRACK TO VP)';
      rankColor = '#ff00ff';
    } else if (this.stats.score >= 4800) {
      rank = 'A';
      rankTitle = 'EMPLOYEE OF THE MONTH ⭐';
      rankColor = '#c6ff00';
    } else if (this.stats.score >= 2800) {
      rank = 'B';
      rankTitle = 'CORPORATE SURVIVOR 💼';
      rankColor = '#ffab40';
    } else {
      rank = 'C';
      rankTitle = 'PLACED ON A PIP 📋';
      rankColor = '#ff7043';
    }

    // Title
    const titleText = this.stats.survived ? 'WORKDAY COMPLETE — 6:00 PM' : 'SHIFT TERMINATED';
    const titleColor = this.stats.survived ? '#c6ff00' : '#ff5252';
    const title = this.add.text(GAME_WIDTH / 2, 60, titleText, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '48px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 400,
      ease: 'Power2.easeOut',
    });

    // Rank Badge (Left-center)
    const rankContainer = this.add.container(260, 280).setAlpha(0).setScale(2);
    const badgeCircle = this.add.circle(0, 0, 80, 0x141424, 0.9)
      .setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(rankColor).color);
    const rankLetter = this.add.text(0, -10, rank, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '84px',
      color: rankColor,
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);
    const rankSubtitle = this.add.text(0, 56, 'RANK', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const rankVerdict = this.add.text(0, 110, rankTitle, {
      fontFamily: 'Impact, sans-serif',
      fontSize: '18px',
      color: rankColor,
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5);

    rankContainer.add([badgeCircle, rankLetter, rankSubtitle, rankVerdict]);

    // Stamp animation for rank
    this.tweens.add({
      targets: rankContainer,
      alpha: 1,
      scale: 1,
      delay: 500,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        SoundManager.play('COMBO_UP', 8);
        this.cameras.main.shake(150, 0.01);
      },
    });

    // Stats rows (Center-right)
    const rows = [
      { label: 'TASKS COMPLETED', value: `${this.stats.tasksCompleted}`, color: '#c6ff00' },
      { label: 'DEADLINES MISSED', value: `${this.stats.deadlinesMissed}`, color: '#ff5252' },
      { label: 'PRODUCTIVITY', value: `${this.stats.productivity}%`, color: '#ff9100' },
      { label: 'REPUTATION', value: `${this.stats.reputation}%`, color: '#b388ff' },
      { label: 'PEAK CHAOS / STRESS', value: `${this.stats.stress}%`, color: '#ff4081' },
      { label: 'FINAL SCORE', value: `${this.stats.score.toLocaleString()}`, color: '#ffd700' },
      { label: 'XP EARNED', value: `+${Math.max(100, Math.round(this.stats.score * 0.4))} XP`, color: '#76ff03' },
    ];

    const startX = 520;
    const startY = 130;
    rows.forEach((row, i) => {
      const y = startY + i * 40;
      const label = this.add.text(startX, y, row.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        color: '#9e9eb0',
      }).setOrigin(0, 0.5).setAlpha(0);

      const val = this.add.text(startX + 400, y, row.value, {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '24px',
        color: row.color,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0);

      this.tweens.add({
        targets: [label, val],
        alpha: 1,
        x: { from: label.x - 20, to: label.x },
        delay: 600 + i * 90,
        duration: 250,
        ease: 'Power2.easeOut',
      });
    });

    // Achievements Section
    const achY = 460;
    const achHeader = this.add.text(GAME_WIDTH / 2, achY, '🏆 UNLOCKED ACHIEVEMENTS', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '22px',
      color: '#ffd180',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: achHeader,
      alpha: 1,
      delay: 1300,
      duration: 300,
    });

    if (this.achievements.length > 0) {
      const achDisplay = this.achievements.slice(0, 4);
      achDisplay.forEach((ach, idx) => {
        const itemX = GAME_WIDTH / 2 + (idx - (achDisplay.length - 1) / 2) * 260;
        const itemY = achY + 45;

        const card = this.add.container(itemX, itemY).setAlpha(0).setScale(0.8);
        const cardBg = this.add.rectangle(0, 0, 240, 52, 0x1a1a2e, 0.9)
          .setStrokeStyle(1.5, 0xffd700);
        const achText = this.add.text(0, -6, `${ach.icon} ${ach.name}`, {
          fontFamily: 'Impact, sans-serif',
          fontSize: '16px',
          color: '#ffffff',
        }).setOrigin(0.5);
        const achSub = this.add.text(0, 12, ach.desc, {
          fontFamily: '"Courier New", monospace',
          fontSize: '11px',
          color: '#ffd180',
        }).setOrigin(0.5);

        card.add([cardBg, achText, achSub]);

        this.tweens.add({
          targets: card,
          alpha: 1,
          scale: 1,
          delay: 1450 + idx * 100,
          duration: 300,
          ease: 'Back.easeOut',
        });
      });
    } else {
      const noAchText = this.add.text(GAME_WIDTH / 2, achY + 40, 'No achievements unlocked this shift. Clock in again to grind!', {
        fontFamily: '"Courier New", monospace',
        fontSize: '15px',
        color: '#757585',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: noAchText,
        alpha: 1,
        delay: 1400,
        duration: 300,
      });
    }

    // Restart button "NEW SHIFT"
    const btnY = GAME_HEIGHT - 65;
    const btnBg = this.add.graphics();
    const drawBtn = (alpha: number) => {
      btnBg.clear();
      btnBg.fillStyle(0xff6f00, alpha);
      btnBg.fillRoundedRect(GAME_WIDTH / 2 - 140, btnY - 26, 280, 52, 8);
      btnBg.lineStyle(2, 0xffab40, 1);
      btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 140, btnY - 26, 280, 52, 8);
    };
    drawBtn(1);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY, 'CLOCK IN — NEW SHIFT', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: btnText,
      alpha: 1,
      delay: 1600,
      duration: 300,
    });

    const hitZone = this.add.zone(GAME_WIDTH / 2, btnY, 280, 52).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => drawBtn(0.85));
    hitZone.on('pointerout', () => drawBtn(1));

    const restartGame = () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(350, () => this.scene.start('MenuScene'));
    };

    hitZone.on('pointerdown', restartGame);
    this.input.keyboard?.once('keydown-SPACE', restartGame);

    // Confetti celebration if survived
    if (this.stats.survived) {
      this.time.delayedCall(800, () => {
        this.add.particles(GAME_WIDTH / 2, -20, 'particle', {
          x: { min: 0, max: GAME_WIDTH },
          lifespan: 3500,
          speedY: { min: 80, max: 220 },
          speedX: { min: -40, max: 40 },
          scale: { start: 1.5, end: 0 },
          alpha: { start: 1, end: 0 },
          frequency: 60,
          quantity: 3,
          tint: [COLORS.lime, COLORS.orange, COLORS.magenta, COLORS.purple, 0xffd700],
        });
      });
    }
  }
}
