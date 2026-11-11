import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeroSphereProps {
  reducedMotion: boolean;
}

export function HeroSphere({ reducedMotion }: HeroSphereProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // Generate Particle Sphere (Fibonacci distribution, ~1,200 dots)
    const count = 1200;
    const radius = 70;
    const positions = new Float32Array(count * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      positions[i * 3] = x * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = z * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particleSphere = new THREE.Points(geometry, material);
    scene.add(particleSphere);

    // Decision Ring surrounding sphere
    const ringGeometry = new THREE.RingGeometry(86, 88, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const decisionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    decisionRing.rotation.x = Math.PI / 2.3;
    scene.add(decisionRing);

    // Subtle outer halo ring
    const haloGeometry = new THREE.RingGeometry(96, 97, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const haloRing = new THREE.Mesh(haloGeometry, haloMaterial);
    haloRing.rotation.x = Math.PI / 2.3;
    scene.add(haloRing);

    // Mouse movement response
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.8;
      mouseY = y * 0.8;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // IntersectionObserver to pause loop when off-screen
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      if (!reducedMotion) {
        const delta = clock.getDelta();
        particleSphere.rotation.y += delta * 0.15;
        particleSphere.rotation.x += delta * 0.05;
        decisionRing.rotation.z += delta * 0.2;

        camera.position.x += (mouseX * 40 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 40 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full min-h-[340px] sm:min-h-[420px] flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent-blue/10 blur-[80px] pointer-events-none -z-10" />
      <div className="absolute w-56 h-56 rounded-full bg-accent-green/10 blur-[60px] pointer-events-none -z-10" />
    </div>
  );
}
