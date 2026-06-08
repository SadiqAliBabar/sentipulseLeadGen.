import { useEffect, useState } from "react";

export default function Particles({ isDarkMode }: { isDarkMode: boolean }) {
  const [particles, setParticles] = useState<Array<{ 
    id: number; top: number; left: number; size: number; duration: number; delay: number; type: 'dot' | 'star'; opacity: number 
  }>>([]);

  useEffect(() => {
    // Generate random particles (mix of small distant dots and distinct 4-point stars)
    const newParticles = Array.from({ length: 80 }).map((_, i) => {
      const isStar = Math.random() > 0.8; // 20% are true stars
      const size = isStar ? Math.random() * 8 + 8 : Math.random() * 2.5 + 1; // Stars: 8-16px, Dots: 1-3.5px
      return {
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: size,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        type: isStar ? 'star' : 'dot',
        opacity: isStar ? 0.5 + Math.random() * 0.5 : 0.3 + Math.random() * 0.4,
      };
    });
    setParticles(newParticles);
  }, []);

  if (!isDarkMode) return null;

  const starSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,0 55,45 100,50 55,55 50,100 45,55 0,50 45,45" fill="white" /></svg>`;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${p.type === 'dot' ? 'rounded-full' : ''}`}
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            backgroundColor: p.type === 'dot' ? 'white' : 'transparent',
            backgroundImage: p.type === 'star' ? `url('${starSvg}')` : 'none',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            animation: `float-particle ${p.duration}s infinite ease-in-out alternate`,
            animationDelay: `${p.delay}s`,
            boxShadow: p.type === 'dot' ? `0 0 ${p.size * 2}px rgba(255, 255, 255, 0.4)` : 'none',
            filter: p.type === 'star' ? `drop-shadow(0 0 4px rgba(255,255,255,0.8))` : 'none',
          }}
        />
      ))}
    </div>
  );
}
