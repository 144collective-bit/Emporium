/*
 * Ambient sound, synthesised (no audio files): a low city hum, rain when it
 * rains, a neon buzz at night and a beat that gets louder near the Emporium.
 * Nothing plays until the visitor turns it on.
 */

export function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode;
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

  function hat(t: number, open = false) {
    const src = noise(0.3);
    const hp = ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.22 : 0.05));
    src.connect(hp).connect(g).connect(beatGain);
    src.start(t);
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
