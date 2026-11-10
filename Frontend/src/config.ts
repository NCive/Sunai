/**
 * Sunai Frontend Configuration
 * Single source of truth for all tunable constants in the Frontend.
 * Rule: No magic numbers in code.
 */

export interface SphereConfig {
  dotCount: number;
  rowCount: number;
  sphereRadius: number;
  ringRadius: number;
  ringThickness: number;
  ringBumpIntensity: number;
  decisionRingRadius: number;
  decisionRingThickness: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  baseRotationSpeed: number;
  stateBlendDurationMs: number;
  spectrumSmoothing: number;
  lowPowerDotCount: number;
  decisionFillDurationMs: number;
  decisionRingColors: {
    noise: string;
    small_sound: string;
    go_on: string;
    interruption: string;
    unclear: string;
  };
}

export interface AudioCaptureConfig {
  sampleRate: number;
  channelCount: number;
  chunkDurationMs: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  highPassFilterHz: number;
  noiseGatingEnabled: boolean;
  noiseGatePreRollMs: number;
  noiseGateHangoverMs: number;
  analyserFftSize: number;
  analyserSmoothing: number;
}

export interface VadConfig {
  useNeuralVad: boolean;
  vadModelPath: string;
  vadWasmPath: string;
  vadWorkletPath: string;
  energyThreshold: number;
  energyThresholdSpeaking: number;
  speakingSpeechProbThreshold: number;
  listeningSpeechProbThreshold: number;
  speakingMinDurationMs: number;
  listeningMinDurationMs: number;
  duckVolume: number;
  duckRampMs: number;
  minSpikeDurationMs: number;
  speechBandLowHz: number;
  speechBandHighHz: number;
  adaptiveNoiseAlpha: number;
  speechHoldMs: number;
  minSpeechDurationMs: number;
  checkIntervalMs: number;
  calibratedNoiseFloor: number;
}

export interface PlayQueueConfig {
  fadeOutTimeSec: number;
  fadeInTimeSec: number;
  analyserFftSize: number;
  analyserSmoothing: number;
}

export interface LayoutConfig {
  headerHeightPx: number;
  sidebarWidthPx: number;
  sidebarMinWidthPx: number;
  sidebarMaxWidthPx: number;
  timelineHeightPx: number;
  timelineCollapsedHeightPx: number;
  breakpointMobileWidthPx: number;
  breakpointAutoCollapseHeightPx: number;
}

export interface FrontendConfig {
  sphere: SphereConfig;
  audioCapture: AudioCaptureConfig;
  vad: VadConfig;
  playQueue: PlayQueueConfig;
  layout: LayoutConfig;
  lowPower: boolean;
  reduceMotion: boolean;
}

export const CONFIG: FrontendConfig = {
  layout: {
    headerHeightPx: 56,
    sidebarWidthPx: 380,
    sidebarMinWidthPx: 340,
    sidebarMaxWidthPx: 420,
    timelineHeightPx: 120,
    timelineCollapsedHeightPx: 34,
    breakpointMobileWidthPx: 900,
    breakpointAutoCollapseHeightPx: 600,
  },
  sphere: {
    dotCount: 6000,
    rowCount: 48,
    sphereRadius: 2.2,
    ringRadius: 3.0,
    ringThickness: 0.05,
    ringBumpIntensity: 0.35,
    decisionRingRadius: 2.82,
    decisionRingThickness: 0.025,
    bloomStrength: 1.4,
    bloomRadius: 0.5,
    bloomThreshold: 0.2,
    baseRotationSpeed: 0.0035,
    stateBlendDurationMs: 200,
    spectrumSmoothing: 0.75,
    lowPowerDotCount: 2000,
    decisionFillDurationMs: 400,
    decisionRingColors: {
      noise: '#22c55e',       // Green (resume)
      small_sound: '#22c55e', // Green (resume)
      go_on: '#22c55e',       // Green (resume)
      interruption: '#ef4444',// Red (stop)
      unclear: '#f59e0b',     // Amber ("ji?")
    },
  },
  audioCapture: {
    sampleRate: 16000,
    channelCount: 1,
    chunkDurationMs: 100,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false, // Default off to prevent boosting background noise
    highPassFilterHz: 100,
    noiseGatingEnabled: true,
    noiseGatePreRollMs: 300,
    noiseGateHangoverMs: 400,
    analyserFftSize: 256,
    analyserSmoothing: 0.8,
  },
  vad: {
    useNeuralVad: true,
    vadModelPath: '/vad/silero_vad_v5.onnx',
    vadWasmPath: '/vad/',
    vadWorkletPath: '/vad/vad.worklet.bundle.min.js',
    energyThreshold: 0.018,
    energyThresholdSpeaking: 0.035,
    speakingSpeechProbThreshold: 0.65,
    listeningSpeechProbThreshold: 0.45,
    speakingMinDurationMs: 200,
    listeningMinDurationMs: 80,
    duckVolume: 0.25,
    duckRampMs: 40,
    minSpikeDurationMs: 120,
    speechBandLowHz: 300,
    speechBandHighHz: 3400,
    adaptiveNoiseAlpha: 0.05,
    speechHoldMs: 350,
    minSpeechDurationMs: 80,
    checkIntervalMs: 20,
    calibratedNoiseFloor: 0.005,
  },
  playQueue: {
    fadeOutTimeSec: 0.015,
    fadeInTimeSec: 0.015,
    analyserFftSize: 256,
    analyserSmoothing: 0.8,
  },
  lowPower: false,
  reduceMotion: false,
};

