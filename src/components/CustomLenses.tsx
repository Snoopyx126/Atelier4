// src/components/CustomLenses.tsx
import { useState } from "react";
import ImageZoomDialog from "@/components/ImageZoomDialog";

import kiwiImg from "@/assets/lenses/kiwi.png";
import framboiseImg from "@/assets/lenses/framboise.png";
import fraiseImg from "@/assets/lenses/fraise.png";
import cassisImg from "@/assets/lenses/cassis.png";
import bleuetsImg from "@/assets/lenses/bleuets.png";
import myrtilleImg from "@/assets/lenses/myrtille.png";
import pecheImg from "@/assets/lenses/peche.png";
import quetscheImg from "@/assets/lenses/quetsche.png";
import raisinImg from "@/assets/lenses/raisin.png";
import mureImg from "@/assets/lenses/mure.png";

const lensColors = [
  { id: 1,  name: "Kiwi",      image: kiwiImg      },
  { id: 2,  name: "Pêche",     image: pecheImg     },
  { id: 3,  name: "Fraise",    image: fraiseImg    },
  { id: 4,  name: "Framboise", image: framboiseImg },
  { id: 5,  name: "Cassis",    image: cassisImg    },
  { id: 6,  name: "Bleuets",   image: bleuetsImg   },
  { id: 7,  name: "Myrtille",  image: myrtilleImg  },
  { id: 8,  name: "Quetsche",  image: quetscheImg  },
  { id: 9,  name: "Raisin",    image: raisinImg    },
  { id: 10, name: "Mûre",      image: mureImg      },
];

const CustomLenses = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  return (
    <section id="custom-lenses" className="py-16 sm:py-28 bg-[#0F0E0C]">
      <div className="container mx-auto px-6 lg:px-10">

        {/* En-tête */}
        <div className="text-center mb-10 sm:mb-20 animate-fade-up">
          <span className="section-label">Verres sur mesure</span>
          <h2 className="font-playfair text-4xl md:text-5xl font-normal text-[#F7F4EE] leading-[1.15]">
            Verre<br />
            <span className="italic text-[#E2C99A]">Photochromique</span>
          </h2>
          <div className="gold-divider" />
          <p className="font-cormorant text-lg text-[#F7F4EE]/55 max-w-xl mx-auto leading-relaxed italic">
            Choisissez votre teinte — cliquez pour la voir jouer à la lumière.
          </p>
        </div>

        {/* Grille des teintes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-[#C9A96E]/8 border border-[#C9A96E]/8">
          {lensColors.map((lens, index) => (
            <div
              key={lens.id}
              className={`group relative bg-[#1C1A17] hover:bg-[#1e1c19] cursor-pointer transition-all duration-400 animate-fade-up ${
                selected === lens.id ? "ring-1 ring-inset ring-[#C9A96E]" : ""
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => setSelected(selected === lens.id ? null : lens.id)}
            >
              <div className="p-6 flex flex-col items-center gap-4">

                {/* Rond image */}
                <div
                  className="w-20 h-20 rounded-full overflow-hidden border border-[#C9A96E]/20 group-hover:border-[#C9A96E]/60 transition-colors duration-400 cursor-zoom-in"
                  onClick={(e) => { e.stopPropagation(); setZoomed({ src: lens.image, alt: lens.name }); }}
                >
                  <img
                    src={lens.image}
                    alt={lens.name}
                    className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Nom */}
                <div className="text-center">
                  <span className="font-playfair text-base text-[#F7F4EE]/80 group-hover:text-[#F7F4EE] transition-colors">
                    {lens.name}
                  </span>
                  <span className="font-sans-dm text-[9px] tracking-[0.15em] uppercase text-[#C9A96E]/50 block mt-1">
                    Photochromique
                  </span>
                </div>

                {/* Indicateur sélection */}
                {selected === lens.id && (
                  <div className="absolute top-3 right-3 w-4 h-4 border border-[#C9A96E] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#C9A96E]" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message sélection */}
        {selected && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="font-cormorant text-lg italic text-[#F7F4EE]/60">
              Vous avez sélectionné{" "}
              <span className="text-[#E2C99A] not-italic font-normal">
                {lensColors.find(l => l.id === selected)?.name}
              </span>{" "}
              — mentionnez cette teinte lors de votre contact.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-14 animate-fade-up">
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="btn-gold text-[10px] py-3.5 px-10"
          >
            <span>Commander mes verres</span>
          </button>
        </div>
      </div>

      <ImageZoomDialog
        isOpen={!!zoomed}
        onClose={() => setZoomed(null)}
        imageSrc={zoomed?.src || ""}
        imageAlt={zoomed?.alt || ""}
      />
    </section>
  );
};

export default CustomLenses;
