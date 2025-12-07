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
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false); // ✅ État Admin

  useEffect(() => {
    const checkLoginStatus = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
          const user = JSON.parse(userStr);
          setIsLoggedIn(true);
          setIsAdmin(user.role === 'admin'); // ✅ Vérification du rôle
      } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
      }
    };

    checkLoginStatus(); 
    window.addEventListener('storage', checkLoginStatus);
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () => setCalendlyReady(true);
      document.body.appendChild(script);
    } else {
      setCalendlyReady(true);
    }
  }, []);

  const openCalendly = () => {
    if (window.Calendly && calendlyReady) {
      window.Calendly.initPopupWidget({ url: "https://calendly.com/rubens-leturque/30min" });
    }
  };

  const handleScrollTo = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };
  
  // ✅ LOGIQUE DE REDIRECTION INTELLIGENTE
  const targetPath = !isLoggedIn ? "/espace-pro" : (isAdmin ? "/admin" : "/dashboardpro");
  const linkText = !isLoggedIn ? "Espace Pro" : (isAdmin ? "Admin" : "Mon Tableau de Bord");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <span className="font-playfair text-2xl italic tracking-tight text-black">L’Atelier des Arts</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleScrollTo("home")} className="hover:text-accent transition">Accueil</button>
            <button onClick={() => handleScrollTo("collection")} className="hover:text-accent transition">Collection</button>
            <Link to={targetPath} className="hover:text-accent transition font-medium">{linkText}</Link>
            <button onClick={() => handleScrollTo("about")} className="hover:text-accent transition">À propos</button>
            <button onClick={() => handleScrollTo("contact")} className="hover:text-accent transition">Contact</button>
            <Button variant="light" size="lg" onClick={openCalendly}>Planifier une consultation</Button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="hover:text-accent transition">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 animate-fade-in bg-background">
            <div className="flex flex-col gap-4">
              <button onClick={() => handleScrollTo("home")} className="text-right py-2 hover:text-accent">Accueil</button>
              <button onClick={() => handleScrollTo("collection")} className="text-right py-2 hover:text-accent">Collection</button>
              <button onClick={() => handleScrollTo("about")} className="text-right py-2 hover:text-accent">À propos</button>
              <button onClick={() => handleScrollTo("contact")} className="text-right py-2 hover:text-accent">Contactez-nous</button>
              <Link to={targetPath} onClick={() => setIsMenuOpen(false)} className="text-right py-2 hover:text-accent font-medium">{linkText}</Link>
              <Button variant="light" size="lg" className="w-full" onClick={openCalendly}>Planifier une consultation</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;