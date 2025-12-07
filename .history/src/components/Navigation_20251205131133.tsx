import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Calendly?: any;
  }
}

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [calendlyReady, setCalendlyReady] = useState(false);

  // ✅ Charger Calendly dynamiquement (solution 100% fiable avec Vite)
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="font-playfair text-2xl italic tracking-tight text-black">
              L’Atelier des Arts
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("home")} className="hover:text-accent transition">
              Accueil
            </button>
            <button onClick={() => scrollToSection("collection")} className="hover:text-accent transition">
              Collection
            </button>
            <button onClick={() => scrollToSection("about")} className="hover:text-accent transition">
              À propos
            </button>
            <button onClick={() => scrollToSection("contact")} className="hover:text-accent transition">
              Contact
            </button>
            <Button variant="light" size="lg" onClick={openCalendly}>
              Planifier une consultation
            </Button>
          </div>

          {/* Mobile Nav Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hover:text-accent transition"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              <button onClick={() => scrollToSection("home")} className="text-right py-2 hover:text-accent">
                Accueil
              </button>
              <button onClick={() => scrollToSection("collection")} className="text-right py-2 hover:text-accent">
                Collection
              </button>
              <button onClick={() => scrollToSection("about")} className="text-right py-2 hover:text-accent">
                À propos
              </button>
              <button onClick={() => scrollToSection("contact")} className="text-right py-2 hover:text-accent">
                Contactez-nous
              </button>
            {/* NOUVEAU: Lien vers l'Espace Pro */}
            <a href="/espace-pro" className="hover:text-accent transition">
              Espace Pro
            </a>
            {/* FIN NOUVEAU */}
            <Button variant="light" size="lg" onClick={openCalendly}>
              Planifier une consultation
            </Button>
              <Button variant="light" size="lg" className="w-full" onClick={openCalendly}>
                Planifier une consultation
              </Button>
              
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
