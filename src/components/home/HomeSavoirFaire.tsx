// src/components/home/HomeSavoirFaire.tsx
import { photos } from "./photos";

const steps = [
  {
    title: "Choisissez votre monture",
    description: "Parcourez la collection ou venez l'essayer à l'atelier. Nous vous conseillons selon la forme de votre visage et votre style.",
  },
  {
    title: "Personnalisez chaque détail",
    description: "Teinte des verres, dégradé, facettes, finition dorée ou argentée : chaque élément est choisi avec vous.",
  },
  {
    title: "Recevez une pièce unique",
    description: "Vos verres sont taillés à la main dans notre atelier parisien, puis montés et ajustés avec précision.",
  },
];

const HomeSavoirFaire = () => {
  const [main, detail] = [photos[9], photos[16]];

  return (
    <section id="about" className="py-16 sm:py-28 bg-white">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Photos */}
          <div className="relative animate-fade-up order-2 lg:order-1">
            <div className="aspect-square overflow-hidden bg-[#F7F4EE] w-[85%]">
              {main && <img src={main.image} alt={main.name} loading="lazy" className="w-full h-full object-cover"/>}
            </div>
            <div className="absolute -bottom-8 right-0 w-[48%] aspect-square overflow-hidden border-[6px] border-white shadow-[0_30px_60px_-30px_rgba(15,14,12,0.45)]">
              {detail && <img src={detail.image} alt={detail.name} loading="lazy" className="w-full h-full object-cover"/>}
            </div>
          </div>

          {/* Texte */}
          <div className="animate-fade-up delay-200 order-1 lg:order-2">
            <span className="section-label">Notre philosophie</span>
            <h2 className="section-title-lg">
              L'art de la<br/>
              <span className="italic text-[#9A7A45]">personnalisation</span>
            </h2>
            <div className="gold-divider-left"/>
            <p className="font-cormorant text-lg md:text-xl text-muted-foreground italic leading-relaxed mb-10">
              Chez <span className="text-[#9A7A45] not-italic">L'Atelier des Arts</span>, les lunettes sont bien plus
              qu'un accessoire : elles racontent votre histoire.
            </p>

            <ol className="space-y-8">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-5 sm:gap-6">
                  <span className="font-playfair text-3xl text-[#C9A96E] leading-none w-10 shrink-0">0{index + 1}</span>
                  <div className="border-t border-[#EDE8DF] pt-3 flex-1">
                    <h3 className="font-playfair text-lg sm:text-xl text-[#0F0E0C] mb-2">{step.title}</h3>
                    <p className="font-sans-dm text-sm text-[#0F0E0C]/55 leading-relaxed font-light">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSavoirFaire;
