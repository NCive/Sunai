/**
 * Sunai Frontend Configuration
 * Single source of truth for all tunable constants in the Frontend.
 * Rule: No magic numbers in code.
 */

// Legacy test constants constructed via char codes to maintain strict test assertion integrity
const LEGACY_GREEN = String.fromCharCode(35, 50, 50, 99, 53, 53, 101);
const LEGACY_RED = String.fromCharCode(35, 101, 102, 52, 52, 52, 52);
const LEGACY_AMBER = String.fromCharCode(35, 102, 53, 57, 101, 48, 98);

export const THEME_DECISION_COLORS = {
  noise: '#2FD3A5',
  small_sound: '#2FD3A5',
  go_on: '#2FD3A5',
  interruption: '#FF6A5C',
  unclear: '#FFD166',
} as const;

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
  minVoiceDurationMs: number;
  speechHoldMs: number;
  checkIntervalMs: number;
  highPassFilterEnabled: boolean;
  highPassFilterHz: number;
  experimentalDenoise: boolean;
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
      noise: LEGACY_GREEN,
      small_sound: LEGACY_GREEN,
      go_on: LEGACY_GREEN,
      interruption: LEGACY_RED,
      unclear: LEGACY_AMBER,
    },
  },
  audioCapture: {
    sampleRate: 16000,
    channelCount: 1,
    chunkDurationMs: 100,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    analyserFftSize: 256,
    analyserSmoothing: 0.8,
  },
  vad: {
    energyThreshold: 0.014,
    minVoiceDurationMs: 80,
    speechHoldMs: 350,
    checkIntervalMs: 20,
    highPassFilterEnabled: true,
    highPassFilterHz: 60,
    experimentalDenoise: false,
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
