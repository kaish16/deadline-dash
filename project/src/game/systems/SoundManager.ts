// SoundManager — Procedural Web Audio Synthesizer for Deadline Dash
// Generates crisp arcade audio effects with zero external file dependencies.

export type SoundEvent =
  | 'TASK_COMPLETE'
  | 'PERFECT_COMPLETE'
  | 'TASK_FAIL'
  | 'COMBO_UP'
  | 'COMBO_BREAK'
  | 'FOCUS_ACTIVATE'
  | 'FOCUS_END'
  | 'BOSS_WARNING'
  | 'PRINTER_EVENT'
  | 'SERVER_CRASH'
  | 'COFFEE'
  | 'FINAL_HOUR'
  | 'WORKDAY_COMPLETE'
  | 'GAME_OVER'
  | 'SLANG_POP'
  | 'ACHIEVEMENT'
  | 'FOOTSTEP'
  | 'INTERACT_EMPTY';

class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.6;

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(event: SoundEvent, extraParam = 1): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = this.volume;
      master.connect(ctx.destination);

      switch (event) {
        case 'TASK_COMPLETE': {
          // Cheerful dual chime (E5 -> B5)
          const pitchMult = 1 + (extraParam - 1) * 0.08;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const g = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';

          osc1.frequency.setValueAtTime(659.25 * pitchMult, now);
          osc1.frequency.exponentialRampToValueAtTime(987.77 * pitchMult, now + 0.12);

          osc2.frequency.setValueAtTime(1318.5 * pitchMult, now + 0.05);

          g.gain.setValueAtTime(0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc1.connect(g);
          osc2.connect(g);
          g.connect(master);

          osc1.start(now);
          osc2.start(now + 0.05);
          osc1.stop(now + 0.35);
          osc2.stop(now + 0.35);
          break;
        }

        case 'PERFECT_COMPLETE': {
          // Major arpeggio (C5 -> E5 -> G5 -> C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * extraParam, now + idx * 0.06);
            g.gain.setValueAtTime(0.25, now + idx * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

            osc.connect(g);
            g.connect(master);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.3);
          });
          break;
        }

        case 'TASK_FAIL': {
          // Low buzzing thud (150Hz down to 40Hz)
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

          g.gain.setValueAtTime(0.4, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }

        case 'COMBO_UP': {
          // Ascending pitch click
          const pitch = 400 + Math.min(extraParam, 10) * 120;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(pitch, now);
          osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.1);

          g.gain.setValueAtTime(0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'COMBO_BREAK': {
          // Sad descending slide
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.25);

          g.gain.setValueAtTime(0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case 'FOCUS_ACTIVATE': {
          // Deep sub bass drop + high whoosh
          const sub = ctx.createOscillator();
          const subG = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(180, now);
          sub.frequency.exponentialRampToValueAtTime(45, now + 0.6);

          subG.gain.setValueAtTime(0.5, now);
          subG.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

          sub.connect(subG);
          subG.connect(master);
          sub.start(now);
          sub.stop(now + 0.6);
          break;
        }

        case 'FOCUS_END': {
          // Rising release sweep
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);

          g.gain.setValueAtTime(0.25, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }

        case 'BOSS_WARNING': {
          // Urgent pulsing alarm sirens
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now + i * 0.15);
            osc.frequency.setValueAtTime(440, now + i * 0.15 + 0.075);

            g.gain.setValueAtTime(0.2, now + i * 0.15);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.14);

            osc.connect(g);
            g.connect(master);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.14);
          }
          break;
        }

        case 'PRINTER_EVENT': {
          // Rapid noise chitter
          const bufferSize = ctx.sampleRate * 0.15;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1200;

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.3, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

          noise.connect(filter);
          filter.connect(g);
          g.connect(master);

          noise.start(now);
          break;
        }

        case 'SERVER_CRASH': {
          // Glitch burst sound
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.setValueAtTime(150, now + 0.05);
          osc.frequency.setValueAtTime(800, now + 0.1);

          g.gain.setValueAtTime(0.35, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case 'COFFEE': {
          // Gulp & energy sparkle
          const notes = [300, 450, 600, 750, 900];
          notes.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.05);

            g.gain.setValueAtTime(0.2, now + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.08);

            osc.connect(g);
            g.connect(master);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.08);
          });
          break;
        }

        case 'SLANG_POP': {
          // Cute bubble pop
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

          g.gain.setValueAtTime(0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'ACHIEVEMENT': {
          // Shiny brass-like fanfare chord
          const freqs = [523.25, 659.25, 783.99, 1046.5];
          freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now);

            g.gain.setValueAtTime(0.15, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc.connect(g);
            g.connect(master);
            osc.start(now);
            osc.stop(now + 0.8);
          });
          break;
        }

        case 'WORKDAY_COMPLETE': {
          // 5-note victory phrase
          const phrase = [523.25, 659.25, 783.99, 880, 1046.5];
          phrase.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.12);

            g.gain.setValueAtTime(0.3, now + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

            osc.connect(g);
            g.connect(master);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.4);
          });
          break;
        }

        case 'INTERACT_EMPTY': {
          // Low blip
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(150, now + 0.06);

          g.gain.setValueAtTime(0.15, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'FOOTSTEP': {
          // Soft quiet noise click
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          g.gain.setValueAtTime(0.04, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
      }
    } catch {
      // Catch any audio context restrictions gracefully
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const SoundManager = new SoundManagerClass();
