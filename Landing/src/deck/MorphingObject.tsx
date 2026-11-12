import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ObjectPose } from './slides';
import gsap from "gsap";

export interface MorphingObjectProps {
  pose: ObjectPose;
  lowPower: boolean;
  reducedMotion: boolean;
  isScrollingOrTransitioning?: boolean;
  onFpsSample?: (fps: number) => void;
}

export function MorphingObject({
  pose,
  lowPower,
  reducedMotion,
  isScrollingOrTransitioning = false,
  onFpsSample,
}: MorphingObjectProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<ObjectPose>(pose);
  poseRef.current = pose;

  const isScrollingRef = useRef<boolean>(isScrollingOrTransitioning);
  isScrollingRef.current = isScrollingOrTransitioning;

  const lastActiveTimeRef = useRef<number>(Date.now());
  if (isScrollingOrTransitioning) {
    lastActiveTimeRef.current = Date.now();
  }

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 180;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
        precision: 'mediump',
      });

      // Cap renderer pixel ratio to Math.min(window.devicePixelRatio, 1.25)
      const pixelRatio = lowPower ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25);
      renderer.setPixelRatio(pixelRatio);

      // Render at lower resolution (~0.75 scale default, 0.6 scale in low power), upscaled with CSS
      const resScale = lowPower ? 0.6 : 0.75;
      renderer.setSize(Math.round(width * resScale), Math.round(height * resScale), false);

      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
    } catch {
      return;
    }

    // Main Group holding all 3D morphing elements
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    // 1. Geodesic Icosahedron Sphere: lower geometry detail (detail 0 = 20 faces, crystal wireframe)
    const icoGeo = new THREE.IcosahedronGeometry(26, 0);
    const wireGeo = new THREE.WireframeGeometry(icoGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(pose.stateColor),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const icoMesh = new THREE.LineSegments(wireGeo, wireMat);
    objectGroup.add(icoMesh);

    // Inner Glowing Core Sphere: lower geometry detail (8 x 8 segments)
    const coreGeo = new THREE.SphereGeometry(14, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pose.stateColor),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    objectGroup.add(coreMesh);

    // 2. Glass Ring: lower geometry detail (8 radial x 32 tubular segments)
    const ringGeo = new THREE.TorusGeometry(36, 1.2, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pose.ringColor),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = pose.ringTilt[0];
    ringMesh.rotation.y = pose.ringTilt[1];
    ringMesh.rotation.z = pose.ringTilt[2];
    objectGroup.add(ringMesh);

    // 3. Floating Dust Particles: cut to ~1/3 count (lowPower: 12, normal: 36)
    const particleCount = lowPower ? 12 : 36;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 220;
      particlePos[i + 1] = (Math.random() - 0.5) * 160;
      particlePos[i + 2] = (Math.random() - 0.5) * 120;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xA5C8FF,
      size: 1.5,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      lastActiveTimeRef.current = Date.now();
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const currentResScale = lowPower ? 0.6 : 0.75;
      renderer.setSize(Math.round(w * currentResScale), Math.round(h * currentResScale), false);
    };
    window.addEventListener('resize', handleResize);

    // Visibility Listener - completely stop rendering when tab is hidden
    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // FPS Sampling & Idle Throttling
    let frameCount = 0;
    let fpsTimer = performance.now();
    let lastRenderTime = 0;
    const clock = new THREE.Clock();

    // Unified Ticker Callback (driven by single GSAP ticker)
    const renderTick = () => {
      // 1. Completely stop rendering when tab is hidden
      if (!isTabVisible || document.hidden) return;

      const now = performance.now();
      const isIdle = !isScrollingRef.current && (Date.now() - lastActiveTimeRef.current > 1000);

      // 2. Cap render loop at 30 fps when idle; 60 fps only while scrolling or transitioning
      if (isIdle) {
        if (now - lastRenderTime < 32.5) { // ~30 fps cap
          return;
        }
      }
      lastRenderTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        const fps = (frameCount * 1000) / (now - fpsTimer);
        if (onFpsSample) onFpsSample(Math.round(fps));
        frameCount = 0;
        fpsTimer = now;
      }

      const delta = Math.min(clock.getDelta(), 0.1);
      const currentTarget = poseRef.current;

      if (!reducedMotion) {
        // Smoothly interpolate group position & scale towards active pose
        objectGroup.position.x += (currentTarget.position[0] - objectGroup.position.x) * 0.1;
        objectGroup.position.y += (currentTarget.position[1] - objectGroup.position.y) * 0.1;
        objectGroup.position.z += (currentTarget.position[2] - objectGroup.position.z) * 0.1;

        const targetScale = currentTarget.scale;
        objectGroup.scale.x += (targetScale - objectGroup.scale.x) * 0.1;
        objectGroup.scale.y += (targetScale - objectGroup.scale.y) * 0.1;
        objectGroup.scale.z += (targetScale - objectGroup.scale.z) * 0.1;

        // Idle & Pose Rotation
        icoMesh.rotation.y += delta * currentTarget.speed * 0.6;
        icoMesh.rotation.x += delta * currentTarget.speed * 0.25;
        ringMesh.rotation.z += delta * currentTarget.speed * 0.5;

        // Smooth color interpolation
        wireMat.color.lerp(new THREE.Color(currentTarget.stateColor), 0.08);
        coreMat.color.lerp(new THREE.Color(currentTarget.stateColor), 0.08);
        ringMat.color.lerp(new THREE.Color(currentTarget.ringColor), 0.08);

        // Smooth ring tilt
        ringMesh.rotation.x += (currentTarget.ringTilt[0] - ringMesh.rotation.x) * 0.08;
        ringMesh.rotation.y += (currentTarget.ringTilt[1] - ringMesh.rotation.y) * 0.08;

        // Camera Parallax
        camera.position.x += (mouseX * 10 - camera.position.x) * 0.06;
        camera.position.y += (-mouseY * 10 - camera.position.y) * 0.06;
        camera.lookAt(0, 0, 0);

        // Particles drift
        particleSystem.rotation.y += delta * 0.02;
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    // Attach to single unified GSAP ticker
    gsap.ticker.add(renderTick);

    return () => {
      gsap.ticker.remove(renderTick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);

      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
      icoGeo.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [lowPower, reducedMotion, onFpsSample]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Lightweight background atmosphere with reduced blur radius */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#244DA8]/12 blur-[40px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#7655C9]/10 blur-[30px] pointer-events-none -z-10" />
    </div>
  );
}
