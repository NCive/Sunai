import React, { useEffect, useRef } from 'react';

export interface BackgroundParticlesProps {
  lowPower?: boolean;
  reduceMotion?: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speedY: number;
}

export const BackgroundParticles: React.FC<BackgroundParticlesProps> = ({
  lowPower = false,
  reduceMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (lowPower) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Modest star count (25 faint drifting stars)
    const starCount = 25;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.35 + 0.1,
        speedY: (Math.random() * 0.08 + 0.02) * -1, // Very slow upward drift
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!reduceMotion && !document.hidden) {
          s.y += s.speedY;
          if (s.y < 0) {
            s.y = height;
            s.x = Math.random() * width;
          }
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        // Starlight glow with rare golden star & aurora cyan particles
        ctx.fillStyle = (i % 8 === 0)
          ? `rgba(229, 193, 139, ${s.alpha})`
          : (i % 4 === 0)
          ? `rgba(98, 201, 232, ${s.alpha})`
          : `rgba(165, 200, 255, ${s.alpha})`;
        ctx.fill();
      }

      if (!reduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [lowPower, reduceMotion]);

  if (lowPower) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
