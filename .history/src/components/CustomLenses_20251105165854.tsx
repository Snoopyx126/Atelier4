import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
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
  {
    id: 1,
    name: "Kiwi",
    image: kiwiImg,
    description: "Verre Photochromique",
  },
  {
    id: 2,
    name: "Peche",
    image: pecheImg,
    description: "Verre Photochromique",
  },
  {
    id: 3,
    name: "Fraise",
    image: fraiseImg,
    description: "Verre Photochromique",
  },
  {
    id: 4,
    name: "Framboise",
    image: framboiseImg,
    description: "Verre Photochromique",
  },
  {
    id: 5,
    name: "Cassis",
    image: cassisImg,
    description: "Verre Photochromique",
  },
  {
    id: 6,
    name: "Bleuets",
    image: bleuetsImg,
    description: "Verre Photochromique",
  },
  {
    id: 7,
    name: "Myrtille",
    image: myrtilleImg,
    description: "Verre Photochromique",
  },
  {
    id: 8,
    name: "Quetsche",
    image: quetscheImg,
    description: "Verre Photochromique",
  },
  {
    id: 9,
    name: "Raisin",
    image: raisinImg,
    description: "Verre Photochromique",
  },
  {
    id: 10,
    name: "Mure",
    image: mureImg,
    description: "Verre Photochromique",
  },
];

const CustomLenses = () => {
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="custom-lenses" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            Verre Photochromique
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
           Choisissez votre teinte préférée - cliquez pour la voir jouer au soleil
          </p>
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

export default CustomLenses;
