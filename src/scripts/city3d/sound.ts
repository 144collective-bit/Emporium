/*
 * Ambient sound, synthesised (no audio files): a low city hum, rain when it
 * rains, a neon buzz at night and a beat that gets louder near the Emporium.
 * Nothing plays until the visitor turns it on.
 */

import type { Sfx } from './combat';

export function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  /** Two seconds of white noise, made once and reused by every short sound */
  let white: AudioBuffer;
  let sfxBus: GainNode;
  let echoIn: GainNode;
  let rainGain: GainNode;
  let buzzGain: GainNode;
  let beatGain: GainNode;
  let on = false;
  let nextBeat = 0;
  let step = 0;
  let timer = 0;
  const BPM = 104;

  function noise(seconds: number, brown = false) {
    const len = ctx!.sampleRate * seconds;
    const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  function init() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const w = white.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
    // Gun sounds, and a short slapback echo off the buildings
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    echoIn = ctx.createGain();
    echoIn.gain.value = 0.35;
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.11;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 2000;
    echoIn.connect(delay).connect(dark).connect(fb).connect(delay);
    dark.connect(master);

    const hum = noise(4, true);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.5;
    hum.connect(lp).connect(humGain).connect(master);
    hum.start();

    const rain = noise(3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.5;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rain.connect(bp).connect(rainGain).connect(master);
    rain.start();

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 120;
    const bbp = ctx.createBiquadFilter();
    bbp.type = 'bandpass';
    bbp.frequency.value = 240;
    bbp.Q.value = 3;
    buzzGain = ctx.createGain();
    buzzGain.gain.value = 0;
    buzz.connect(bbp).connect(buzzGain).connect(master);
    buzz.start();

    beatGain = ctx.createGain();
    beatGain.gain.value = 0;
    beatGain.connect(master);
    nextBeat = ctx.currentTime + 0.1;
  }

  function kick(t: number) {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(beatGain);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** A one-shot from the shared noise (start it at a random offset) */
  function burst() {
    const src = ctx!.createBufferSource();
    src.buffer = white;
    return src;
  }

  function hat(t: number, open = false) {
    const src = burst();
    const hp = ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.22 : 0.05));
    src.connect(hp).connect(g).connect(beatGain);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.3);
  }

  function bass(t: number, f: number) {
    const o = ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(lp).connect(g).connect(beatGain);
    o.start(t);
    o.stop(t + 0.3);
  }

  const notes = [55, 55, 65.4, 49];

  function schedule() {
    if (!ctx || !on) return;
    const sixteenth = 60 / BPM / 4;
    while (nextBeat < ctx.currentTime + 0.2) {
      const s = step % 16;
      if (s % 4 === 0) kick(nextBeat);
      if (s % 4 === 2) hat(nextBeat, s === 14);
      if (s % 2 === 1) hat(nextBeat);
      if (s === 0 || s === 6 || s === 10) bass(nextBeat, notes[Math.floor(step / 16) % 4]);
      nextBeat += sixteenth;
      step++;
    }
  }

  return {
    get on() {
      return on;
    },
    async toggle() {
      if (!ctx) init();
      on = !on;
      if (on) {
        await ctx!.resume();
        nextBeat = ctx!.currentTime + 0.1;
        timer = window.setInterval(schedule, 50);
        master.gain.setTargetAtTime(0.55, ctx!.currentTime, 0.4);
      } else {
        window.clearInterval(timer);
        master.gain.setTargetAtTime(0, ctx!.currentTime, 0.15);
      }
      return on;
    },
    /**
     * Gun sounds for walk mode, in layers: each shot is a low punch, a crack, a
     * mechanical click, an echo off the buildings and now and then a casing tink;
     * reloads click out and clack in; cardboard thuds, drones ring. Silent unless
     * sound is on.
     */
    sfx(kind: Sfx) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      const env = (g: GainNode, at: number, peak: number, decay: number) => {
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(peak, at + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      };
      /** Filtered noise; `echo` also sends it down the street */
      const crack = (at: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number, echo = false) => {
        const src = burst();
        const f = ctx!.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx!.createGain();
        env(g, at, peak, decay);
        src.connect(f).connect(g).connect(sfxBus);
        if (echo) g.connect(echoIn);
        src.start(at, Math.random() * 1.5);
        src.stop(at + decay + 0.05);
      };
      const tone = (at: number, type: OscillatorType, f0: number, f1: number, peak: number, decay: number, echo = false) => {
        const o = ctx!.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f0, at);
        o.frequency.exponentialRampToValueAtTime(f1, at + decay);
        const g = ctx!.createGain();
        env(g, at, peak, decay);
        o.connect(g).connect(sfxBus);
        if (echo) g.connect(echoIn);
        o.start(at);
        o.stop(at + decay + 0.02);
      };
      const tick = (at: number, f: number, peak: number) => tone(at, 'square', f, f * 0.8, peak, 0.025);
      switch (kind) {
        case 'shot':
          tone(t, 'sine', 150, 42, 0.7, 0.14, true);
          crack(t, 'bandpass', 1800, 0.7, 0.5, 0.09, true);
          crack(t, 'highpass', 5200, 0.7, 0.22, 0.03);
          tick(t + 0.012, 2400, 0.05);
          if (Math.random() < 0.55) tone(t + 0.26 + Math.random() * 0.08, 'sine', 5000 + Math.random() * 800, 4400, 0.04, 0.08);
          break;
        case 'empty':
          crack(t, 'bandpass', 3800, 9, 0.2, 0.03);
          tick(t, 3000, 0.04);
          break;
        case 'magout':
          crack(t, 'bandpass', 2600, 6, 0.3, 0.04);
          crack(t + 0.03, 'bandpass', 900, 2, 0.15, 0.12);
          break;
        case 'magin':
          tone(t, 'sine', 220, 110, 0.35, 0.08);
          crack(t, 'bandpass', 2000, 5, 0.4, 0.05);
          break;
        case 'bolt':
          crack(t, 'bandpass', 3200, 7, 0.35, 0.04);
          crack(t + 0.09, 'bandpass', 2200, 6, 0.42, 0.06);
          break;
        case 'hit':
          crack(t, 'bandpass', 500, 1, 0.4, 0.08);
          tone(t, 'triangle', 1500, 1400, 0.12, 0.06);
          break;
        case 'hitMetal':
          tone(t, 'sine', 1250, 1210, 0.12, 0.25);
          tone(t, 'sine', 1890, 1850, 0.09, 0.2);
          tone(t, 'triangle', 1500, 1400, 0.1, 0.05);
          break;
        case 'down':
          tone(t, 'square', 520, 160, 0.12, 0.25);
          crack(t, 'bandpass', 900, 0.8, 0.35, 0.2);
          tone(t + 0.03, 'sine', 1320, 1300, 0.12, 0.3);
          break;
        case 'boom':
          tone(t, 'sine', 90, 35, 0.8, 0.5, true);
          crack(t, 'bandpass', 300, 0.5, 0.6, 0.45, true);
          break;
        case 'gear':
          crack(t, 'bandpass', 2400, 6, 0.3, 0.05);
          crack(t + 0.18, 'bandpass', 1600, 5, 0.35, 0.06);
          crack(t + 0.34, 'bandpass', 3200, 7, 0.35, 0.04);
          crack(t + 0.43, 'bandpass', 2200, 6, 0.42, 0.06);
          break;
        case 'draw':
          crack(t, 'bandpass', 1200, 1.5, 0.12, 0.12);
          tick(t + 0.12, 3000, 0.05);
          break;
        case 'holster':
          crack(t, 'bandpass', 1000, 1.5, 0.12, 0.14);
          break;
        case 'unlock':
          [660, 880, 1320].forEach((f, i) => tone(t + i * 0.08, 'triangle', f, f, 0.15, 0.18));
          break;
      }
    },
    /** Called every frame with the scene's state. `near` is 0-1 closeness to the Emporium. */
    update(rain: number, night: number, near: number) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      rainGain.gain.setTargetAtTime(rain * 0.5, t, 0.5);
      buzzGain.gain.setTargetAtTime(night * 0.012, t, 0.5);
      beatGain.gain.setTargetAtTime(0.06 + near * 0.5, t, 0.3);
    },
    suspend() {
      if (ctx && on) ctx.suspend();
    },
    resume() {
      if (ctx && on) ctx.resume();
    },
  };
}
