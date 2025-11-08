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

  initialize(
    player: HTMLAudioElement,
    bands: EqualizerBand[],
    eqEnabled: boolean,
    reverbEnabled: boolean,
    reverbPreset: string,
    volume: number
  ) {
    this.equalizerBands = bands;
    this.equalizerEnabled = eqEnabled;
    this.reverbEnabled = reverbEnabled;
    this.reverbPreset = reverbPreset;

    this.audioContext = new AudioContext();

    this.sourceNode = this.audioContext.createMediaElementSource(player);
    this.gainNode = this.audioContext.createGain();
    this.analyzerNode = this.audioContext.createAnalyser();

    this.analyzerNode.fftSize = 2048;
    this.analyzerNode.smoothingTimeConstant = 0.8;

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
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyzerNode) return null;
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyzerNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyzerNode) return null;
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyzerNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  setAnalyzerFFTSize(
    size: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768
  ) {
    if (this.analyzerNode) {
      this.analyzerNode.fftSize = size;
    }
  }

  setAnalyzerSmoothing(value: number) {
    if (this.analyzerNode) {
      this.analyzerNode.smoothingTimeConstant = Math.max(0, Math.min(1, value));
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
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
    bands: EqualizerBand[]
  ) {
    this.equalizerBands = bands;
    const bandIndex = bands.findIndex((b) => b.id === id);
    if (bandIndex === -1) return;

    const node = this.equalizerNodes[bandIndex];
    if (node) {
      if (updates.type !== undefined) node.type = updates.type;
      if (updates.frequency !== undefined)
        node.frequency.value = updates.frequency;
      if (updates.gain !== undefined) node.gain.value = updates.gain;
      if (updates.Q !== undefined) node.Q.value = updates.Q;
    }
  }

  toggleEqualizer(enabled: boolean) {
    this.equalizerEnabled = enabled;
    this.reconnectAudioGraph();
  }

  resetEqualizer() {
    this.equalizerNodes.forEach((node) => {
      node.gain.value = 0;
    });
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

    const impulseResponse = await this.generateImpulseResponse(preset);
    this.convolverNode.buffer = impulseResponse;
  }

  private async generateImpulseResponse(preset: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const sampleRate = this.audioContext.sampleRate;
    let duration: number;
    let decay: number;
    let earlyReflections: { delay: number; gain: number }[];
    let density: number;
    let modulation: number;

    switch (preset) {
      case "Small Hall 1":
        duration = 2.1;
        decay = 2.5;
        density = 0.5;
        modulation = 0.3;
        earlyReflections = [
          { delay: 0.01, gain: 0.5 },
          { delay: 0.022, gain: 0.45 },
          { delay: 0.035, gain: 0.4 },
          { delay: 0.048, gain: 0.35 },
        ];
        break;
      case "Small Hall 2":
        duration = 2.3;
        decay = 2.8;
        density = 0.5;
        modulation = 0.25;
        earlyReflections = [
          { delay: 0.01, gain: 0.5 },
          { delay: 0.022, gain: 0.45 },
          { delay: 0.035, gain: 0.4 },
          { delay: 0.048, gain: 0.35 },
        ];
        break;
      case "Medium Hall 1":
        duration = 2.8;
        decay = 2.3;
        density = 0.6;
        modulation = 0.25;
        earlyReflections = [
          { delay: 0.01, gain: 0.55 },
          { delay: 0.024, gain: 0.5 },
          { delay: 0.039, gain: 0.45 },
          { delay: 0.055, gain: 0.4 },
          { delay: 0.072, gain: 0.35 },
        ];
        break;
      case "Medium Hall 2":
        duration = 2.9;
        decay = 2.4;
        density = 0.6;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.01, gain: 0.55 },
          { delay: 0.024, gain: 0.5 },
          { delay: 0.039, gain: 0.45 },
          { delay: 0.055, gain: 0.4 },
          { delay: 0.072, gain: 0.35 },
        ];
        break;
      case "Large Hall 1":
        duration = 3.8;
        decay = 1.8;
        density = 0.7;
        modulation = 0.15;
        earlyReflections = [
          { delay: 0.018, gain: 0.6 },
          { delay: 0.036, gain: 0.55 },
          { delay: 0.056, gain: 0.5 },
          { delay: 0.078, gain: 0.45 },
          { delay: 0.102, gain: 0.4 },
          { delay: 0.128, gain: 0.35 },
        ];
        break;
      case "Large Hall 2":
        duration = 4.2;
        decay = 1.7;
        density = 0.7;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.018, gain: 0.6 },
          { delay: 0.036, gain: 0.55 },
          { delay: 0.056, gain: 0.5 },
          { delay: 0.078, gain: 0.45 },
          { delay: 0.102, gain: 0.4 },
          { delay: 0.128, gain: 0.35 },
        ];
        break;
      case "Small Room 1":
        duration = 0.5;
        decay = 5.5;
        density = 0.4;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.005, gain: 0.7 },
          { delay: 0.012, gain: 0.6 },
          { delay: 0.02, gain: 0.5 },
        ];
        break;
      case "Small Room 2":
        duration = 0.5;
        decay = 5.5;
        density = 0.45;
        modulation = 0.3;
        earlyReflections = [
          { delay: 0.005, gain: 0.7 },
          { delay: 0.012, gain: 0.6 },
          { delay: 0.02, gain: 0.5 },
        ];
        break;
      case "Medium Room 1":
        duration = 0.8;
        decay = 4.0;
        density = 0.5;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.008, gain: 0.65 },
          { delay: 0.018, gain: 0.6 },
          { delay: 0.029, gain: 0.5 },
          { delay: 0.042, gain: 0.4 },
        ];
        break;
      case "Medium Room 2":
        duration = 1.2;
        decay = 3.2;
        density = 0.55;
        modulation = 0.3;
        earlyReflections = [
          { delay: 0.016, gain: 0.65 },
          { delay: 0.03, gain: 0.6 },
          { delay: 0.046, gain: 0.5 },
          { delay: 0.064, gain: 0.4 },
        ];
        break;
      case "Large Room 1":
        duration = 1.8;
        decay = 2.6;
        density = 0.65;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.01, gain: 0.7 },
          { delay: 0.025, gain: 0.65 },
          { delay: 0.042, gain: 0.6 },
          { delay: 0.061, gain: 0.5 },
          { delay: 0.082, gain: 0.4 },
        ];
        break;
      case "Large Room 2":
        duration = 1.9;
        decay = 2.5;
        density = 0.65;
        modulation = 0.3;
        earlyReflections = [
          { delay: 0.02, gain: 0.7 },
          { delay: 0.04, gain: 0.65 },
          { delay: 0.062, gain: 0.6 },
          { delay: 0.086, gain: 0.5 },
          { delay: 0.112, gain: 0.4 },
        ];
        break;
      case "Plate High":
        duration = 1.8;
        decay = 2.6;
        density = 0.8;
        modulation = 0.2;
        earlyReflections = [
          { delay: 0.0, gain: 0.8 },
          { delay: 0.003, gain: 0.75 },
          { delay: 0.007, gain: 0.7 },
          { delay: 0.012, gain: 0.6 },
          { delay: 0.018, gain: 0.5 },
        ];
        break;
      case "Plate Low":
        duration = 1.9;
        decay = 2.5;
        density = 0.8;
        modulation = 0.3;
        earlyReflections = [
          { delay: 0.0, gain: 0.8 },
          { delay: 0.003, gain: 0.75 },
          { delay: 0.007, gain: 0.7 },
          { delay: 0.012, gain: 0.6 },
          { delay: 0.018, gain: 0.5 },
        ];
        break;
      case "Long Reverb 1":
        duration = 12.0;
        decay = 0.6;
        density = 0.9;
        modulation = 0.35;
        earlyReflections = [
          { delay: 0.0, gain: 0.4 },
          { delay: 0.015, gain: 0.38 },
          { delay: 0.032, gain: 0.36 },
          { delay: 0.051, gain: 0.34 },
        ];
        break;
      case "Long Reverb 2":
        duration = 30.0;
        decay = 0.25;
        density = 0.95;
        modulation = 0.4;
        earlyReflections = [
          { delay: 0.0, gain: 0.35 },
          { delay: 0.02, gain: 0.33 },
          { delay: 0.042, gain: 0.31 },
          { delay: 0.066, gain: 0.29 },
        ];
        break;
      default:
        duration = 2.1;
        decay = 2.5;
        density = 0.5;
        modulation = 0.25;
        earlyReflections = [
          { delay: 0.02, gain: 0.6 },
          { delay: 0.038, gain: 0.5 },
          { delay: 0.058, gain: 0.4 },
        ];
    }

    const length = Math.floor(sampleRate * duration);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-decay * t);

      let leftSample = 0;
      let rightSample = 0;

      earlyReflections.forEach((reflection, idx) => {
        const reflectionSample = Math.floor(reflection.delay * sampleRate);
        if (i === reflectionSample) {
          leftSample += reflection.gain * (idx % 2 === 0 ? 1 : -1);
          rightSample += reflection.gain * (idx % 2 === 0 ? -1 : 1);
        }
      });

      const densityFactor = Math.min(1, t * density * 10);
      const mod = Math.sin(t * modulation * 1000) * 0.3;

      leftSample +=
        (Math.random() * 2 - 1) * envelope * densityFactor * (1 + mod);
      rightSample +=
        (Math.random() * 2 - 1) * envelope * densityFactor * (1 - mod);

      left[i] = leftSample;
      right[i] = rightSample;
    }

    return impulse;
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
