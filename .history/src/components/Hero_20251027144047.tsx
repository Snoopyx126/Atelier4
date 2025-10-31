import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import heroImage from "@/assets/hero-eyewear.jpg";

const Hero = () => {
  const scrollToCollection = () => {
    const element = document.getElementById("collection");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Luxury eyewear"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
        <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-primary-foreground mb-4 sm:mb-6 tracking-tight leading-tight">
          L'Atelier des Arts
        </h1>
        <p className="font-playfair text-xl sm:text-2xl md:text-3xl lg:text-4xl text-accent italic mb-6 sm:mb-8">
          Signez votre regard
        </p>
        <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
          Découvrez l'art de la lunetterie sur mesure. Chaque monture est conçue pour refléter votre style et votre vision uniques.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
          <Button 
            variant="luxury" 
            size="lg"
            onClick={scrollToCollection}
            className="text-base sm:text-lg px-6 py-6 w-full sm:w-auto min-h-[48px] touch-manipulation"
          >
            גלו את הקולקציה
          </Button>
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => {
              const element = document.getElementById("contact");
              if (element) element.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-base sm:text-lg px-6 py-6 w-full sm:w-auto min-h-[48px] touch-manipulation"
          >
            קביעת פגישת ייעוץ
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToCollection}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 text-primary-foreground animate-bounce hover:text-accent transition-colors"
        aria-label="Scroll down"
      >
        <ArrowDown size={32} />
      </button>
    </section>
  );
};

export default Hero;
