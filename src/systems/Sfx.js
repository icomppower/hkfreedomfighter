// Tiny WebAudio synthesizer — all SFX are generated, no audio files.
// Call Sfx.ensure() from a user-gesture handler before playing anything.

class SfxEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone({ f0 = 220, f1 = 110, dur = 0.1, type = 'square', vol = 0.15, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.12, vol = 0.2, freq = 900, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'punch':
        this.noise({ dur: 0.07, vol: 0.22, freq: 1200 });
        this.tone({ f0: 180, f1: 90, dur: 0.06, type: 'square', vol: 0.1 });
        break;
      case 'kick':
        this.noise({ dur: 0.1, vol: 0.26, freq: 700 });
        this.tone({ f0: 140, f1: 60, dur: 0.09, type: 'square', vol: 0.12 });
        break;
      case 'hit':
        this.noise({ dur: 0.12, vol: 0.3, freq: 500 });
        this.tone({ f0: 110, f1: 45, dur: 0.12, type: 'sawtooth', vol: 0.14 });
        break;
      case 'hurt':
        this.tone({ f0: 320, f1: 120, dur: 0.16, type: 'sawtooth', vol: 0.12 });
        break;
      case 'special':
        this.tone({ f0: 200, f1: 880, dur: 0.22, type: 'sawtooth', vol: 0.14 });
        this.noise({ dur: 0.25, vol: 0.2, freq: 1500, delay: 0.05 });
        break;
      case 'jump':
        this.tone({ f0: 260, f1: 520, dur: 0.1, type: 'square', vol: 0.07 });
        break;
      case 'land':
        this.noise({ dur: 0.06, vol: 0.1, freq: 300 });
        break;
      case 'pickup':
        this.tone({ f0: 660, f1: 660, dur: 0.07, type: 'square', vol: 0.1 });
        this.tone({ f0: 990, f1: 990, dur: 0.1, type: 'square', vol: 0.1, delay: 0.07 });
        break;
      case 'ko':
        this.tone({ f0: 90, f1: 30, dur: 0.4, type: 'sawtooth', vol: 0.2 });
        this.noise({ dur: 0.3, vol: 0.25, freq: 220 });
        break;
      case 'break':
        this.tone({ f0: 800, f1: 200, dur: 0.18, type: 'square', vol: 0.12 });
        break;
      case 'wave':
        this.tone({ f0: 440, f1: 220, dur: 0.25, type: 'triangle', vol: 0.14 });
        this.tone({ f0: 440, f1: 220, dur: 0.25, type: 'triangle', vol: 0.14, delay: 0.3 });
        break;
      case 'boss':
        this.tone({ f0: 70, f1: 50, dur: 0.7, type: 'sawtooth', vol: 0.22 });
        this.tone({ f0: 105, f1: 75, dur: 0.7, type: 'sawtooth', vol: 0.16, delay: 0.05 });
        break;
      case 'block':
        this.noise({ dur: 0.07, vol: 0.18, freq: 380 });
        this.tone({ f0: 240, f1: 340, dur: 0.09, type: 'triangle', vol: 0.1 });
        break;
      case 'kiblast':
        this.tone({ f0: 880, f1: 1760, dur: 0.08, type: 'sine', vol: 0.12 });
        this.tone({ f0: 440, f1: 220, dur: 0.3, type: 'sawtooth', vol: 0.1, delay: 0.05 });
        this.noise({ dur: 0.15, vol: 0.12, freq: 2200, delay: 0.02 });
        break;
      case 'select':
        this.tone({ f0: 520, f1: 780, dur: 0.08, type: 'square', vol: 0.1 });
        break;
      default:
        break;
    }
  }
}

export const Sfx = new SfxEngine();
