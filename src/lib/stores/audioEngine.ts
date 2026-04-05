import type { EqualizerBand } from "./playerEqualizer.svelte";

export class AudioEngine {
  audioContext: AudioContext | null = null;
  sourceNode: MediaElementAudioSourceNode | null = null;
  preAmpGainNode: GainNode | null = null;
  gainNode: GainNode | null = null;
  analyzerNode: AnalyserNode | null = null;
  equalizerNodes: BiquadFilterNode[] = [];

  private equalizerBands: EqualizerBand[] = [];
  private equalizerEnabled: boolean = true;
  private pureBypassEnabled: boolean = false;

  private frequencyDataBuffer: Uint8Array | null = null;

  private lastFrequencyDataTime: number = 0;
  private analyzerThrottleMs: number = 33;

  initialize(
    player: HTMLAudioElement,
    bands: EqualizerBand[],
    eqEnabled: boolean,
    preAmpDb: number,
    pureBypassEnabled: boolean,
    volume: number,
  ) {
    this.equalizerBands = bands;
    this.equalizerEnabled = eqEnabled;
    this.pureBypassEnabled = pureBypassEnabled;

    this.audioContext = new AudioContext({ latencyHint: "playback" });

    this.sourceNode = this.audioContext.createMediaElementSource(player);
    this.preAmpGainNode = this.audioContext.createGain();
    this.gainNode = this.audioContext.createGain();
    this.analyzerNode = this.audioContext.createAnalyser();

    this.analyzerNode.fftSize = 1024;
    this.analyzerNode.smoothingTimeConstant = 0.8;
    this.analyzerNode.minDecibels = -90;
    this.analyzerNode.maxDecibels = -10;

    this.frequencyDataBuffer = new Uint8Array(
      this.analyzerNode.frequencyBinCount,
    );

    this.equalizerNodes = this.equalizerBands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      return filter;
    });

    this.setPreAmpDb(preAmpDb);
    this.gainNode.gain.value = Math.max(0, volume);
    this.reconnectAudioGraph();
  }

  cleanup() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.preAmpGainNode) {
      this.preAmpGainNode.disconnect();
      this.preAmpGainNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.equalizerNodes.length > 0) {
      this.equalizerNodes.forEach((node) => node.disconnect());
      this.equalizerNodes = [];
    }
    if (this.analyzerNode) {
      this.analyzerNode.disconnect();
      this.analyzerNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyDataBuffer = null;
  }

  getFrequencyData(): Uint8Array | null {
    if (
      this.pureBypassEnabled ||
      !this.analyzerNode ||
      !this.frequencyDataBuffer
    ) {
      return null;
    }

    const now = performance.now();
    if (now - this.lastFrequencyDataTime < this.analyzerThrottleMs) {
      return this.frequencyDataBuffer;
    }
    this.lastFrequencyDataTime = now;

    this.analyzerNode.getByteFrequencyData(
      this.frequencyDataBuffer as Uint8Array<ArrayBuffer>,
    );
    return this.frequencyDataBuffer;
  }

  setPreAmpDb(db: number) {
    const clampedDb = Math.max(-30, Math.min(30, db));

    if (this.preAmpGainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      const linearGain = Math.pow(10, clampedDb / 20);

      this.preAmpGainNode.gain.cancelScheduledValues(now);
      this.preAmpGainNode.gain.setValueAtTime(
        this.preAmpGainNode.gain.value,
        now,
      );
      this.preAmpGainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, linearGain),
        now + 0.03,
      );
    }
  }

  setVolume(volume: number) {
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);

      if (volume <= 0) {
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.03);
        return;
      }

      this.gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.03);
    }
  }

  async resumeContext() {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  updateEqualizerBand(
    id: number,
    updates: Partial<EqualizerBand>,
    bands: EqualizerBand[],
  ) {
    this.equalizerBands = bands;
    const bandIndex = bands.findIndex((b) => b.id === id);
    if (bandIndex === -1) return;

    const node = this.equalizerNodes[bandIndex];
    if (node && this.audioContext) {
      const now = this.audioContext.currentTime;
      const rampTime = now + 0.02;

      if (updates.type !== undefined) node.type = updates.type;

      if (updates.frequency !== undefined) {
        node.frequency.cancelScheduledValues(now);
        node.frequency.setValueAtTime(node.frequency.value, now);
        node.frequency.linearRampToValueAtTime(updates.frequency, rampTime);
      }
      if (updates.gain !== undefined) {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(updates.gain, rampTime);
      }
      if (updates.Q !== undefined) {
        node.Q.cancelScheduledValues(now);
        node.Q.setValueAtTime(node.Q.value, now);
        node.Q.linearRampToValueAtTime(updates.Q, rampTime);
      }
    }
  }

  toggleEqualizer(enabled: boolean) {
    this.equalizerEnabled = enabled;
    this.reconnectAudioGraph();
  }

  resetEqualizer() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const rampTime = now + 0.05;
    this.equalizerNodes.forEach((node) => {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(0, rampTime);
    });
  }

  rebuildEqualizer(bands: EqualizerBand[]) {
    if (!this.audioContext) return;

    this.equalizerNodes.forEach((node) => node.disconnect());
    this.equalizerNodes = [];

    this.equalizerBands = bands;

    this.equalizerNodes = bands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      return filter;
    });

    this.reconnectAudioGraph();
  }

  applyEqualizerPreset(
    bands: EqualizerBand[],
    equalizerEnabled: boolean,
    preAmpDb: number,
  ) {
    this.equalizerBands = bands;
    this.equalizerEnabled = equalizerEnabled;

    if (!this.audioContext) {
      return;
    }

    this.equalizerNodes.forEach((node) => node.disconnect());
    this.equalizerNodes = bands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      return filter;
    });

    this.setPreAmpDb(preAmpDb);
    this.reconnectAudioGraph();
  }

  togglePureBypass(enabled: boolean) {
    this.pureBypassEnabled = enabled;
    this.reconnectAudioGraph();
  }

  private reconnectAudioGraph() {
    if (
      !this.sourceNode ||
      !this.preAmpGainNode ||
      !this.gainNode ||
      !this.analyzerNode ||
      !this.audioContext
    ) {
      return;
    }

    try {
      this.sourceNode.disconnect();
    } catch {}
    try {
      this.preAmpGainNode.disconnect();
    } catch {}

    try {
      this.gainNode.disconnect();
    } catch {}
    this.equalizerNodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {}
    });
    try {
      this.analyzerNode.disconnect();
    } catch {}

    if (this.pureBypassEnabled) {
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      return;
    }

    this.sourceNode.connect(this.preAmpGainNode);
    this.preAmpGainNode.connect(this.gainNode);

    let currentNode: AudioNode = this.gainNode;

    if (this.equalizerEnabled && this.equalizerNodes.length > 0) {
      currentNode.connect(this.equalizerNodes[0]);
      for (let i = 0; i < this.equalizerNodes.length - 1; i++) {
        this.equalizerNodes[i].connect(this.equalizerNodes[i + 1]);
      }
      currentNode = this.equalizerNodes[this.equalizerNodes.length - 1];
    }
    currentNode.connect(this.analyzerNode);
    this.analyzerNode.connect(this.audioContext.destination);
  }
}
