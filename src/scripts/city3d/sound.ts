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
  let engine: { g: GainNode; lp: BiquadFilterNode; a: OscillatorNode; b: OscillatorNode } | null = null;
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
        // Turned off again while waking up: no beat timer left running
        if (!on) return on;
        window.clearInterval(timer);
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
    sfx(kind: Sfx, gain = 1) {
      if (!ctx || !on || gain <= 0) return;
      const t = ctx.currentTime;
      // Quieter for things further away (other players' shots)
      const bus = gain < 1 ? ctx.createGain() : sfxBus;
      if (bus !== sfxBus) {
        bus.gain.value = gain;
        bus.connect(sfxBus);
      }
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
        src.connect(f).connect(g).connect(bus);
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
        o.connect(g).connect(bus);
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
        case 'shotSmg':
          // Higher, snappier, quieter: it fires fifteen times a second
          tone(t, 'sine', 210, 70, 0.45, 0.08, true);
          crack(t, 'bandpass', 2600, 0.8, 0.38, 0.06, true);
          crack(t, 'highpass', 6200, 0.7, 0.16, 0.025);
          if (Math.random() < 0.35) tone(t + 0.2 + Math.random() * 0.08, 'sine', 5600, 5000, 0.03, 0.06);
          break;
        case 'shotShotgun':
          // A deep boom, a long street echo, then the pump racking back
          tone(t, 'sine', 110, 30, 0.95, 0.3, true);
          crack(t, 'lowpass', 900, 0.7, 0.75, 0.22, true);
          crack(t, 'bandpass', 1500, 0.6, 0.4, 0.12);
          crack(t + 0.34, 'bandpass', 1300, 4, 0.32, 0.06);
          crack(t + 0.46, 'bandpass', 2100, 5, 0.38, 0.05);
          tone(t + 0.62, 'sine', 4800, 4300, 0.04, 0.08);
          break;
        case 'shotDmr':
          // A sharp, heavy crack that rolls down the street, and the bolt cycling
          tone(t, 'sine', 130, 34, 0.9, 0.24, true);
          crack(t, 'bandpass', 1900, 0.5, 0.65, 0.16, true);
          crack(t, 'highpass', 5800, 0.7, 0.3, 0.04);
          crack(t + 0.28, 'bandpass', 3000, 6, 0.26, 0.04);
          tone(t + 0.4, 'sine', 5200, 4600, 0.035, 0.08);
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
        // Your car: a soft rubbery bump, and its door
        case 'bump':
          tone(t, 'sine', 95, 38, 0.6, 0.2);
          crack(t, 'lowpass', 420, 0.8, 0.35, 0.12);
          break;
        case 'door':
          crack(t, 'bandpass', 900, 1.2, 0.25, 0.05);
          tone(t + 0.03, 'square', 140, 90, 0.18, 0.08);
          break;
        // The premium guns: a heavy revolver boom and its hammer, the carbine's crisp burst, the belt-fed thump
        case 'shotRevolver':
          tone(t, 'sine', 120, 32, 0.95, 0.26, true);
          crack(t, 'bandpass', 1500, 0.5, 0.7, 0.18, true);
          crack(t, 'highpass', 5200, 0.7, 0.3, 0.04);
          crack(t + 0.3, 'bandpass', 3400, 7, 0.22, 0.03);
          break;
        case 'shotBurst':
          tone(t, 'sine', 180, 52, 0.55, 0.1, true);
          crack(t, 'bandpass', 2200, 0.8, 0.45, 0.07, true);
          crack(t, 'highpass', 6000, 0.7, 0.2, 0.025);
          break;
        case 'shotLmg':
          tone(t, 'sine', 135, 40, 0.65, 0.13, true);
          crack(t, 'lowpass', 1200, 0.6, 0.5, 0.1, true);
          crack(t, 'bandpass', 2000, 0.8, 0.3, 0.07);
          if (Math.random() < 0.5) tone(t + 0.22 + Math.random() * 0.1, 'sine', 4600 + Math.random() * 900, 4100, 0.035, 0.07);
          break;
        // The city's game: a till for a purchase, a buzz when it can't be afforded, an upgrade's wrench, a level-up fanfare
        case 'buy':
          tick(t, 2400, 0.08);
          [1046, 1318, 1568].forEach((f, i) => tone(t + 0.04 + i * 0.06, 'triangle', f, f, 0.16, 0.16));
          crack(t + 0.02, 'bandpass', 3000, 6, 0.2, 0.04);
          break;
        case 'denied':
          tone(t, 'square', 220, 180, 0.12, 0.12);
          tone(t + 0.14, 'square', 180, 150, 0.12, 0.16);
          break;
        case 'upgrade':
          crack(t, 'bandpass', 2800, 7, 0.3, 0.04);
          crack(t + 0.1, 'bandpass', 2300, 6, 0.3, 0.05);
          [784, 988, 1175].forEach((f, i) => tone(t + 0.2 + i * 0.07, 'triangle', f, f, 0.14, 0.18));
          break;
        case 'levelup':
          [523, 659, 784, 1046, 1318].forEach((f, i) => tone(t + i * 0.09, 'triangle', f, f, 0.2, 0.3));
          tone(t + 0.45, 'sine', 1568, 1568, 0.18, 0.6);
          break;
        case 'mission':
          [660, 990].forEach((f, i) => tone(t + i * 0.12, 'triangle', f, f, 0.18, 0.22));
          tone(t + 0.26, 'triangle', 1320, 1320, 0.2, 0.4);
          break;
        // Races: the countdown beeps, the GO, each checkpoint, the finish
        case 'countdown':
          tone(t, 'square', 440, 440, 0.18, 0.18);
          break;
        case 'go':
          tone(t, 'square', 880, 880, 0.22, 0.42);
          break;
        case 'checkpoint':
          tone(t, 'triangle', 1174, 1174, 0.16, 0.1);
          tone(t + 0.07, 'triangle', 1760, 1760, 0.16, 0.16);
          break;
        case 'finish':
          [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(t + i * 0.08, 'triangle', f, f, 0.18, 0.28));
          crack(t, 'bandpass', 1200, 0.6, 0.3, 0.3, true);
          break;
        // The crew on the south bank: a shove, and one going down
        case 'shove':
          tone(t, 'sine', 160, 60, 0.5, 0.15);
          crack(t, 'lowpass', 600, 0.8, 0.4, 0.12);
          break;
        case 'goonDown':
          tone(t, 'square', 420, 90, 0.14, 0.35);
          crack(t, 'bandpass', 700, 0.8, 0.3, 0.2);
          [880, 660, 440].forEach((f, i) => tone(t + 0.1 + i * 0.07, 'triangle', f, f, 0.08, 0.12));
          break;
        // The kart park: a boost's whoosh, a cartoon boing when you're spun, a ding when you land one
        case 'kartBoost':
          tone(t, 'sawtooth', 180, 720, 0.16, 0.3);
          crack(t, 'bandpass', 1400, 1, 0.3, 0.28);
          crack(t + 0.05, 'highpass', 3500, 0.7, 0.12, 0.2);
          break;
        case 'kartHit':
          tone(t, 'square', 330, 70, 0.22, 0.3);
          tone(t + 0.02, 'sine', 620, 540, 0.14, 0.2);
          crack(t, 'lowpass', 900, 0.8, 0.35, 0.16);
          break;
        case 'kartHitLanded':
          tick(t, 2600, 0.08);
          tone(t + 0.02, 'triangle', 880, 1320, 0.2, 0.14);
          tone(t + 0.1, 'triangle', 1760, 1760, 0.12, 0.12);
          break;
        // The shield's glassy chime, the roulette stopping on an item, a throw's whoosh
        case 'kartShield':
          tone(t, 'sine', 1200, 1180, 0.14, 0.3);
          tone(t + 0.03, 'sine', 1800, 1760, 0.1, 0.26);
          crack(t, 'highpass', 4200, 0.7, 0.12, 0.08);
          break;
        case 'kartItem':
          tick(t, 1800, 0.1);
          tone(t + 0.03, 'triangle', 1046, 1046, 0.14, 0.1);
          tone(t + 0.1, 'triangle', 1568, 1568, 0.16, 0.16);
          break;
        case 'kartUse':
          tone(t, 'sine', 420, 140, 0.18, 0.16);
          crack(t, 'bandpass', 1600, 0.9, 0.28, 0.14);
          break;
        // Drifting: the tyres' squeal, and a rising tick for each stage of the boost
        case 'kartDrift':
          tone(t, 'sawtooth', 1500, 1150, 0.06, 0.3);
          crack(t, 'bandpass', 3200, 3, 0.2, 0.24);
          break;
        case 'kartSpark':
          tone(t, 'square', 1200, 2100, 0.1, 0.07);
          tick(t + 0.05, 2600, 0.06);
          break;
        // The hump: up, and the landing's thud
        case 'kartJump':
          tone(t, 'sine', 300, 760, 0.16, 0.16);
          crack(t, 'highpass', 2500, 0.7, 0.1, 0.1);
          break;
        case 'kartLand':
          tone(t, 'sine', 130, 48, 0.45, 0.16);
          crack(t, 'lowpass', 500, 0.8, 0.3, 0.1);
          break;
        // Onto the dirt shortcut: a short gravel skid, stones pinging off the floor pan
        case 'kartShortcut':
          crack(t, 'lowpass', 900, 0.6, 0.35, 0.32);
          crack(t + 0.05, 'bandpass', 2200, 1.2, 0.2, 0.26);
          tone(t, 'sawtooth', 220, 90, 0.08, 0.3);
          [0.03, 0.11, 0.19, 0.26].forEach((dt, i) => tick(t + dt, 2700 + ((i * 731) % 900), 0.045));
          break;
        // Across the line faster than your ghost: a soft three-note chime
        case 'kartGhost':
          tone(t, 'sine', 1318, 1318, 0.14, 0.4);
          tone(t + 0.12, 'sine', 1760, 1760, 0.12, 0.5);
          tone(t + 0.24, 'sine', 2093, 2093, 0.1, 0.65);
          break;
        // The Fight Club: cartoon fisticuffs
        case 'whoosh':
          crack(t, 'bandpass', 1400, 0.7, 0.16, 0.1);
          break;
        case 'punch':
          tone(t, 'sine', 140, 50, 0.6, 0.14);
          crack(t, 'lowpass', 900, 0.9, 0.5, 0.09);
          break;
        case 'kick':
          tone(t, 'sine', 110, 40, 0.7, 0.18);
          crack(t, 'lowpass', 600, 0.9, 0.55, 0.12);
          break;
        case 'fightBlock':
          crack(t, 'bandpass', 2200, 3, 0.35, 0.06);
          tone(t, 'triangle', 520, 420, 0.18, 0.08);
          break;
        case 'parry':
          tone(t, 'square', 880, 1320, 0.16, 0.08);
          crack(t, 'bandpass', 3000, 4, 0.3, 0.05);
          break;
        case 'thud':
          tone(t, 'sine', 70, 30, 0.8, 0.3);
          crack(t, 'lowpass', 300, 0.7, 0.5, 0.2);
          break;
        case 'fightKo':
          tone(t, 'sine', 80, 30, 0.9, 0.5, true);
          crack(t, 'lowpass', 400, 0.6, 0.6, 0.3, true);
          [660, 550, 440, 330].forEach((f, i) => tone(t + 0.2 + i * 0.12, 'triangle', f, f * 0.9, 0.12, 0.16));
          break;
        case 'bell':
          tone(t, 'triangle', 1760, 1700, 0.3, 0.6, true);
          tone(t, 'sine', 2640, 2600, 0.18, 0.5);
          tone(t + 0.35, 'triangle', 1760, 1700, 0.26, 0.6, true);
          break;
        case 'count':
          tone(t, 'square', 330, 330, 0.14, 0.1);
          break;
      }
    },
    /**
     * Your car's engine, a soft cartoon hum: `revs` 0..1 sets its pitch, a negative value
     * switches it off. Made the first time it's needed; silent unless sound is on.
     */
    engine(revs: number) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      if (!engine) {
        if (revs < 0) return;
        const g = ctx.createGain();
        g.gain.value = 0;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        const a = ctx.createOscillator();
        const b = ctx.createOscillator();
        a.type = 'sawtooth';
        b.type = 'square';
        a.connect(lp);
        b.connect(lp);
        lp.connect(g).connect(sfxBus);
        a.start();
        b.start();
        engine = { g, lp, a, b };
      }
      const on2 = revs >= 0;
      const r = Math.max(0, Math.min(1, revs));
      engine.a.frequency.setTargetAtTime(42 + r * 120, t, 0.08);
      engine.b.frequency.setTargetAtTime(21 + r * 60, t, 0.08);
      engine.lp.frequency.setTargetAtTime(380 + r * 1300, t, 0.1);
      engine.g.gain.setTargetAtTime(on2 ? 0.05 + r * 0.06 : 0, t, on2 ? 0.15 : 0.25);
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
