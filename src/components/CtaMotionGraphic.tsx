import React, { useEffect, useRef } from 'react';
import { useSiteContent } from '../context/SiteContentContext';

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  baseAlpha: number;
  phaseOffset: number;
}

interface CtaMotionGraphicProps {
  className?: string;
  isTriggered?: boolean;
  targetRef?: React.RefObject<HTMLElement | null>;
}

export const CtaMotionGraphic: React.FC<CtaMotionGraphicProps> = ({
  className = '',
  isTriggered = false,
  targetRef
}) => {
  const { siteContent } = useSiteContent();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const animType = siteContent.ctaAnimationType || 'white_particles_focus';
  const isEnabled = animType !== 'none';

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    // Accessibility check: respect user reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 550);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // =========================================================================
    // MODE A: WHITE PARTICLES → CTA FOCUS LOOP
    // Sequence:
    // 1. Small particles scatter gently throughout the banner.
    // 2. Particles move smoothly and assemble toward the CTA button.
    // 3. The CTA button subtly pops out / becomes more prominent.
    // 4. Particles scatter again throughout the banner.
    // 5. Loop repeats continuously and smoothly.
    // =========================================================================
    if (animType === 'white_particles_focus' || animType === 'white_particles') {
      const particleCount = width < 640 ? 36 : 68;
      const palette = [
        'rgba(255, 255, 255, 0.95)',
        'rgba(255, 255, 255, 0.80)',
        'rgba(255, 255, 255, 0.65)',
        'rgba(255, 249, 241, 0.85)',
        'rgba(240, 120, 34, 0.75)'
      ];

      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        particles.push({
          x: hx,
          y: hy,
          homeX: hx,
          homeY: hy,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.random() * 1.8 + 1.2,
          color: palette[Math.floor(Math.random() * palette.length)],
          baseAlpha: Math.random() * 0.35 + 0.55,
          phaseOffset: Math.random() * Math.PI * 2
        });
      }

      let tick = 0;
      // Full cycle period: approx 480 frames (~8 seconds at 60fps)
      const CYCLE_LENGTH = 480;

      const renderParticles = () => {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, width, height);

        tick = (tick + 1) % CYCLE_LENGTH;
        const progress = tick / CYCLE_LENGTH; // 0 to 1

        // Determine CTA target position
        let targetX = width * 0.5;
        let targetY = height * 0.72;
        if (targetRef?.current && canvas) {
          const btnRect = targetRef.current.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          targetX = btnRect.left + btnRect.width / 2 - canvasRect.left;
          targetY = btnRect.top + btnRect.height / 2 - canvasRect.top;
        }

        // Calculate cycle phase weightings:
        // Phase 1 (0.00 - 0.25): Scattered ambient drift
        // Phase 2 (0.25 - 0.52): Convergence towards CTA
        // Phase 3 (0.52 - 0.72): Congregated focus & subtle CTA button prominence glow
        // Phase 4 (0.72 - 1.00): Gentle scatter outward back to banner
        let convergenceWeight = 0;
        let ctaPopWeight = 0;

        if (progress < 0.25) {
          // Pure scatter drift
          convergenceWeight = 0;
          ctaPopWeight = 0;
        } else if (progress < 0.52) {
          // Smooth ease into convergence
          const t = (progress - 0.25) / 0.27;
          convergenceWeight = t * t * (3 - 2 * t); // smoothstep
          ctaPopWeight = Math.max(0, (t - 0.6) / 0.4);
        } else if (progress < 0.72) {
          // Fully assembled around CTA button, CTA is subtly prominent
          convergenceWeight = 1;
          const t = (progress - 0.52) / 0.2;
          ctaPopWeight = 0.8 + Math.sin(t * Math.PI) * 0.2; // gentle breathing prominence
        } else {
          // Smooth release back into scattered banner
          const t = (progress - 0.72) / 0.28;
          convergenceWeight = 1 - (t * t * (3 - 2 * t));
          ctaPopWeight = Math.max(0, 1 - t * 2.5);
        }

        // Subtly pop out CTA area with soft warm halo
        if (ctaPopWeight > 0.05) {
          const glowRadius = Math.min(width, height) * 0.28;
          const halo = ctx.createRadialGradient(targetX, targetY, 15, targetX, targetY, glowRadius);
          halo.addColorStop(0, `rgba(240, 120, 34, ${0.22 * ctaPopWeight})`);
          halo.addColorStop(0.4, `rgba(255, 255, 255, ${0.10 * ctaPopWeight})`);
          halo.addColorStop(1, 'rgba(23, 59, 117, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(targetX, targetY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ambient banner depth glow (always subtle)
        const ambientGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          10,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.65
        );
        ambientGrad.addColorStop(0, 'rgba(36, 88, 166, 0.12)');
        ambientGrad.addColorStop(0.7, 'rgba(23, 59, 117, 0.04)');
        ambientGrad.addColorStop(1, 'rgba(23, 59, 117, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, width, height);

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Ambient scattered wandering
          p.homeX += p.vx;
          p.homeY += p.vy;
          if (p.homeX < 0) p.homeX = width;
          if (p.homeX > width) p.homeX = 0;
          if (p.homeY < 0) p.homeY = height;
          if (p.homeY > height) p.homeY = 0;

          // Target orbital location around CTA button
          const angle = p.phaseOffset + tick * 0.02;
          const orbitRadius = 45 + ((i % 5) * 12);
          const ctaX = targetX + Math.cos(angle) * orbitRadius;
          const ctaY = targetY + Math.sin(angle) * (orbitRadius * 0.45); // slight elliptical squish

          // Interpolate current position based on convergenceWeight
          p.x = p.homeX * (1 - convergenceWeight) + ctaX * convergenceWeight;
          p.y = p.homeY * (1 - convergenceWeight) + ctaY * convergenceWeight;

          // Particle twinkle / opacity
          const twinkle = Math.sin(tick * 0.05 + p.phaseOffset) * 0.25;
          const alpha = Math.min(1, Math.max(0.15, (p.baseAlpha + twinkle)));

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Delicate soft glow around brighter particles
          if (p.size > 2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
          }
          ctx.restore();
        }

        animFrameRef.current = requestAnimationFrame(renderParticles);
      };

      renderParticles();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }

    // =========================================================================
    // MODE B: KINETIC AURORA VECTOR RIBBONS (Retained existing option)
    // =========================================================================
    let phase = 0;
    const renderRibbons = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      phase += 0.012;

      // Ambient depth glow
      const bgGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.65,
        20,
        width * 0.5,
        height * 0.65,
        Math.max(width, height) * 0.7
      );
      bgGlow.addColorStop(0, 'rgba(240, 120, 34, 0.12)');
      bgGlow.addColorStop(0.4, 'rgba(36, 88, 166, 0.15)');
      bgGlow.addColorStop(1, 'rgba(23, 59, 117, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Flowing Ribbon Wave A
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      for (let x = 0; x <= width; x += 15) {
        const y =
          height * 0.58 +
          Math.sin(x * 0.0035 + phase) * 45 +
          Math.cos(x * 0.007 - phase * 0.8) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const waveGradA = ctx.createLinearGradient(0, height * 0.4, width, height);
      waveGradA.addColorStop(0, 'rgba(36, 88, 166, 0.22)');
      waveGradA.addColorStop(1, 'rgba(23, 59, 117, 0.08)');
      ctx.fillStyle = waveGradA;
      ctx.fill();

      // Flowing Ribbon Wave B
      ctx.beginPath();
      ctx.moveTo(0, height * 0.72);
      for (let x = 0; x <= width; x += 15) {
        const y =
          height * 0.72 +
          Math.sin(x * 0.0045 - phase * 1.2) * 35 +
          Math.cos(x * 0.002 + phase) * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const waveGradB = ctx.createLinearGradient(0, height * 0.5, width, height);
      waveGradB.addColorStop(0, 'rgba(240, 120, 34, 0.18)');
      waveGradB.addColorStop(0.5, 'rgba(240, 120, 34, 0.08)');
      waveGradB.addColorStop(1, 'rgba(23, 59, 117, 0)');
      ctx.fillStyle = waveGradB;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(renderRibbons);
    };

    renderRibbons();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isEnabled, animType]);

  if (!isEnabled) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
};
