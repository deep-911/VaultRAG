import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, File, FolderOpen, Image, Code, Table } from 'lucide-react';

const FILE_TYPES = [
  { Icon: FileText, color: '#ef4444', label: 'PDF' },      // Red
  { Icon: File, color: '#3b82f6', label: 'DOC' },       // Blue
  { Icon: Table, color: '#22c55e', label: 'Excel' },     // Green
  { Icon: Code, color: '#10b981', label: 'Code' },      // Teal
  { Icon: Image, color: '#f472b6', label: 'Image' },     // Pink
  { Icon: FolderOpen, color: '#f59e0b', label: 'Folder' },  // Amber
  { Icon: FileText, color: '#8b5cf6', label: 'Notebook' },  // Purple
  { Icon: File, color: '#06b6d4', label: 'Text' },      // Cyan
];

const WAVE_SIZE = 6;         // particles per wave
const WAVE_INTERVAL = 2200;  // ms between waves

export default function SearchingAnimation() {
  const [waves, setWaves] = useState([]);
  const waveCounter = useRef(0);

  // Get the input bar position so particles originate from it
  const getOrigin = useCallback(() => {
    const inputBar = document.querySelector('.input-bar__container');
    if (inputBar) {
      const rect = inputBar.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    // Fallback: center-bottom of screen
    return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
  }, []);

  // Spawn a new wave of particles
  const spawnWave = useCallback(() => {
    const origin = getOrigin();
    const currentWave = waveCounter.current;
    waveCounter.current += 1;

    const newParticles = Array.from({ length: WAVE_SIZE }, (_, i) => {
      const fileType = FILE_TYPES[(currentWave * WAVE_SIZE + i) % FILE_TYPES.length];
      // Spread angle: fan out from origin, mostly upward
      const angleSpread = Math.PI * 0.8; // ~144° arc upward
      const baseAngle = -Math.PI / 2; // straight up
      const angle = baseAngle + (Math.random() - 0.5) * angleSpread;
      const distance = 350 + Math.random() * 450; // how far they travel
      const endX = origin.x + Math.cos(angle) * distance;
      const endY = origin.y + Math.sin(angle) * distance;
      const size = 16 + Math.random() * 14;
      const duration = 2.3 + Math.random() * 1.0; // 2.2–3.2s one-shot
      const stagger = i * 0.08; // slight stagger within wave
      const rotation = -20 + Math.random() * 40;

      return {
        id: `w${currentWave}-p${i}`,
        ...fileType,
        originX: origin.x,
        originY: origin.y,
        endX,
        endY,
        size,
        duration,
        stagger,
        rotation,
      };
    });
    setWaves((prev) => [...prev, ...newParticles]);
  }, [getOrigin]);

  // Spawn initial wave immediately, then on interval
  useEffect(() => {
    spawnWave();
    const interval = setInterval(spawnWave, WAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [spawnWave]);

  // Clean up old particles that have finished animating
  useEffect(() => {
    const cleanup = setInterval(() => {
      setWaves((prev) => {
        if (prev.length > WAVE_SIZE * 4) {
          return prev.slice(-WAVE_SIZE * 3);
        }
        return prev;
      });
    }, 3000);
    return () => clearInterval(cleanup);
  }, []);

  return (
    <div className="searching-animation" aria-hidden="true">
      {waves.map((p) => (
        <span
          key={p.id}
          className="searching-animation__particle"
          style={{
            left: `${p.originX}px`,
            top: `${p.originY}px`,
            color: p.color,
            '--end-x': `${p.endX - p.originX}px`,
            '--end-y': `${p.endY - p.originY}px`,
            '--rotation': `${p.rotation}deg`,
            animationDelay: `${p.stagger}s`,
            animationDuration: `${p.duration}s`,
            filter: `drop-shadow(0 0 8px ${p.color}66)`,
          }}
        >
          <p.Icon style={{ width: p.size, height: p.size }} />
        </span>
      ))}
    </div>
  );
}
