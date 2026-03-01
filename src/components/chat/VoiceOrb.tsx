"use client";

import { useRef, useEffect, useCallback } from "react";
import type { VoiceState } from "./types";

interface VoiceOrbProps {
  state: VoiceState;
  analyserNode?: AnalyserNode | null;
  size?: number;
}

// ── 3D Mesh Waveform — layered wave curves with audio reactivity ────────────
const GOLD = [254, 161, 22];
const GOLD_DIM = [200, 130, 20];

export default function VoiceOrb({ state, analyserNode, size = 220 }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const audioDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(64));

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      timeRef.current += 0.012;
      const t = timeRef.current;

      let audioLevel = 0;
      const freqBands: number[] = [];
      if (analyserNode && (state === "listening" || state === "speaking")) {
        analyserNode.getByteFrequencyData(audioDataRef.current);
        const sum = audioDataRef.current.reduce((a, b) => a + b, 0);
        audioLevel = sum / (audioDataRef.current.length * 255);
        for (let i = 0; i < 8; i++) {
          const idx = Math.floor((i / 8) * audioDataRef.current.length);
          freqBands.push(audioDataRef.current[idx] / 255);
        }
      } else {
        for (let i = 0; i < 8; i++) freqBands.push(0);
      }

      ctx.clearRect(0, 0, w, h);

      // State parameters
      const waveCount = 5;
      let amplitude = 12;
      let speed = 0.8;
      let glowAlpha = 0.15;
      let lineAlpha = 0.3;

      switch (state) {
        case "idle":
          amplitude = 8; speed = 0.6; glowAlpha = 0.08; lineAlpha = 0.2;
          break;
        case "listening":
          amplitude = 15 + audioLevel * 30; speed = 1.2;
          glowAlpha = 0.15 + audioLevel * 0.25; lineAlpha = 0.3 + audioLevel * 0.3;
          break;
        case "processing":
          amplitude = 12; speed = 2; glowAlpha = 0.2; lineAlpha = 0.35;
          break;
        case "speaking":
          amplitude = 12 + audioLevel * 25; speed = 1;
          glowAlpha = 0.2 + audioLevel * 0.2; lineAlpha = 0.35 + audioLevel * 0.25;
          break;
      }

      const cx = w / 2;
      const cy = h / 2;

      // Center glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.4);
      glowGrad.addColorStop(0, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${glowAlpha})`);
      glowGrad.addColorStop(0.5, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${glowAlpha * 0.3})`);
      glowGrad.addColorStop(1, "rgba(254, 161, 22, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw layered mesh waves
      for (let wave = 0; wave < waveCount; wave++) {
        const waveProgress = wave / (waveCount - 1);
        const yOffset = cy + (waveProgress - 0.5) * 60;
        const centerProximity = 1 - Math.abs(waveProgress - 0.5) * 2;
        const depthAlpha = 0.15 + centerProximity * lineAlpha;
        const lineWidth = 1 + centerProximity * 1.5;

        const r = Math.round(GOLD_DIM[0] + (GOLD[0] - GOLD_DIM[0]) * centerProximity);
        const g = Math.round(GOLD_DIM[1] + (GOLD[1] - GOLD_DIM[1]) * centerProximity);
        const b = Math.round(GOLD_DIM[2] + (GOLD[2] - GOLD_DIM[2]) * centerProximity);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${depthAlpha})`;
        ctx.lineWidth = lineWidth;

        const points = 80;
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * w;
          const xNorm = (i / points) * Math.PI * 2;
          const distFromCenter = Math.abs(x - cx) / (w * 0.5);
          const envelope = Math.cos(distFromCenter * Math.PI * 0.5) ** 2;

          let y = yOffset;
          y += Math.sin(xNorm * 2 + t * speed + wave * 0.8) * amplitude * 0.5 * envelope;
          y += Math.sin(xNorm * 3 - t * speed * 0.7 + wave * 1.2) * amplitude * 0.3 * envelope;
          y += Math.sin(xNorm * 5 + t * speed * 1.3 + wave * 0.5) * amplitude * 0.2 * envelope;

          if (audioLevel > 0.02) {
            const bandIdx = Math.floor((i / points) * freqBands.length);
            const freq = freqBands[Math.min(bandIdx, freqBands.length - 1)];
            y += Math.sin(xNorm * 4 + t * 2) * freq * 20 * envelope;
          }

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Fill under center wave
        if (wave === Math.floor(waveCount / 2)) {
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          const fillGrad = ctx.createLinearGradient(0, cy - amplitude, 0, cy + 40);
          fillGrad.addColorStop(0, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${depthAlpha * 0.15})`);
          fillGrad.addColorStop(1, "rgba(254, 161, 22, 0)");
          ctx.fillStyle = fillGrad;
          ctx.fill();
        }
      }

      // Vertical mesh cross-lines (active states only)
      if (state !== "idle") {
        const vLines = 20;
        for (let v = 0; v < vLines; v++) {
          const x = (v / (vLines - 1)) * w;
          const distFromCenter = Math.abs(x - cx) / (w * 0.5);
          if (distFromCenter > 0.85) continue;
          const vAlpha = (1 - distFromCenter) * 0.06 * (0.5 + audioLevel);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${vAlpha})`;
          ctx.lineWidth = 0.5;
          for (let wave = 0; wave < waveCount; wave++) {
            const waveProgress = wave / (waveCount - 1);
            const yOff = cy + (waveProgress - 0.5) * 60;
            const xN = (v / vLines) * Math.PI * 2;
            const env = Math.cos(distFromCenter * Math.PI * 0.5) ** 2;
            let y = yOff;
            y += Math.sin(xN * 2 + t * speed + wave * 0.8) * amplitude * 0.5 * env;
            y += Math.sin(xN * 3 - t * speed * 0.7 + wave * 1.2) * amplitude * 0.3 * env;
            if (wave === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Processing spinner
      if (state === "processing") {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + t * 2;
          const dx = cx + Math.cos(angle) * 30;
          const dy = cy + Math.sin(angle) * 30;
          const dotAlpha = 0.3 + Math.sin(t * 3 + i) * 0.2;
          ctx.beginPath();
          ctx.arc(dx, dy, 2 + Math.sin(t * 2 + i * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${dotAlpha})`;
          ctx.fill();
        }
      }
    },
    [state, analyserNode]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    if (analyserNode) {
      audioDataRef.current = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    function animate() {
      draw(ctx!, size, size);
      animFrameRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [size, draw, analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="pointer-events-none"
    />
  );
}
