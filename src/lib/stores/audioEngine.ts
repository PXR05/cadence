import type { EqualizerBand } from "./player.svelte";

export class AudioEngine {
  audioContext: AudioContext | null = null;
  sourceNode: MediaElementAudioSourceNode | null = null;
  gainNode: GainNode | null = null;
  analyzerNode: AnalyserNode | null = null;
  equalizerNodes: BiquadFilterNode[] = [];
  convolverNode: ConvolverNode | null = null;
  reverbDryGainNode: GainNode | null = null;
  reverbWetGainNode: GainNode | null = null;

  private equalizerBands: EqualizerBand[] = [];
  private equalizerEnabled: boolean = true;
  private reverbEnabled: boolean = false;
  private reverbPreset: string = "Small Hall 1";

  private frequencyDataBuffer: Uint8Array | null = null;
  private timeDomainDataBuffer: Uint8Array | null = null;

  private impulseResponseCache: Map<string, AudioBuffer> = new Map();

  private irGenerationPending: boolean = false;

  initialize(
    player: HTMLAudioElement,
    bands: EqualizerBand[],
    eqEnabled: boolean,
    reverbEnabled: boolean,
    reverbPreset: string,
    volume: number,
  ) {
    this.equalizerBands = bands;
    this.equalizerEnabled = eqEnabled;
    this.reverbEnabled = reverbEnabled;
    this.reverbPreset = reverbPreset;

    this.audioContext = new AudioContext({ latencyHint: "playback" });

    this.sourceNode = this.audioContext.createMediaElementSource(player);
    this.gainNode = this.audioContext.createGain();
    this.analyzerNode = this.audioContext.createAnalyser();

    this.analyzerNode.fftSize = 1024;
    this.analyzerNode.smoothingTimeConstant = 0.8;

    this.frequencyDataBuffer = new Uint8Array(
      this.analyzerNode.frequencyBinCount,
    );
    this.timeDomainDataBuffer = new Uint8Array(
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

    this.convolverNode = this.audioContext.createConvolver();
    this.reverbDryGainNode = this.audioContext.createGain();
    this.reverbWetGainNode = this.audioContext.createGain();
    this.reverbDryGainNode.gain.value = 0.6;
    this.reverbWetGainNode.gain.value = 1.2;

    this.loadImpulseResponse(this.reverbPreset);

    this.sourceNode.connect(this.gainNode);
    this.analyzerNode.connect(this.audioContext.destination);
    this.reconnectAudioGraph();

    this.gainNode.gain.value = volume;
  }

  cleanup() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.equalizerNodes.length > 0) {
      this.equalizerNodes.forEach((node) => node.disconnect());
      this.equalizerNodes = [];
    }
    if (this.convolverNode) {
      this.convolverNode.disconnect();
      this.convolverNode = null;
    }
    if (this.reverbDryGainNode) {
      this.reverbDryGainNode.disconnect();
      this.reverbDryGainNode = null;
    }
    if (this.reverbWetGainNode) {
      this.reverbWetGainNode.disconnect();
      this.reverbWetGainNode = null;
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
    this.timeDomainDataBuffer = null;
    this.impulseResponseCache.clear();
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyzerNode || !this.frequencyDataBuffer) return null;
    this.analyzerNode.getByteFrequencyData(
      this.frequencyDataBuffer as Uint8Array<ArrayBuffer>,
    );
    return this.frequencyDataBuffer;
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyzerNode || !this.timeDomainDataBuffer) return null;
    this.analyzerNode.getByteTimeDomainData(
      this.timeDomainDataBuffer as Uint8Array<ArrayBuffer>,
    );
    return this.timeDomainDataBuffer;
  }

  setAnalyzerFFTSize(
    size: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768,
  ) {
    if (this.analyzerNode) {
      this.analyzerNode.fftSize = size;
      this.frequencyDataBuffer = new Uint8Array(
        this.analyzerNode.frequencyBinCount,
      );
      this.timeDomainDataBuffer = new Uint8Array(
        this.analyzerNode.frequencyBinCount,
      );
    }
  }

  setAnalyzerSmoothing(value: number) {
    if (this.analyzerNode) {
      this.analyzerNode.smoothingTimeConstant = Math.max(0, Math.min(1, value));
    }
  }

  setVolume(volume: number) {
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.setTargetAtTime(volume, now, 0.015);
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
      if (updates.type !== undefined) node.type = updates.type;
      if (updates.frequency !== undefined) {
        node.frequency.cancelScheduledValues(now);
        node.frequency.setValueAtTime(updates.frequency, now);
      }
      if (updates.gain !== undefined) {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(updates.gain, now);
      }
      if (updates.Q !== undefined) {
        node.Q.cancelScheduledValues(now);
        node.Q.setValueAtTime(updates.Q, now);
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
    this.equalizerNodes.forEach((node) => {
      node.gain.setTargetAtTime(0, now, 0.015);
    });
  }

  /**
   * Rebuild the entire equalizer chain with new bands.
   * Used when adding or removing bands.
   */
  rebuildEqualizer(bands: EqualizerBand[]) {
    if (!this.audioContext) return;

    // Disconnect and remove old nodes
    this.equalizerNodes.forEach((node) => node.disconnect());
    this.equalizerNodes = [];

    // Store the new bands configuration
    this.equalizerBands = bands;

    // Create new filter nodes
    this.equalizerNodes = bands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      return filter;
    });

    // Reconnect the audio graph
    this.reconnectAudioGraph();
  }

  toggleReverb(enabled: boolean) {
    this.reverbEnabled = enabled;
    this.reconnectAudioGraph();
  }

  async setReverbPreset(preset: string) {
    this.reverbPreset = preset;
    await this.loadImpulseResponse(preset);
  }

  private async loadImpulseResponse(preset: string) {
    if (!this.audioContext || !this.convolverNode) return;

    const cached = this.impulseResponseCache.get(preset);
    if (cached) {
      this.convolverNode.buffer = cached;
      return;
    }

    if (this.irGenerationPending) return;
    this.irGenerationPending = true;

    try {
      const impulseResponse = await this.generateImpulseResponseAsync(preset);
      this.impulseResponseCache.set(preset, impulseResponse);
      if (this.convolverNode) {
        this.convolverNode.buffer = impulseResponse;
      }
    } finally {
      this.irGenerationPending = false;
    }
  }

  private async generateImpulseResponseAsync(
    preset: string,
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const sampleRate = this.audioContext.sampleRate;
    const params = this.getPresetParams(preset);

    const cappedDuration = Math.min(params.duration, 5);
    const length = Math.floor(sampleRate * cappedDuration);

    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const chunkSize = 8192;
    const totalChunks = Math.ceil(length / chunkSize);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const startIdx = chunk * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, length);

      this.processImpulseChunk(
        left,
        right,
        startIdx,
        endIdx,
        sampleRate,
        params,
      );

      if (chunk < totalChunks - 1) {
        await this.yieldToMainThread();
      }
    }

    return impulse;
  }

  private processImpulseChunk(
    left: Float32Array,
    right: Float32Array,
    startIdx: number,
    endIdx: number,
    sampleRate: number,
    params: ReverbParams,
  ) {
    const { decay, density, modulation, earlyReflections } = params;

    const reflectionSamples = earlyReflections.map((r) => ({
      sample: Math.floor(r.delay * sampleRate),
      gain: r.gain,
    }));

    for (let i = startIdx; i < endIdx; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-decay * t);

      let leftSample = 0;
      let rightSample = 0;

      for (let j = 0; j < reflectionSamples.length; j++) {
        const reflection = reflectionSamples[j];
        if (i === reflection.sample) {
          const sign = j % 2 === 0 ? 1 : -1;
          leftSample += reflection.gain * sign;
          rightSample += reflection.gain * -sign;
        }
      }

      const densityFactor = Math.min(1, t * density * 10);
      const mod = Math.sin(t * modulation * 1000) * 0.3;

      const rand1 = this.fastRandom() * 2 - 1;
      const rand2 = this.fastRandom() * 2 - 1;

      leftSample += rand1 * envelope * densityFactor * (1 + mod);
      rightSample += rand2 * envelope * densityFactor * (1 - mod);

      left[i] = leftSample;
      right[i] = rightSample;
    }
  }

  private randomSeed: number = 1;
  private fastRandom(): number {
    this.randomSeed = (this.randomSeed * 16807) % 2147483647;
    return this.randomSeed / 2147483647;
  }

  private yieldToMainThread(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => resolve(), { timeout: 16 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  private getPresetParams(preset: string): ReverbParams {
    switch (preset) {
      case "Small Hall 1":
        return {
          duration: 2.1,
          decay: 2.5,
          density: 0.5,
          modulation: 0.3,
          earlyReflections: [
            { delay: 0.01, gain: 0.5 },
            { delay: 0.022, gain: 0.45 },
            { delay: 0.035, gain: 0.4 },
            { delay: 0.048, gain: 0.35 },
          ],
        };
      case "Small Hall 2":
        return {
          duration: 2.3,
          decay: 2.8,
          density: 0.5,
          modulation: 0.25,
          earlyReflections: [
            { delay: 0.01, gain: 0.5 },
            { delay: 0.022, gain: 0.45 },
            { delay: 0.035, gain: 0.4 },
            { delay: 0.048, gain: 0.35 },
          ],
        };
      case "Medium Hall 1":
        return {
          duration: 2.8,
          decay: 2.3,
          density: 0.6,
          modulation: 0.25,
          earlyReflections: [
            { delay: 0.01, gain: 0.55 },
            { delay: 0.024, gain: 0.5 },
            { delay: 0.039, gain: 0.45 },
            { delay: 0.055, gain: 0.4 },
            { delay: 0.072, gain: 0.35 },
          ],
        };
      case "Medium Hall 2":
        return {
          duration: 2.9,
          decay: 2.4,
          density: 0.6,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.01, gain: 0.55 },
            { delay: 0.024, gain: 0.5 },
            { delay: 0.039, gain: 0.45 },
            { delay: 0.055, gain: 0.4 },
            { delay: 0.072, gain: 0.35 },
          ],
        };
      case "Large Hall 1":
        return {
          duration: 3.8,
          decay: 1.8,
          density: 0.7,
          modulation: 0.15,
          earlyReflections: [
            { delay: 0.018, gain: 0.6 },
            { delay: 0.036, gain: 0.55 },
            { delay: 0.056, gain: 0.5 },
            { delay: 0.078, gain: 0.45 },
            { delay: 0.102, gain: 0.4 },
            { delay: 0.128, gain: 0.35 },
          ],
        };
      case "Large Hall 2":
        return {
          duration: 4.2,
          decay: 1.7,
          density: 0.7,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.018, gain: 0.6 },
            { delay: 0.036, gain: 0.55 },
            { delay: 0.056, gain: 0.5 },
            { delay: 0.078, gain: 0.45 },
            { delay: 0.102, gain: 0.4 },
            { delay: 0.128, gain: 0.35 },
          ],
        };
      case "Small Room 1":
        return {
          duration: 0.5,
          decay: 5.5,
          density: 0.4,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.005, gain: 0.7 },
            { delay: 0.012, gain: 0.6 },
            { delay: 0.02, gain: 0.5 },
          ],
        };
      case "Small Room 2":
        return {
          duration: 0.5,
          decay: 5.5,
          density: 0.45,
          modulation: 0.3,
          earlyReflections: [
            { delay: 0.005, gain: 0.7 },
            { delay: 0.012, gain: 0.6 },
            { delay: 0.02, gain: 0.5 },
          ],
        };
      case "Medium Room 1":
        return {
          duration: 0.8,
          decay: 4.0,
          density: 0.5,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.008, gain: 0.65 },
            { delay: 0.018, gain: 0.6 },
            { delay: 0.029, gain: 0.5 },
            { delay: 0.042, gain: 0.4 },
          ],
        };
      case "Medium Room 2":
        return {
          duration: 1.2,
          decay: 3.2,
          density: 0.55,
          modulation: 0.3,
          earlyReflections: [
            { delay: 0.016, gain: 0.65 },
            { delay: 0.03, gain: 0.6 },
            { delay: 0.046, gain: 0.5 },
            { delay: 0.064, gain: 0.4 },
          ],
        };
      case "Large Room 1":
        return {
          duration: 1.8,
          decay: 2.6,
          density: 0.65,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.01, gain: 0.7 },
            { delay: 0.025, gain: 0.65 },
            { delay: 0.042, gain: 0.6 },
            { delay: 0.061, gain: 0.5 },
            { delay: 0.082, gain: 0.4 },
          ],
        };
      case "Large Room 2":
        return {
          duration: 1.9,
          decay: 2.5,
          density: 0.65,
          modulation: 0.3,
          earlyReflections: [
            { delay: 0.02, gain: 0.7 },
            { delay: 0.04, gain: 0.65 },
            { delay: 0.062, gain: 0.6 },
            { delay: 0.086, gain: 0.5 },
            { delay: 0.112, gain: 0.4 },
          ],
        };
      case "Plate High":
        return {
          duration: 1.8,
          decay: 2.6,
          density: 0.8,
          modulation: 0.2,
          earlyReflections: [
            { delay: 0.0, gain: 0.8 },
            { delay: 0.003, gain: 0.75 },
            { delay: 0.007, gain: 0.7 },
            { delay: 0.012, gain: 0.6 },
            { delay: 0.018, gain: 0.5 },
          ],
        };
      case "Plate Low":
        return {
          duration: 1.9,
          decay: 2.5,
          density: 0.8,
          modulation: 0.3,
          earlyReflections: [
            { delay: 0.0, gain: 0.8 },
            { delay: 0.003, gain: 0.75 },
            { delay: 0.007, gain: 0.7 },
            { delay: 0.012, gain: 0.6 },
            { delay: 0.018, gain: 0.5 },
          ],
        };
      default:
        return {
          duration: 2.1,
          decay: 2.5,
          density: 0.5,
          modulation: 0.25,
          earlyReflections: [
            { delay: 0.02, gain: 0.6 },
            { delay: 0.038, gain: 0.5 },
            { delay: 0.058, gain: 0.4 },
          ],
        };
    }
  }

  private reconnectAudioGraph() {
    if (!this.gainNode || !this.analyzerNode) return;

    this.gainNode.disconnect();
    this.equalizerNodes.forEach((node) => node.disconnect());
    this.convolverNode?.disconnect();
    this.reverbDryGainNode?.disconnect();
    this.reverbWetGainNode?.disconnect();

    let currentNode: AudioNode = this.gainNode;

    if (this.equalizerEnabled && this.equalizerNodes.length > 0) {
      currentNode.connect(this.equalizerNodes[0]);
      for (let i = 0; i < this.equalizerNodes.length - 1; i++) {
        this.equalizerNodes[i].connect(this.equalizerNodes[i + 1]);
      }
      currentNode = this.equalizerNodes[this.equalizerNodes.length - 1];
    }

    if (
      this.reverbEnabled &&
      this.convolverNode &&
      this.reverbDryGainNode &&
      this.reverbWetGainNode
    ) {
      currentNode.connect(this.reverbDryGainNode);
      currentNode.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbWetGainNode);
      this.reverbDryGainNode.connect(this.analyzerNode);
      this.reverbWetGainNode.connect(this.analyzerNode);
      return;
    }

    currentNode.connect(this.analyzerNode);
  }
}

interface ReverbParams {
  duration: number;
  decay: number;
  density: number;
  modulation: number;
  earlyReflections: { delay: number; gain: number }[];
}
