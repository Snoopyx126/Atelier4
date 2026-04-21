// src/components/Footer.tsx

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0F0E0C] text-[#F7F4EE]/60 py-16">
      <div className="container mx-auto px-6 lg:px-10">

        {/* Ligne du haut */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 mb-12">

          {/* Marque */}
          <div>
            <span className="font-playfair text-xl italic text-[#F7F4EE] tracking-wide block mb-3">
              L'Atelier des Arts
            </span>
            <span className="font-cormorant text-sm italic text-[#C9A96E]/80">
              Signez votre regard
            </span>
            <div className="w-8 h-px bg-[#C9A96E]/40 mt-4" />
          </div>

          {/* Liens rapides */}
          <div>
            <span className="font-sans-dm text-[9px] tracking-[0.25em] uppercase text-[#C9A96E] block mb-5">
              Navigation
            </span>
            <ul className="space-y-3">
              {[
                { label: "Accueil", id: "home" },
                { label: "Collection", id: "collection" },
                { label: "À propos", id: "about" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
                    className="font-sans-dm text-xs hover:text-[#C9A96E] transition-colors font-light"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <span className="font-sans-dm text-[9px] tracking-[0.25em] uppercase text-[#C9A96E] block mb-5">
              Contact
            </span>
            <ul className="space-y-3">
              <li>
                <a href="mailto:Atelierdesarts.12@gmail.com" className="font-sans-dm text-xs hover:text-[#C9A96E] transition-colors font-light">
                  Atelierdesarts.12@gmail.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/+33698409687" target="_blank" rel="noopener noreferrer" className="font-sans-dm text-xs hover:text-[#C9A96E] transition-colors font-light flex items-center gap-2">
                  +33 6 98 40 96 87
                  <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>
              </li>
              <li>
                <a href="https://maps.app.goo.gl/W77h7dbrrhhDnLCEA" target="_blank" rel="noopener noreferrer" className="font-sans-dm text-xs hover:text-[#C9A96E] transition-colors font-light">
                  178 avenue Daumesnil, 75012 Paris
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Ligne du bas */}
        <div className="border-t border-[#C9A96E]/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans-dm text-[10px] tracking-[0.1em] text-[#F7F4EE]/30">
            © {year} L'Atelier des Arts. Tous droits réservés.
          </p>
          <div className="flex items-center gap-3">
            <div className="w-4 h-px bg-[#C9A96E]/30" />
            <span className="font-cormorant text-xs italic text-[#C9A96E]/50">Paris · Artisan lunettier</span>
            <div className="w-4 h-px bg-[#C9A96E]/30" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
