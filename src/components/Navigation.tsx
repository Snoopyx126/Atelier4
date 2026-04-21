// src/components/Navigation.tsx
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

declare global {
  interface Window { Calendly?: any; }
}

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [calendlyReady, setCalendlyReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsLoggedIn(true);
        setIsAdmin(user.role === "admin");
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
  }, []);

  const openCalendly = () => {
    if (window.Calendly && calendlyReady) {
      window.Calendly.initPopupWidget({ url: "https://calendly.com/rubens-leturque/30min" });
    }
  };

  const handleScrollTo = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  const targetPath = !isLoggedIn ? "/espace-pro" : (isAdmin ? "/admin" : "/dashboardpro");
  const linkText = !isLoggedIn ? "Espace Pro" : (isAdmin ? "Admin" : "Tableau de bord");

  const navBg = scrolled
    ? "bg-[#0F0E0C]/95 backdrop-blur-md shadow-[0_1px_0_rgba(201,169,110,0.15)]"
    : location.pathname === "/"
      ? "bg-transparent"
      : "bg-[#0F0E0C]/95 backdrop-blur-md";

  const textColor = scrolled || location.pathname !== "/" ? "text-[#F7F4EE]" : "text-white";
  const logoColor = scrolled || location.pathname !== "/" ? "text-[#F7F4EE]" : "text-white";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}>
      <div className="container mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <div className="cursor-pointer flex-shrink-0" onClick={() => navigate("/")}>
            <span className={`font-playfair text-xl italic tracking-wide ${logoColor} transition-colors duration-300`}>
              L'Atelier des Arts
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            {[
              { label: "Accueil", id: "home" },
              { label: "Collection", id: "collection" },
              { label: "À propos", id: "about" },
              { label: "Contact", id: "contact" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleScrollTo(item.id)}
                className={`font-sans-dm text-xs tracking-[0.15em] uppercase transition-colors duration-300 hover:text-[#C9A96E] ${textColor}`}
              >
                {item.label}
              </button>
            ))}

            <Link
              to="/configurateur"
              className={`font-sans-dm text-xs tracking-[0.15em] uppercase transition-colors duration-300 hover:text-[#C9A96E] ${textColor} flex items-center gap-2`}
            >
              <span className="text-[8px] tracking-widest bg-[#C9A96E] text-[#0F0E0C] px-2 py-0.5">Bientôt</span>
              Atelier 3D
            </Link>

            <Link
              to={targetPath}
              className={`font-sans-dm text-xs tracking-[0.15em] uppercase transition-colors duration-300 hover:text-[#C9A96E] ${textColor}`}
            >
              {linkText}
            </Link>

            <button
              onClick={openCalendly}
              className="btn-gold text-[10px] py-2.5 px-6"
            >
              <span>Prendre rendez-vous</span>
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className={`md:hidden transition-colors ${textColor} hover:text-[#C9A96E]`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#0F0E0C] border-t border-[#C9A96E]/20 py-8 animate-fade-in">
            <div className="flex flex-col gap-6 px-4">
              {["home", "collection", "about", "contact"].map((id) => (
                <button
                  key={id}
                  onClick={() => handleScrollTo(id)}
                  className="text-left font-sans-dm text-sm tracking-[0.15em] uppercase text-[#F7F4EE] hover:text-[#C9A96E] transition-colors py-2"
                >
                  {id === "home" ? "Accueil" : id === "collection" ? "Collection" : id === "about" ? "À propos" : "Contact"}
                </button>
              ))}
              <Link to={targetPath} onClick={() => setIsMenuOpen(false)} className="font-sans-dm text-sm tracking-[0.15em] uppercase text-[#F7F4EE] hover:text-[#C9A96E] transition-colors py-2">
                {linkText}
              </Link>
              <button onClick={openCalendly} className="btn-gold text-[10px] mt-2 w-full">
                <span>Prendre rendez-vous</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
