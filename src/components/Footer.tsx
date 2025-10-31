import logo from "@/assets/logo.jpeg";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Logo and Tagline */}
          <div className="text-center md:text-right">
            <img 
              src={logo} 
              alt="L'atelier des Arts" 
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover mx-auto md:mr-0 md:ml-auto mb-3 sm:mb-4"
            />
            
            <p className="font-playfair text-base sm:text-lg text-accent italic">
              Signez votre regard
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="font-playfair text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="hover:text-accent transition-colors"
                >
                  Acceuil
                </button>
              </li>
              <li>
                <button 
                  onClick={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })}
                  className="hover:text-accent transition-colors"
                >
                  Collection
                </button>
              </li>
              <li>
                <button 
                  onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                  className="hover:text-accent transition-colors"
                >
                  A propos
                </button>
              </li>
              <li>
                <button 
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="hover:text-accent transition-colors"
                >
                  Contactez-nous
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h4 className="font-playfair text-lg sm:text-xl font-semibold mb-3 sm:mb-4">prise de contact</h4>
            <p className="mb-2 text-sm sm:text-base break-all">
              <a href="mailto:Opticaltzion@gmail.com" className="hover:text-accent transition-colors">
                Atelierdesarts.12@gmail.com
              </a>
            </p>
            <p className="mb-2 flex items-center justify-center md:justify-start gap-2 min-h-[44px]">
              <a href="https://wa.me/33782548362" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors flex items-center gap-2 text-sm sm:text-base">
                <span>+33 6 98 40 96 87</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </p>
            <p className="text-xs sm:text-sm opacity-80">
            178 avenue daumesnil 75012 Paris 
            </p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
          <p>&copy; {currentYear} L'atelier des Arts Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
