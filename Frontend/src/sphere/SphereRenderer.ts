import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CONFIG } from '../config';

export type SphereState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'PAUSED'
  | 'IDLE_CHECK'
  | 'SLEEP'
  | 'WAKE';

export type DecisionType = 'noise' | 'small_sound' | 'go_on' | 'interruption' | 'unclear';

interface DotData {
  basePosition: THREE.Vector3;
  row: number;
  col: number;
  angle: number;
  latRatio: number;
}

/**
 * Generates a glowing circular sprite texture programmatically.
 * No external images or assets needed.
 */
function createDotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * SphereRenderer
 * Manages the Three.js scene, outer bumped glowing ring, inner latitude dot sphere,
 * decision ring, audio analyser reactivity, and state blending.
 */
export class SphereRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  // Dot sphere
  private pointsMesh: THREE.Points | null = null;
  private dotData: DotData[] = [];
  private positionsArray: Float32Array = new Float32Array(0);
  private colorsArray: Float32Array = new Float32Array(0);

  // Outer ring
  private ringMesh: THREE.Mesh | null = null;
  private ringGeometry: THREE.BufferGeometry | null = null;
  private ringMaterial: THREE.MeshBasicMaterial | null = null;
  private ringSegmentCount = 128;

  // Decision ring
  private decisionRingMesh: THREE.Line | null = null;
  private decisionRingGeometry: THREE.BufferGeometry | null = null;
  private decisionRingMaterial: THREE.LineBasicMaterial | null = null;
  private decisionSegmentCount = 128;

  // Orbiting dots (for THINKING state)
  private orbitPointsMesh: THREE.Points | null = null;
  private orbitDotCount = 8;

  // Audio analysers
  private micAnalyser: AnalyserNode | null = null;
  private playAnalyser: AnalyserNode | null = null;
  private freqByteData: Uint8Array = new Uint8Array(128);
  private smoothedSpectrum: number[] = new Array(CONFIG.sphere.rowCount).fill(0);

  // States & animation
  private currentState: SphereState = 'IDLE';
  private stateTransitionStart = 0;
  private stateTransitionProgress = 1.0;

  private pausedStartTime = 0;
  private currentDecision: DecisionType | null = null;
  private decisionTimestamp = 0;

  // Visual effects
  private burstIntensity = 0.0;
  private wobbleIntensity = 0.0;
  private currentScale = 1.0;
  private targetScale = 1.0;

  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Settings
  private isLowPower: boolean;
  private isReduceMotion: boolean;

  // FPS tracking
  private onFpsUpdate: ((fps: number) => void) | null = null;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    options?: { lowPower?: boolean; reduceMotion?: boolean; onFps?: (fps: number) => void }
  ) {
    this.container = container;
    this.isLowPower = options?.lowPower ?? CONFIG.lowPower;
    this.isReduceMotion = options?.reduceMotion ?? CONFIG.reduceMotion;
    this.onFpsUpdate = options?.onFps ?? null;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.z = 7.5;

    // 2. WebGL Renderer with transparency
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isLowPower,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Transparent canvas
    container.appendChild(this.renderer.domElement);

    // 3. Post-processing Bloom (if not in lowPower mode)
    if (!this.isLowPower) {
      const renderScene = new RenderPass(this.scene, this.camera);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        CONFIG.sphere.bloomStrength,
        CONFIG.sphere.bloomRadius,
        CONFIG.sphere.bloomThreshold
      );
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderScene);
      this.composer.addPass(this.bloomPass);
    }

    // 4. Build elements
    this.buildDotSphere();
    this.buildOuterRing();
    this.buildDecisionRing();
    this.buildOrbitingDots();

    // 5. Start loop and observe stage container with ResizeObserver
    this.handleResize = this.handleResize.bind(this);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.handleResize);
    }
    this.startLoop();
  }

  public setAudioSources(mic: AnalyserNode | null, playQueue: AnalyserNode | null): void {
    this.micAnalyser = mic;
    this.playAnalyser = playQueue;
  }

  public setState(nextState: SphereState): void {
    if (this.currentState === nextState && this.stateTransitionProgress >= 1.0) return;

    this.currentState = nextState;
    this.stateTransitionStart = performance.now();
    this.stateTransitionProgress = 0.0;

    if (nextState === 'PAUSED') {
      this.pausedStartTime = performance.now();
      this.currentDecision = null;
    } else if (nextState === 'SLEEP') {
      this.targetScale = 0.08;
    } else if (nextState === 'WAKE') {
      this.targetScale = 1.0;
    } else {
      this.targetScale = 1.0;
    }
  }

  public getState(): SphereState {
    return this.currentState;
  }

  public setDecision(decision: DecisionType): void {
    this.currentDecision = decision;
    this.decisionTimestamp = performance.now();

    if (decision === 'interruption' && !this.isReduceMotion) {
      // Quick burst on real interruption
      this.burstIntensity = 1.0;
    } else if (decision === 'unclear') {
      // Small head-tilt wobble for "ji?"
      this.wobbleIntensity = 1.0;
    }
  }

  public setConfigOverrides(options: { lowPower?: boolean; reduceMotion?: boolean }): void {
    if (options.reduceMotion !== undefined) {
      this.isReduceMotion = options.reduceMotion;
    }
    if (options.lowPower !== undefined && options.lowPower !== this.isLowPower) {
      this.isLowPower = options.lowPower;
      // Rebuild points with new dot count
      this.buildDotSphere();
      if (this.isLowPower) {
        this.composer = null;
        this.bloomPass = null;
      } else {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          CONFIG.sphere.bloomStrength,
          CONFIG.sphere.bloomRadius,
          CONFIG.sphere.bloomThreshold
        );
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);
      }
    }
  }

  /**
   * Builds inner sphere dots in latitude rows.
   */
  private buildDotSphere(): void {
    if (this.pointsMesh) {
      this.scene.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      (this.pointsMesh.material as THREE.Material).dispose();
      this.pointsMesh = null;
    }

    const dotCount = this.isLowPower
      ? CONFIG.sphere.lowPowerDotCount
      : CONFIG.sphere.dotCount;
    const rowCount = CONFIG.sphere.rowCount;
    const radius = CONFIG.sphere.sphereRadius;

    this.dotData = [];
    const positions: number[] = [];
    const colors: number[] = [];

    // Calculate dots per row proportional to circumference cos(phi)
    const circumferences: number[] = [];
    let totalCircumference = 0;
    for (let r = 0; r < rowCount; r++) {
      const v = (r + 0.5) / rowCount;
      const phi = (v - 0.5) * Math.PI; // -PI/2 to +PI/2
      const c = Math.max(0.08, Math.cos(phi));
      circumferences.push(c);
      totalCircumference += c;
    }

    for (let r = 0; r < rowCount; r++) {
      const v = (r + 0.5) / rowCount;
      const phi = (v - 0.5) * Math.PI;
      const latRatio = Math.abs(v - 0.5) * 2.0; // 0 at equator, 1 at poles
      const dotsInRow = Math.max(
        6,
        Math.round((circumferences[r] / totalCircumference) * dotCount)
      );

      for (let i = 0; i < dotsInRow; i++) {
        const theta = (i / dotsInRow) * Math.PI * 2.0;
        const x = radius * Math.cos(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi);
        const z = radius * Math.cos(phi) * Math.sin(theta);

        positions.push(x, y, z);
        // Base alpha: middle rows are slightly fainter so background shows through
        const baseAlpha = 0.25 + 0.75 * Math.pow(latRatio, 0.7);
        colors.push(baseAlpha, baseAlpha, baseAlpha);

        this.dotData.push({
          basePosition: new THREE.Vector3(x, y, z),
          row: r,
          col: i,
          angle: theta,
          latRatio,
        });
      }
    }

    this.positionsArray = new Float32Array(positions);
    this.colorsArray = new Float32Array(colors);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positionsArray, 3)
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colorsArray, 3));

    const material = new THREE.PointsMaterial({
      size: 0.085,
      map: createDotTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.pointsMesh = new THREE.Points(geometry, material);
    this.scene.add(this.pointsMesh);
  }

  /**
   * Builds thick glowing outer ring with spectrum bump vertices.
   */
  private buildOuterRing(): void {
    if (this.ringMesh) {
      this.scene.remove(this.ringMesh);
      this.ringMesh.geometry.dispose();
      (this.ringMesh.material as THREE.Material).dispose();
      this.ringMesh = null;
    }

    const segments = this.ringSegmentCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const indices: number[] = [];

    // Create a circular quad ribbon for the ring
    for (let i = 0; i <= segments; i++) {
      const idx = i * 2;
      indices.push(idx, idx + 1, (idx + 2) % ((segments + 1) * 2));
      indices.push(
        idx + 1,
        (idx + 3) % ((segments + 1) * 2),
        (idx + 2) % ((segments + 1) * 2)
      );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    this.ringGeometry = geometry;
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.ringMesh = new THREE.Mesh(geometry, this.ringMaterial);
    this.scene.add(this.ringMesh);
  }

  /**
   * Builds the thin decision ring (arc progress indicator for PAUSED state).
   */
  private buildDecisionRing(): void {
    if (this.decisionRingMesh) {
      this.scene.remove(this.decisionRingMesh);
      this.decisionRingMesh.geometry.dispose();
      this.decisionRingMesh = null;
    }

    const segments = this.decisionSegmentCount;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.decisionRingGeometry = geometry;
    this.decisionRingMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
    });

    this.decisionRingMesh = new THREE.Line(geometry, this.decisionRingMaterial);
    this.scene.add(this.decisionRingMesh);
  }

  /**
   * Builds small orbiting dots that circle the sphere during THINKING.
   */
  private buildOrbitingDots(): void {
    if (this.orbitPointsMesh) {
      this.scene.remove(this.orbitPointsMesh);
      this.orbitPointsMesh.geometry.dispose();
      this.orbitPointsMesh = null;
    }

    const positions = new Float32Array(this.orbitDotCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: createDotTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.orbitPointsMesh = new THREE.Points(geometry, material);
    this.scene.add(this.orbitPointsMesh);
  }

  /**
   * Main animation frame loop.
   */
  private startLoop(): void {
    const render = () => {
      this.animFrameId = requestAnimationFrame(render);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.updateFps();
      this.updateStateTransition();
      this.sampleAudioSpectrum(elapsed);
      this.animateDots(elapsed);
      this.animateOuterRing(elapsed);
      this.animateDecisionRing(elapsed);
      this.animateOrbitingDots(elapsed);

      // Whole-sphere rotation (if motion enabled)
      if (!this.isReduceMotion && this.pointsMesh) {
        const rotSpeed =
          this.currentState === 'PAUSED'
            ? CONFIG.sphere.baseRotationSpeed * 0.2
            : CONFIG.sphere.baseRotationSpeed;
        this.pointsMesh.rotation.y += rotSpeed;
        if (this.ringMesh) {
          this.ringMesh.rotation.z += rotSpeed * 0.4;
        }
      }

      // Smooth scale adjustment (sleep / wake)
      this.currentScale += (this.targetScale - this.currentScale) * Math.min(1.0, delta * 6.0);
      this.scene.scale.set(this.currentScale, this.currentScale, this.currentScale);

      // Render via Bloom Composer or direct WebGL
      if (this.composer && !this.isLowPower) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      const currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      if (this.onFpsUpdate) {
        this.onFpsUpdate(currentFps);
      }
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  private updateStateTransition(): void {
    const elapsed = performance.now() - this.stateTransitionStart;
    this.stateTransitionProgress = Math.min(
      1.0,
      elapsed / CONFIG.sphere.stateBlendDurationMs
    );
  }

  /**
   * Determines active audio spectrum based on state.
   * LISTENING -> mic analyser
   * SPEAKING -> play queue analyser
   * IDLE / THINKING / PAUSED -> gentle synthetic wave
   */
  private sampleAudioSpectrum(elapsed: number): void {
    let analyser: AnalyserNode | null = null;

    if (this.currentState === 'LISTENING') {
      analyser = this.micAnalyser;
    } else if (this.currentState === 'SPEAKING') {
      analyser = this.playAnalyser;
    }

    const rowCount = CONFIG.sphere.rowCount;
    const smoothing = CONFIG.sphere.spectrumSmoothing;

    if (analyser) {
      if (this.freqByteData.length !== analyser.frequencyBinCount) {
        this.freqByteData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      analyser.getByteFrequencyData(this.freqByteData as any);

      const maxBin = Math.min(this.freqByteData.length, 64);
      for (let r = 0; r < rowCount; r++) {
        const binIndex = Math.floor((r / rowCount) * maxBin);
        const val = this.freqByteData[binIndex] / 255.0;
        this.smoothedSpectrum[r] =
          this.smoothedSpectrum[r] * smoothing + val * (1 - smoothing);
      }
    } else {
      // Synthetic calm harmonic wave
      for (let r = 0; r < rowCount; r++) {
        const normR = r / rowCount;
        let wave = 0;
        if (this.currentState === 'THINKING') {
          wave = (Math.sin(normR * Math.PI * 3.0 - elapsed * 3.5) + 1.0) * 0.25;
        } else if (this.currentState === 'IDLE') {
          wave = (Math.sin(normR * Math.PI * 2.0 - elapsed * 1.2) + 1.0) * 0.08;
        } else if (this.currentState === 'IDLE_CHECK') {
          wave = (Math.sin(normR * Math.PI * 2.0 - elapsed * 0.6) + 1.0) * 0.04;
        } else {
          wave = 0.02;
        }
        this.smoothedSpectrum[r] =
          this.smoothedSpectrum[r] * smoothing + wave * (1 - smoothing);
      }
    }
  }

  /**
   * Animates dots according to current state, row frequency, and ripples.
   */
  private animateDots(elapsed: number): void {
    if (!this.pointsMesh) return;

    const positions = this.positionsArray;
    const colors = this.colorsArray;
    const state = this.currentState;
    const blend = this.stateTransitionProgress;

    // Decay burst and wobble
    if (this.burstIntensity > 0.001) {
      this.burstIntensity *= 0.92;
    } else {
      this.burstIntensity = 0.0;
    }

    if (this.wobbleIntensity > 0.001) {
      this.wobbleIntensity *= 0.88;
      // Head-tilt wobble on Z axis
      this.pointsMesh.rotation.z =
        Math.sin(elapsed * 25.0) * 0.12 * this.wobbleIntensity;
    } else {
      this.wobbleIntensity = 0.0;
      this.pointsMesh.rotation.z = 0;
    }

    // Breathing pulse for IDLE
    const breathOffset =
      state === 'IDLE' ? Math.sin(elapsed * 1.5) * 0.04 : 0.0;

    for (let i = 0; i < this.dotData.length; i++) {
      const dot = this.dotData[i];
      const rowVal = this.smoothedSpectrum[dot.row] || 0;
      const basePos = dot.basePosition;

      // Ripple propagation direction:
      // LISTENING -> ripples move inward
      // SPEAKING -> ripples move outward
      let ripple = 0;
      if (state === 'LISTENING') {
        ripple = Math.sin(dot.row * 0.4 + elapsed * 5.0) * 0.08 * rowVal;
      } else if (state === 'SPEAKING') {
        ripple = Math.sin(dot.row * 0.4 - elapsed * 6.0) * 0.12 * rowVal;
      } else if (state === 'THINKING') {
        ripple = Math.sin(dot.row * 0.3 - elapsed * 3.0) * 0.06;
      }

      // In PAUSED state, rows flatten and slow down
      const pausedDamp = state === 'PAUSED' ? 0.35 : 1.0;
      const displacement =
        (rowVal * 0.55 + ripple + breathOffset + this.burstIntensity * 0.6) *
        pausedDamp;

      const normX = basePos.x / CONFIG.sphere.sphereRadius;
      const normY = basePos.y / CONFIG.sphere.sphereRadius;
      const normZ = basePos.z / CONFIG.sphere.sphereRadius;

      const pIdx = i * 3;
      positions[pIdx] = basePos.x + normX * displacement;
      positions[pIdx + 1] = basePos.y + normY * displacement;
      positions[pIdx + 2] = basePos.z + normZ * displacement;

      // Opacity calculation
      let targetAlpha =
        0.2 +
        0.8 * Math.pow(dot.latRatio, 0.7) +
        rowVal * 0.7 +
        this.burstIntensity * 0.5;

      if (state === 'PAUSED' || state === 'IDLE_CHECK') {
        targetAlpha *= 0.45;
      } else if (state === 'SLEEP') {
        targetAlpha *= 0.1;
      }

      // Apply transition blending
      const currentAlpha = colors[pIdx];
      const finalAlpha = THREE.MathUtils.lerp(currentAlpha, targetAlpha, blend);

      colors[pIdx] = finalAlpha;
      colors[pIdx + 1] = finalAlpha;
      colors[pIdx + 2] = finalAlpha;
    }

    this.pointsMesh.geometry.attributes.position.needsUpdate = true;
    this.pointsMesh.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * Animates thick outer ring with bumps following the spectrum.
   */
  private animateOuterRing(elapsed: number): void {
    if (!this.ringMesh || !this.ringGeometry || !this.ringMaterial) return;

    const segments = this.ringSegmentCount;
    const posAttr = this.ringGeometry.attributes.position as THREE.BufferAttribute;
    const baseRadius = CONFIG.sphere.ringRadius;
    const thickness = CONFIG.sphere.ringThickness;
    const state = this.currentState;

    // Bass pulse for SPEAKING
    const bass = (this.smoothedSpectrum[1] || 0) * 0.4;
    const pulse =
      state === 'SPEAKING'
        ? bass
        : state === 'LISTENING'
        ? (this.smoothedSpectrum[2] || 0) * 0.25
        : Math.sin(elapsed * 1.5) * 0.02;

    const bumpScale =
      state === 'PAUSED' ? 0.08 : CONFIG.sphere.ringBumpIntensity;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2.0;
      // Map angle symmetrically across rows
      const rowIdx = Math.floor(
        Math.abs(Math.sin(angle)) * (CONFIG.sphere.rowCount - 1)
      );
      const rowBump = (this.smoothedSpectrum[rowIdx] || 0) * bumpScale;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const rInner = baseRadius - thickness - rowBump * 0.5 + pulse;
      const rOuter = baseRadius + thickness + rowBump + pulse;

      const idxInner = i * 2 * 3;
      const idxOuter = (i * 2 + 1) * 3;

      posAttr.array[idxInner] = cos * rInner;
      posAttr.array[idxInner + 1] = sin * rInner;
      posAttr.array[idxInner + 2] = 0;

      posAttr.array[idxOuter] = cos * rOuter;
      posAttr.array[idxOuter + 1] = sin * rOuter;
      posAttr.array[idxOuter + 2] = 0;
    }

    posAttr.needsUpdate = true;

    // Opacity per state
    let targetOpacity = 0.7;
    if (state === 'IDLE' || state === 'IDLE_CHECK') {
      targetOpacity = 0.35;
    } else if (state === 'PAUSED') {
      targetOpacity = 0.2; // Main ring dims during pause
    } else if (state === 'SLEEP') {
      targetOpacity = 0.05;
    }

    this.ringMaterial.opacity = THREE.MathUtils.lerp(
      this.ringMaterial.opacity,
      targetOpacity,
      this.stateTransitionProgress
    );
  }

  /**
   * Animates the thin decision ring during PAUSED.
   * Fills arc over 300-500 ms, then shows decision in green/red/amber.
   */
  private animateDecisionRing(_elapsed: number): void {
    if (
      !this.decisionRingMesh ||
      !this.decisionRingGeometry ||
      !this.decisionRingMaterial
    )
      return;

    const segments = this.decisionSegmentCount;
    const posAttr = this.decisionRingGeometry.attributes
      .position as THREE.BufferAttribute;
    const radius = CONFIG.sphere.decisionRingRadius;

    if (this.currentState === 'PAUSED' || this.currentDecision !== null) {
      const pauseDuration = performance.now() - this.pausedStartTime;
      const fillDuration = CONFIG.sphere.decisionFillDurationMs;
      const fillRatio = Math.min(1.0, pauseDuration / fillDuration);

      let targetColor = new THREE.Color(0xffffff);
      let targetOpacity = 0.85;

      if (this.currentDecision !== null) {
        const decisionAge = performance.now() - this.decisionTimestamp;
        const hexColor = CONFIG.sphere.decisionRingColors[this.currentDecision];
        targetColor = new THREE.Color(hexColor);

        // Flash and fade out after decision
        if (decisionAge > 800) {
          targetOpacity = Math.max(0.0, 1.0 - (decisionAge - 800) / 400);
        } else {
          targetOpacity = 0.95;
        }
      }

      this.decisionRingMaterial.color.copy(targetColor);
      this.decisionRingMaterial.opacity = targetOpacity;

      const arcMax = (this.currentDecision ? 1.0 : fillRatio) * Math.PI * 2.0;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * arcMax;
        const pIdx = i * 3;
        posAttr.array[pIdx] = Math.cos(theta) * radius;
        posAttr.array[pIdx + 1] = Math.sin(theta) * radius;
        posAttr.array[pIdx + 2] = 0.02; // Slightly forward in Z
      }
      posAttr.needsUpdate = true;
      this.decisionRingMesh.visible = true;
    } else {
      this.decisionRingMaterial.opacity = 0.0;
      this.decisionRingMesh.visible = false;
    }
  }

  /**
   * Animates orbiting dots in THINKING state.
   */
  private animateOrbitingDots(elapsed: number): void {
    if (!this.orbitPointsMesh) return;

    const material = this.orbitPointsMesh.material as THREE.PointsMaterial;
    const isThinking = this.currentState === 'THINKING';

    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      isThinking ? 0.9 : 0.0,
      this.stateTransitionProgress
    );

    if (material.opacity < 0.01) {
      this.orbitPointsMesh.visible = false;
      return;
    }

    this.orbitPointsMesh.visible = true;
    const posAttr = this.orbitPointsMesh.geometry.attributes
      .position as THREE.BufferAttribute;
    const orbitRadius = CONFIG.sphere.sphereRadius * 1.15;

    for (let i = 0; i < this.orbitDotCount; i++) {
      const angle = (i / this.orbitDotCount) * Math.PI * 2.0 + elapsed * 1.8;
      const pIdx = i * 3;
      posAttr.array[pIdx] = Math.cos(angle) * orbitRadius;
      posAttr.array[pIdx + 1] = Math.sin(angle * 2.0) * 0.4; // Figure-8 tilt
      posAttr.array[pIdx + 2] = Math.sin(angle) * orbitRadius;
    }
    posAttr.needsUpdate = true;
  }

  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  public destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);

    if (this.composer) {
      this.composer.dispose();
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
