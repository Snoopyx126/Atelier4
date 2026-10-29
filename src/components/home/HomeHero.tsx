// src/components/home/HomeHero.tsx
import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { photos } from "./photos";

declare global { interface Window { Calendly?: any; } }

const heroPhotos = [photos[0], photos[8], photos[6], photos[13], photos[18]].filter(Boolean);

const HomeHero = () => {
  const [current, setCurrent] = useState(0);
  const [calendlyReady, setCalendlyReady] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCurrent(c => (c + 1) % heroPhotos.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.onload = () => setCalendlyReady(true);
      document.body.appendChild(s);
    } else { setCalendlyReady(true); }
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
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="home" className="relative min-h-screen bg-[#0F0E0C] overflow-hidden flex items-center pt-28 pb-20 lg:pt-24 lg:pb-16">
      {/* Halo doré */}
      <div className="absolute -top-40 -right-40 w-[38rem] h-[38rem] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0) 70%)" }}/>

      <div className="relative z-10 container mx-auto px-5 sm:px-8 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

        {/* Texte */}
        <div className="lg:col-span-6 text-center lg:text-left">
          <span className="animate-fade-up delay-100 inline-block font-sans-dm text-[9px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.35em] uppercase text-[#C9A96E] border border-[#C9A96E]/30 px-4 sm:px-5 py-2 mb-8">
            Artisan lunettier · Paris 12ème
          </span>

          <h1 className="animate-fade-up delay-200 font-playfair text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-normal text-[#F7F4EE] leading-[1.02] tracking-tight mb-8">
            Signez<br/>
            <span className="italic text-[#E2C99A]">votre regard</span>
          </h1>

          <div className="animate-fade-up delay-300 w-12 h-px bg-[#C9A96E] mx-auto lg:mx-0 mb-8"/>

          <p className="animate-fade-up delay-400 font-cormorant text-lg sm:text-xl italic text-[#F7F4EE]/70 max-w-md mx-auto lg:mx-0 leading-relaxed mb-10">
            Montures sans cercle, verres taillés à la main et facettes sur mesure.
            Chaque pièce est façonnée pour refléter votre style unique.
          </p>

          <div className="animate-fade-up delay-500 flex flex-col sm:flex-row gap-5 justify-center lg:justify-start items-center">
            <button onClick={() => scrollTo("collection")} className="btn-gold py-4 px-10 text-[11px] w-full sm:w-auto max-w-xs">
              <span>Découvrir la collection</span>
            </button>
            <button onClick={openCalendly}
              className="font-sans-dm text-[11px] tracking-[0.18em] uppercase text-[#F7F4EE]/75 hover:text-[#F7F4EE] transition-colors flex items-center gap-3">
              <span className="w-6 h-px bg-[#C9A96E]"/>
              Prendre rendez-vous
            </button>
          </div>

          {/* Chiffres */}
          <div className="animate-fade-up delay-500 grid grid-cols-3 gap-4 mt-14 pt-8 border-t border-[#C9A96E]/15 max-w-md mx-auto lg:mx-0">
            {[
              { value: `${photos.length}`, label: "Modèles" },
              { value: "10", label: "Teintes" },
              { value: "100%", label: "Sur mesure" },
            ].map(stat => (
              <div key={stat.label}>
                <p className="font-playfair text-2xl sm:text-3xl text-[#E2C99A]">{stat.value}</p>
                <p className="font-sans-dm text-[9px] tracking-[0.22em] uppercase text-[#F7F4EE]/45 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo */}
        <div className="lg:col-span-6 animate-fade-up delay-300">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="absolute -top-3 -left-3 w-14 h-14 border-l border-t border-[#C9A96E]/60"/>
            <div className="absolute -bottom-3 -right-3 w-14 h-14 border-r border-b border-[#C9A96E]/60"/>

            <div className="relative aspect-square overflow-hidden bg-[#F7F4EE] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
              {heroPhotos.map((photo, i) => (
                <img
                  key={photo.id}
                  src={photo.image}
                  alt={photo.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transition: "opacity 1.4s ease-out, transform 1.4s ease-out", opacity: i === current ? 1 : 0, transform: i === current ? "scale(1)" : "scale(1.04)" }}
                />
              ))}
            </div>

            {/* Indicateurs */}
            <div className="flex justify-center gap-2 mt-6">
              {heroPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrent(i)}
                  aria-label={`Voir ${photo.name}`}
                  className={`h-px transition-all duration-500 ${i === current ? "w-10 bg-[#C9A96E]" : "w-5 bg-[#F7F4EE]/25 hover:bg-[#F7F4EE]/50"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => scrollTo("collection")}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-2 group" aria-label="Défiler">
        <ArrowDown size={16} className="text-[#F7F4EE]/40 group-hover:text-[#C9A96E] transition-colors animate-bounce"/>
      </button>
    </section>
  );
};

export default HomeHero;
