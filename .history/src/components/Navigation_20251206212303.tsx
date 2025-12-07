import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom"; // ✅ Imports corrigés

declare global {
  interface Window {
    Calendly?: any;
  }
}

const Navigation = () => {
  // ✅ 1. LE FIX EST ICI : Les Hooks doivent être DANS le composant
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [calendlyReady, setCalendlyReady] = useState(false);

  // --- Gestion de Calendly ---
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

  // --- Gestion du Scroll ---
  const handleScrollTo = (id: string) => {
    // Si on n'est pas sur la page d'accueil, on y va d'abord
    if (location.pathname !== "/") {
      navigate("/");
      // On attend un peu que la page charge pour scroller (astuce simple)
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Si on est déjà sur l'accueil, on scroll direct
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <span className="font-playfair text-2xl italic tracking-tight text-black">
              L’Atelier des Arts
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleScrollTo("home")} className="hover:text-accent transition">
              Accueil
            </button>
            <button onClick={() => handleScrollTo("collection")} className="hover:text-accent transition">
              Collection
            </button>
            
            {/* ✅ Lien vers Espace Pro qui marche */}
            

            <button onClick={() => handleScrollTo("about")} className="hover:text-accent transition">
              À propos
            </button>
            <button onClick={() => handleScrollTo("contact")} className="hover:text-accent transition">
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
          <div className="md:hidden py-4 animate-fade-in bg-background">
            <div className="flex flex-col gap-4">
              <button onClick={() => handleScrollTo("home")} className="text-right py-2 hover:text-accent">
                Accueil
              </button>
              <button onClick={() => handleScrollTo("collection")} className="text-right py-2 hover:text-accent">
                Collection
              </button>
              <button onClick={() => handleScrollTo("about")} className="text-right py-2 hover:text-accent">
                À propos
              </button>
              <button onClick={() => handleScrollTo("contact")} className="text-right py-2 hover:text-accent">
                Contactez-nous
              </button>
              
              {/* ✅ Lien Mobile Espace Pro */}
              <Link 
                to="/espace-pro" 
                onClick={() => setIsMenuOpen(false)}
                className="text-right py-2 hover:text-accent"
              >
                Espace Pro
              </Link>
              
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