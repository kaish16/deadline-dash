import * as Phaser from 'phaser';
import { SoundManager } from './SoundManager';

export type SlangCategory = 'COMPLETE' | 'STREAK' | 'MISS' | 'BOSS' | 'OVERLOAD';

const CATEGORY_COLORS: Record<SlangCategory, string> = {
  COMPLETE: '#c6ff00',
  STREAK: '#ff6f00',
  MISS: '#ff5252',
  BOSS: '#ff4081',
  OVERLOAD: '#b388ff'
};

const CATEGORY_MESSAGES: Record<SlangCategory, string[]> = {
  COMPLETE: ['W', 'EASY MONEY', 'COOKING 🔥', 'WE MOVE', 'LOCKED IN', 'THAT\'S A WRAP', 'TASK DELETED', 'BANGER', 'CLUTCH', 'SPEED DEMON', 'NO STRESS'],
  STREAK: ['BRO IS LOCKED IN', 'ABSOLUTE CINEMA', 'THE GRIND IS GRINDING', 'WHO GAVE YOU THIS MUCH PRODUCTIVITY?', 'COOKING FR 🔥'],
  MISS: ['BRUH 💀', 'IT\'S OVER', 'NAHHHH', 'TASK FUMBLED', 'WE\'RE COOKED', 'NOT THE DEADLINE 😭'],
  BOSS: ['BOSS DETECTED', 'ACT NATURAL', 'LOOK BUSY', 'CTRL+C CTRL+V YOUR WAY OUT'],
  OVERLOAD: ['BRO WHAT', 'THIS IS NOT A JOB', 'WHO APPROVED THIS?', 'SEND HELP', 'ABSOLUTE CHAOS']
};

export class SlangSystem {
  private scene: Phaser.Scene;
  private activeMessages: Phaser.GameObjects.Text[] = [];
  private lastMessage: Record<SlangCategory, string | null> = {
    COMPLETE: null,
    STREAK: null,
    MISS: null,
    BOSS: null,
    OVERLOAD: null
  };
  private maxSimultaneous = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(category: SlangCategory, x: number, y: number, combo?: number): void {
    const messages = CATEGORY_MESSAGES[category];
    let possibleMessages = messages.filter(msg => msg !== this.lastMessage[category]);
    
    if (possibleMessages.length === 0) {
      possibleMessages = messages;
    }

    const text = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];
    this.lastMessage[category] = text;
    
    const color = CATEGORY_COLORS[category];
    
    // Append combo if provided for streak
    const displayText = combo && category === 'STREAK' ? `${text} x${combo}` : text;
    
    this.showCustom(displayText, x, y, color);
  }

  showCustom(text: string, x: number, y: number, color: string = '#ffffff'): void {
    // Limit simultaneous messages
    if (this.activeMessages.length >= this.maxSimultaneous) {
      const oldest = this.activeMessages.shift();
      if (oldest) {
        oldest.destroy();
      }
    }

    // Randomize offset to avoid overlap
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 60 - 40;

    const textObj = this.scene.add.text(x + offsetX, y + offsetY, text, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: '26px',
      color: color,
      stroke: '#000000',
      strokeThickness: 5,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 0,
        fill: true
      }
    }).setOrigin(0.5).setDepth(Math.max(2500, y + 500));

    // Initial state for animation
    textObj.setScale(0);
    const randomRotation = (Math.random() - 0.5) * 0.4;
    textObj.setRotation(randomRotation);

    this.activeMessages.push(textObj);

    // Animation: Juicy pop-in
    this.scene.tweens.add({
      targets: textObj,
      scale: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle back to 1.0
        this.scene.tweens.add({
          targets: textObj,
          scale: 1.0,
          duration: 100,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Randomize stay duration between 0.8s and 1.5s
    const stayDuration = 800 + Math.random() * 700;

    // Animation: Fade and float away
    this.scene.tweens.add({
      targets: textObj,
      y: y + offsetY - 60,
      alpha: 0,
      scale: 0.8,
      delay: stayDuration,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        textObj.destroy();
        this.activeMessages = this.activeMessages.filter(msg => msg !== textObj);
      }
    });

    // Play sound
    SoundManager.play('SLANG_POP');
  }

  update(): void {
    // Cleanup destroyed text objects if any were destroyed outside this system
    this.activeMessages = this.activeMessages.filter(msg => msg && msg.active);
  }

  destroy(): void {
    this.activeMessages.forEach(msg => {
      if (msg && msg.active) {
        msg.destroy();
      }
    });
    this.activeMessages = [];
  }
}
