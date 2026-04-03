<script lang="ts">
  import { onMount } from "svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { playerStore } from "$lib/stores/player.svelte";

  let canvasRef: HTMLCanvasElement;
  let isDragging = false;
  let draggedBandId: number | null = null;
  let animationFrameId: number;

  const WIDTH = $derived.by(() => {
    const windowWidth = innerWidth.current ?? 0;
    return windowWidth < 768 ? windowWidth - 16 : windowWidth - 256;
  });
  const HEIGHT = $derived(400);
  const PADDING = { top: 40, right: 40, bottom: 40, left: 50 };
  const GRAPH_WIDTH = $derived(WIDTH - PADDING.left - PADDING.right);
  const GRAPH_HEIGHT = $derived(HEIGHT - PADDING.top - PADDING.bottom);

  const MIN_FREQ = 20;
  const MAX_FREQ = 20000;
  const MIN_GAIN = -20;
  const MAX_GAIN = 20;
  const MIN_Q = 0.1;
  const MAX_Q = 10;

  function freqToX(freq: number): number {
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);
    const logFreq = Math.log10(freq);
    return (
      PADDING.left + ((logFreq - logMin) / (logMax - logMin)) * GRAPH_WIDTH
    );
  }

  function xToFreq(x: number): number {
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);
    const ratio = (x - PADDING.left) / GRAPH_WIDTH;
    return Math.pow(10, logMin + ratio * (logMax - logMin));
  }

  function gainToY(gain: number): number {
    return (
      PADDING.top + ((MAX_GAIN - gain) / (MAX_GAIN - MIN_GAIN)) * GRAPH_HEIGHT
    );
  }

  function yToGain(y: number): number {
    return (
      MAX_GAIN - ((y - PADDING.top) / GRAPH_HEIGHT) * (MAX_GAIN - MIN_GAIN)
    );
  }

  function computeBiquadResponse(
    band: (typeof playerStore.equalizerBands)[0],
    frequencies: Float32Array,
    sampleRate: number = 44100,
  ): Float32Array {
    const response = new Float32Array(frequencies.length);
    const { frequency: f0, gain, Q, type } = band;

    const A = Math.pow(10, gain / 40);
    const omega0 = (2 * Math.PI * f0) / sampleRate;
    const sinOmega = Math.sin(omega0);
    const cosOmega = Math.cos(omega0);
    const alpha = sinOmega / (2 * Q);

    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

    switch (type) {
      case "lowpass":
        b0 = (1 - cosOmega) / 2;
        b1 = 1 - cosOmega;
        b2 = (1 - cosOmega) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
      case "highpass":
        b0 = (1 + cosOmega) / 2;
        b1 = -(1 + cosOmega);
        b2 = (1 + cosOmega) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
      case "bandpass":
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
      case "notch":
        b0 = 1;
        b1 = -2 * cosOmega;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
      case "allpass":
        b0 = 1 - alpha;
        b1 = -2 * cosOmega;
        b2 = 1 + alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosOmega;
        a2 = 1 - alpha;
        break;
      case "peaking": {
        const alphaA = sinOmega / (2 * Q);
        b0 = 1 + alphaA * A;
        b1 = -2 * cosOmega;
        b2 = 1 - alphaA * A;
        a0 = 1 + alphaA / A;
        a1 = -2 * cosOmega;
        a2 = 1 - alphaA / A;
        break;
      }
      case "lowshelf": {
        const sqrtA = Math.sqrt(A);
        const alphaShelf =
          (sinOmega / 2) * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2);
        b0 = A * (A + 1 - (A - 1) * cosOmega + 2 * sqrtA * alphaShelf);
        b1 = 2 * A * (A - 1 - (A + 1) * cosOmega);
        b2 = A * (A + 1 - (A - 1) * cosOmega - 2 * sqrtA * alphaShelf);
        a0 = A + 1 + (A - 1) * cosOmega + 2 * sqrtA * alphaShelf;
        a1 = -2 * (A - 1 + (A + 1) * cosOmega);
        a2 = A + 1 + (A - 1) * cosOmega - 2 * sqrtA * alphaShelf;
        break;
      }
      case "highshelf": {
        const sqrtA = Math.sqrt(A);
        const alphaShelf =
          (sinOmega / 2) * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2);
        b0 = A * (A + 1 + (A - 1) * cosOmega + 2 * sqrtA * alphaShelf);
        b1 = -2 * A * (A - 1 + (A + 1) * cosOmega);
        b2 = A * (A + 1 + (A - 1) * cosOmega - 2 * sqrtA * alphaShelf);
        a0 = A + 1 - (A - 1) * cosOmega + 2 * sqrtA * alphaShelf;
        a1 = 2 * (A - 1 - (A + 1) * cosOmega);
        a2 = A + 1 - (A - 1) * cosOmega - 2 * sqrtA * alphaShelf;
        break;
      }
      default:
        response.fill(1);
        return response;
    }

    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    for (let i = 0; i < frequencies.length; i++) {
      const omega = (2 * Math.PI * frequencies[i]) / sampleRate;
      const cosW = Math.cos(omega);
      const cos2W = Math.cos(2 * omega);
      const sinW = Math.sin(omega);
      const sin2W = Math.sin(2 * omega);

      const numReal = b0 + b1 * cosW + b2 * cos2W;
      const numImag = -(b1 * sinW + b2 * sin2W);
      const denReal = 1 + a1 * cosW + a2 * cos2W;
      const denImag = -(a1 * sinW + a2 * sin2W);

      const denMagSq = denReal * denReal + denImag * denImag;
      const realPart = (numReal * denReal + numImag * denImag) / denMagSq;
      const imagPart = (numImag * denReal - numReal * denImag) / denMagSq;

      response[i] = Math.sqrt(realPart * realPart + imagPart * imagPart);
    }

    return response;
  }

  function getFrequencyResponse(frequencies: Float32Array): Float32Array {
    const response = new Float32Array(frequencies.length);
    response.fill(1);

    if (!playerStore.equalizerEnabled) return response;

    const sampleRate = playerStore.audioContext?.sampleRate ?? 44100;

    playerStore.equalizerBands.forEach((band) => {
      if (!band.enabled) return;

      const bandResponse = computeBiquadResponse(band, frequencies, sampleRate);

      for (let i = 0; i < frequencies.length; i++) {
        response[i] *= bandResponse[i];
      }
    });

    return response;
  }

  function cssVar(name: string, alpha?: number) {
    let value = getComputedStyle(document.body).getPropertyValue(name).trim();
    if (alpha !== undefined && value.startsWith("oklch")) {
      value = value.replace(/\)$/, ` / ${alpha})`);
    }
    return value;
  }

  function drawEqualizer() {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasRef.width = WIDTH * dpr;
    canvasRef.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const COLOR_BG = cssVar("--card");
    const COLOR_GRID = cssVar("--muted");
    const COLOR_GRID_STRONG = cssVar("--muted-foreground");
    const COLOR_CURVE = cssVar("--primary");
    const COLOR_BAND_ACTIVE = cssVar("--primary");
    const COLOR_BAND_DISABLED = cssVar("--muted-foreground");
    const COLOR_TEXT = cssVar("--foreground");
    const COLOR_TEXT_ALT = cssVar("--background");
    const COLOR_SPECTRUM = cssVar("--primary", 0.2);
    const COLOR_HANDLE_STROKE = cssVar("--primary-foreground");

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;

    const freqLines = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqLines.forEach((freq) => {
      const x = freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, HEIGHT - PADDING.bottom);
      ctx.stroke();
      ctx.fillStyle = COLOR_GRID_STRONG;
      ctx.font = "10px Satoshi, sans-serif";
      ctx.textAlign = "center";
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillText(label, x, HEIGHT - PADDING.bottom + 20);
    });

    const gainLines = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    gainLines.forEach((gain) => {
      const y = gainToY(gain);
      ctx.strokeStyle = gain === 0 ? COLOR_GRID_STRONG : COLOR_GRID;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(WIDTH - PADDING.right, y);
      ctx.stroke();
      ctx.fillStyle = COLOR_GRID_STRONG;
      ctx.font = "10px Satoshi, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${gain > 0 ? "+" : ""}${gain}dB`, PADDING.left - 10, y + 4);
    });

    const numPoints = 500;
    const frequencies = new Float32Array(numPoints);
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);

    for (let i = 0; i < numPoints; i++) {
      const logFreq = logMin + (i / (numPoints - 1)) * (logMax - logMin);
      frequencies[i] = Math.pow(10, logFreq);
    }

    const response = getFrequencyResponse(frequencies);

    ctx.strokeStyle = COLOR_CURVE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const x = freqToX(frequencies[i]);
      const gainDb = 20 * Math.log10(response[i]);
      const y = gainToY(gainDb);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (playerStore.isPlaying) {
      const frequencyData = playerStore.getFrequencyData();
      if (frequencyData) {
        ctx.fillStyle = COLOR_SPECTRUM;
        const sampleRate = playerStore.audioContext?.sampleRate || 44100;
        const binCount = frequencyData.length;
        for (let i = 0; i < binCount; i++) {
          const freq = (i * sampleRate) / (binCount * 2);
          if (freq < MIN_FREQ || freq > MAX_FREQ) continue;
          const x = freqToX(freq);
          const amplitude = frequencyData[i] / 255;
          const barHeight = amplitude * GRAPH_HEIGHT * 0.8;
          ctx.fillRect(
            x - 1,
            HEIGHT - PADDING.bottom - barHeight,
            2,
            barHeight,
          );
        }
      }
    }

    playerStore.equalizerBands.forEach((band) => {
      const x = freqToX(band.frequency);
      const y = gainToY(band.gain);
      const isDisabled = !band.enabled;
      const isDraggedBand = draggedBandId === band.id;
      const handleRadius = 10;

      ctx.fillStyle = isDisabled ? COLOR_BAND_DISABLED : COLOR_TEXT;
      ctx.beginPath();
      ctx.arc(x, y, handleRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDisabled
        ? COLOR_BAND_DISABLED
        : isDraggedBand
          ? COLOR_TEXT
          : COLOR_BAND_ACTIVE;
      ctx.strokeStyle = COLOR_HANDLE_STROKE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDisabled ? COLOR_TEXT : COLOR_TEXT_ALT;
      ctx.font = "bold 11px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${band.id + 1}`, x, y);

      ctx.fillStyle = isDisabled ? COLOR_BAND_DISABLED : COLOR_TEXT;
      ctx.font = "11px Satoshi, sans-serif";
      const freqLabel =
        band.frequency >= 1000
          ? `${(band.frequency / 1000).toFixed(1)}kHz`
          : `${band.frequency.toFixed(0)}Hz`;
      const gainLabel = `${band.gain > 0 ? "+" : ""}${band.gain.toFixed(1)}dB`;
      ctx.fillText(freqLabel, x, y - handleRadius - 12);
      ctx.fillText(gainLabel, x, y + handleRadius + 16);
    });

    animationFrameId = requestAnimationFrame(drawEqualizer);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const band of playerStore.equalizerBands) {
      if (!band.enabled) continue;
      const bandX = freqToX(band.frequency);
      const bandY = gainToY(band.gain);
      const distance = Math.sqrt(
        Math.pow(x - bandX, 2) + Math.pow(y - bandY, 2),
      );

      if (distance < 15) {
        isDragging = true;
        draggedBandId = band.id;
        break;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || draggedBandId === null) return;

    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const freq = Math.max(MIN_FREQ, Math.min(MAX_FREQ, xToFreq(x)));
    const gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, yToGain(y)));

    playerStore.updateEqualizerBand(draggedBandId, {
      frequency: Math.round(freq),
      gain: Math.round(gain * 10) / 10,
    });
  }

  function handleMouseWheel(e: WheelEvent) {
    if (!isDragging || draggedBandId === null) return;

    e.preventDefault();

    const Q = playerStore.equalizerBands[draggedBandId].Q;

    playerStore.updateEqualizerBand(draggedBandId, {
      Q: Math.max(MIN_Q, Math.min(MAX_Q, e.deltaY > 0 ? Q - 0.1 : Q + 0.1)),
    });
  }

  function handleMouseUp() {
    isDragging = false;
    draggedBandId = null;
  }

  onMount(() => {
    drawEqualizer();

    window.addEventListener("wheel", handleMouseWheel, { passive: false });

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("wheel", handleMouseWheel);
    };
  });
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<canvas
  bind:this={canvasRef}
  onmousedown={handleMouseDown}
  class="border rounded-lg cursor-crosshair"
  style="width: {WIDTH}px; height: {HEIGHT}px; max-width: 100%;"
></canvas>
