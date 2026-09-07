// FASE 10 — AudioManager: síntesis de música y efectos con Web Audio API.
// Todo el audio se genera en código (sin assets externos): licencia del
// proyecto. Un único punto de acceso para que ningún componente reproduzca
// sonidos sueltos.

import { loadSettings } from "../config/settings";

export type SfxName =
  | "hitLight"
  | "hitHeavy"
  | "kick"
  | "grab"
  | "block"
  | "dodge"
  | "jump"
  | "land"
  | "ko"
  | "throw"
  | "pickup"
  | "menu"
  | "menuConfirm"
  | "victory"
  | "defeat"
  | "ringout";

interface MusicPattern {
  bpm: number;
  root: number;
  scale: number[];
  bassSteps: number[];
  momentum: number;
  hatOpen: boolean;
}

const MUSIC: Record<string, MusicPattern> = {
  neon: {
    bpm: 112,
    root: 45,
    scale: [0, 3, 5, 7, 10, 12],
    bassSteps: [0, 0, 7, 0, 3, 3, 10, 8],
    momentum: 0.9,
    hatOpen: true,
  },
  iron: {
    bpm: 112,
    root: 40,
    scale: [0, 2, 3, 7, 10, 12],
    bassSteps: [0, 0, 7, 0, 3, 3, 10, 8],
    momentum: 0.95,
    hatOpen: false,
  },
  docks: {
    bpm: 92,
    root: 43,
    scale: [0, 2, 5, 7, 8, 12],
    bassSteps: [0, 0, 0, 7, 0, 0, 8, 5],
    momentum: 0.55,
    hatOpen: true,
  },
};

type Ctx = AudioContext;

export class AudioManager {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private detuneNoise: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private ambientTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private currentStage: string | null = null;
  private crowdGain: GainNode | null = null;
  private paused = false;
  /** si el navegador pausa el contexto (tab de fondo), nos adaptamos */
  private lastScheduleAt = 0;

  private static instance: AudioManager | null = null;

  static get() {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  /** Llamar tras un gesto del usuario (botón de menú, etc.). */
  ensureInit(): AudioManager {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctx }).webkitAudioContext;
    if (this.ctx || !Ctor) return this;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.ambienceBus = ctx.createGain();
    this.ambienceBus.connect(this.master);

    // Buffer de ruido blanco reutilizable.
    const bin = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bin, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bin; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    const dbuf = ctx.createBuffer(1, bin, ctx.sampleRate);
    const ddata = dbuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bin; i++) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
      ddata[i] = last * 4;
    }
    this.detuneNoise = dbuf;

    this.applyVolumes();
    if (ctx.state === "suspended") void ctx.resume();
    return this;
  }

  private applyVolumes() {
    const s = loadSettings();
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Math.max(0, s.masterVolume), t, 0.05);
    this.musicBus.gain.setTargetAtTime(
      Math.max(0, s.musicVolume) * (this.paused ? 0.25 : 1),
      t,
      0.1,
    );
    this.sfxBus.gain.setTargetAtTime(Math.max(0, s.sfxVolume), t, 0.05);
  }

  /** Reaplica volúmenes tras cambiarlos en opciones. */
  refresh() {
    this.applyVolumes();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (this.ctx) {
      const target = paused ? 0.25 : 1;
      this.musicBus?.gain.setTargetAtTime(
        Math.max(0, loadSettings().musicVolume) * target,
        this.ctx.currentTime,
        0.2,
      );
      if (this.ambienceBus) {
        this.ambienceBus.gain.setTargetAtTime(
          paused ? 0 : Math.max(0, loadSettings().sfxVolume) * 0.16,
          this.ctx.currentTime,
          0.3,
        );
      }
    }
  }

  dispose() {
    this.stopMusic(true);
    this.stopAmbience();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.ambienceBus = null;
  }

  // ---------- SFX ----------

  private env(gainValue: number, attack: number, decay: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gainValue, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.sfxBus!);
    return g;
  }

  /** Fuente de ruido con filtro y envolvente. */
  private noiseHit(
    type: BiquadFilterType,
    freq: number,
    q: number,
    gain: number,
    attack: number,
    decay: number,
    buffer: AudioBuffer | null = null,
  ) {
    if (!this.ctx || !this.noise || !this.sfxBus) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer ?? this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.env(gain, attack, decay);
    src.connect(filt).connect(g);
    src.start();
    src.stop(ctx.currentTime + attack + decay + 0.02);
  }

  private tone(
    type: OscillatorType,
    freq: number,
    fEnd: number | null,
    gain: number,
    attack: number,
    decay: number,
    bus: AudioNode | null = null,
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = bus ?? this.sfxBus!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (fEnd != null)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, fEnd),
        ctx.currentTime + attack + decay,
      );
    const g = this.env(gain, attack, decay);
    osc.connect(g).connect(out);
    osc.start();
    osc.stop(ctx.currentTime + attack + decay + 0.02);
  }

  playSfx(name: SfxName) {
    if (!this.ctx || !this.sfxBus) return;
    switch (name) {
      case "hitLight":
        this.noiseHit("lowpass", 2200, 0.8, 0.5, 0.001, 0.09);
        this.tone("square", 190, 120, 0.16, 0.001, 0.06);
        break;
      case "hitHeavy":
        this.noiseHit("lowpass", 900, 1.2, 0.7, 0.001, 0.16);
        this.tone("sine", 150, 55, 0.55, 0.002, 0.2);
        this.tone("square", 90, 40, 0.25, 0.002, 0.18);
        break;
      case "kick":
        this.noiseHit("bandpass", 500, 0.6, 0.5, 0.001, 0.12);
        this.tone("sine", 120, 60, 0.5, 0.002, 0.16);
        break;
      case "grab":
        this.tone("sawtooth", 320, 160, 0.2, 0.001, 0.12);
        this.noiseHit("highpass", 600, 0.5, 0.3, 0.001, 0.2);
        break;
      case "block":
        this.tone("triangle", 880, 640, 0.35, 0.001, 0.12);
        this.tone("triangle", 1320, 900, 0.18, 0.001, 0.1);
        this.noiseHit("bandpass", 3400, 6, 0.22, 0.001, 0.08);
        break;
      case "dodge":
        this.noiseHit("bandpass", 500, 3, 0.35, 0.03, 0.16, this.detuneNoise);
        break;
      case "jump":
        this.tone("sine", 240, 480, 0.16, 0.01, 0.16);
        break;
      case "land":
        this.tone("sine", 130, 70, 0.22, 0.004, 0.1);
        break;
      case "ko":
        this.noiseHit("lowpass", 700, 1.2, 0.9, 0.001, 0.5);
        this.tone("sine", 100, 30, 0.7, 0.002, 0.6);
        this.tone("sawtooth", 55, 25, 0.3, 0.002, 0.5);
        break;
      case "throw":
        this.noiseHit("bandpass", 900, 1.5, 0.4, 0.02, 0.2);
        break;
      case "pickup":
        this.tone("square", 520, 660, 0.14, 0.002, 0.07);
        this.tone("square", 780, 990, 0.12, 0.01, 0.08);
        break;
      case "menu":
        this.tone("square", 620, 620, 0.12, 0.002, 0.05);
        break;
      case "menuConfirm":
        this.tone("square", 520, 520, 0.12, 0.002, 0.05);
        this.tone("square", 780, 780, 0.12, 0.005, 0.09);
        break;
      case "victory":
        [523, 659, 784, 1046].forEach((f, i) => {
          setTimeout(() => this.tone("square", f, null, 0.14, 0.01, 0.28), i * 120);
        });
        break;
      case "defeat":
        [330, 262, 196].forEach((f, i) => {
          setTimeout(() => this.tone("sawtooth", f, null, 0.12, 0.02, 0.35), i * 180);
        });
        break;
      case "ringout":
        this.noiseHit("lowpass", 400, 1, 0.5, 0.01, 0.8);
        this.tone("sine", 300, 80, 0.3, 0.01, 0.7);
        break;
    }
  }

  // ---------- Ambiente ----------

  /** Público/ambiente del escenario: cruce de camino de lowpass. */
  startAmbience() {
    this.stopAmbience();
    if (!this.ctx || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 420;
    filt.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filt.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(
      Math.max(0, loadSettings().sfxVolume) * 0.16,
      ctx.currentTime + 1.2,
    );
    src.connect(filt).connect(g).connect(this.ambienceBus!);
    src.start();
    lfo.start();
    this.crowdGain = g;
    this.ambientTimer = window.setTimeout(() => {
      if (src && g) {
        try {
          src.stop();
          lfo.stop();
        } catch {
          // ya detenido
        }
      }
    }, 90_000);
  }

  stopAmbience() {
    if (this.ambientTimer != null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.crowdGain = null;
  }

  // ---------- Música procedural ----------

  playMusic(stageId: string) {
    if (!this.ctx) return;
    if (this.currentStage === stageId && this.musicTimer != null) return;
    this.stopMusic(false);
    this.currentStage = stageId;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.lastScheduleAt = performance.now();
    this.musicTimer = window.setInterval(() => this.schedule(), 30);
  }

  stopMusic(full = true) {
    if (this.musicTimer != null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentStage = null;
    if (full) this.panic();
  }

  /** Silencia cualquier nota pendiente. */
  private panic() {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(
      Math.max(0, loadSettings().musicVolume) * (this.paused ? 0.25 : 1),
      t,
      0.02,
    );
  }

  private pattern(stageId: string): MusicPattern {
    return MUSIC[stageId] ?? (MUSIC.neon as MusicPattern);
  }

  private schedule() {
    if (!this.ctx || !this.musicBus) return;
    // Pausa transparente si el contexto se suspendió (pestaña en segundo plano).
    if (this.ctx.state === "suspended") return;
    const pat = this.pattern(this.currentStage ?? "neon");
    const spb = 60 / pat.bpm;
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      this.scheduleStep(pat, spb, this.step);
      this.step++;
      this.nextNoteTime += spb / 4;
    }
  }

  private scheduleStep(pat: MusicPattern, spb: number, step: number) {
    const ctx = this.ctx!;
    const barStep = step % 16;
    const when = this.nextNoteTime;

    const kick = step % 4 === 0 || barStep === 10;
    if (kick) {
      this.note("sine", 120, 45, 0.5, 0.001, 0.14, when, 0.16);
    }

    const snare = barStep === 4 || barStep === 12;
    if (snare) {
      this.noiseNote("highpass", 1600, 0.22, 0.001, 0.12, when, 0.16);
    }

    const hatEvery = pat.hatOpen ? 2 : 1;
    for (let i = 0; i < pat.hatOpen ? 2 : 1; i++) {
      const h = step + i * 0.5;
      if (h % 1 === 0) {
        this.noiseNote(
          "highpass",
          7000,
          0.05 + pat.momentum * 0.03,
          0.001,
          0.05,
          when + i * spb * 0.5,
          0.08,
        );
      }
    }

    // Bajo: octava corta.
    const bassIdx = pat.bassSteps[barStep] ?? 0;
    if (bassIdx !== null && barStep % 2 === 0) {
      const f = pat.root + pat.scale[bassIdx % (pat.scale.length - 2)]!;
      this.note("sawtooth", f, null, 0.14, 0.001, 0.14, when, 0.14);
    }

    // Arpegio: 16ths, con más densidad según momentum.
    if (this.rand(step * 7) < pat.momentum) {
      const notes = [0, 7, 12, 7, 3, 10, 15, 10];
      const n = notes[step % notes.length]!;
      const freq = pat.root + 12 + pat.scale[n % pat.scale.length]!;
      this.note("triangle", freq, null, 0.07, 0.005, 0.18, when, 0.12);
    }
  }

  private rand(seed: number) {
    const x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  private note(
    type: OscillatorType,
    freq: number,
    slideTo: number | null,
    gain: number,
    attack: number,
    decay: number,
    when: number,
    v: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), when + attack + decay);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain * v * (type === "sawtooth" ? 0.7 : 1), when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    osc.connect(g).connect(this.musicBus);
    osc.start(when);
    osc.stop(when + attack + decay + 0.02);
  }

  private noiseNote(
    type: BiquadFilterType,
    freq: number,
    gain: number,
    attack: number,
    decay: number,
    when: number,
    v: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.musicBus) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain * v, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    src.connect(filt).connect(g).connect(this.musicBus);
    src.start(when);
    src.stop(when + attack + decay + 0.02);
  }
}

/** Singleton accesible desde cualquier componente. */
export const audio = AudioManager.get();
