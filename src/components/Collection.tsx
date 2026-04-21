// src/components/Collection.tsx
import { useState } from "react";
import ImageZoomDialog from "@/components/ImageZoomDialog";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";
import product7 from "@/assets/product-7.jpg";
import product8 from "@/assets/product-8.jpg";
import product9 from "@/assets/product-9.jpg";
import product10 from "@/assets/product-10.jpg";
import product11 from "@/assets/product-11.jpg";
import product12 from "@/assets/product-12.jpg";
import product13 from "@/assets/product-13.jpg";
import product14 from "@/assets/product-14.jpg";

const products = [
  { id: 1,  name: "Facette Custom",       image: product1  },
  { id: 2,  name: "Diamond Mixte",        image: product2  },
  { id: 3,  name: "Facette Lisse",        image: product3  },
  { id: 4,  name: "Facette Twinkle",      image: product4  },
  { id: 5,  name: "Diamond Line",         image: product5  },
  { id: 6,  name: "Facette Tornado",      image: product6  },
  { id: 7,  name: "Diamond Jungle",       image: product7  },
  { id: 8,  name: "Facette Custom II",    image: product8  },
  { id: 9,  name: "Facette Lisse Int.",   image: product9  },
  { id: 10, name: "Facette Art Optic",    image: product10 },
  { id: 11, name: "Diamond Jade",         image: product11 },
  { id: 12, name: "Diamond Ice",          image: product12 },
  { id: 13, name: "Diamond Flower",       image: product13 },
  { id: 14, name: "Diamond Shark",        image: product14 },
];

const Collection = () => {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="collection" className="py-16 sm:py-28 bg-[#F7F4EE]">
      <div className="container mx-auto px-6 lg:px-10">

        {/* En-tête section */}
        <div className="text-center mb-10 sm:mb-20 animate-fade-up">
          <span className="section-label">Savoir-faire</span>
          <h2 className="section-title-lg">
            Notre Collection
          </h2>
          <div className="gold-divider" />
          <p className="font-cormorant text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed italic">
            Chaque pièce est façonnée pour s'adapter à votre style unique.
            Choisissez votre modèle — nous le personnaliserons pour vous.
          </p>
        </div>

        {/* Grille éditoriale */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-[#EDE8DF] border border-[#EDE8DF]">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="relative group bg-white overflow-hidden cursor-pointer animate-fade-up"
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => setZoomedImage({ src: product.image, alt: product.name })}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                  style={{ transition: "transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                />
              </div>

              {/* Overlay au hover */}
              <div className="absolute inset-0 product-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col justify-end p-5">
                <p className="font-playfair text-white text-base font-normal leading-tight mb-2">
                  {product.name}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); scrollToContact(); }}
                  className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-4 h-px bg-[#C9A96E]" />
                  Demander un devis
                </button>
              </div>

              {/* Numéro */}
              <div className="absolute top-3 left-3 font-sans-dm text-[9px] tracking-[0.15em] text-white/50 bg-black/20 px-2 py-1">
                {String(index + 1).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 animate-fade-up">
          <p className="font-cormorant text-lg text-muted-foreground italic mb-6">
            Une pièce vous inspire ? Contactez-nous pour démarrer votre création.
          </p>
          <button onClick={scrollToContact} className="btn-dark">
            Commencer votre parcours
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
  );
};

export default Collection;
