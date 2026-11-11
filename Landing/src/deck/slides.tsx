import React from 'react';
import { Slide01Hero } from './slides/Slide01Hero';
import { Slide02Problem } from './slides/Slide02Problem';
import { Slide03PauseFirst } from './slides/Slide03PauseFirst';
import { Slide04Outcomes } from './slides/Slide04Outcomes';
import { Slide05Simulation } from './slides/Slide05Simulation';
import { Slide06Features } from './slides/Slide06Features';
import { Slide07Languages } from './slides/Slide07Languages';
import { Slide08Architecture } from './slides/Slide08Architecture';
import { Slide09Latency } from './slides/Slide09Latency';
import { Slide10Hardware } from './slides/Slide10Hardware';
import { Slide11WhyQwen } from './slides/Slide11WhyQwen';
import { Slide12HonestStatus } from './slides/Slide12HonestStatus';
import { Slide13TechStack } from './slides/Slide13TechStack';
import { Slide14Demo } from './slides/Slide14Demo';
import { Slide15Team } from './slides/Slide15Team';
import { Slide16Closing } from './slides/Slide16Closing';

export type DeckTransition =
  | 'push-up'
  | 'iris'
  | 'wipe-diagonal'
  | 'flip'
  | 'zoom'
  | 'push'
  | 'fade-through'
  | 'wipe-down'
  | 'split-horizontal'
  | 'blur-dissolve'
  | 'zoom-out';

export interface ObjectPose {
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number];
  scale: number;
  ringTilt: [number, number, number];
  ringScale: number;
  stateColor: string; // Hex color for inner core
  ringColor: string;  // Hex color for outer glass ring
  opacity: number;
  speed: number;
}

export interface SlideRegistryItem {
  id: string;
  title: string;
  sectionLabel: string;
  transition: DeckTransition;
  buildSteps: number;
  transitionLength: number; // in vh units (e.g. 100vh)
  buildStepLength: number;  // in vh units per build step (e.g. 60vh)
  hold: number;             // in vh units
  pose: ObjectPose;
  render: (props: {
    buildStep?: number;
    onOpenOfflineModal: () => void;
    isOnline: boolean | null;
    hasScrolled?: boolean;
  }) => React.ReactNode;
}

export const SLIDES_REGISTRY: SlideRegistryItem[] = [
  {
    id: 'hero',
    title: 'Timing-First Voice AI',
    sectionLabel: '01 / INTRODUCTION',
    transition: 'push-up',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [35, 0, 0],
      rotation: [0, 0, 0],
      scale: 1.1,
      ringTilt: [Math.PI / 3, 0, 0],
      ringScale: 1.25,
      stateColor: '#2FD3A5',
      ringColor: '#D1E8E2',
      opacity: 0.9,
      speed: 0.25,
    },
    render: (props) => <Slide01Hero {...props} />,
  },
  {
    id: 'problem',
    title: 'The Timing Problem',
    sectionLabel: '02 / THE PROBLEM',
    transition: 'iris',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-45, 10, -20],
      rotation: [0.2, 0.4, 0],
      scale: 0.85,
      ringTilt: [Math.PI / 2.2, 0.3, 0],
      ringScale: 1.1,
      stateColor: '#FF6A5C',
      ringColor: '#FF6A5C',
      opacity: 0.75,
      speed: 0.15,
    },
    render: () => <Slide02Problem />,
  },
  {
    id: 'pause-first',
    title: 'Pause First, Decide Second',
    sectionLabel: '03 / CORE INNOVATION',
    transition: 'wipe-diagonal',
    buildSteps: 4,
    transitionLength: 40,
    buildStepLength: 40,
    hold: 30,
    pose: {
      position: [40, -5, 0],
      rotation: [0, 0.6, 0.2],
      scale: 1.0,
      ringTilt: [Math.PI / 2.5, 0, 0.2],
      ringScale: 1.3,
      stateColor: '#FFCB9A',
      ringColor: '#2FD3A5',
      opacity: 0.85,
      speed: 0.3,
    },
    render: (props) => <Slide03PauseFirst buildStep={props.buildStep} />,
  },
  {
    id: 'outcomes',
    title: 'Three Classification Outcomes',
    sectionLabel: '04 / DECISIONS',
    transition: 'flip',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [0, -35, -15],
      rotation: [0.4, 0, 0],
      scale: 0.9,
      ringTilt: [Math.PI / 2, 0, 0],
      ringScale: 1.4,
      stateColor: '#2FD3A5',
      ringColor: '#FFCB9A',
      opacity: 0.8,
      speed: 0.35,
    },
    render: (props) => <Slide04Outcomes buildStep={props.buildStep} />,
  },
  {
    id: 'simulation',
    title: 'Decision-Ring Simulation',
    sectionLabel: '05 / TESTBED',
    transition: 'zoom',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-40, -10, -10],
      rotation: [0, 0.8, 0],
      scale: 0.8,
      ringTilt: [Math.PI / 3, 0.2, 0],
      ringScale: 1.2,
      stateColor: '#2FD3A5',
      ringColor: '#D1E8E2',
      opacity: 0.75,
      speed: 0.2,
    },
    render: () => <Slide05Simulation />,
  },
  {
    id: 'features',
    title: 'Verified Capabilities',
    sectionLabel: '06 / CAPABILITIES',
    transition: 'push',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [48, 25, -30],
      rotation: [0.1, 1.2, 0],
      scale: 0.7,
      ringTilt: [Math.PI / 2.6, 0, 0],
      ringScale: 1.1,
      stateColor: '#2FD3A5',
      ringColor: '#116466',
      opacity: 0.65,
      speed: 0.15,
    },
    render: (props) => <Slide06Features buildStep={props.buildStep} />,
  },
  {
    id: 'languages',
    title: 'Multilingual Support',
    sectionLabel: '07 / MULTILINGUAL',
    transition: 'fade-through',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-42, 20, -25],
      rotation: [0.3, -0.6, 0],
      scale: 0.75,
      ringTilt: [Math.PI / 2.8, -0.3, 0],
      ringScale: 1.15,
      stateColor: '#FFCB9A',
      ringColor: '#D9B08C',
      opacity: 0.7,
      speed: 0.2,
    },
    render: () => <Slide07Languages />,
  },
  {
    id: 'architecture',
    title: 'System Architecture',
    sectionLabel: '08 / TOPOLOGY',
    transition: 'wipe-down',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [0, -45, -30],
      rotation: [Math.PI / 2.1, 0, 0],
      scale: 1.2,
      ringTilt: [Math.PI / 2, 0, 0],
      ringScale: 1.8,
      stateColor: '#116466',
      ringColor: '#2FD3A5',
      opacity: 0.8,
      speed: 0.1,
    },
    render: () => <Slide08Architecture />,
  },
  {
    id: 'pipeline',
    title: 'Streaming Latency Pipeline',
    sectionLabel: '09 / PIPELINE TIMING',
    transition: 'split-horizontal',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [45, 0, -25],
      rotation: [0, 1.4, 0],
      scale: 0.75,
      ringTilt: [Math.PI / 3, 0, 0.4],
      ringScale: 1.2,
      stateColor: '#2FD3A5',
      ringColor: '#FFCB9A',
      opacity: 0.7,
      speed: 0.3,
    },
    render: () => <Slide09Latency />,
  },
  {
    id: 'hardware',
    title: 'Runs on Bare-Minimum Laptop',
    sectionLabel: '10 / HARDWARE FOOTPRINT',
    transition: 'push-up',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-45, 0, -20],
      rotation: [0.2, 0.4, 0],
      scale: 0.8,
      ringTilt: [Math.PI / 2.4, 0, 0],
      ringScale: 1.15,
      stateColor: '#D9B08C',
      ringColor: '#2FD3A5',
      opacity: 0.75,
      speed: 0.2,
    },
    render: () => <Slide10Hardware />,
  },
  {
    id: 'why-qwen',
    title: 'Why Qwen3.5-4B',
    sectionLabel: '11 / MODEL SELECTION',
    transition: 'blur-dissolve',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [40, 20, -25],
      rotation: [0, -0.8, 0],
      scale: 0.75,
      ringTilt: [Math.PI / 2.6, 0.2, 0],
      ringScale: 1.2,
      stateColor: '#FFCB9A',
      ringColor: '#D1E8E2',
      opacity: 0.7,
      speed: 0.25,
    },
    render: () => <Slide11WhyQwen />,
  },
  {
    id: 'status',
    title: 'Honest Status',
    sectionLabel: '12 / TRANSPARENCY',
    transition: 'push',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-40, -15, -20],
      rotation: [0.1, 0.6, 0],
      scale: 0.8,
      ringTilt: [Math.PI / 2.2, 0, 0],
      ringScale: 1.2,
      stateColor: '#2FD3A5',
      ringColor: '#FFCB9A',
      opacity: 0.7,
      speed: 0.15,
    },
    render: () => <Slide12HonestStatus />,
  },
  {
    id: 'tech-stack',
    title: 'Technology Stack',
    sectionLabel: '13 / TECHNOLOGIES',
    transition: 'zoom-out',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [0, 0, -35],
      rotation: [0, 1.8, 0],
      scale: 1.0,
      ringTilt: [Math.PI / 2, 0, 0],
      ringScale: 1.5,
      stateColor: '#116466',
      ringColor: '#D1E8E2',
      opacity: 0.75,
      speed: 0.2,
    },
    render: () => <Slide13TechStack />,
  },
  {
    id: 'demo',
    title: 'Demonstration',
    sectionLabel: '14 / LIVE DEMO',
    transition: 'fade-through',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [-48, 25, -30],
      rotation: [0, 0.5, 0],
      scale: 0.65,
      ringTilt: [Math.PI / 2.5, 0, 0],
      ringScale: 1.1,
      stateColor: '#FFCB9A',
      ringColor: '#2FD3A5',
      opacity: 0.65,
      speed: 0.15,
    },
    render: (props) => <Slide14Demo {...props} />,
  },
  {
    id: 'team',
    title: 'Team and Credits',
    sectionLabel: '15 / CONTRIBUTORS',
    transition: 'iris',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 60,
    pose: {
      position: [42, -15, -20],
      rotation: [0.3, 0.2, 0],
      scale: 0.8,
      ringTilt: [Math.PI / 2.3, 0, 0.2],
      ringScale: 1.2,
      stateColor: '#D1E8E2',
      ringColor: '#116466',
      opacity: 0.75,
      speed: 0.2,
    },
    render: () => <Slide15Team />,
  },
  {
    id: 'closing',
    title: 'Pause First. Decide Second.',
    sectionLabel: '16 / CONCLUSION',
    transition: 'fade-through',
    buildSteps: 0,
    transitionLength: 40,
    buildStepLength: 0,
    hold: 80,
    pose: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1.25,
      ringTilt: [Math.PI / 3, 0, 0],
      ringScale: 1.4,
      stateColor: '#FFCB9A',
      ringColor: '#2FD3A5',
      opacity: 0.95,
      speed: 0.3,
    },
    render: (props) => <Slide16Closing {...props} />,
  },
];
