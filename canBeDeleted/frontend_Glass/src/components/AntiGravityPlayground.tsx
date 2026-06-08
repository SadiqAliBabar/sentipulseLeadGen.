import { useState } from "react";
import AntiGravityCanvas, { AntiGravityCanvasProps } from "./AntiGravityCanvas";
import { 
  Sparkles, 
  Sliders, 
  Activity, 
  Cpu, 
  Zap, 
  Info, 
  RefreshCw, 
  MousePointer,
  HelpCircle
} from "lucide-react";

interface PlaygroundProps {
  isDarkMode: boolean;
}

export default function AntiGravityPlayground({ isDarkMode }: PlaygroundProps) {
  // Config state
  const [particleCount, setParticleCount] = useState<number>(300);
  const [arrangement, setArrangement] = useState<"grid" | "scatter">("scatter");
  const [particleSize, setParticleSize] = useState<number>(2.5);
  const [mouseRadius, setMouseRadius] = useState<number>(120);
  const [repulsionStrength, setRepulsionStrength] = useState<number>(8);
  const [springStrength, setSpringStrength] = useState<number>(0.04);
  const [damping, setDamping] = useState<number>(0.92);
  const [theme, setTheme] = useState<AntiGravityCanvasProps["theme"]>("teal-pink");
  const [drawConnections, setDrawConnections] = useState<boolean>(true);
  const [connectionDistance, setConnectionDistance] = useState<number>(80);
  const [interactionMode, setInteractionMode] = useState<"repel" | "attract" | "orbit">("repel");
  const [glowEnabled, setGlowEnabled] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [keyReset, setKeyReset] = useState<number>(0); // For force-recreating particles

  // Presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case "spacedust":
        setParticleCount(550);
        setArrangement("scatter");
        setParticleSize(1.5);
        setMouseRadius(100);
        setRepulsionStrength(14);
        setSpringStrength(0.015);
        setDamping(0.96);
        setTheme("cyberpunk");
        setDrawConnections(false);
        setGlowEnabled(true);
        setInteractionMode("repel");
        break;
      case "constellation":
        setParticleCount(220);
        setArrangement("grid");
        setParticleSize(3);
        setMouseRadius(140);
        setRepulsionStrength(7);
        setSpringStrength(0.05);
        setDamping(0.88);
        setTheme("teal-pink");
        setDrawConnections(true);
        setConnectionDistance(90);
        setGlowEnabled(false);
        setInteractionMode("repel");
        break;
      case "gravitywell":
        setParticleCount(450);
        setArrangement("scatter");
        setParticleSize(2);
        setMouseRadius(180);
        setRepulsionStrength(9);
        setSpringStrength(0.03);
        setDamping(0.94);
        setTheme("gold");
        setDrawConnections(false);
        setGlowEnabled(false);
        setInteractionMode("attract");
        break;
      case "quantumorbit":
        setParticleCount(260);
        setArrangement("grid");
        setParticleSize(2.5);
        setMouseRadius(150);
        setRepulsionStrength(6);
        setSpringStrength(0.04);
        setDamping(0.91);
        setTheme("matrix");
        setDrawConnections(true);
        setConnectionDistance(75);
        setGlowEnabled(false);
        setInteractionMode("orbit");
        break;
      case "minimalist":
      default:
        setParticleCount(150);
        setArrangement("scatter");
        setParticleSize(3.5);
        setMouseRadius(110);
        setRepulsionStrength(10);
        setSpringStrength(0.06);
        setDamping(0.89);
        setTheme("monochrome");
        setDrawConnections(true);
        setConnectionDistance(85);
        setGlowEnabled(false);
        setInteractionMode("repel");
        break;
    }
    setKeyReset(prev => prev + 1); // Reset layout trigger
  };

  const handleReset = () => {
    setKeyReset(prev => prev + 1);
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.35s_ease-out]">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#191c1d] dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-[#b5005d] dark:text-pink-400" />
            Anti-Gravity Interactive Sandbox
          </h2>
          <p className="text-xs text-[#3d4947]/75 dark:text-slate-400 font-semibold mt-1">
            Real-time particle sandbox using vector mathematics, Hooke's Law, and spring dynamics.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap gap-2 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <button 
            onClick={() => applyPreset("spacedust")} 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            🌌 Space Dust
          </button>
          <button 
            onClick={() => applyPreset("constellation")} 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            🕸️ Constellation
          </button>
          <button 
            onClick={() => applyPreset("gravitywell")} 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            🕳️ Gravity Well
          </button>
          <button 
            onClick={() => applyPreset("quantumorbit")} 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            ⚛️ Quantum Orbit
          </button>
          <button 
            onClick={() => applyPreset("minimalist")} 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            ⚪ Monochrome
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Canvas Display Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-[4/3] w-full rounded-2xl border border-neutral-200 dark:border-slate-800 bg-[#fefefe] dark:bg-[#080b11] shadow-xl overflow-hidden group">
            {/* Live Canvas Component */}
            <AntiGravityCanvas
              key={`${keyReset}-${arrangement}-${particleCount}-${theme}`}
              particleCount={particleCount}
              arrangement={arrangement}
              particleSize={particleSize}
              mouseRadius={mouseRadius}
              repulsionStrength={repulsionStrength}
              springStrength={springStrength}
              damping={damping}
              theme={theme}
              drawConnections={drawConnections}
              connectionDistance={connectionDistance}
              interactionMode={interactionMode}
              glowEnabled={glowEnabled}
              isDarkMode={isDarkMode}
              onFpsUpdate={setFps}
            />

            {/* Float overlay status */}
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none select-none">
              <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-[10px] font-black text-emerald-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>FPS: {fps}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-[10px] font-black text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Particles: {particlesRefSize(arrangement, particleCount)}</span>
              </div>
            </div>

            {/* Interaction tip bottom overlay */}
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none bg-gradient-to-t from-slate-900/80 to-slate-900/20 backdrop-blur-xs p-2 rounded-xl border border-slate-800/40 text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              🖱️ Hover to displace • Click to unleash a shockwave blast • Touch drag on mobile
            </div>
          </div>

          {/* Quick interactive guidelines & Physics theory card */}
          <div className="bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-neutral-200/80 dark:border-slate-800/80 p-5 backdrop-blur-md shadow-sm">
            <h4 className="text-xs font-black text-[#191c1d] dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#008378] dark:text-teal-400" />
              Under the Hood: Particle Physics Engine
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-neutral-600 dark:text-slate-400">
              <div className="space-y-2">
                <p>
                  <strong className="text-neutral-800 dark:text-slate-200">1. Cursor Collision Field:</strong> For each particle, vector distance d = mouse_pos - particle_pos is calculated. If distance is less than the influence radius, a repulsion vector is computed pushing it away.
                </p>
                <p>
                  <strong className="text-neutral-800 dark:text-slate-200">2. Hooke's Law Easing:</strong> Particles are tethered to home coordinates via spring joints. Spring restoration acceleration force = k_spring * (particle_base - particle_pos).
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong className="text-neutral-800 dark:text-slate-200">3. Inertial Integration:</strong> Velocity integration integrates friction damping factor at each tick: velocity_(t+1) = (velocity_t + force) * damping_factor, generating smooth dampening.
                </p>
                <p>
                  <strong className="text-neutral-800 dark:text-slate-200">4. Interactive Shockwave:</strong> Canvas clicks push a virtual impulse wave outward. Distance to wave ring triggers radial spikes of velocity that override natural tethers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-neutral-200 dark:border-slate-800 p-6 shadow-md backdrop-blur-md">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-slate-800/80">
              <h3 className="text-sm font-black text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-[#008378] dark:text-teal-400" />
                Parameters Configurator
              </h3>
              <button 
                onClick={handleReset} 
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Force Re-render Particles"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              
              {/* Density & Layout */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 dark:text-slate-500 block mb-2">
                  Arrangement & Density
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => setArrangement("scatter")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      arrangement === "scatter"
                        ? "bg-[#00685f]/10 text-[#00685f] border border-[#00685f] dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
                        : "bg-neutral-50 text-neutral-600 border border-neutral-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Scatter Dust
                  </button>
                  <button
                    onClick={() => setArrangement("grid")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      arrangement === "grid"
                        ? "bg-[#00685f]/10 text-[#00685f] border border-[#00685f] dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
                        : "bg-neutral-50 text-neutral-600 border border-neutral-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Structural Grid
                  </button>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                    <span>Target Size</span>
                    <span>{particleCount} particles</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="800"
                    step="10"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                  />
                </div>
              </div>

              {/* Particle Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                  <span>Particle Base Size</span>
                  <span>{particleSize}px</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={particleSize}
                  onChange={(e) => setParticleSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                />
              </div>

              {/* Interaction Mode */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 dark:text-slate-500 block mb-2">
                  Interaction Mechanics
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["repel", "attract", "orbit"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInteractionMode(mode)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                        interactionMode === mode
                          ? "bg-[#b5005d]/10 text-[#b5005d] border border-[#b5005d] dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800"
                          : "bg-neutral-50 text-neutral-600 border border-neutral-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repulsion Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                  <span>Influence Field Radius</span>
                  <span>{mouseRadius}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="300"
                  step="5"
                  value={mouseRadius}
                  onChange={(e) => setMouseRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                />
              </div>

              {/* Repulsion Force */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                  <span>Interaction Strength</span>
                  <span>{repulsionStrength}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.5"
                  value={repulsionStrength}
                  onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                />
              </div>

              {/* Spring Pull */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                  <span>Spring Restoring Constant ($k$)</span>
                  <span>{springStrength}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.15"
                  step="0.005"
                  value={springStrength}
                  onChange={(e) => setSpringStrength(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                />
              </div>

              {/* Damping */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                  <span>Damping (Friction $\mu$)</span>
                  <span>{damping}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="0.99"
                  step="0.01"
                  value={damping}
                  onChange={(e) => setDamping(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                />
              </div>

              {/* Aesthetics Dropdown and Switches */}
              <div className="pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-4">
                
                {/* Theme selection */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">Color Palette</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as AntiGravityCanvasProps["theme"])}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-50 text-neutral-700 border border-neutral-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="teal-pink">Teal & Pink (Default)</option>
                    <option value="cyberpunk">Cyberpunk Neon</option>
                    <option value="gold">Golden Glow</option>
                    <option value="matrix">Digital Green</option>
                    <option value="monochrome">Monochrome</option>
                  </select>
                </div>

                {/* Connections Mesh */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">Draw Constellation Mesh</span>
                    <span className="text-[10px] text-neutral-400">Links close particles with fading lines</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drawConnections}
                      onChange={(e) => setDrawConnections(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-[#00685f] dark:peer-checked:bg-teal-500"></div>
                  </label>
                </div>

                {/* Connection Distance */}
                {drawConnections && (
                  <div className="space-y-1 pl-4 border-l-2 border-neutral-100 dark:border-slate-800/80 animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-slate-400">
                      <span>Max Link Distance</span>
                      <span>{connectionDistance}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="180"
                      step="5"
                      value={connectionDistance}
                      onChange={(e) => setConnectionDistance(Number(e.target.value))}
                      className="w-full h-1 bg-neutral-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00685f] dark:accent-teal-400"
                    />
                  </div>
                )}

                {/* Particle Glow */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">Glow Aura Effect</span>
                    <span className="text-[10px] text-neutral-400">Adds neon shadow blur (GPU heavy)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={glowEnabled}
                      onChange={(e) => setGlowEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-[#00685f] dark:peer-checked:bg-teal-500"></div>
                  </label>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper function to show grid dimensions or total particles
function particlesRefSize(arrangement: "grid" | "scatter", count: number): number {
  if (arrangement === "scatter") return count;
  
  // For grid, the actual particles depend on grid rounding, but we display the actual size generated by canvas ref
  // We can just return count as an approximation or let the canvas pass it back. Let's return count here.
  return count;
}
