import { Scene, GameObjects } from 'phaser';
import { SoundManager } from './SoundManager';

export class ComboSystem {
  combo: number = 0;
  maxCombo: number = 0;
  multiplier: number = 1;
  lastCompleteTime: number = 0;
  
  private scene: Scene;
  private comboText: GameObjects.Text;
  private comboTimer: number = 0;
  private readonly COMBO_TIMEOUT = 4000;
  private isBroken: boolean = false;
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Scene) {
    this.scene = scene;
    
    // Create combo text for visual feedback
    this.comboText = scene.add.text(scene.cameras.main.width - 24, 76, '', {
      fontSize: '28px',
      fontFamily: 'Impact, "Arial Black", sans-serif',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 5,
    });
    this.comboText.setOrigin(1, 0.5);
    this.comboText.setScrollFactor(0);
    this.comboText.setDepth(3500);
    this.comboText.setVisible(false);
  }

  onTaskComplete(timeLeftRatio: number): { combo: number; multiplier: number; isPerfect: boolean; bonusScore: number } {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    
    this.comboTimer = this.COMBO_TIMEOUT;
    this.lastCompleteTime = this.scene.time.now;
    this.isBroken = false;

    // Update multiplier based on combo thresholds
    if (this.combo >= 10) {
      this.multiplier = 3;
    } else if (this.combo >= 5) {
      this.multiplier = 2;
    } else if (this.combo >= 3) {
      this.multiplier = 1.5;
    } else {
      this.multiplier = 1;
    }

    const isPerfect = timeLeftRatio > 0.7;
    let bonusScore = 0;
    
    if (isPerfect) {
      bonusScore = 50 * this.multiplier;
      SoundManager.play('PERFECT_COMPLETE');
    }

    SoundManager.play('COMBO_UP', this.combo);

    this.updateComboText();

    return { 
      combo: this.combo, 
      multiplier: this.multiplier, 
      isPerfect, 
      bonusScore 
    };
  }

  onTaskMiss(): void {
    if (this.combo > 0) {
      this.breakCombo();
    }
  }

  update(dt: number): void {
    if (this.combo > 0 && !this.isBroken) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.breakCombo();
      }
    }
  }

  getComboInfo(): { combo: number; multiplier: number; maxCombo: number } {
    return { combo: this.combo, multiplier: this.multiplier, maxCombo: this.maxCombo };
  }

  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    if (this.comboText) {
      this.comboText.destroy();
    }
  }

  private breakCombo(): void {
    if (this.combo >= 3) {
      SoundManager.play('COMBO_BREAK');
      this.scene.cameras.main.shake(200, 0.01);
      
      // Visual feedback for breaking a high combo
      this.scene.tweens.add({
        targets: this.comboText,
        x: this.comboText.x + 10,
        yoyo: true,
        duration: 50,
        repeat: 3,
        onComplete: () => {
          this.comboText.setVisible(false);
          this.comboText.x = this.scene.cameras.main.width - 20; // reset position
        }
      });
    } else {
      this.comboText.setVisible(false);
    }

    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.isBroken = true;
  }

  private updateComboText(): void {
    if (this.combo < 2) {
      this.comboText.setVisible(false);
      return;
    }

    this.comboText.setVisible(true);
    let message = `COMBO x${this.combo}`;
    let color = '#00ff00'; // lime
    let fontSize = '32px';
    let pulseSpeed = 500;
    
    // Milestones check
    if (this.combo >= 15) {
      message = 'ASCENDED';
      color = '#a020f0'; // purple
      fontSize = '48px';
      pulseSpeed = 150;
      this.comboText.setShadow(0, 0, '#a020f0', 10, true, true);
    } else if (this.combo >= 10) {
      message = 'OFFICE FINAL BOSS';
      color = '#ff00ff'; // magenta
      fontSize = '44px';
      pulseSpeed = 200;
      this.scene.cameras.main.shake(100, 0.005);
      this.comboText.setShadow(0, 0, '#000000', 0);
    } else if (this.combo >= 5) {
      message = 'LOCKED IN 🔥';
      color = '#ffa500'; // orange
      fontSize = '38px';
      pulseSpeed = 300;
      this.comboText.setShadow(0, 0, '#000000', 0);
    } else {
      this.comboText.setShadow(0, 0, '#000000', 0);
    }

    this.comboText.setText(message);
    this.comboText.setColor(color);
    this.comboText.setFontSize(fontSize);

    // Scale up briefly on each increment
    this.comboText.setScale(1.5);
    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });

    // Update pulse tween for the new combo tier
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    
    this.pulseTween = this.scene.tweens.add({
      targets: this.comboText,
      alpha: 0.7,
      yoyo: true,
      repeat: -1,
      duration: pulseSpeed
    });
  }
}
