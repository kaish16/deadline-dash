import Phaser from 'phaser';
import { ROOMS, STATIONS, COLORS, WORLD_WIDTH, WORLD_HEIGHT, type StationConfig } from '../config/constants';

interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// OfficeMap draws the office world: floors, walls, furniture, stations.
// Also provides wall collision rectangles and station positions for task spawning.
export class OfficeMap {
  private scene: Phaser.Scene;
  private walls: WallRect[] = [];
  private wallBodies: Phaser.GameObjects.Rectangle[] = [];
  private stationPositions: { station: StationConfig; x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.build();
    this.placeFurniture();
    this.placeStations();
    this.buildOuterWalls();
    this.buildRoomWalls();
    this.createWallBodies();
    this.buildDoors();
    this.buildDecorations();
  }

  private build(): void {
    // Background floor
    this.scene.cameras.main.setBackgroundColor(COLORS.floor);
    this.scene.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, COLORS.floor).setOrigin(0).setDepth(-2);

    // Room floors with subtle color
    ROOMS.forEach((room) => {
      const floor = this.scene.add.rectangle(room.x, room.y, room.w, room.h, room.color).setOrigin(0).setDepth(-1);
      // Floor grid pattern
      const grid = this.scene.add.graphics();
      grid.lineStyle(1, room.accent, 0.15);
      for (let gx = room.x; gx < room.x + room.w; gx += 40) {
        grid.lineBetween(gx, room.y, gx, room.y + room.h);
      }
      for (let gy = room.y; gy < room.y + room.h; gy += 40) {
        grid.lineBetween(room.x, gy, room.x + room.w, gy);
      }
      grid.setDepth(-0.5);
      // Room label
      this.scene.add.text(room.x + room.w / 2, room.y + 14, room.name, {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '14px',
        color: '#3a3a52',
      }).setOrigin(0.5, 0).setDepth(-0.5).setAlpha(0.4);
    });
  }

  private placeFurniture(): void {
    // Cubicle dividers and desk clusters
    STATIONS.forEach((station) => {
      const tex = this.furnitureTexture(station.type);
      if (tex) {
        this.scene.add.image(station.x, station.y, tex).setDepth(station.y + 32).setScale(1);
      }
    });

    // Extra decorative plants in hallways
    this.scene.add.image(810, 380, 'plant').setDepth(380).setScale(1.5);
    this.scene.add.image(1340, 380, 'plant').setDepth(380).setScale(1.5);
    this.scene.add.image(1800, 380, 'plant').setDepth(380).setScale(1.5);
  }

  private furnitureTexture(type: StationConfig['type']): string | null {
    switch (type) {
      case 'desk': return 'desk';
      case 'meeting': return 'meeting_table';
      case 'server': return 'server_rack';
      case 'printer': return 'printer';
      case 'phone': return 'phone';
      case 'boss': return 'boss_chair';
      case 'cafeteria': return 'cafeteria_table';
      default: return null;
    }
  }

  private placeStations(): void {
    STATIONS.forEach((station) => {
      this.stationPositions.push({ station, x: station.x, y: station.y });
    });
  }

  private buildOuterWalls(): void {
    const t = 16; // wall thickness
    this.walls.push({ x: 0, y: 0, w: WORLD_WIDTH, h: t }); // top
    this.walls.push({ x: 0, y: WORLD_HEIGHT - t, w: WORLD_WIDTH, h: t }); // bottom
    this.walls.push({ x: 0, y: 0, w: t, h: WORLD_HEIGHT }); // left
    this.walls.push({ x: WORLD_WIDTH - t, y: 0, w: t, h: WORLD_HEIGHT }); // right
  }

  private buildRoomWalls(): void {
    const t = 12;
    // Horizontal divider between top rooms and bottom rooms (y=370)
    // Leave gaps for doors
    this.walls.push({ x: 40, y: 370, w: 300, h: t }); // left of cubicles
    this.walls.push({ x: 460, y: 370, w: 340, h: t }); // right of cubicles
    this.walls.push({ x: 840, y: 370, w: 160, h: t }); // left of meeting
    this.walls.push({ x: 1140, y: 370, w: 160, h: t }); // right of meeting
    this.walls.push({ x: 1360, y: 370, w: 120, h: t }); // left of boss
    this.walls.push({ x: 1660, y: 370, w: 120, h: t }); // right of boss
    this.walls.push({ x: 1820, y: 370, w: 180, h: t }); // left of server
    this.walls.push({ x: 2180, y: 370, w: 180, h: t }); // right of server

    // Vertical walls between top-row rooms
    this.walls.push({ x: 820, y: 40, w: t, h: 140 }); // cubicles | meeting (gap at bottom)
    this.walls.push({ x: 820, y: 240, w: t, h: 130 });
    this.walls.push({ x: 1340, y: 40, w: t, h: 140 }); // meeting | boss
    this.walls.push({ x: 1340, y: 240, w: t, h: 130 });
    this.walls.push({ x: 1800, y: 40, w: t, h: 140 }); // boss | server
    this.walls.push({ x: 1800, y: 240, w: t, h: 130 });

    // Vertical walls between bottom-row rooms
    this.walls.push({ x: 1360, y: 400, w: t, h: 180 }); // cafeteria | printing (gap)
    this.walls.push({ x: 1360, y: 660, w: t, h: 140 });
    this.walls.push({ x: 1780, y: 400, w: t, h: 180 }); // printing | stairwell
    this.walls.push({ x: 1780, y: 660, w: t, h: 140 });
  }

  private buildDoors(): void {
    // Draw door markers (visual floor strips at gaps)
    const g = this.scene.add.graphics();
    g.fillStyle(0x2a2a3a, 0.5);
    // Door gaps in horizontal divider
    g.fillRect(340, 368, 120, 16);
    g.fillRect(1000, 368, 140, 16);
    g.fillRect(1480, 368, 180, 16);
    g.fillRect(2000, 368, 180, 16);
    g.setDepth(-0.3);
  }

  private createWallBodies(): void {
    // Draw walls visually
    const wallGfx = this.scene.add.graphics();
    wallGfx.fillStyle(COLORS.wall, 1);
    wallGfx.lineStyle(2, COLORS.wallTop, 1);

    this.walls.forEach((w) => {
      wallGfx.fillRect(w.x, w.y, w.w, w.h);
      wallGfx.strokeRect(w.x, w.y, w.w, w.h);
      // Physics body
      const body = this.scene.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x000000, 0);
      this.scene.physics.add.existing(body, true);
      this.wallBodies.push(body);
    });
    wallGfx.setDepth(1000); // walls render on top
  }

  private buildDecorations(): void {
    // Ceiling lights that will be flickered by ChaosManager
    const lights: Phaser.GameObjects.Arc[] = [];
    for (let lx = 100; lx < WORLD_WIDTH - 50; lx += 200) {
      for (let ly = 80; ly < WORLD_HEIGHT - 50; ly += 160) {
        const light = this.scene.add.circle(lx, ly, 18, 0xffff88, 0.08).setDepth(500);
        lights.push(light);
      }
    }
    this.scene.registry.set('lights', lights);
  }

  getWallBodies(): Phaser.GameObjects.Rectangle[] {
    return this.wallBodies;
  }

  getStations(): { station: StationConfig; x: number; y: number }[] {
    return this.stationPositions;
  }
}
