import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import heroImage from "@/assets/hero-eyewear.jpg";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    Calendly?: any;
  }
}

const Hero = () => {
  const [calendlyReady, setCalendlyReady] = useState(false);

  // ✅ Charge Calendly dynamiquement si pas déjà chargé
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () => setCalendlyReady(true);
      document.body.appendChild(script);
    } else {
      setCalendlyReady(true);
    }

    // ✅ Réactive le scroll si Calendly le bloque
    const restoreScroll = (e: MessageEvent) => {
      if (
        e.data?.event === "calendly.event_scheduled" ||
        e.data?.event === "calendly.closePopupWidget"
      ) {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";
      }
    };
    window.addEventListener("message", restoreScroll);
    return () => window.removeEventListener("message", restoreScroll);
  }, []);

  // ✅ Fonction pour ouvrir le popup Calendly
  const openCalendly = () => {
    if (window.Calendly && calendlyReady) {
      window.Calendly.initPopupWidget({
        url: "https://calendly.com/rubens-leturque/30min",
      });
      return false;
    } else {
      console.warn("Calendly n’est pas encore prêt");
    }
  };

  // ✅ Scroll to collection
  const scrollToCollection = () => {
    const element = document.getElementById("collection");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-black"
    >
      {/* ✅ Background image + assombrissement */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Luxury eyewear"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ✅ Contenu */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight"></h1>
        <p className="font-playfair text-3xl sm:text-5xl italic mb-10 leading-snug tracking-wide text-gray-200">
          Signez votre regard
        </p>

        <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
          Découvrez l’art de la lunetterie sur mesure. Chaque monture est conçue
          pour refléter votre style et votre vision uniques.
        </p>

        {/* ✅ Boutons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={scrollToCollection}
            className="text-base sm:text-lg px-8 py-6 bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Découvrez la collection
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={openCalendly}
            className="text-base sm:text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-black transition-colors"
          >
            Planifier une consultation
          </Button>
        </div>
      </div>

      {/* ✅ Flèche animée */}
      <button
        onClick={scrollToCollection}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 text-white hover:text-gray-300 transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ArrowDown size={32} />
      </button>
    </section>
  );
};

export default Hero;
