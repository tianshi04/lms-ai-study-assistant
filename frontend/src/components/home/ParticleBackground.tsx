"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  color: string;
}

interface ParticleBackgroundProps {
  className?: string;
  maxParticles?: number;
}

export function ParticleBackground({ className = "", maxParticles = 65 }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    // Mouse state
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 140,
    };

    // Color palette matching LMS theme tokens (Primary, Secondary, Accent)
    const colorOptions = [
      "rgba(37, 99, 235, ", // Primary blue
      "rgba(124, 58, 237, ", // Violet / Tertiary
      "rgba(14, 165, 233, ", // Sky / Info
      "rgba(99, 102, 241, ", // Indigo
    ];

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      width = parent.clientWidth;
      height = parent.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      // Scale particle density according to viewport area
      const area = width * height;
      const calculatedCount = Math.min(Math.floor(area / 14000), maxParticles);
      const count = Math.max(calculatedCount, 25);

      particles = [];
      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2 + 1.2;
        const baseAlpha = Math.random() * 0.45 + 0.25;
        const colorPrefix = colorOptions[Math.floor(Math.random() * colorOptions.length)];

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius,
          alpha: baseAlpha,
          baseAlpha,
          color: colorPrefix,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const connectionDistance = 110;
      const connectionDistanceSq = connectionDistance * connectionDistance;

      // Update & render particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce on boundaries with padding
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse distance & interactive push/glow effect
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
        const mouseRadiusSq = mouse.radius * mouse.radius;

        if (distMouseSq < mouseRadiusSq) {
          const distMouse = Math.sqrt(distMouseSq);
          const force = (mouse.radius - distMouse) / mouse.radius;
          // Soft subtle glow boost on hover
          p.alpha = Math.min(p.baseAlpha + force * 0.4, 0.9);
        } else {
          p.alpha = p.baseAlpha;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();

        // Connect with nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < connectionDistanceSq) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / connectionDistance) * 0.25;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor
        if (distMouseSq < mouseRadiusSq) {
          const dist = Math.sqrt(distMouseSq);
          const lineAlpha = (1 - dist / mouse.radius) * 0.35;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(37, 99, 235, ${lineAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // Attach observers and events
    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
    }

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [maxParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
