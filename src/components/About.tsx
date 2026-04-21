// src/components/About.tsx
import { Eye, Sparkles, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Conception personnalisée",
    description: "Chaque monture est spécialement adaptée à votre style unique, à la forme de votre visage et à votre personnalité.",
  },
  {
    icon: Sparkles,
    title: "Matériaux haut de gamme",
    description: "Nous sélectionnons des matériaux de qualité supérieure pour garantir confort, durabilité et esthétique à chaque monture.",
  },
  {
    icon: Users,
    title: "Conseil professionnel",
    description: "Travaillez directement avec nos experts en lunetterie pour créer la paire parfaite, conçue pour durer.",
  },
];

const About = () => {
  return (
    <section id="about" className="py-16 sm:py-28 bg-[#0F0E0C]">
      <div className="container mx-auto px-6 lg:px-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-20 items-center mb-12 sm:mb-24">

          {/* Texte principal */}
          <div className="animate-fade-up">
            <span className="section-label">Notre philosophie</span>
            <h2 className="font-playfair text-4xl md:text-5xl font-normal text-[#F7F4EE] leading-[1.15] mb-6">
              L'art de la<br />
              <span className="italic text-[#E2C99A]">personnalisation</span>
            </h2>
            <div className="gold-divider-left" />
            <p className="font-cormorant text-lg text-[#F7F4EE]/65 leading-relaxed mb-8 italic">
              Chez <span className="text-[#E2C99A] not-italic">L'Atelier des Arts</span>, nous pensons que les lunettes
              sont bien plus qu'un simple accessoire fonctionnel. Elles racontent votre histoire.
            </p>
            <p className="font-sans-dm text-sm text-[#F7F4EE]/45 leading-relaxed font-light">
              C'est pourquoi nous nous consacrons à la création de pièces véritablement
              personnalisées, où chaque détail — de la forme aux gravures — reflète votre
              style et votre vision du monde.
            </p>
          </div>

          {/* Citation */}
          <div className="animate-fade-up delay-200 relative">
            <div className="absolute -top-4 -left-4 w-12 h-12 border-l-2 border-t-2 border-[#C9A96E]/40" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-r-2 border-b-2 border-[#C9A96E]/40" />
            <div className="p-6 sm:p-10 border border-[#C9A96E]/15 bg-[#1C1A17]">
              <p className="font-playfair text-xl sm:text-2xl italic text-[#F7F4EE]/80 leading-relaxed mb-6">
                "Vos yeux racontent votre histoire.<br />
                Laissez-nous vous aider à la mettre en valeur."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-8 h-px bg-[#C9A96E]" />
                <span className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-[#C9A96E]">
                  L'équipe Atelier des Arts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trois piliers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#C9A96E]/10 border border-[#C9A96E]/10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 sm:p-10 bg-[#0F0E0C] hover:bg-[#1C1A17] transition-colors duration-400 animate-fade-up"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="mb-6">
                  <div className="w-10 h-10 border border-[#C9A96E]/30 flex items-center justify-center group-hover:border-[#C9A96E]/70 transition-colors duration-400">
                    <Icon className="w-4 h-4 text-[#C9A96E]" />
                  </div>
                </div>

                <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/60 block mb-3">
                  0{index + 1}
                </span>

                <h3 className="font-playfair text-xl font-normal text-[#F7F4EE] mb-4 leading-snug">
                  {feature.title}
                </h3>

                <p className="font-sans-dm text-xs text-[#F7F4EE]/40 leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default About;
