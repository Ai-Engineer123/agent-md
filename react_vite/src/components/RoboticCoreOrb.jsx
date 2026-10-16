import React, { useState, useEffect, useRef } from 'react';

export const RoboticCoreOrb = ({ isSpeaking = false, onInteract }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const orbRef = useRef(null);

  // Smoothly track mouse cursor for realistic robotic eye gazing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      // Clamp between -12px and 12px
      setMousePos({
        x: Math.max(-12, Math.min(12, deltaX * 12)),
        y: Math.max(-12, Math.min(12, deltaY * 12)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={orbRef}
      onClick={onInteract}
      className="orb-stage"
      title="A.E.G.I.S. Core Matrix // Click to Trigger Voice Greeting"
    >
      {/* Outer Ambient Glow Aura */}
      <div className={`orb-aura ${isSpeaking ? 'orb-aura-speaking' : ''}`} />

      {/* Ring 1: Outer Clockwise Titanium Ring */}
      <div className="gimbal-ring ring-outer">
        <div className="ring-sensor sensor-cyan" />
      </div>

      {/* Ring 2: Middle Counter-Rotating Holographic Ring */}
      <div className="gimbal-ring ring-middle">
        <div className="ring-sensor sensor-teal" />
      </div>

      {/* Ring 3: Inner Dotted Orbital Track */}
      <div className="gimbal-ring ring-inner" />

      {/* Center Spherical Titanium Core Housing */}
      <div className={`core-sphere ${isSpeaking ? 'core-sphere-pulse' : ''}`}>
        {/* Optical Sensor Well */}
        <div className="sensor-well">
          {/* Cybernetic Pupil Lens (Tracks Cursor) */}
          <div
            className="pupil-lens"
            style={{
              transform: `translate(calc(-50% + ${mousePos.x}px), calc(-50% + ${mousePos.y}px))`,
            }}
          >
            {/* Center Quantum Glow Dot */}
            <div className={`quantum-dot ${isSpeaking ? 'quantum-dot-active' : ''}`} />
            {/* Crosshair target reticle */}
            <div className="reticle-h" />
            <div className="reticle-v" />
          </div>

          {/* Holographic Specular Reflection */}
          <div className="specular-glint" />
        </div>
      </div>
    </div>
  );
};
