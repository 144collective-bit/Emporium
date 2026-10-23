/*
 * Ambient sound, synthesised (no audio files): a low city hum, rain when it
 * rains, a neon buzz at night and a beat that gets louder near the Emporium;
 * since growth plan Phase 8 the mix follows the district you're in
 * (ambience.ts): the hum in town, the river by the water, traffic's rush by
 * the highway and the avenues, wind over the open land. In The Trenches
 * (the grit step) the el rumbles and screeches overhead as the train goes
 * by, a siren wails somewhere far off now and then, a dog barks, and a
 * boombox plays by a walk-up's stoop (its own slow beat, through a small
 * speaker); by Club PULSE's door its four-on-the-floor thumps through the
 * walls (the grit's step 3). In Westlake Park birds sing by day and an owl
 * hoots at night, the lake laps at its rim, and by the courts a ball is
 * kicked, bounced and hit (step 3).
 * Nothing plays until the visitor turns it on.
 */

import type { Sfx } from './combat';
import type { Ambience } from './ambience';

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
  let humGain: GainNode;
  let waterGain: GainNode;
  let roadGain: GainNode;
  let windGain: GainNode;
  /** The Trenches: the el's rumble and screech, the boombox, the hood's own (sirens, dogs) */
  let elGain: GainNode;
  let screechGain: GainNode;
  let boomGain: GainNode;
  let hoodGain: GainNode;
  let nextBoom = 0;
  /** Club PULSE: its beat through the walls (a four-on-the-floor kick and bass, everything over a low hum cut off) */
  let clubGain: GainNode;
  let nextClub = 0;
  let clubStep = 0;
  let boomStep = 0;
  let nextSiren = 0;
  let nextDog = 0;
  /** Westlake Park: birds by day and an owl at night through one, the games' balls through the other */
  let parkGain: GainNode;
  let sportGain: GainNode;
  let nextBird = 0;
  let nextOwl = 0;
  let nextBall = 0;
  const BOOM_BPM = 88;
  const CLUB_BPM = 124;
  let on = false;
  let engine: { g: GainNode; lp: BiquadFilterNode; a: OscillatorNode; b: OscillatorNode } | null = null;
  /** Your car's tyres sliding (city life plan, Phase 2): a squeal and a hiss, by how hard they slide */
  let tyres: { g: GainNode; bp: BiquadFilterNode; sq: OscillatorNode; gSq: GainNode } | null = null;
  /** Your aircraft's engine: a buzz, a hiss and a whine, beaten by a throb (the prop's blades, the rotor's thump) */
  let aero: { out: GainNode; buzz: OscillatorNode; lp: BiquadFilterNode; gBuzz: GainNode; bp: BiquadFilterNode; gHiss: GainNode; whine: OscillatorNode; gWhine: GainNode; lfo: OscillatorNode; depth: GainNode; am: GainNode } | null = null;
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
    humGain = ctx.createGain();
    humGain.gain.value = 0.5;
    hum.connect(lp).connect(humGain).connect(master);
    hum.start();

    // A layer of noise through a filter, its level swayed slowly by an LFO (waves, gusts, passing cars)
    const layer = (type: BiquadFilterType, f: number, q: number, sway: number, rate: number, brown = false) => {
      const src = noise(4, brown);
      const filt = ctx!.createBiquadFilter();
      filt.type = type;
      filt.frequency.value = f;
      filt.Q.value = q;
      const g = ctx!.createGain();
      g.gain.value = 0;
      const swayG = ctx!.createGain();
      swayG.gain.value = 1;
      const lfo = ctx!.createOscillator();
      lfo.frequency.value = rate;
      const depth = ctx!.createGain();
      depth.gain.value = sway;
      lfo.connect(depth).connect(swayG.gain);
      src.connect(filt).connect(swayG).connect(g).connect(master);
      src.start();
      lfo.start();
      return g;
    };
    waterGain = layer('lowpass', 520, 0.7, 0.45, 0.17, true);
    roadGain = layer('bandpass', 700, 0.6, 0.35, 0.09);
    windGain = layer('bandpass', 380, 1.4, 0.6, 0.06, true);

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

    // The el overhead: a deep rumble, and the wheels' screech on the rails swaying in and out
    elGain = layer('lowpass', 150, 0.8, 0.3, 0.7, true);
    screechGain = layer('bandpass', 3100, 9, 0.8, 0.45);
    // The boombox: its own beat through a small speaker (a band, a bit of crunch)
    boomGain = ctx.createGain();
    boomGain.gain.value = 0;
    const speaker = ctx.createBiquadFilter();
    speaker.type = 'bandpass';
    speaker.frequency.value = 900;
    speaker.Q.value = 0.45;
    boomGain.connect(speaker).connect(master);
    nextBoom = ctx.currentTime + 0.1;
    // Club PULSE: through its walls only the low end gets out
    clubGain = ctx.createGain();
    clubGain.gain.value = 0;
    const wall = ctx.createBiquadFilter();
    wall.type = 'lowpass';
    wall.frequency.value = 180;
    wall.Q.value = 0.7;
    clubGain.connect(wall).connect(master);
    nextClub = ctx.currentTime + 0.1;
    // The hood's far-off sounds (sirens, dogs) go through this, its level the district's
    hoodGain = ctx.createGain();
    hoodGain.gain.value = 0;
    hoodGain.connect(master);
    nextSiren = ctx.currentTime + 8 + Math.random() * 20;
    nextDog = ctx.currentTime + 4 + Math.random() * 10;
    parkGain = ctx.createGain();
    parkGain.gain.value = 0;
    parkGain.connect(master);
    sportGain = ctx.createGain();
    sportGain.gain.value = 0;
    sportGain.connect(master);
  }

  /** A bird in the trees: a few quick whistles sweeping up and down */
  function bird(t: number) {
    const n = 2 + Math.floor(Math.random() * 5);
    const base = 2400 + Math.random() * 2200;
    let at = t;
    for (let i = 0; i < n; i++) {
      const len = 0.06 + Math.random() * 0.1;
      const o = ctx!.createOscillator();
      o.type = 'sine';
      const f = base * (0.85 + Math.random() * 0.4);
      o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.7), at + len);
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.035, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(parkGain);
      o.start(at);
      o.stop(at + len + 0.02);
      at += len + 0.03 + Math.random() * 0.08;
    }
  }
  /** An owl at night: hoo, hoo-hoo, low and soft */
  function owl(t: number) {
    for (const [d, len] of [[0, 0.45], [0.75, 0.22], [1.05, 0.5]]) {
      const o = ctx!.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(390, t + d);
      o.frequency.linearRampToValueAtTime(350, t + d + len);
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(g).connect(parkGain);
      o.start(t + d);
      o.stop(t + d + len + 0.05);
    }
  }
  /** A ball: a tennis ball's pock, a football's kick or a basketball's bounce */
  function ball(t: number) {
    const kind = Math.floor(Math.random() * 3);
    const o = ctx!.createOscillator();
    o.type = kind === 0 ? 'triangle' : 'sine';
    const [f0, f1, len] = kind === 0 ? [1100, 700, 0.05] : kind === 1 ? [160, 70, 0.12] : [230, 120, 0.1];
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + len);
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === 0 ? 0.05 : 0.12, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(sportGain);
    o.start(t);
    o.stop(t + len + 0.02);
  }

  /** A siren far off: a wail rising and falling, muffled by the blocks between */
  function siren(t: number) {
    const o = ctx!.createOscillator();
    o.type = 'sawtooth';
    const len = 6 + Math.random() * 4;
    const rate = 0.35 + Math.random() * 0.2;
    o.frequency.setValueAtTime(700, t);
    for (let k = 0; k < len * rate; k++) {
      o.frequency.linearRampToValueAtTime(1250, t + (k + 0.5) / rate);
      o.frequency.linearRampToValueAtTime(700, t + (k + 1) / rate);
    }
    const lp = ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + len * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(hoodGain);
    o.start(t);
    o.stop(t + len + 0.1);
  }
  /** A dog a few yards over: two or three barks */
  function dog(t: number) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const at = t + i * (0.32 + Math.random() * 0.15);
      const o = ctx!.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, at);
      o.frequency.exponentialRampToValueAtTime(260, at + 0.12);
      const bp = ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 2.5;
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.09, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(bp).connect(g).connect(hoodGain);
      o.start(at);
      o.stop(at + 0.2);
    }
  }
  /** A snare: a crack of noise over a short tone */
  function snare(t: number, out: AudioNode) {
    const src = burst();
    const bp = ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.2);
  }

  function kick(t: number, out: AudioNode = beatGain) {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** A one-shot from the shared noise (start it at a random offset) */
  function burst() {
    const src = ctx!.createBufferSource();
    src.buffer = white;
    return src;
  }

  function hat(t: number, open = false, out: AudioNode = beatGain) {
    const src = burst();
    const hp = ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.22 : 0.05));
    src.connect(hp).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.3);
  }

  function bass(t: number, f: number, out: AudioNode = beatGain) {
    const o = ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(lp).connect(g).connect(out);
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
    // The boombox: a slow head-nod beat (kick, snare on two and four, hats, a bass line)
    const boomSixteenth = 60 / BOOM_BPM / 4;
    while (nextBoom < ctx.currentTime + 0.2) {
      const k = boomStep % 16;
      if (k === 0 || k === 7 || k === 10) kick(nextBoom, boomGain);
      if (k === 4 || k === 12) snare(nextBoom, boomGain);
      if (k % 2 === 0) hat(nextBoom, false, boomGain);
      if (k === 0 || k === 10) bass(nextBoom, [49, 49, 58.3, 43.7][Math.floor(boomStep / 16) % 4], boomGain);
      nextBoom += boomSixteenth;
      boomStep++;
    }
    // The club: a kick on every beat, the bass on the off-beats
    const clubSixteenth = 60 / CLUB_BPM / 4;
    while (nextClub < ctx.currentTime + 0.2) {
      const k = clubStep % 16;
      if (k % 4 === 0) kick(nextClub, clubGain);
      if (k % 4 === 2) bass(nextClub, [41.2, 41.2, 49, 36.7][Math.floor(clubStep / 16) % 4], clubGain);
      nextClub += clubSixteenth;
      clubStep++;
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
        nextBoom = ctx!.currentTime + 0.1;
        nextClub = ctx!.currentTime + 0.1;
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
        // A car's horn: two reeds a third apart, a short toot (quieter the further off)
        case 'horn':
          tone(t, 'sawtooth', 370, 362, 0.1, 0.42);
          tone(t, 'sawtooth', 466, 455, 0.08, 0.42);
          tone(t, 'square', 185, 181, 0.04, 0.4);
          break;
        // A bus's doors (city life plan, Phase 4): a hiss of air, then the fold
        case 'doors':
          crack(t, 'bandpass', 2400, 0.9, 0.2, 0.4);
          crack(t + 0.05, 'highpass', 1500, 0.7, 0.1, 0.55);
          tone(t + 0.42, 'square', 160, 120, 0.04, 0.08);
          break;
        // A boat's horn before a bridge: two low reeds held a moment, sent down the river
        case 'boatHorn': {
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.14, t + 0.18);
          g.gain.setValueAtTime(0.14, t + 0.9);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 900;
          for (const [f, type] of [[98, 'sawtooth'], [131, 'sawtooth'], [49, 'square']] as const) {
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = f;
            o.connect(lp);
            o.start(t);
            o.stop(t + 1.5);
          }
          lp.connect(g).connect(bus);
          g.connect(echoIn);
          break;
        }
        // Thunder: a long roll of low noise swelling and dying away, a second roll behind it
        case 'thunder': {
          const src = noise(3, true);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(90, t);
          lp.frequency.linearRampToValueAtTime(170, t + 0.4);
          lp.frequency.exponentialRampToValueAtTime(60, t + 3.2);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.55, t + 0.35);
          g.gain.exponentialRampToValueAtTime(0.2, t + 1.1);
          g.gain.exponentialRampToValueAtTime(0.45, t + 1.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
          src.connect(lp).connect(g).connect(bus);
          src.start(t);
          src.stop(t + 3.5);
          break;
        }
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
        // Kart races: the countdown beeps, the GO, the finish
        case 'countdown':
          tone(t, 'square', 440, 440, 0.18, 0.18);
          break;
        case 'go':
          tone(t, 'square', 880, 880, 0.22, 0.42);
          break;
        case 'finish':
          [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(t + i * 0.08, 'triangle', f, f, 0.18, 0.28));
          crack(t, 'bandpass', 1200, 0.6, 0.3, 0.3, true);
          break;
        // The crew on the south bank: a shove, and one going down
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
    /**
     * Your car's tyres sliding: `level` 0..1 how hard (0 or a negative value is silent). A hiss of
     * filtered noise under a thin squeal that climbs a little with the slide. Made the first time it's
     * needed; silent unless sound is on.
     */
    tyres(level: number) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      if (!tyres) {
        if (level <= 0) return;
        const g = ctx.createGain();
        g.gain.value = 0;
        const src = noise(4, false);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1900;
        bp.Q.value = 2.2;
        src.connect(bp).connect(g);
        src.start();
        const sq = ctx.createOscillator();
        sq.type = 'sawtooth';
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        const gSq = ctx.createGain();
        gSq.gain.value = 0;
        sq.connect(lp).connect(gSq).connect(g);
        sq.start();
        g.connect(sfxBus);
        tyres = { g, bp, sq, gSq };
      }
      const l = Math.max(0, Math.min(1, level));
      tyres.sq.frequency.setTargetAtTime(560 + l * 260, t, 0.06);
      tyres.bp.frequency.setTargetAtTime(1600 + l * 900, t, 0.06);
      tyres.gSq.gain.setTargetAtTime(l * 0.05, t, 0.05);
      tyres.g.gain.setTargetAtTime(l > 0 ? 0.08 + l * 0.14 : 0, t, l > 0 ? 0.05 : 0.12);
    },
    /**
     * Your aircraft's engine: `kind` picks the voice (a prop's buzz, a jet's whine and roar, a
     * rotor's thump), `revs` 0..1 how hard it's working, a negative value switches it off. Made
     * the first time it's needed; silent unless sound is on.
     */
    aero(kind: 'prop' | 'jet' | 'heli', revs: number) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      if (!aero) {
        if (revs < 0) return;
        const out = ctx.createGain();
        out.gain.value = 0;
        // The throb: a gain swung by a slow oscillator
        const am = ctx.createGain();
        am.gain.value = 0.7;
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        depth.gain.value = 0.3;
        lfo.connect(depth).connect(am.gain);
        am.connect(out).connect(sfxBus);
        const buzz = ctx.createOscillator();
        buzz.type = 'sawtooth';
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.5;
        const gBuzz = ctx.createGain();
        buzz.connect(lp).connect(gBuzz).connect(am);
        const hiss = ctx.createBufferSource();
        hiss.buffer = white;
        hiss.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.8;
        const gHiss = ctx.createGain();
        hiss.connect(bp).connect(gHiss).connect(am);
        const whine = ctx.createOscillator();
        whine.type = 'sine';
        const gWhine = ctx.createGain();
        whine.connect(gWhine).connect(am);
        for (const o of [lfo, buzz, hiss, whine]) o.start();
        aero = { out, buzz, lp, gBuzz, bp, gHiss, whine, gWhine, lfo, depth, am };
      }
      const a = aero;
      const r = Math.max(0, Math.min(1, revs));
      const set = (p: AudioParam, v: number, k = 0.12) => p.setTargetAtTime(v, t, k);
      if (kind === 'prop') {
        set(a.buzz.frequency, 52 + r * 120);
        set(a.lp.frequency, 420 + r * 1500);
        set(a.gBuzz.gain, 0.5 + r * 0.4);
        set(a.bp.frequency, 900 + r * 700);
        set(a.gHiss.gain, 0.08 + r * 0.12);
        set(a.gWhine.gain, 0);
        set(a.lfo.frequency, 12 + r * 34);
        set(a.depth.gain, 0.32);
      } else if (kind === 'jet') {
        set(a.buzz.frequency, 34 + r * 36);
        set(a.lp.frequency, 220 + r * 300);
        set(a.gBuzz.gain, 0.3);
        set(a.bp.frequency, 500 + r * 2600);
        set(a.gHiss.gain, 0.35 + r * 0.55);
        set(a.whine.frequency, 900 + r * 1900);
        set(a.gWhine.gain, 0.04 + r * 0.05);
        set(a.lfo.frequency, 0.6);
        set(a.depth.gain, 0.04);
      } else {
        set(a.buzz.frequency, 38 + r * 22);
        set(a.lp.frequency, 260 + r * 220);
        set(a.gBuzz.gain, 0.45);
        set(a.bp.frequency, 260 + r * 260);
        set(a.gHiss.gain, 0.4 + r * 0.4);
        set(a.gWhine.gain, 0.015 * r);
        set(a.whine.frequency, 1300 + r * 500);
        set(a.lfo.frequency, 3 + r * 13);
        set(a.depth.gain, 0.62);
      }
      set(a.out.gain, revs >= 0 ? 0.04 + r * 0.07 : 0, revs >= 0 ? 0.2 : 0.3);
    },
    /** Called every frame with the scene's state and the district's layers where you are (ambience.ts) */
    update(rain: number, night: number, a: Ambience, rumble = 0) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      // The Trenches: the el as the train goes over, the boombox, sirens and dogs now and then
      elGain.gain.setTargetAtTime(rumble * 0.5, t, 0.3);
      screechGain.gain.setTargetAtTime(rumble * rumble * 0.035, t, 0.3);
      boomGain.gain.setTargetAtTime(a.boombox * 0.32, t, 0.4);
      clubGain.gain.setTargetAtTime(a.club * 0.55, t, 0.4);
      hoodGain.gain.setTargetAtTime(a.hood, t, 1);
      if (a.hood > 0.15 && t > nextSiren) {
        siren(t);
        nextSiren = t + 40 + Math.random() * 60;
      }
      if (a.hood > 0.15 && t > nextDog) {
        dog(t);
        nextDog = t + 14 + Math.random() * 30;
      }
      // Westlake Park: birds by day (fewer in the rain), an owl now and then at night; a ball by the courts
      parkGain.gain.setTargetAtTime(a.park, t, 1);
      sportGain.gain.setTargetAtTime(a.sport, t, 0.5);
      if (a.park > 0.15 && night < 0.5 && t > nextBird) {
        bird(t);
        nextBird = t + (1.2 + Math.random() * 4) * (1 + rain * 3);
      }
      if (a.park > 0.15 && night > 0.6 && t > nextOwl) {
        owl(t);
        nextOwl = t + 12 + Math.random() * 20;
      }
      if (a.sport > 0.15 && rain < 0.5 && t > nextBall) {
        ball(t);
        nextBall = t + 0.6 + Math.random() * 1.1;
      }
      rainGain.gain.setTargetAtTime(rain * 0.5, t, 0.5);
      // The neon buzz is the town's; the beat carries a little everywhere in town, more near the Emporium
      buzzGain.gain.setTargetAtTime(night * 0.012 * a.city, t, 0.5);
      beatGain.gain.setTargetAtTime(0.06 * a.city + a.beat * 0.5, t, 0.3);
      humGain.gain.setTargetAtTime(0.15 + 0.35 * a.city, t, 1);
      waterGain.gain.setTargetAtTime(a.water * 0.22, t, 1);
      roadGain.gain.setTargetAtTime(a.road * 0.09, t, 1);
      windGain.gain.setTargetAtTime(a.open * 0.16 * (1 + rain * 0.5), t, 1.5);
    },
    suspend() {
      if (ctx && on) ctx.suspend();
    },
    resume() {
      if (ctx && on) ctx.resume();
    },
  };
}
