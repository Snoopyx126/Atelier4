import { Button } from "@/components/ui/button";
import { Download, Clock, Zap } from "lucide-react";

const HowItWorksPro = () => {
  return (
    <section id="how-it-works-pro" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Comment ça marche :
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Notre service est optimisé pour les professionnels. Suivez ces étapes pour passer commande.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          
          {/* Étape 1: Téléchargement */}
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg animate-scale-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-4">
              <Download className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-playfair text-xl font-semibold text-foreground mb-3">
              1. Téléchargez les fichiers
            </h3>
            <p className="text-base text-muted-foreground mb-4">
              Accédez à l'Espace Pro pour télécharger notre grille tarifaire exclusive et les gabarits de montage requis.
            </p>
            {/* Laissez le lien vide, il doit être accessible UNIQUEMENT après connexion (voir section 2) */}
            <a 
              href="/espace-pro" 
              className="font-semibold text-accent hover:text-foreground transition-colors"
            >
              Cliquez ici pour accéder au téléchargement
            </a>
          </div>

          {/* Étape 2: Montage et Envoi */}
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg animate-scale-in" style={{ animationDelay: "150ms" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-4">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-playfair text-xl font-semibold text-foreground mb-3">
              2. Préparez et Envoyez votre Commande
            </h3>
            <p className="text-base text-muted-foreground mb-4">
              Une fois la fiche atelier complété et la grille tarifaire consultée, vous pouvez nous envoyer vos montages.
            </p>
          </div>

          {/* Étape 3: Horaires */}
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg animate-scale-in" style={{ animationDelay: "300ms" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-4">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-playfair text-xl font-semibold text-foreground mb-3">
              3. Traitement et Délais
            </h3>
            <p className="text-base text-muted-foreground">
              Vous pouvez nous envoyer vos montages <strong className="text-foreground"> Lundi-Jeudi 10H-19H Vendredi 10H-14H</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong className="text-foreground">Traitement des commandes :</strong> Nous traitons les demandes durant les heures d'ouverture (Lundi-Vendredi).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksPro;