import React, { useEffect, useRef, useState, MouseEvent, TouchEvent } from "react";

export interface AntiGravityCanvasProps {
  key?: string;
  particleCount: number;
  arrangement: "grid" | "scatter";
  particleSize: number;
  mouseRadius: number;
  repulsionStrength: number;
  springStrength: number;
  damping: number; // friction (0.8 - 0.99)
  theme: "teal-pink" | "cyberpunk" | "gold" | "matrix" | "monochrome";
  drawConnections: boolean;
  connectionDistance: number;
  interactionMode: "repel" | "attract" | "orbit";
  glowEnabled: boolean;
  isDarkMode: boolean;
  onFpsUpdate?: (fps: number) => void;
  externalMouse?: { x: number; y: number; active: boolean };
  externalClick?: { x: number; y: number; time: number };
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  density: number;
  angle: number; // For orbit mode or random animations
}

export default function AntiGravityCanvas({
  particleCount = 200,
  arrangement = "scatter",
  particleSize = 2,
  mouseRadius = 120,
  repulsionStrength = 8,
  springStrength = 0.04,
  damping = 0.9,
  theme = "teal-pink",
  drawConnections = true,
  connectionDistance = 80,
  interactionMode = "repel",
  glowEnabled = false,
  isDarkMode = false,
  onFpsUpdate,
  externalMouse,
  externalClick,
}: AntiGravityCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  
  // Shockwave burst states
  const shockwavesRef = useRef<Array<{ x: number; y: number; radius: number; maxRadius: number; force: number; speed: number }>>([]);

  const lastClickTimeRef = useRef<number>(0);

  // Sync external mouse position to internal ref
  useEffect(() => {
    if (externalMouse) {
      mouseRef.current = externalMouse;
    }
  }, [externalMouse]);

  // Sync external clicks to trigger shockwaves
  useEffect(() => {
    if (externalClick && externalClick.time > lastClickTimeRef.current) {
      lastClickTimeRef.current = externalClick.time;
      shockwavesRef.current.push({
        x: externalClick.x,
        y: externalClick.y,
        radius: 5,
        maxRadius: 280,
        force: 22,
        speed: 8,
      });
    }
  }, [externalClick]);

  // Get color palette based on theme
  const getThemeColors = (isDark: boolean) => {
    switch (theme) {
      case "teal-pink":
        return isDark
          ? ["#2dd4bf", "#f43f5e", "#38bdf8", "#ec4899"]
          : ["#008378", "#d946ef", "#0284c7", "#db2777"];
      case "cyberpunk":
        return ["#00f0ff", "#ff007f", "#9d00ff", "#ffea00"];
      case "gold":
        return ["#f59e0b", "#fbbf24", "#d97706", "#f59e0b"];
      case "matrix":
        return ["#22c55e", "#4ade80", "#15803d", "#86efac"];
      case "monochrome":
      default:
        return isDark
          ? ["#ffffff", "#e2e8f0", "#94a3b8", "#cbd5e1"]
          : ["#0f172a", "#334155", "#475569", "#64748b"];
    }
  };

  // Init particles based on container dimensions
  const initParticles = (width: number, height: number) => {
    const colors = getThemeColors(isDarkMode);
    const newParticles: Particle[] = [];

    if (arrangement === "grid") {
      // Calculate spacing based on particleCount to fill the area
      const area = width * height;
      const spacing = Math.sqrt(area / particleCount);
      const cols = Math.floor(width / spacing);
      const rows = Math.floor(height / spacing);
      
      // Center the grid
      const xOffset = (width - cols * spacing) / 2 + spacing / 2;
      const yOffset = (height - rows * spacing) / 2 + spacing / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = xOffset + c * spacing;
          const y = yOffset + r * spacing;
          
          if (x < width && y < height) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            newParticles.push({
              x,
              y,
              baseX: x,
              baseY: y,
              vx: 0,
              vy: 0,
              size: particleSize * (0.8 + Math.random() * 0.4),
              color,
              density: Math.random() * 15 + 5,
              angle: Math.random() * Math.PI * 2,
            });
          }
        }
      }
    } else {
      // Random scatter distribution
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        newParticles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          size: particleSize * (0.8 + Math.random() * 0.4),
          color,
          density: Math.random() * 15 + 5,
          angle: Math.random() * Math.PI * 2,
        });
      }
    }

    particlesRef.current = newParticles;
  };

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const canvas = canvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Re-initialize particles to fit the new size
      initParticles(rect.width, rect.height);
    };

    // Initial resize and listener
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // ResizeObserver for container resizing
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [particleCount, arrangement, particleSize, theme, isDarkMode]);

  // Handle Mouse Events
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Create a shockwave burst
    shockwavesRef.current.push({
      x: clickX,
      y: clickY,
      radius: 5,
      maxRadius: 280,
      force: 22,
      speed: 8,
    });
  };

  // Touch support for mobile devices
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
      active: true,
    };
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
      active: true,
    };
  };

  const handleTouchEnd = () => {
    mouseRef.current.active = false;
  };

  // Main Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsInterval = lastTime;

    const render = (time: number) => {
      // Calculate FPS
      frameCount++;
      if (time - fpsInterval >= 1000) {
        if (onFpsUpdate) {
          onFpsUpdate(Math.round((frameCount * 1000) / (time - fpsInterval)));
        }
        frameCount = 0;
        fpsInterval = time;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      const particles = particlesRef.current;
      const shockwaves = shockwavesRef.current;

      // Update shockwaves
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const wave = shockwaves[s];
        wave.radius += wave.speed;
        
        // draw ripple ring
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = theme === "teal-pink"
          ? `rgba(217, 70, 239, ${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.3})`
          : theme === "cyberpunk"
          ? `rgba(0, 240, 255, ${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.3})`
          : theme === "gold"
          ? `rgba(251, 191, 36, ${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.3})`
          : `rgba(74, 222, 128, ${Math.max(0, 1 - wave.radius / wave.maxRadius) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        if (wave.radius >= wave.maxRadius) {
          shockwaves.splice(s, 1);
        }
      }

      // 1. Draw connections first (beneath particles)
      if (drawConnections && particles.length > 0) {
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            
            // Optimization: horizontal bounds check
            const dx = p1.x - p2.x;
            if (Math.abs(dx) > connectionDistance) continue;
            
            // vertical bounds check
            const dy = p1.y - p2.y;
            if (Math.abs(dy) > connectionDistance) continue;

            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * (isDarkMode ? 0.15 : 0.25);
              
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              
              // Gradient-like line styling based on average coordinates
              ctx.strokeStyle = theme === "teal-pink"
                ? `rgba(0, 131, 120, ${alpha})`
                : theme === "cyberpunk"
                ? `rgba(157, 0, 255, ${alpha})`
                : theme === "gold"
                ? `rgba(217, 119, 6, ${alpha})`
                : theme === "matrix"
                ? `rgba(34, 197, 94, ${alpha})`
                : isDarkMode
                ? `rgba(255, 255, 255, ${alpha})`
                : `rgba(15, 23, 42, ${alpha})`;
            }
          }
        }
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // 2. Update and draw particles
      if (glowEnabled) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = theme === "teal-pink"
          ? "#d946ef"
          : theme === "cyberpunk"
          ? "#00f0ff"
          : theme === "gold"
          ? "#fbbf24"
          : theme === "matrix"
          ? "#4ade80"
          : "#ffffff";
      } else {
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Core physics calculations
        let dx = 0;
        let dy = 0;
        let dist = 0;

        // Apply mouse interaction force
        if (mouse.active) {
          dx = mouse.x - p.x;
          dy = mouse.y - p.y;
          dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius && dist > 0) {
            const force = (mouseRadius - dist) / mouseRadius; // 1 at center, 0 at outer boundary
            
            if (interactionMode === "repel") {
              // Push away
              const forceDirectionX = dx / dist;
              const forceDirectionY = dy / dist;
              
              // Apply repulsion scaling by repulsionStrength and density (mass factor)
              const pushForce = force * repulsionStrength * (p.density * 0.1);
              p.vx -= forceDirectionX * pushForce;
              p.vy -= forceDirectionY * pushForce;
            } else if (interactionMode === "attract") {
              // Pull in
              const forceDirectionX = dx / dist;
              const forceDirectionY = dy / dist;
              
              const pullForce = force * repulsionStrength * (p.density * 0.1);
              p.vx += forceDirectionX * pullForce;
              p.vy += forceDirectionY * pullForce;
            } else if (interactionMode === "orbit") {
              // Rotate perpendicular to mouse direction
              const tangentX = -dy / dist;
              const tangentY = dx / dist;
              
              // Apply tangential force plus a slight inward pull to stabilize orbit
              const orbitForce = force * repulsionStrength * 0.8;
              p.vx += tangentX * orbitForce + (dx / dist) * orbitForce * 0.2;
              p.vy += tangentY * orbitForce + (dy / dist) * orbitForce * 0.2;
            }
          }
        }

        // Apply click-triggered shockwaves
        for (let s = 0; s < shockwaves.length; s++) {
          const wave = shockwaves[s];
          const wdx = p.x - wave.x;
          const wdy = p.y - wave.y;
          const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
          
          // If particle is caught in the expanding ring thickness (e.g. within 30px)
          const ringThickness = 40;
          if (wdist > wave.radius - ringThickness && wdist < wave.radius + ringThickness) {
            const pushDirX = wdx / (wdist || 1);
            const pushDirY = wdy / (wdist || 1);
            
            // Falloff force based on distance from the wave origin
            const strengthFactor = (1 - wave.radius / wave.maxRadius);
            const pushVal = wave.force * strengthFactor;
            p.vx += pushDirX * pushVal;
            p.vy += pushDirY * pushVal;
          }
        }

        // Easing / Spring constant physics: pull back to original/base spot
        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        
        // Add spring force to velocity
        p.vx += dxBase * springStrength;
        p.vy += dyBase * springStrength;

        // Apply damping (friction)
        p.vx *= damping;
        p.vy *= damping;

        // Update coordinate
        p.x += p.vx;
        p.y += p.vy;

        // Visual enhancement: adjust opacity or size if displaced
        const displacement = Math.sqrt(dxBase * dxBase + dyBase * dyBase);
        const displacementFactor = Math.min(1, displacement / 150); // Normalized 0-1
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Color shifts based on displacement
        if (theme === "teal-pink" && displacement > 10) {
          // Fade from base teal to secondary pink when pushed
          ctx.fillStyle = `color-mix(in srgb, ${p.color} ${100 - displacementFactor * 100}%, ${isDarkMode ? '#ec4899' : '#d946ef'} ${displacementFactor * 100}%)`;
        } else if (theme === "cyberpunk" && displacement > 10) {
          // Fade from cyan to neon purple
          ctx.fillStyle = `color-mix(in srgb, ${p.color} ${100 - displacementFactor * 100}%, #ff007f ${displacementFactor * 100}%)`;
        } else {
          ctx.fillStyle = p.color;
        }
        
        ctx.fill();
      }

      // 3. Draw mouse cursor range ring for feedback
      if (mouse.active) {
        ctx.shadowBlur = 0; // reset shadow for ring
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouseRadius, 0, Math.PI * 2);
        
        // Ring color based on theme
        const strokeStyle = theme === "teal-pink"
          ? "rgba(0, 131, 120, 0.15)"
          : theme === "cyberpunk"
          ? "rgba(0, 240, 255, 0.15)"
          : theme === "gold"
          ? "rgba(245, 158, 11, 0.15)"
          : theme === "matrix"
          ? "rgba(34, 197, 94, 0.15)"
          : isDarkMode
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(15, 23, 42, 0.08)";
          
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line looks very tech-premium
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw small glowing core dot under cursor
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = theme === "teal-pink"
          ? "#008378"
          : theme === "cyberpunk"
          ? "#00f0ff"
          : theme === "gold"
          ? "#fbbf24"
          : theme === "matrix"
          ? "#4ade80"
          : isDarkMode
          ? "#ffffff"
          : "#0f172a";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    mouseRadius,
    repulsionStrength,
    springStrength,
    damping,
    theme,
    drawConnections,
    connectionDistance,
    interactionMode,
    glowEnabled,
    isDarkMode,
    onFpsUpdate,
  ]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-transparent select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
