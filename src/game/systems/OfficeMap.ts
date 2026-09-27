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
      this.scene.add.rectangle(room.x, room.y, room.w, room.h, room.color).setOrigin(0).setDepth(-1);
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

        // Put active monitors on desks with subtle idle animation
        if (station.type === 'desk') {
          const monitor = this.scene.add.image(station.x, station.y - 10, 'monitor_active')
            .setDepth(station.y + 33);
          
          // Random slight screen flicker to feel alive
          this.scene.tweens.add({
            targets: monitor,
            alpha: { from: 0.9, to: 1 },
            duration: 400 + Math.random() * 600,
            yoyo: true,
            repeat: -1,
          });

          // Trash can next to desk
          if (station.x === 180 || station.x === 540) {
            this.scene.add.image(station.x - 42, station.y + 12, 'trash_can')
              .setDepth(station.y + 31);
          }
        }
      }
    });

    // Coffee machine in cafeteria with steam emitter
    const coffeeMachine = this.scene.add.image(920, 480, 'coffee_machine').setDepth(480 + 32);
    this.scene.add.particles(coffeeMachine.x, coffeeMachine.y - 20, 'particle', {
      lifespan: 1200,
      speedY: { min: -25, max: -45 },
      speedX: { min: -5, max: 5 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 250,
      quantity: 1,
      tint: 0xffffff,
    }).setDepth(coffeeMachine.depth + 1);

    // Wall clocks in Meeting room and Cubicles
    this.scene.add.image(400, 50, 'wall_clock').setDepth(1005);
    this.scene.add.image(1070, 50, 'wall_clock').setDepth(1005);

    // Extra decorative plants in hallways
    this.scene.add.image(810, 380, 'plant').setDepth(380).setScale(1.5);
    this.scene.add.image(1340, 380, 'plant').setDepth(380).setScale(1.5);
    this.scene.add.image(1800, 380, 'plant').setDepth(380).setScale(1.5);

    // Elevators in Stairwell / Hallway with periodic open/close
    const elDoorL = this.scene.add.image(2020, 440, 'elevator_door_left').setDepth(440).setScale(0.5);
    const elDoorR = this.scene.add.image(2060, 440, 'elevator_door_right').setDepth(440).setScale(0.5);
    this.scene.add.image(2040, 395, 'elevator_frame').setDepth(441).setScale(0.5);

    // Periodic elevator door cycling
    this.scene.time.addEvent({
      delay: 14000,
      loop: true,
      callback: () => {
        this.scene.tweens.add({
          targets: elDoorL,
          x: elDoorL.x - 20,
          duration: 1200,
          yoyo: true,
          hold: 2500,
        });
        this.scene.tweens.add({
          targets: elDoorR,
          x: elDoorR.x + 20,
          duration: 1200,
          yoyo: true,
          hold: 2500,
        });
      },
    });
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

  private windows: Phaser.GameObjects.Image[] = [];

  private buildDecorations(): void {
    // Exterior windows along the top north wall
    const windowXPositions = [120, 280, 440, 600, 720, 940, 1100, 1460, 1620, 1920, 2100];
    windowXPositions.forEach((wx) => {
      const win = this.scene.add.image(wx, 16, 'office_window').setDepth(1001);
      this.windows.push(win);
    });

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

  updateDayNight(progressRatio: number): void {
    // 0 = Morning (9:00 AM), 0.5 = Afternoon (1:30 PM), 0.75 = Evening (4:30 PM), 1.0 = Final Hour (6:00 PM)
    let windowTint = 0x80d8ff; // Morning cyan
    if (progressRatio >= 0.75) {
      // Final hour: dark night with deep crimson alert tint
      windowTint = 0x1a0a2a;
    } else if (progressRatio >= 0.55) {
      // Evening: deep sunset amber
      windowTint = 0xff6f00;
    } else if (progressRatio >= 0.3) {
      // Afternoon: warm golden sun
      windowTint = 0xffd54f;
    }

    this.windows.forEach((win) => {
      win.setTint(windowTint);
    });
  }

  getWallBodies(): Phaser.GameObjects.Rectangle[] {
    return this.wallBodies;
  }

  getStations(): { station: StationConfig; x: number; y: number }[] {
    return this.stationPositions;
  }
}
