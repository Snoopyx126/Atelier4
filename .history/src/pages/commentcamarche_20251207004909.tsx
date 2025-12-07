// src/pages/CommentCaMarche.tsx

import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Clock, DollarSign, Send } from "lucide-react"; // Pour les icônes

const CommentCaMarche = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-4xl">
  
  <div className="text-center mb-10">
    <h1 className="text-4xl sm:text-3xl font-playfair font-bold text-gray-900 mb-3 leading-snug">
            Comment Ça Marche ?
          </h1>
    <p className="text-xl text-gray-600">
      Toutes les informations pour nous envoyer votre montage optique.
    </p>
  </div>

        {/* --- Section 1: Comment nous envoyer votre montage --- */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8 border-t-4 border-accent">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <Send className="w-6 h-6 mr-3 text-accent" />
            1. Comment nous envoyer votre montage
          </h2>
          <p className="text-gray-700 mb-4">
            Pour garantir un traitement rapide et précis, veuillez suivre ces étapes :
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4 text-gray-600">
            <li>
              **Préparation physique :** Emballez soigneusement la monture et les verres (si verres de démonstration ou à reprendre).
            </li>
            <li>
              **Informations Requises :** Assurez-vous d'inclure le **document de commande rempli** (voir Section 4) avec toutes les mesures (écarts pupillaires, hauteurs, etc.).
            </li>
            <li>
              **Expédition :** Envoyez le tout à notre laboratoire à l'adresse suivante : [Votre Adresse de Laboratoire]. Nous recommandons un envoi suivi.
            </li>
          </ul>
        </div>
        
        {/* --- Section 2: Délais --- */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8 border-t-4 border-accent">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-6 h-6 mr-3 text-accent" />
            2. Nos Délais de Traitement
          </h2>
          <p className="text-gray-700 mb-4">
            Nos délais dépendent de la complexité du montage :
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4 text-gray-600">
            <li>
              **Montages Standards (unifocaux) :** **24 à 48 heures** après réception.
            </li>
            <li>
              **Montages Complexes (progressifs, fortement galbés) :** **3 à 5 jours ouvrés** après réception.
            </li>
            <li>
              *Note :* Les délais de livraison postaux ne sont pas inclus dans ces estimations.
            </li>
          </ul>
        </div>

        {/* --- Section 3: Grille Tarifaire --- */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8 border-t-4 border-accent">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <DollarSign className="w-6 h-6 mr-3 text-accent" />
            3. Grille Tarifaire
          </h2>
          <p className="text-gray-700 mb-4">
            Notre grille tarifaire détaillée est accessible via ce lien. Si vous avez besoin d'un devis spécifique pour un montage complexe, veuillez nous contacter.
          </p>
          <a 
            href="/Tarif.pdf" // 👈 Modifiez ce lien
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="text-accent border-accent hover:bg-accent hover:text-white">
              Télécharger la Grille Tarifaire
            </Button>
          </a>
        </div>
        
        {/* --- Section 4: Document à Remplir --- */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8 border-t-4 border-accent">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-accent" />
            4. Document de Commande
          </h2>
          <p className="text-gray-700 mb-4">
            Ce document est **obligatoire** pour tout envoi de montage. Il assure que nous disposons de toutes les informations techniques nécessaires (corrections, PD, hauteurs) avant de commencer le travail.
          </p>
          <a 
            href="/Fiche.pdf" // 👈 Modifiez ce lien
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button className="bg-accent hover:bg-accent/90">
              Télécharger le Formulaire de Commande (PDF)
            </Button>
          </a>
        </div>

        <div className="text-center mt-12">
          <Link to="/dashboardpro">
            <Button variant="secondary">← Retour au Tableau de Bord</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CommentCaMarche;