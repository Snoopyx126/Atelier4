// src/components/home/HomeCollection.tsx
import { useState } from "react";
import ImageZoomDialog from "@/components/ImageZoomDialog";
import { photos } from "./photos";

const INITIAL_COUNT = 9;

const marquee = ["Montures sans cercle", "Verres taillés main", "Facettes sur mesure", "Diamond cut", "Gravure personnalisée", "Atelier parisien"];

const HomeCollection = () => {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const scrollToContact = () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  const visible = showAll ? photos : photos.slice(0, INITIAL_COUNT);

  return (
    <>
      {/* Bandeau défilant */}
      <div className="bg-[#C9A96E] overflow-hidden py-4 border-y border-[#9A7A45]/30">
        <div className="flex w-max animate-[marquee_40s_linear_infinite]">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((item, i) => (
            <span key={i} className="flex items-center font-sans-dm text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-[#0F0E0C] whitespace-nowrap">
              <span className="px-6 sm:px-8">{item}</span>
              <span className="w-1 h-1 rounded-full bg-[#0F0E0C]/50"/>
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      <section id="collection" className="py-16 sm:py-28 bg-[#F7F4EE]">
        <div className="container mx-auto px-5 sm:px-6 lg:px-10">

          {/* En-tête */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 sm:mb-16 animate-fade-up">
            <div>
              <span className="section-label">Savoir-faire</span>
              <h2 className="section-title-lg">
                Notre <span className="italic text-[#9A7A45]">Collection</span>
              </h2>
              <div className="gold-divider-left"/>
            </div>
            <p className="font-cormorant text-lg md:text-xl text-muted-foreground max-w-md leading-relaxed italic lg:text-right">
              Choisissez votre modèle — nous le personnalisons pour vous, de la teinte des verres à la taille des facettes.
            </p>
          </div>

          {/* Grille */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {visible.map((product, index) => (
              <div
                key={product.id}
                className="relative group bg-white overflow-hidden cursor-zoom-in animate-fade-up shadow-[0_1px_0_rgba(15,14,12,0.04)] hover:shadow-[0_24px_50px_-24px_rgba(15,14,12,0.35)] transition-shadow duration-500"
                style={{ animationDelay: `${(index % INITIAL_COUNT) * 60}ms` }}
                onClick={() => setZoomedImage({ src: product.image, alt: product.name })}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.alt}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105"
                    style={{ transition: "transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                  />
                </div>

                {/* Légende */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 flex items-end justify-between bg-gradient-to-t from-[#0F0E0C]/70 via-[#0F0E0C]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <p className="font-playfair text-white text-sm sm:text-base leading-tight">{product.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); scrollToContact(); }}
                    className="hidden sm:flex font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#E2C99A] hover:text-white transition-colors items-center gap-2"
                  >
                    <span className="w-4 h-px bg-[#E2C99A]"/>
                    Devis
                  </button>
                </div>

                <div className="absolute top-3 left-3 font-sans-dm text-[9px] tracking-[0.15em] text-[#0F0E0C]/50">
                  {String(product.id).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 sm:mt-16 animate-fade-up">
            {photos.length > INITIAL_COUNT && (
              <button onClick={() => setShowAll(v => !v)} className="btn-ghost w-full sm:w-auto max-w-xs">
                {showAll ? "Réduire" : `Voir les ${photos.length} modèles`}
              </button>
            )}
            <button onClick={scrollToContact} className="btn-dark w-full sm:w-auto max-w-xs">
              Demander un devis
            </button>
          </div>
        </div>

        <ImageZoomDialog
          isOpen={!!zoomedImage}
          onClose={() => setZoomedImage(null)}
          imageSrc={zoomedImage?.src || ""}
          imageAlt={zoomedImage?.alt || ""}
        />
      </section>
    </>
  );
};

export default HomeCollection;
