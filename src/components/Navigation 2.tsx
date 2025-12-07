import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-foreground hover:text-accent transition-colors duration-300"
            >
              Acceuil
            </button>
            <button
              onClick={() => scrollToSection("collection")}
              className="text-foreground hover:text-accent transition-colors duration-300"
            >
              Collection
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-foreground hover:text-accent transition-colors duration-300"
            >
              A propos
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-foreground hover:text-accent transition-colors duration-300"
            >
              Contact
            </button>
            <a href="/espace-pro" className="text-right py-2 hover:text-accent">
                Espace Pro
              </a>
            <Button 
              variant="light" 
              size="lg"
              onClick={() => navigate("rdv")}
            >
             Planifier une consultation
            </Button>
            
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground hover:text-accent transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("home")}
                className="text-right text-foreground hover:text-accent transition-colors py-2"
              >
               Acceuil
              </button>
              <button
                onClick={() => scrollToSection("collection")}
                className="text-right text-foreground hover:text-accent transition-colors py-2"
              >
                Collection
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-right text-foreground hover:text-accent transition-colors py-2"
              >
                A propos
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-right text-foreground hover:text-accent transition-colors py-2"
              >
                Contactez-nous
              </button>
              <Button 
                variant="light" 
                size="lg" 
                className="w-full"
                onClick={() => scrollToSection("contact")}
              >
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
