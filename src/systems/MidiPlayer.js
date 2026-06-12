import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

export class MidiPlayer {
  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
      volume: -10,
    }).toDestination();

    this.isMuted  = false;
    this._started = false;
    this._part    = null;
  }

  async play() {
    if (this._started) return;
    this._started = true;

    await Tone.start();

    const res  = await fetch('/audio/glory_to_hk.mid');
    const buf  = await res.arrayBuffer();
    const midi = new Midi(buf);

    Tone.Transport.cancel();
    Tone.Transport.bpm.value = midi.header.tempos[0]?.bpm ?? 120;

    const notes = [];
    midi.tracks.forEach(track => {
      track.notes.forEach(n => {
        notes.push({ time: n.time, note: n.name, duration: n.duration, velocity: n.velocity });
      });
    });

    this._part = new Tone.Part((time, ev) => {
      if (!this.isMuted) {
        this.synth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
      }
    }, notes);

    this._part.loop    = true;
    this._part.loopEnd = midi.duration;
    this._part.start(0);

    Tone.Transport.loop    = true;
    Tone.Transport.loopEnd = midi.duration;
    Tone.Transport.start();
  }

  stop() {
    if (this._part) { this._part.stop(); this._part.dispose(); this._part = null; }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this._started = false;
  }

  // Returns new muted state.
  toggle() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const midiPlayer = new MidiPlayer();
