import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';

// Boot scene — generates all textures procedurally so the game has zero asset dependencies.
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.makeTextures();
    this.scene.start('MenuScene');
  }

  private makeTextures(): void {
    const g = this.add.graphics();

    // --- Player sprite (top-down character with directional facing) ---
    // 32x32 body with a head dot and shoulder pads
    g.clear();
    g.fillStyle(COLORS.player, 1);
    g.fillRoundedRect(6, 8, 20, 22, 5);
    g.fillStyle(0xffcc80, 1);
    g.fillCircle(16, 10, 6); // head
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(8, 14, 4, 3);
    g.fillRect(20, 14, 4, 3);
    g.generateTexture('player', 32, 32);

    // Player with focus glow
    g.clear();
    g.fillStyle(COLORS.focusTint, 0.35);
    g.fillCircle(16, 16, 20);
    g.fillStyle(COLORS.player, 1);
    g.fillRoundedRect(6, 8, 20, 22, 5);
    g.fillStyle(0xffcc80, 1);
    g.fillCircle(16, 10, 6);
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(8, 14, 4, 3);
    g.fillRect(20, 14, 4, 3);
    g.generateTexture('player_focus', 40, 40);

    // --- NPC coworker (gray-blue body) ---
    const npcColors = [0x5c6bc0, 0x26a69a, 0xec407a, 0x66bb6a, 0xff7043, 0x7e57c2];
    npcColors.forEach((col, i) => {
      g.clear();
      g.fillStyle(col, 1);
      g.fillRoundedRect(6, 8, 20, 22, 5);
      g.fillStyle(0xffcc80, 1);
      g.fillCircle(16, 10, 6);
      g.generateTexture(`npc_${i}`, 32, 32);
    });

    // --- Task marker (a pulsing diamond) ---
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 2, 30, 16, 16, 30);
    g.fillTriangle(16, 2, 2, 16, 16, 30);
    g.generateTexture('task_marker', 32, 32);

    // --- Task beam (vertical light beam) ---
    g.clear();
    const beam = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const alpha = 0.04 * (1 - i / 40);
      beam.fillStyle(0xffffff, alpha);
      const w = 24 - i * 0.4;
      beam.fillRect(16 - w / 2, i, w, 1);
    }
    beam.generateTexture('task_beam', 32, 40);

    // --- Desk furniture ---
    g.clear();
    g.fillStyle(0x3a3a4e, 1);
    g.fillRoundedRect(0, 0, 64, 36, 3);
    g.fillStyle(0x4a4a5e, 1);
    g.fillRoundedRect(2, 2, 60, 8, 2);
    g.fillStyle(0x2a2a3e, 1);
    g.fillRect(4, 32, 6, 4);
    g.fillRect(54, 32, 6, 4);
    g.generateTexture('desk', 64, 36);

    // --- Meeting table (large oval-ish) ---
    g.clear();
    g.fillStyle(0x4a3a5e, 1);
    g.fillRoundedRect(0, 0, 120, 60, 8);
    g.fillStyle(0x5a4a6e, 1);
    g.fillRoundedRect(4, 4, 112, 52, 6);
    g.generateTexture('meeting_table', 120, 60);

    // --- Server rack ---
    g.clear();
    g.fillStyle(0x1a2a3a, 1);
    g.fillRoundedRect(0, 0, 40, 72, 3);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x00e676, 1);
      g.fillRect(6, 6 + i * 11, 4, 4);
      g.fillStyle(0x2a3a4a, 1);
      g.fillRect(14, 6 + i * 11, 20, 4);
    }
    g.generateTexture('server_rack', 40, 72);

    // --- Printer ---
    g.clear();
    g.fillStyle(0x3a3a3a, 1);
    g.fillRoundedRect(0, 0, 56, 40, 4);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(8, 4, 40, 10);
    g.fillStyle(0x555555, 1);
    g.fillRect(12, 18, 32, 4);
    g.fillStyle(0xff9100, 1);
    g.fillRect(44, 2, 4, 4);
    g.generateTexture('printer', 56, 40);

    // --- Phone ---
    g.clear();
    g.fillStyle(0x1a1a2a, 1);
    g.fillRoundedRect(0, 0, 24, 24, 4);
    g.fillStyle(0x40c4ff, 1);
    g.fillCircle(12, 12, 5);
    g.generateTexture('phone', 24, 24);

    // --- Boss chair ---
    g.clear();
    g.fillStyle(0x4a1a1a, 1);
    g.fillRoundedRect(0, 0, 48, 48, 6);
    g.fillStyle(0x6a2a2a, 1);
    g.fillRoundedRect(4, 4, 40, 40, 4);
    g.generateTexture('boss_chair', 48, 48);

    // --- Cafeteria table ---
    g.clear();
    g.fillStyle(0x2a3a2a, 1);
    g.fillRoundedRect(0, 0, 80, 44, 6);
    g.fillStyle(0x3a4a3a, 1);
    g.fillRoundedRect(4, 4, 72, 36, 4);
    g.generateTexture('cafeteria_table', 80, 44);

    // --- Plant (decoration) ---
    g.clear();
    g.fillStyle(0x4a3a2a, 1);
    g.fillRect(8, 20, 16, 12);
    g.fillStyle(0x2e7d32, 1);
    g.fillCircle(16, 14, 12);
    g.fillStyle(0x43a047, 1);
    g.fillCircle(10, 10, 6);
    g.fillCircle(22, 10, 6);
    g.generateTexture('plant', 32, 32);

    // --- Particle (tiny square) ---
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);

    // --- Ring particle ---
    g.clear();
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(16, 16, 14);
    g.generateTexture('ring', 32, 32);

    // --- Vignette overlay (dark edges) ---
    const vig = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const alpha = 0.015 * (i / 60);
      vig.fillStyle(0x000000, alpha);
      vig.fillRect(0, 0, GAME_WIDTH, i);
      vig.fillRect(0, GAME_HEIGHT - i, GAME_WIDTH, i);
      vig.fillRect(0, 0, i, GAME_HEIGHT);
      vig.fillRect(GAME_WIDTH - i, 0, i, GAME_HEIGHT);
    }
    vig.generateTexture('vignette', GAME_WIDTH, GAME_HEIGHT);

    // --- Scanline texture for chaos effect ---
    g.clear();
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      g.fillStyle(0x000000, 0.12);
      g.fillRect(0, i, GAME_WIDTH, 2);
    }
    g.generateTexture('scanlines', GAME_WIDTH, GAME_HEIGHT);

    g.destroy();
    beam.destroy();
    vig.destroy();
  }
}
