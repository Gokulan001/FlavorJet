"use client";

import { useRef, useEffect, useCallback } from "react";
import type { VoiceState } from "./types";

interface SineWaveProps {
  state: VoiceState;
  analyserNode?: AnalyserNode | null;
  height?: number;
}

const GOLD: [number, number, number] = [254, 161, 22];

export default function SineWave({ state, analyserNode, height = 220 }: SineWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const phaseRef = useRef(0);
  const audioDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128) as Uint8Array<ArrayBuffer>);
  const dimsRef = useRef({ w: 600, h: height });

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      let audioLevel = 0;
      if (analyserNode && (state === "listening" || state === "speaking")) {
        analyserNode.getByteFrequencyData(audioDataRef.current);
        const sum = audioDataRef.current.reduce((a, b) => a + b, 0);
        audioLevel = sum / (audioDataRef.current.length * 255);
      }

      let amplitude: number;
      let phaseSpeed: number;
      let alpha: number;
      let lineWidth: number;

      switch (state) {
        case "idle":
          amplitude = 14 + Math.sin(t * 0.5) * 5;
          phaseSpeed = 0.022;
          alpha = 0.45;
          lineWidth = 2;
          break;
        case "listening":
          amplitude = 22 + audioLevel * 80;
          phaseSpeed = 0.055 + audioLevel * 0.045;
          alpha = 0.75 + audioLevel * 0.25;
          lineWidth = 2.5;
          break;
        case "processing":
          amplitude = 16 + Math.sin(t * 4) * 7;
          phaseSpeed = 0.09;
          alpha = 0.5 + Math.abs(Math.sin(t * 3)) * 0.35;
          lineWidth = 2;
          break;
        case "speaking":
          amplitude = 20 + audioLevel * 65;
          phaseSpeed = 0.042 + audioLevel * 0.032;
          alpha = 0.7 + audioLevel * 0.3;
          lineWidth = 2.5;
          break;
        default:
          amplitude = 14;
          phaseSpeed = 0.022;
          alpha = 0.45;
          lineWidth = 2;
      }

      phaseRef.current += phaseSpeed;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, w, h);

      const cy = h / 2;

      // Four layered waves for richness
      const layers = [
        { yOffset: -24, ampScale: 0.35, alphaScale: 0.18, phaseOffset: Math.PI * 0.3 },
        { yOffset: -10, ampScale: 0.65, alphaScale: 0.55, phaseOffset: 0 },
        { yOffset: 0,   ampScale: 1.0,  alphaScale: 1.0,  phaseOffset: 0 },
        { yOffset: 10,  ampScale: 0.65, alphaScale: 0.55, phaseOffset: Math.PI },
        { yOffset: 24,  ampScale: 0.35, alphaScale: 0.18, phaseOffset: Math.PI * 1.3 },
      ];

      for (const layer of layers) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${alpha * layer.alphaScale})`;
        ctx.lineWidth = lineWidth * (layer.alphaScale < 0.6 ? 0.65 : layer.alphaScale < 0.9 ? 0.85 : 1);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const points = 200;
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * w;
          const xNorm = (i / points) * Math.PI * 5.5;
          // Smooth edge fade — no abrupt starts/ends
          const edgeFade = Math.sin((i / points) * Math.PI);

          let y = cy + layer.yOffset;
          y += Math.sin(xNorm - phase + layer.phaseOffset) * amplitude * layer.ampScale * edgeFade;
          y += Math.sin(xNorm * 1.7 - phase * 1.4 + layer.phaseOffset) * amplitude * 0.3 * layer.ampScale * edgeFade;

          if (audioLevel > 0.02) {
            const binIdx = Math.floor((i / points) * audioDataRef.current.length);
            const freqVal = audioDataRef.current[binIdx] / 255;
            y += Math.sin(xNorm * 3.2 - phase * 2.1) * freqVal * 22 * edgeFade;
          }

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Wide glow band
      const glowH = amplitude * 2.5 + 30;
      const glow = ctx.createLinearGradient(0, cy - glowH, 0, cy + glowH);
      glow.addColorStop(0, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, 0)`);
      glow.addColorStop(0.5, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${alpha * 0.07})`);
      glow.addColorStop(1, `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, cy - glowH, w, glowH * 2);

      // Processing: traveling dots along main wave
      if (state === "processing") {
        for (let i = 0; i < 6; i++) {
          const dotPhase = phase + (i / 6) * Math.PI * 5.5;
          const dotX = (((dotPhase % (Math.PI * 5.5)) / (Math.PI * 5.5)) * w + w) % w;
          const dotXNorm = (dotX / w) * Math.PI * 5.5;
          const ef = Math.sin((dotX / w) * Math.PI);
          const dotY = cy + Math.sin(dotXNorm - phase) * amplitude * ef;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, 0.9)`;
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

    function resize() {
      if (!canvas) return;
      const w = canvas.parentElement?.clientWidth ?? 600;
      const h = height;
      dimsRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    if (analyserNode) {
      audioDataRef.current = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    function animate() {
      const { w, h } = dimsRef.current;
      draw(ctx!, w, h);
      animFrameRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [height, draw, analyserNode]);

  return <canvas ref={canvasRef} className="pointer-events-none block" style={{ height }} />;
}
