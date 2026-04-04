import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CursorOrbs() {
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);

  // Primary orb: moderate stiffness, follows closely
  const primaryX = useSpring(mouseX, { stiffness: 80, damping: 25, mass: 0.5 });
  const primaryY = useSpring(mouseY, { stiffness: 80, damping: 25, mass: 0.5 });

  // Secondary orb: softer spring, lags behind more
  const secondaryX = useSpring(mouseX, { stiffness: 40, damping: 20, mass: 1 });
  const secondaryY = useSpring(mouseX, { stiffness: 40, damping: 20, mass: 1 });
  const secondaryYActual = useSpring(mouseY, { stiffness: 40, damping: 20, mass: 1 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <>
      <motion.div
        className="cursor-orb cursor-orb--primary"
        style={{
          x: primaryX,
          y: primaryY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
      <motion.div
        className="cursor-orb cursor-orb--secondary"
        style={{
          x: secondaryX,
          y: secondaryYActual,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </>
  );
}
