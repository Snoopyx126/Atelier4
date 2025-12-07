// src/components/Navigation.tsx

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom"; 

declare global {
  interface Window {
    Calendly?: any;
  }
}

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [calendlyReady, setCalendlyReady] = useState(false);
  // ✅ NOUVEL ÉTAT : Pour suivre l'état de connexion
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  // --- Vérification de l'état de connexion ---
  useEffect(() => {
    const checkLoginStatus = () => {
      // Si 'user' est dans le localStorage, l'utilisateur est considéré comme connecté
      setIsLoggedIn(!!localStorage.getItem('user'));
    };

    checkLoginStatus(); // Vérification au chargement initial

    // Écoute des événements de stockage pour la déconnexion dans d'autres onglets
    window.addEventListener('storage', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []); // [] : S'exécute uniquement au montage initial

  // --- Gestion de Calendly ---
  useEffect(() => {
    // ... (Code Calendly inchangé) ...
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
    // ... (Code handleScrollTo inchangé) ...
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsMenuOpen(false);
  };
  
  // ✅ DÉFINITION DYNAMIQUE DE LA CIBLE ET DU TEXTE
  const targetPath = isLoggedIn ? "/dashboardpro" : "/espace-pro";
  const linkText = isLoggedIn ? "Mon Tableau de Bord" : "Espace Pro";


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
            
            {/* ✅ Lien dynamique Espace Pro / Tableau de Bord */}
            <Link to={targetPath} className="hover:text-accent transition">
              {linkText}
            </Link>

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
              
              {/* ✅ Lien Mobile Espace Pro / Tableau de Bord */}
              <Link 
                to={targetPath} 
                onClick={() => setIsMenuOpen(false)}
                className="text-right py-2 hover:text-accent"
              >
                {linkText}
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