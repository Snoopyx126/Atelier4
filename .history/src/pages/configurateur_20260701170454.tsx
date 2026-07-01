import React from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cuboid, ArrowLeft, Sparkles } from "lucide-react";

const Configurateur = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barre de navigation */}
      <Navigation />

      {/* Contenu Principal */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
        
        {/* Cercle avec icône (Cube pour évoquer la 3D/Construction) */}
        <div className="bg-white p-6 rounded-full shadow-lg mb-8 animate-pulse">
            <Cuboid className="w-16 h-16 text-gray-900" />
        </div>

        {/* Titre */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Configurateur Sur-Mesure
        </h1>

        {/* Badge "Bientôt" */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Bientôt disponible</span>
        </div>

        {/* Description */}
        <p className="text-gray-600 max-w-lg text-lg mb-10 leading-relaxed">
          Nous développons un outil innovant pour vous permettre de configurer, personnaliser et visualiser vos montages optiques en temps réel.
        </p>

        {/* Bouton de retour */}
        <Link to="/">
            <Button className="bg-black hover:bg-gray-800 text-white px-8 py-6 text-lg gap-2">
                <ArrowLeft className="w-5 h-5" />
                Retour à l'accueil
            </Button>
        </Link>

      </div>
    </div>
  );
};

export default Configurateur;