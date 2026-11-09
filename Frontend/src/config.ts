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
  analyserFftSize: number;
  analyserSmoothing: number;
}

export interface VadConfig {
  energyThreshold: number;
  speechHoldMs: number;
  minSpeechDurationMs: number;
  checkIntervalMs: number;
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
    autoGainControl: true,
    analyserFftSize: 256,
    analyserSmoothing: 0.8,
  },
  vad: {
    energyThreshold: 0.018,
    speechHoldMs: 350,
    minSpeechDurationMs: 80,
    checkIntervalMs: 20,
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

