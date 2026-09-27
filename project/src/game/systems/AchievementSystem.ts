import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

export interface GameAchievement {
  key: string;
  name: string;
  desc: string;
  icon: string; // emoji
  unlocked: boolean;
}

export class AchievementSystem {
  private scene: Phaser.Scene;
  private achievements: Map<string, GameAchievement> = new Map();
  
  // Tracking vars
  private consecutiveTasks: number = 0;
  private coffeeCount: number = 0;
  private urgentCount: number = 0;
  private perfectCount: number = 0;
  private printersFixed: number = 0;
  
  private untouchableTimer: number = 0;

  private popupQueue: GameAchievement[] = [];
  private isPopupActive: boolean = false;
  
  private popupContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initAchievements();
    this.createPopupUI();
  }

  private initAchievements(): void {
    const list: GameAchievement[] = [
      { key: 'LOCKED_IN', name: 'Locked In', desc: 'Complete 10 tasks without missing one', icon: '🔒', unlocked: false },
      { key: 'COFFEE_ADDICT', name: 'Coffee Addict', desc: 'Use coffee boost 5 times', icon: '☕', unlocked: false },
      { key: 'DEADLINE_DEMON', name: 'Deadline Demon', desc: 'Complete 5 critical/urgent tasks', icon: '😈', unlocked: false },
      { key: 'MEETING_SURVIVOR', name: 'Meeting Survivor', desc: 'Survive an emergency meeting', icon: '👔', unlocked: false },
      { key: 'PRINTER_WARRIOR', name: 'Printer Warrior', desc: 'Fix 3 printer failures', icon: '🖨️', unlocked: false },
      { key: 'OVERTIME_LEGEND', name: 'Overtime Legend', desc: 'Survive the Final Hour', icon: '⏳', unlocked: false },
      { key: 'ABSOLUTE_CINEMA', name: 'Absolute Cinema', desc: 'Trigger a rare secret event', icon: '🎬', unlocked: false },
      { key: 'SPEED_RUNNER', name: 'Speed Runner', desc: 'Complete 5 tasks with PERFECT timing', icon: '⚡', unlocked: false },
      { key: 'COMBO_KING', name: 'Combo King', desc: 'Reach combo x10', icon: '👑', unlocked: false },
      { key: 'UNTOUCHABLE', name: 'Untouchable', desc: 'Go 30s without missing while 5+ tasks active', icon: '🛡️', unlocked: false },
    ];

    list.forEach(a => this.achievements.set(a.key, a));
  }

  private createPopupUI(): void {
    // Create popup at top-right, initially hidden and off-screen
    this.popupContainer = this.scene.add.container(GAME_WIDTH + 400, 80);
    this.popupContainer.setScrollFactor(0);
    this.popupContainer.setDepth(3000); // High depth to ensure it's on top

    // Background banner
    const bg = this.scene.add.rectangle(0, 0, 320, 80, 0xffb700, 0.9);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setOrigin(0, 0.5);

    // Header text
    const headerText = this.scene.add.text(10, -32, '🏆 ACHIEVEMENT UNLOCKED', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });

    // Achievement Title
    const titleText = this.scene.add.text(10, -8, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#000000'
    });
    titleText.setName('title');

    // Achievement Description
    const descText = this.scene.add.text(10, 16, '', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#222222',
      wordWrap: { width: 300 }
    });
    descText.setName('desc');

    this.popupContainer.add([bg, headerText, titleText, descText]);
    this.popupContainer.setVisible(false);
  }

  private unlock(key: string): void {
    const ach = this.achievements.get(key);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.popupQueue.push(ach);
      if (!this.isPopupActive) {
        this.showNextPopup();
      }
    }
  }

  private showNextPopup(): void {
    if (this.popupQueue.length === 0) {
      this.isPopupActive = false;
      return;
    }

    this.isPopupActive = true;
    const ach = this.popupQueue.shift()!;

    const titleText = this.popupContainer.getByName('title') as Phaser.GameObjects.Text;
    const descText = this.popupContainer.getByName('desc') as Phaser.GameObjects.Text;

    titleText.setText(`${ach.icon} ${ach.name}`);
    descText.setText(ach.desc);

    // Setup initial position for slide in
    this.popupContainer.x = GAME_WIDTH + 10;
    this.popupContainer.setVisible(true);

    // Play sound via event (expected to be caught by SoundManager)
    this.scene.events.emit('play-sound', 'ACHIEVEMENT');
    
    // Optional fallback for direct SoundManager if it exists globally
    // SoundManager.getInstance()?.playSound('ACHIEVEMENT');

    // Small particle burst
    const particles = this.scene.add.particles(GAME_WIDTH - 320, 80, 'particle', {
      speed: { min: 50, max: 200 },
      angle: { min: 135, max: 225 },
      scale: { start: 1, end: 0 },
      tint: 0xffd700,
      lifespan: 1000,
      quantity: 20,
      emitting: false
    });
    particles.setDepth(3001).setScrollFactor(0);
    particles.explode();

    // Slide in tween
    this.scene.tweens.add({
      targets: this.popupContainer,
      x: GAME_WIDTH - 330,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stay for 3 seconds, then slide out
        this.scene.time.delayedCall(3000, () => {
          this.scene.tweens.add({
            targets: this.popupContainer,
            x: GAME_WIDTH + 50,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
              this.popupContainer.setVisible(false);
              particles.destroy();
              this.showNextPopup();
            }
          });
        });
      }
    });
  }

  // --- External update if manual timer tracking is needed ---
  public update(delta: number, activeTaskCount: number): void {
    if (activeTaskCount >= 5) {
      this.untouchableTimer += delta;
      if (this.untouchableTimer >= 30000) { // 30 seconds
        this.unlock('UNTOUCHABLE');
      }
    } else {
      this.untouchableTimer = 0;
    }
  }

  // --- Interface Methods ---

  public onTaskComplete(isUrgent: boolean, isPerfect: boolean): void {
    this.consecutiveTasks++;
    if (this.consecutiveTasks >= 10) {
      this.unlock('LOCKED_IN');
    }

    if (isUrgent) {
      this.urgentCount++;
      if (this.urgentCount >= 5) {
        this.unlock('DEADLINE_DEMON');
      }
    }

    if (isPerfect) {
      this.perfectCount++;
      if (this.perfectCount >= 5) {
        this.unlock('SPEED_RUNNER');
      }
    }
  }

  public onTaskMiss(): void {
    this.consecutiveTasks = 0;
    this.untouchableTimer = 0;
  }

  public onComboReached(combo: number): void {
    if (combo >= 10) {
      this.unlock('COMBO_KING');
    }
  }

  public onEventSurvived(eventKey: string): void {
    if (eventKey === 'MEETING_SURVIVOR' || eventKey.includes('MEETING')) {
      this.unlock('MEETING_SURVIVOR');
    } else if (eventKey === 'PRINTER_WARRIOR' || eventKey.includes('PRINTER')) {
      this.printersFixed++;
      if (this.printersFixed >= 3) {
        this.unlock('PRINTER_WARRIOR');
      }
    }
  }

  public onCoffeeUsed(): void {
    this.coffeeCount++;
    if (this.coffeeCount >= 5) {
      this.unlock('COFFEE_ADDICT');
    }
  }

  public onSecretEvent(): void {
    this.unlock('ABSOLUTE_CINEMA');
  }

  public onBossPhaseComplete(): void {
    this.unlock('OVERTIME_LEGEND');
  }

  public getUnlocked(): GameAchievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  public getAll(): GameAchievement[] {
    return Array.from(this.achievements.values());
  }

  public destroy(): void {
    if (this.popupContainer) {
      this.popupContainer.destroy();
    }
  }
}
