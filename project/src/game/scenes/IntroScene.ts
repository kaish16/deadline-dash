import { Scene } from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';

export class IntroScene extends Scene {
    private isSkipping: boolean = false;
    private skipText!: Phaser.GameObjects.Text;

    constructor() {
        super('IntroScene');
    }

    create() {
        this.isSkipping = false;

        // Skip text
        this.skipText = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'SPACE — SKIP', {
            fontFamily: 'Impact',
            fontSize: '24px',
            color: '#aaaaaa'
        }).setOrigin(1, 1).setAlpha(0.5).setDepth(100);

        this.input.keyboard?.once('keydown-SPACE', this.skipIntro, this);

        // Sequence
        // 1. BLACK SCREEN -> fade in to show elevator doors
        this.cameras.main.setBackgroundColor(COLORS.bg || 0x0a0a0f);
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        const elevatorLeft = this.add.rectangle(GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2, 100, 200, 0x3a3a52).setOrigin(1, 0.5);
        const elevatorRight = this.add.rectangle(GAME_WIDTH / 2 + 50, GAME_HEIGHT / 2, 100, 200, 0x3a3a52).setOrigin(0, 0.5);
        
        // Floor
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, GAME_WIDTH, 100, 0x14141c).setOrigin(0.5, 0);

        const player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'player').setAlpha(0);

        this.time.delayedCall(1000, () => {
            if (this.isSkipping) return;
            
            // Elevator doors open
            this.tweens.add({
                targets: elevatorLeft,
                x: elevatorLeft.x - 100,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
            this.tweens.add({
                targets: elevatorRight,
                x: elevatorRight.x + 100,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });

            // 2. Player walks out
            player.setAlpha(1);
            player.setScale(0.8);
            this.tweens.add({
                targets: player,
                y: player.y + 50,
                scale: 1,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => this.showOffice(player, elevatorLeft, elevatorRight)
            });
        });
    }

    private showOffice(player: Phaser.GameObjects.Image, el1: Phaser.GameObjects.Rectangle, el2: Phaser.GameObjects.Rectangle) {
        if (this.isSkipping) return;

        el1.destroy();
        el2.destroy();

        // 3. Office interior appears (simplified bg with desks, NPCs)
        const desk1 = this.add.image(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 + 80, 'desk');
        const desk2 = this.add.image(GAME_WIDTH / 2 + 200, GAME_HEIGHT / 2 + 80, 'desk');
        
        const npc1 = this.add.image(desk1.x, desk1.y - 40, 'npc_0');
        const npc2 = this.add.image(desk2.x, desk2.y - 40, 'npc_1');

        this.cameras.main.flash(500);

        // 4. Everything looks calm for ~2 seconds
        this.time.delayedCall(2000, () => {
            if (this.isSkipping) return;
            this.startChaos(npc1, npc2);
        });
    }

    private startChaos(npc1: Phaser.GameObjects.Image, npc2: Phaser.GameObjects.Image) {
        if (this.isSkipping) return;

        // 5. CHAOS BEGINS
        this.cameras.main.shake(2000, 0.005);
        this.cameras.main.flash(200, 255, 255, 255);

        // NPCs start running around
        this.tweens.add({
            targets: [npc1, npc2],
            x: { value: '+=100', duration: 200, yoyo: true, repeat: -1 },
            y: { value: '-=50', duration: 150, yoyo: true, repeat: -1 },
        });

        // Text popups
        const popups = ['📧 NEW EMAIL', '📞 INCOMING CALL', '🖨️ PRINTER JAM'];
        popups.forEach((text, i) => {
            this.time.delayedCall(i * 300, () => {
                if (this.isSkipping) return;
                const txt = this.add.text(GAME_WIDTH / 2 + Phaser.Math.Between(-200, 200), GAME_HEIGHT / 2 + Phaser.Math.Between(-100, 100), text, {
                    fontFamily: 'Impact',
                    fontSize: '32px',
                    color: '#ff0000',
                    backgroundColor: '#ffffff'
                }).setOrigin(0.5);
                this.tweens.add({
                    targets: txt,
                    y: txt.y - 50,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => txt.destroy()
                });
            });
        });

        // Floating paper particles
        const particles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: GAME_WIDTH },
            y: -50,
            lifespan: 3000,
            speedY: { min: 100, max: 300 },
            speedX: { min: -50, max: 50 },
            scale: { start: 1, end: 0 },
            quantity: 2,
            blendMode: 'ADD'
        });

        this.time.delayedCall(2500, () => {
            if (this.isSkipping) return;
            particles.destroy();
            this.showTitleSequence();
        });
    }

    private showTitleSequence() {
        if (this.isSkipping) return;

        this.cameras.main.fadeOut(500, 0, 0, 0);
        
        this.time.delayedCall(600, () => {
            if (this.isSkipping) return;
            this.children.removeAll();
            this.add.existing(this.skipText);
            this.cameras.main.fadeIn(10, 0, 0, 0);

            // 6. Show centered text: 'MONDAY — 8:59 AM' (hold 1.5s)
            const timeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'MONDAY — 8:59 AM', {
                fontFamily: 'Impact',
                fontSize: '64px',
                color: '#ffffff'
            }).setOrigin(0.5);

            this.time.delayedCall(1500, () => {
                if (this.isSkipping) return;
                
                // 7. Clock animation: 8:59 → 9:00 AM (dramatic zoom)
                timeText.setText('MONDAY — 9:00 AM');
                timeText.setColor('#ff4444');
                this.tweens.add({
                    targets: timeText,
                    scale: 2,
                    duration: 500,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        this.time.delayedCall(500, () => {
                            if (this.isSkipping) return;
                            timeText.destroy();
                            this.showTitle();
                        });
                    }
                });
            });
        });
    }

    private showTitle() {
        if (this.isSkipping) return;

        // 8. BIG TITLE SLAM: 'DEADLINE DASH' (scales from 2x to 1x with bounce)
        const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'DEADLINE DASH', {
            fontFamily: 'Impact',
            fontSize: '100px',
            color: '#ff8800',
            stroke: '#ffffff',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(2);

        this.cameras.main.shake(500, 0.01);

        this.tweens.add({
            targets: title,
            scale: 1,
            duration: 800,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                if (this.isSkipping) return;
                
                // 9. Boss speech bubble
                const bubble = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '"Welcome to the team. We have 47 urgent tasks for you."', {
                    fontFamily: 'Impact',
                    fontSize: '32px',
                    color: '#00ff00'
                }).setOrigin(0.5).setAlpha(0);

                this.tweens.add({
                    targets: bubble,
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.time.delayedCall(2000, () => {
                            this.skipIntro();
                        });
                    }
                });
            }
        });
    }

    private skipIntro() {
        if (this.isSkipping) return;
        this.isSkipping = true;
        
        // 10. Quick fade to black -> transition to GameScene
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('GameScene');
        });
    }
}
