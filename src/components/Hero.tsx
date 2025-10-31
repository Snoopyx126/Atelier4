import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import heroImage from "@/assets/hero-eyewear.jpg";

const Hero = () => {
  const scrollToCollection = () => {
    const element = document.getElementById("collection");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-black"
    >
      {/* ✅ Background image + assombrissement */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Luxury eyewear"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black/40" /> {/* filtre foncé */}
      </div>

      {/* ✅ Contenu */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight">
          
        </h1>
        <p className="font-playfair text-3xl sm:text-5xl italic mb-10 leading-snug tracking-wide text-gray-200">
          Signez votre regard
        </p>

        <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
          Découvrez l’art de la lunetterie sur mesure. Chaque monture est
          conçue pour refléter votre style et votre vision uniques.
        </p>

        {/* ✅ Boutons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={scrollToCollection}
            className="text-base sm:text-lg px-8 py-6 bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Découvrez la collection
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              const element = document.getElementById("contact");
              if (element) element.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-base sm:text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-black transition-colors"
          >
            Planifier une consultation
          </Button>
        </div>
      </div>

      {/* ✅ Flèche animée */}
      <button
        onClick={scrollToCollection}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 text-white hover:text-gray-300 transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ArrowDown size={32} />
      </button>
    </section>
  );
};

export default Hero;
