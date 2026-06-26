import React, { useEffect, useRef } from 'react';

// ============= Fish species definitions =============
interface FishDef {
  emoji: string;
  size: number;
  speed: number;    // base speed multiplier
  depth: number;     // preferred depth (% from top)
  depthRange: number;// how far it can wander vertically
  turnRate: number;  // how fast it can turn (radians/sec)
  opacity: number;
}

const SPECIES: FishDef[] = [
  { emoji: '🐟', size: 26, speed: 0.6,  depth: 28, depthRange: 18, turnRate: 0.3, opacity: 0.35 },
  { emoji: '🐠', size: 20, speed: 0.45, depth: 55, depthRange: 22, turnRate: 0.4, opacity: 0.28 },
  { emoji: '🐡', size: 24, speed: 0.35, depth: 72, depthRange: 15, turnRate: 0.25, opacity: 0.32 },
  { emoji: '🦈', size: 30, speed: 0.3,  depth: 44, depthRange: 12, turnRate: 0.2, opacity: 0.3  },
];

// ============= Fish instance state =============
interface FishState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  angle: number;       // radians, 0 = facing right
  nextTurnAt: number;  // timestamp for next behavior change
  species: number;     // index into SPECIES
  element: HTMLDivElement;
}

const FISH_COUNT = 8; // total fish instances

// behavior timing range (ms)
const TURN_INTERVAL_MIN = 3000;
const TURN_INTERVAL_MAX = 9000;
const PAUSE_CHANCE = 0.15;
const PAUSE_DURATION_MIN = 800;
const PAUSE_DURATION_MAX = 2500;

function rng(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function OceanFish() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<FishState[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- spawn fish ---
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fishes: FishState[] = [];

    for (let i = 0; i < FISH_COUNT; i++) {
      const sIdx = i % SPECIES.length;
      const sp = SPECIES[sIdx];
      const el = document.createElement('div');
      el.textContent = sp.emoji;
      el.style.position = 'fixed';
      el.style.zIndex = '0';
      el.style.pointerEvents = 'none';
      el.style.fontSize = sp.size + 'px';
      el.style.opacity = String(sp.opacity);
      el.style.willChange = 'transform';
      el.style.lineHeight = '1';
      el.style.filter = i === FISH_COUNT - 1
        ? `drop-shadow(0 0 6px rgba(34,211,238,0.4))`
        : 'none';
      container.appendChild(el);

      const baseY = (sp.depth / 100) * vh + rng(-30, 30);
      const f: FishState = {
        x: rng(-100, vw + 100),
        y: baseY,
        vx: sp.speed * rng(0.5, 1.2) * (Math.random() > 0.5 ? 1 : -1),
        vy: 0,
        targetVx: 0,
        targetVy: 0,
        angle: 0,
        nextTurnAt: performance.now() + rng(TURN_INTERVAL_MIN, TURN_INTERVAL_MAX),
        species: sIdx,
        element: el,
      };
      fishes.push(f);
    }

    fishRefs.current = fishes;
    lastTimeRef.current = performance.now();

    // --- animation loop ---
    function tick(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const f of fishes) {
        const sp = SPECIES[f.species];

        // --- decide new behavior ---
        if (now > f.nextTurnAt) {
          f.nextTurnAt = now + rng(TURN_INTERVAL_MIN, TURN_INTERVAL_MAX);

          if (Math.random() < PAUSE_CHANCE) {
            // pause briefly (hover in place)
            f.targetVx = 0;
            f.targetVy = 0;
            // resume after pause
            const resumeAt = now + rng(PAUSE_DURATION_MIN, PAUSE_DURATION_MAX);
            const origNext = f.nextTurnAt;
            f.nextTurnAt = resumeAt;
            // schedule new direction after pause
            setTimeout(() => {
              f.targetVx = sp.speed * rng(0.4, 1.0) * (Math.random() > 0.5 ? 1 : -1);
              f.targetVy = rng(-0.3, 0.3) * sp.speed;
              f.nextTurnAt = performance.now() + rng(TURN_INTERVAL_MIN, TURN_INTERVAL_MAX);
            }, resumeAt - now);
          } else {
            // new random direction
            f.targetVx = sp.speed * rng(0.4, 1.0) * (Math.random() > 0.5 ? 1 : -1);
            f.targetVy = rng(-0.3, 0.3) * sp.speed;
          }
        }

        // --- steer toward target velocity ---
        const steer = sp.turnRate * 3;
        f.vx += (f.targetVx - f.vx) * steer * dt;
        f.vy += (f.targetVy - f.vy) * steer * dt;

        // --- boundary avoidance (soft margins) ---
        const margin = 60;
        const preferredY = (sp.depth / 100) * vh;
        const maxWander = (sp.depthRange / 100) * vh;

        // horizontal: wrap around with smooth transition
        if (f.x < -120) f.x = vw + 120;
        if (f.x > vw + 120) f.x = -120;

        // vertical: soft spring toward preferred depth
        const distFromPref = f.y - preferredY;
        const springForce = -distFromPref / (maxWander * 0.6);
        f.vy += springForce * 0.8 * dt;

        // hard clamp
        const topBound = preferredY - maxWander;
        const botBound = preferredY + maxWander;
        if (f.y < topBound) f.vy += Math.abs(topBound - f.y) * 0.1;
        if (f.y > botBound) f.vy -= Math.abs(f.y - botBound) * 0.1;
        if (f.y < margin) f.vy += 0.5;
        if (f.y > vh - margin) f.vy -= 0.5;

        // --- update position ---
        f.x += f.vx;
        f.y += f.vy;

        // --- smooth angle toward movement direction ---
        const targetAngle = Math.atan2(f.vy, f.vx);
        let angleDiff = targetAngle - f.angle;
        // normalize to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) !ngleDiff += 2 * Math.PI;
        f.angle += angleDiff * sp.turnRate * dt;

        // --- gentle tail wag (secondary motion) ---
        const wag = Math.sin(now * 0.004 + f.x * 0.1) * 4;
        const roll = Math.cos(now * 0.003 + f.y * 0.08) * 3;

        // --- render ---
        f.element.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${(f.angle * 180) / Math.PI}deg) scaleX(${f.vx < 0.05 ? 1 : 1})`;
        // subtle scale pulse for "breathing"
        const pulse = 1 + Math.sin(now * 0.002 + f.x * 0.05) * 0.04;
        f.element.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${(f.angle * 180 / Math.PI) + wag}deg) scale(${pulse}) scaleX(${f.vx >= 0 ? 1 : -1})`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    // give initial velocities
    for (const f of fishes) {
      const sp = SPECIES[f.species];
      f.targetVx = sp.speed * rng(0.5, 1.0) * (Math.random() > 0.5 ? 1 : -1);
      f.targetVy = rng(-0.2, 0.2) * sp.speed;
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const f of fishes) {
        f.element.remove();
      }
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} />;
}
