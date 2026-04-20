// src/components/Hero.tsx
import { ArrowDown } from "lucide-react";
import heroImage from "@/assets/hero-eyewear.jpg";
import { useEffect, useState } from "react";

declare global {
  interface Window { Calendly?: any; }
}

const Hero = () => {
  const [calendlyReady, setCalendlyReady] = useState(false);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.onload = () => setCalendlyReady(true);
      document.body.appendChild(s);
    } else {
      setCalendlyReady(true);
    }
    const restore = (e: MessageEvent) => {
      if (e.data?.event?.includes("calendly")) document.body.style.overflow = "auto";
    };
    window.addEventListener("message", restore);
    return () => window.removeEventListener("message", restore);
  }, []);

  const openCalendly = () => {
    if (window.Calendly && calendlyReady)
      window.Calendly.initPopupWidget({ url: "https://calendly.com/rubens-leturque/30min" });
  };

  const scrollToCollection = () => {
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Image de fond + overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Lunetterie de luxe"
          className="w-full h-full object-cover"
          style={{ transform: "scale(1.04)" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.50)" }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.60) 100%)"
        }} />
      </div>

      {/* Ligne décorative gauche */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-4 z-10">
        <div className="w-px h-20 bg-white/20" />
        <span className="font-sans-dm text-[9px] tracking-[0.3em] uppercase text-white/40 rotate-90 whitespace-nowrap">
          Paris · Lunetterie sur mesure
        </span>
        <div className="w-px h-20 bg-white/20" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 container mx-auto px-6 text-center">

        {/* Label chapeau */}
        <div className="animate-fade-up delay-100 mb-10">
          <span className="font-sans-dm text-[10px] tracking-[0.35em] uppercase text-white/85 border border-white/25 px-5 py-2">
            Artisan lunettier · Paris 12ème
          </span>
        </div>

        {/* Titre — "Signez" en blanc, "votre regard" en doré */}
        <div className="animate-fade-up delay-200 mb-8">
          <h1
            className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight tracking-tight"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
          >
            Signez
          </h1>
          <h1
            className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold italic leading-tight tracking-tight"
            style={{
              color: "#E2C99A",
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}
          >
            votre regard
          </h1>
        </div>

        {/* Séparateur */}
        <div className="animate-fade-up delay-300 flex items-center justify-center gap-4 mb-8">
          <div className="w-16 h-px bg-white/25" />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C9A96E" }} />
          <div className="w-16 h-px bg-white/25" />
        </div>

        {/* Sous-titre */}
        <p
          className="animate-fade-up delay-400 font-sans-dm text-base sm:text-lg text-white/85 max-w-lg mx-auto leading-relaxed mb-12 font-normal"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
        >
          Chaque monture est conçue pour refléter votre style et votre vision uniques.
        </p>

        {/* Boutons */}
        <div className="animate-fade-up delay-500 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={scrollToCollection} className="btn-gold py-4 px-10 text-[11px]">
            <span>Découvrir la collection</span>
          </button>
          <button
            onClick={openCalendly}
            className="font-sans-dm text-[11px] tracking-[0.18em] uppercase text-white/80 hover:text-white transition-colors flex items-center gap-3"
          >
            <span className="w-6 h-px bg-white/40" />
            Prendre rendez-vous
          </button>
        </div>
      </div>

      {/* Flèche scroll */}
      <button
        onClick={scrollToCollection}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 group"
        aria-label="Défiler"
      >
        <span className="font-sans-dm text-[9px] tracking-[0.25em] uppercase text-white/50 group-hover:text-white transition-colors">
          Découvrir
        </span>
        <ArrowDown size={16} className="text-white/50 group-hover:text-white transition-colors animate-bounce" />
      </button>
    </section>
  );
};

export default Hero;
