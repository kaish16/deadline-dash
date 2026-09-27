import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAT_MAX, ROUND_LENGTH_MS, BOSS_PHASE_MS } from '../config/constants';

// HUD — fixed overlay showing meters, countdown, focus cooldown, and active task count.
export class HUD {
  scene: Phaser.Scene;
  private productivityBar: Phaser.GameObjects.Rectangle;
  private productivityFill: Phaser.GameObjects.Rectangle;
  private reputationBar: Phaser.GameObjects.Rectangle;
  private reputationFill: Phaser.GameObjects.Rectangle;
  private exhaustionBar: Phaser.GameObjects.Rectangle;
  private exhaustionFill: Phaser.GameObjects.Rectangle;
  private chaosBar: Phaser.GameObjects.Rectangle;
  private chaosFill: Phaser.GameObjects.Rectangle;
  private countdownText: Phaser.GameObjects.Text;
  private workdayClockText: Phaser.GameObjects.Text;
  private focusBorder: Phaser.GameObjects.Rectangle;
  private focusBannerText: Phaser.GameObjects.Text;
  private lastFocusState = false;
  private taskCountText: Phaser.GameObjects.Text;
  private bossText: Phaser.GameObjects.Text;
  private focusBg: Phaser.GameObjects.Rectangle;
  private focusFill: Phaser.GameObjects.Rectangle;
  private focusLabel: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;

  // Labels
  private prodLabel: Phaser.GameObjects.Text;
  private repLabel: Phaser.GameObjects.Text;
  private exhLabel: Phaser.GameObjects.Text;
  private chaosLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const depth = 3000;

    // --- Top bar background ---
    scene.add.rectangle(0, 0, GAME_WIDTH, 56, 0x0a0a0f, 0.9)
      .setOrigin(0).setScrollFactor(0).setDepth(depth);
    scene.add.rectangle(0, 55, GAME_WIDTH, 2, COLORS.orange, 0.6)
      .setOrigin(0).setScrollFactor(0).setDepth(depth);

    // --- Countdown timer & Workday Clock (center top) ---
    this.countdownText = scene.add.text(GAME_WIDTH / 2, 18, '2:00', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#f2e9ff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    this.workdayClockText = scene.add.text(GAME_WIDTH / 2, 42, '9:00 AM', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ffd180',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    // Focus mode screen border pulse
    this.focusBorder = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setStrokeStyle(10, COLORS.focusTint, 0.8)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth - 1)
      .setVisible(false);

    // Focus mode banner
    this.focusBannerText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'FOCUS MODE: LOCKED IN', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '44px',
      color: '#b388ff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 10).setAlpha(0);

    // --- Score (top left) ---
    this.scoreText = scene.add.text(16, 10, 'SCORE: 0', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#ff9100',
      stroke: '#000000',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(depth + 1);

    // --- Task count (top right) ---
    this.taskCountText = scene.add.text(GAME_WIDTH - 16, 10, 'TASKS: 0', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#ff4081',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth + 1);

    // --- Meter bars (left side, below top bar) ---
    const meterY = 70;
    const meterW = 180;
    const meterH = 12;
    const labelOffset = -14;

    // Productivity
    this.prodLabel = this.makeLabel(scene, 16, meterY + labelOffset, 'PRODUCTIVITY', '#ff9100', depth);
    this.productivityBar = this.makeBarBg(scene, 16, meterY, meterW, meterH, depth);
    this.productivityFill = this.makeBarFill(scene, 16, meterY, meterW, meterH, COLORS.orange, depth);

    // Reputation
    const repY = meterY + 42;
    this.repLabel = this.makeLabel(scene, 16, repY + labelOffset, 'REPUTATION', '#b388ff', depth);
    this.reputationBar = this.makeBarBg(scene, 16, repY, meterW, meterH, depth);
    this.reputationFill = this.makeBarFill(scene, 16, repY, meterW, meterH, COLORS.purple, depth);

    // Exhaustion
    const exhY = repY + 42;
    this.exhLabel = this.makeLabel(scene, 16, exhY + labelOffset, 'EXHAUSTION', '#ff5252', depth);
    this.exhaustionBar = this.makeBarBg(scene, 16, exhY, meterW, meterH, depth);
    this.exhaustionFill = this.makeBarFill(scene, 16, exhY, meterW, meterH, COLORS.red, depth);

    // Chaos
    const chaosY = exhY + 42;
    this.chaosLabel = this.makeLabel(scene, 16, chaosY + labelOffset, 'CHAOS', '#ff4081', depth);
    this.chaosBar = this.makeBarBg(scene, 16, chaosY, meterW, meterH, depth);
    this.chaosFill = this.makeBarFill(scene, 16, chaosY, meterW, meterH, COLORS.magenta, depth);

    // --- Focus ability indicator (bottom left) ---
    const focusY = GAME_HEIGHT - 36;
    this.focusBg = scene.add.rectangle(16, focusY, 110, 28, 0x1a1a2a, 0.9)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);
    scene.add.rectangle(16, focusY, 110, 28).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth)
      .setStrokeStyle(2, COLORS.purple);
    this.focusFill = scene.add.rectangle(16, focusY, 0, 28, COLORS.purple, 0.5)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);
    this.focusLabel = scene.add.text(71, focusY, '[F] FOCUS', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '15px',
      color: '#f2e9ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // Controls hints bar (bottom)
    const hints = '[SHIFT] DASH   •   [B] LOOK BUSY   •   [SPACE] INTERACT / MASH';
    scene.add.text(140, focusY, hints, {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#ffd180',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);

    // --- Boss phase banner (hidden initially) ---
    this.bossText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'FINAL 60 SECONDS\nALL DEPARTMENTS ATTACK', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '48px',
      color: '#ff5252',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 5).setAlpha(0);
  }

  private makeLabel(scene: Phaser.Scene, x: number, y: number, text: string, color: string, depth: number): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '12px',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(depth);
  }

  private makeBarBg(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth: number): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(x, y, w, h, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(depth)
      .setStrokeStyle(1, 0x2a2a3a);
  }

  private makeBarFill(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, depth: number): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(x, y, 0, h, color).setOrigin(0).setScrollFactor(0).setDepth(depth + 1);
  }

  update(data: {
    elapsed: number;
    productivity: number;
    reputation: number;
    exhaustion: number;
    chaos: number;
    taskCount: number;
    score: number;
    focus: { active: boolean; cooldown: boolean; cooldownRatio: number; activeRatio: number };
  }): void {
    // Countdown
    const remaining = Math.max(0, ROUND_LENGTH_MS - data.elapsed);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    this.countdownText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

    // Workday Clock: 9:00 AM -> 6:00 PM
    const progress = Math.min(1, data.elapsed / ROUND_LENGTH_MS);
    const totalMinutes = Math.floor(progress * 540); // 9 hours = 540 min
    const currentHour = 9 + Math.floor(totalMinutes / 60);
    const currentMinute = totalMinutes % 60;
    const isPM = currentHour >= 12;
    const displayHour = currentHour > 12 ? currentHour - 12 : currentHour;
    const timeString = `${displayHour}:${currentMinute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    this.workdayClockText.setText(timeString);

    // Color countdown red in final 60s
    if (remaining <= BOSS_PHASE_MS) {
      this.countdownText.setColor('#ff5252');
      this.workdayClockText.setColor('#ff1744');
      // Pulse
      if (!this.countdownText.getData('pulsing')) {
        this.countdownText.setData('pulsing', true);
        this.scene.tweens.add({
          targets: [this.countdownText, this.workdayClockText],
          scale: { from: 1, to: 1.12 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Focus state change banner & border
    if (data.focus.active !== this.lastFocusState) {
      this.lastFocusState = data.focus.active;
      this.focusBorder.setVisible(data.focus.active);
      if (data.focus.active) {
        this.focusBannerText.setText('FOCUS MODE: LOCKED IN');
        this.focusBannerText.setColor('#b388ff');
        this.focusBannerText.setAlpha(1);
        this.focusBannerText.setScale(1.2);
        this.scene.tweens.add({
          targets: this.focusBannerText,
          scale: 1,
          duration: 300,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.focusBannerText,
              alpha: 0,
              delay: 1200,
              duration: 300,
            });
          },
        });
      } else {
        this.focusBannerText.setText('FOCUS OVER');
        this.focusBannerText.setColor('#ffab40');
        this.focusBannerText.setAlpha(1);
        this.scene.tweens.add({
          targets: this.focusBannerText,
          alpha: 0,
          delay: 800,
          duration: 300,
        });
      }
    }

    // Meters
    this.setBarWidth(this.productivityFill, data.productivity / STAT_MAX, 180);
    this.setBarWidth(this.reputationFill, data.reputation / STAT_MAX, 180);
    this.setBarWidth(this.exhaustionFill, data.exhaustion / STAT_MAX, 180);
    this.setBarWidth(this.chaosFill, data.chaos / STAT_MAX, 180);

    // Task count
    this.taskCountText.setText(`TASKS: ${data.taskCount}`);

    // Score
    this.scoreText.setText(`SCORE: ${data.score}`);

    // Focus indicator
    if (data.focus.active) {
      this.focusFill.width = 120 * data.focus.activeRatio;
      this.focusFill.fillColor = COLORS.purple;
      this.focusLabel.setText('[F] ACTIVE');
      this.focusLabel.setColor('#b388ff');
    } else if (data.focus.cooldown) {
      this.focusFill.width = 120 * (1 - data.focus.cooldownRatio);
      this.focusFill.fillColor = 0x4a4a5a;
      this.focusLabel.setText('[F] COOLDOWN');
      this.focusLabel.setColor('#8a8a9a');
    } else {
      this.focusFill.width = 120;
      this.focusFill.fillColor = COLORS.lime;
      this.focusLabel.setText('[F] READY');
      this.focusLabel.setColor('#c6ff00');
    }
  }

  private setBarWidth(bar: Phaser.GameObjects.Rectangle, ratio: number, maxW: number): void {
    bar.width = Math.max(0, Math.min(1, ratio)) * maxW;
  }

  showBossBanner(): void {
    this.bossText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.bossText,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 1500,
      repeat: 0,
      onComplete: () => this.bossText.setAlpha(0),
    });
    this.scene.tweens.add({
      targets: this.bossText,
      scale: { from: 0.5, to: 1.1 },
      duration: 300,
      yoyo: true,
      hold: 1200,
    });
  }
}
