import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { SoundManager } from '../systems/SoundManager';

export class IntroScene extends Phaser.Scene {
  private isSkipping = false;
  private skipBtn!: Phaser.GameObjects.Container;
  private timelineTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    this.isSkipping = false;
    this.timelineTimers = [];

    // Background setup
    this.cameras.main.setBackgroundColor(0x0a0a12);
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Skip button (top right, prominent and clickable)
    this.createSkipButton();

    // Key listener for SPACE to skip
    this.input.keyboard?.once('keydown-SPACE', () => this.skipIntro());

    // Run the cinematic intro sequence
    this.playCinematic();
  }

  private createSkipButton(): void {
    this.skipBtn = this.add.container(GAME_WIDTH - 120, 40).setDepth(2000);
    const bg = this.add.rectangle(0, 0, 160, 44, 0x1a1a28, 0.8)
      .setStrokeStyle(2, 0xffab40)
      .setInteractive({ useHandCursor: true });
    
    const txt = this.add.text(0, 0, 'SPACE — SKIP', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '18px',
      color: '#ffb300',
    }).setOrigin(0.5);

    this.skipBtn.add([bg, txt]);

    bg.on('pointerover', () => {
      bg.setFillStyle(0xff6f00, 0.9);
      txt.setColor('#ffffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1a1a28, 0.8);
      txt.setColor('#ffb300');
    });
    bg.on('pointerdown', () => this.skipIntro());

    this.tweens.add({
      targets: this.skipBtn,
      alpha: { from: 0.6, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private schedule(delayMs: number, callback: () => void): void {
    const timer = this.time.delayedCall(delayMs, () => {
      if (!this.isSkipping) {
        callback();
      }
    });
    this.timelineTimers.push(timer);
  }

  private playCinematic(): void {
    // Stage 1: Elevator hallway wall and floor
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 600, 360, 0x1f1f2e).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 180, 800, 140, 0x14141c).setOrigin(0.5);
    
    // Elevator frame & doors
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'elevator_frame').setDepth(20);
    const doorLeft = this.add.image(GAME_WIDTH / 2 - 40, GAME_HEIGHT / 2, 'elevator_door_left').setOrigin(0.5).setDepth(15);
    const doorRight = this.add.image(GAME_WIDTH / 2 + 40, GAME_HEIGHT / 2, 'elevator_door_right').setOrigin(0.5).setDepth(15);

    // Player waiting inside elevator
    const player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, 'player').setDepth(10).setScale(0.85);

    // Decorative wall signs: "JOBLESS CORP - 14th FLOOR"
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'JOBLESS CORP — FLOOR 14', {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '22px',
      color: '#ffd180',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    // Story Subtitle: "FIRST DAY ON THE JOB..."
    const caption = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'After 8 months unemployed, you landed your first tech job...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    // Step 1 (1.2s): Elevator dings, doors slide open
    this.schedule(1200, () => {
      SoundManager.play('ELEVATOR_DING');
      
      this.tweens.add({
        targets: doorLeft,
        x: doorLeft.x - 70,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });
      this.tweens.add({
        targets: doorRight,
        x: doorRight.x + 70,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });

      // Player steps forward out of elevator
      this.tweens.add({
        targets: player,
        y: player.y + 70,
        scale: 1.15,
        duration: 1200,
        ease: 'Power2.easeOut',
      });
    });

    // Step 2 (2.6s): Show normal office environment
    this.schedule(2600, () => {
      caption.setText('Everything seems calm... 8:58 AM.');

      // Desks fade in
      const deskL = this.add.image(GAME_WIDTH / 2 - 240, GAME_HEIGHT / 2 + 60, 'desk').setDepth(30).setAlpha(0);
      const deskR = this.add.image(GAME_WIDTH / 2 + 240, GAME_HEIGHT / 2 + 60, 'desk').setDepth(30).setAlpha(0);
      const monitorL = this.add.image(deskL.x - 8, deskL.y - 12, 'monitor_active').setDepth(31).setAlpha(0);
      const monitorR = this.add.image(deskR.x + 8, deskR.y - 12, 'monitor_active').setDepth(31).setAlpha(0);
      const coffeeMachine = this.add.image(GAME_WIDTH / 2 + 350, GAME_HEIGHT / 2 - 30, 'coffee_machine').setDepth(30).setAlpha(0);
      const printer = this.add.image(GAME_WIDTH / 2 - 350, GAME_HEIGHT / 2 - 30, 'printer').setDepth(30).setAlpha(0);

      // Coworkers sitting at desks
      const coworkerL = this.add.image(deskL.x, deskL.y - 28, 'npc_0').setDepth(29).setAlpha(0);
      const coworkerR = this.add.image(deskR.x, deskR.y - 28, 'npc_1').setDepth(29).setAlpha(0);

      this.tweens.add({
        targets: [deskL, deskR, monitorL, monitorR, coffeeMachine, printer, coworkerL, coworkerR],
        alpha: 1,
        duration: 600,
      });

      // Ambient typing sound
      SoundManager.play('KEYBOARD_CLICK');
      this.time.delayedCall(200, () => SoundManager.play('KEYBOARD_CLICK'));
      this.time.delayedCall(450, () => SoundManager.play('KEYBOARD_CLICK'));
    });

    // Step 3 (4.4s): SUDDEN CHAOS ERUPTS!
    this.schedule(4400, () => {
      caption.setText('WAIT. WHAT IS HAPPENING?!');
      caption.setColor('#ff5252');

      // Camera shake and flash
      this.cameras.main.shake(1200, 0.015);
      this.cameras.main.flash(200, 255, 82, 82);

      // Telephones ringing
      SoundManager.play('PHONE_RING');
      
      // Slack pings popping
      this.time.delayedCall(300, () => SoundManager.play('SLACK_PING'));
      this.time.delayedCall(600, () => SoundManager.play('SLACK_PING'));
      this.time.delayedCall(900, () => SoundManager.play('SERVER_CRASH'));

      // Printer explosions & flying paper sheets
      SoundManager.play('PRINTER_EVENT');
      for (let p = 0; p < 18; p++) {
        const paper = this.add.image(GAME_WIDTH / 2 - 350, GAME_HEIGHT / 2 - 30, 'paper_sheet').setDepth(150);
        this.tweens.add({
          targets: paper,
          x: paper.x + Phaser.Math.Between(-180, 280),
          y: paper.y + Phaser.Math.Between(-140, 160),
          rotation: Phaser.Math.FloatBetween(-3, 3),
          duration: 900 + Phaser.Math.Between(0, 500),
          ease: 'Cubic.easeOut',
        });
      }

      // Coworkers panicking and dashing
      const panickingCoworker = this.add.image(GAME_WIDTH / 2 - 100, GAME_HEIGHT / 2 + 50, 'npc_2').setDepth(120);
      const speech1 = this.add.text(panickingCoworker.x, panickingCoworker.y - 30, 'NOT AGAIN!! 🔥', {
        fontFamily: 'Impact, sans-serif',
        fontSize: '16px',
        color: '#ff1744',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(125);

      this.tweens.add({
        targets: [panickingCoworker, speech1],
        x: '+=380',
        duration: 1000,
        ease: 'Linear',
      });

      // Boss enters with swagger & intimidation!
      const boss = this.add.image(GAME_WIDTH + 60, GAME_HEIGHT / 2 + 30, 'boss_sprite')
        .setScale(1.4)
        .setDepth(160);
      
      SoundManager.play('BOSS_WARNING');

      this.tweens.add({
        targets: boss,
        x: GAME_WIDTH / 2 + 100,
        duration: 1100,
        ease: 'Power2.easeOut',
      });

      // Flood of task indicators appearing everywhere
      const taskLocs = [
        { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT / 2 - 40, label: 'URGENT BUG' },
        { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT / 2 - 30, label: 'CLIENT ANGRY' },
        { x: GAME_WIDTH / 2 - 80, y: GAME_HEIGHT / 2 + 110, label: '47 EMAILS' },
        { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT / 2 + 90, label: 'HOTFIX EOD' },
      ];

      taskLocs.forEach((loc, idx) => {
        this.time.delayedCall(idx * 200, () => {
          if (this.isSkipping) return;
          const marker = this.add.image(loc.x, loc.y, 'task_marker').setTint(COLORS.red).setDepth(130).setScale(0);
          const tText = this.add.text(loc.x, loc.y - 24, loc.label, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '14px',
            color: '#ff5252',
            stroke: '#000000',
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(131).setAlpha(0);

          this.tweens.add({
            targets: marker,
            scale: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
          });
          this.tweens.add({
            targets: tText,
            alpha: 1,
            y: tText.y - 8,
            duration: 300,
          });
        });
      });
    });

    // Step 4 (6.5s): Big Clock transition sequence (8:59 AM -> 9:00 AM)
    this.schedule(6500, () => {
      // Fade backdrop
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setDepth(400);

      const clockLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'MONDAY — 8:59 AM', {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '68px',
        color: '#f5f5f5',
        stroke: '#000000',
        strokeThickness: 8,
      }).setOrigin(0.5).setDepth(410);

      // Heartbeat sound / pulse
      SoundManager.play('FOOTSTEP');

      this.schedule(1100, () => {
        // Slam to 9:00 AM
        clockLabel.setText('MONDAY — 9:00 AM');
        clockLabel.setColor('#ff1744');
        SoundManager.play('FINAL_HOUR');
        this.cameras.main.shake(400, 0.02);

        this.tweens.add({
          targets: clockLabel,
          scale: 1.25,
          duration: 350,
          ease: 'Back.easeOut',
        });
      });

      // Step 5 (8.2s): DEADLINE DASH title slam
      this.schedule(2100, () => {
        clockLabel.destroy();

        const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'DEADLINE DASH', {
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: '94px',
          color: '#ff6f00',
          stroke: '#ffffff',
          strokeThickness: 8,
        }).setOrigin(0.5).setScale(2.5).setDepth(450);

        const subText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'JOBLESS 2.0', {
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: '44px',
          color: '#b388ff',
          stroke: '#000000',
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(450).setAlpha(0);

        this.cameras.main.shake(500, 0.025);
        this.cameras.main.flash(250, 255, 111, 0);
        SoundManager.play('COMBO_UP', 10);

        this.tweens.add({
          targets: titleText,
          scale: 1,
          duration: 400,
          ease: 'Bounce.easeOut',
        });
        this.tweens.add({
          targets: subText,
          alpha: 1,
          delay: 300,
          duration: 400,
        });

        // Boss Dialogue Speech Bubble
        const bossBubbleBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 780, 68, 0x141420, 0.95)
          .setStrokeStyle(3, 0xff5252)
          .setDepth(460)
          .setScale(0);

        const bossQuote = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '👔 BOSS: "Welcome to the team. We have 47 urgent tasks for you."', {
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: '26px',
          color: '#ffeb3b',
          stroke: '#000000',
          strokeThickness: 4,
        }).setOrigin(0.5).setDepth(465).setAlpha(0);

        this.tweens.add({
          targets: bossBubbleBg,
          scale: 1,
          delay: 500,
          duration: 350,
          ease: 'Back.easeOut',
        });
        this.tweens.add({
          targets: bossQuote,
          alpha: 1,
          delay: 700,
          duration: 300,
        });

        // Auto transition into gameplay
        this.schedule(3600, () => {
          this.skipIntro();
        });
      });
    });
  }

  private skipIntro(): void {
    if (this.isSkipping) return;
    this.isSkipping = true;

    // Clear all pending timers
    this.timelineTimers.forEach((t) => t.remove());

    // Fade out and start GameScene
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => {
      this.scene.start('GameScene');
    });
  }
}
