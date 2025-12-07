import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// ATTENTION: Ceci est le frontend (l'apparence). L'envoi des données et la vérification du SIRET nécessitent un BACKEND/API.
const ProAccess = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    siret: "",
  });
  const [isLogin, setIsLogin] = useState(true); // Toggle entre Connexion et Inscription

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin && (!formData.email || !formData.password)) {
      toast.error("Veuillez remplir l'email et le mot de passe.");
      return;
    }

    if (!isLogin && (!formData.email || !formData.password || !formData.siret)) {
      toast.error("Veuillez remplir tous les champs obligatoires (incluant le SIRET).");
      return;
    }

    // REMARQUE CRITIQUE: Ici, vous devez appeler votre API/Backend pour l'authentification.
    console.log("Données envoyées au serveur:", formData, "Action:", isLogin ? "Connexion" : "Inscription");
    
    // Exemple de message d'attente (à remplacer par la réponse du serveur)
    toast.info("Connexion/Inscription en cours..."); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section className="py-20 bg-secondary/30 min-h-screen pt-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="font-playfair text-3xl font-bold">
              {isLogin ? "Connexion Pro" : "Créer votre Compte Pro"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-semibold">Accès réservé :</span> Veuillez vous identifier avec votre compte professionnel.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  E-mail professionnel
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@votresociete.com"
                  required
                />
              </div>

              {/* Champ SIRET - Visible uniquement à l'inscription */}
              {!isLogin && (
                <div>
                  <label htmlFor="siret" className="block text-sm font-medium text-foreground mb-2">
                    N° de SIRET *
                  </label>
                  <Input
                    id="siret"
                    name="siret"
                    type="text"
                    value={formData.siret}
                    onChange={handleChange}
                    placeholder="Ex: 123 456 789 00000"
                    required
                    maxLength={14}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Obligatoire pour la vérification du compte Pro.</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base min-h-[48px]"
              >
                {isLogin ? "Connexion" : "Créer le Compte Pro"}
              </Button>
            </form>

            <p className="text-center mt-6">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-sm font-medium text-accent hover:text-foreground transition-colors"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ProAccess;