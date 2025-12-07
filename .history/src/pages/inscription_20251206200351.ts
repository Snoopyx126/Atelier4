// src/pages/Inscription.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link } from "react-router-dom";

const Inscription = () => {
  const [formData, setFormData] = useState({
    nomSociete: "",
    email: "",
    siret: "",
    password: "",
    confirmPassword: "",
    pieceJointe: null as File | null, // Pour le fichier
  });
  
  // Gère la mise à jour des champs de texte
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Gère la mise à jour du champ fichier (carte d'identité)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, pieceJointe: e.target.files![0] }));
    } else {
      setFormData(prev => ({ ...prev, pieceJointe: null }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!formData.siret || formData.siret.length !== 14) {
      alert("Veuillez entrer un numéro SIRET valide (14 chiffres).");
      return;
    }
    if (!formData.pieceJointe) {
      alert("Veuillez joindre une copie de votre carte d'identité ou Kbis.");
      return;
    }
    
    // 💡 Ici, vous intégreriez la logique d'envoi des données et du fichier au serveur
    console.log("Données à envoyer:", formData);
    alert("Formulaire envoyé pour vérification !");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8">
          
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-playfair font-bold text-gray-900">
              Créer votre Compte Professionnel
            </h2>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Inscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Nom de la société */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <Input id="nomSociete" type="text" required onChange={handleChange} />
                </div>
                
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input id="email" type="email" required onChange={handleChange} />
                </div>

                {/* Numéro SIRET (Obligatoire) */}
                <div>
                  <Label htmlFor="siret">Numéro SIRET (14 chiffres)</Label>
                  <Input id="siret" type="text" required pattern="[0-9]{14}" title="Le SIRET doit contenir 14 chiffres." onChange={handleChange} />
                </div>

                {/* Mot de passe */}
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" required onChange={handleChange} />
                </div>

                {/* Confirmation Mot de passe */}
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le Mot de passe</Label>
                  <Input id="confirmPassword" type="password" required onChange={handleChange} />
                </div>

                {/* Pièce jointe (Carte d'identité / Kbis) */}
                <div className="pt-2">
                  <Label htmlFor="pieceJointe">
                    Carte d'identité / Kbis (Obligatoire)
                  </Label>
                  <Input 
                    id="pieceJointe" 
                    type="file" 
                    required 
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                    onChange={handleFileChange} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format : PDF, JPG ou PNG.
                  </p>
                </div>
                
                <Button className="w-full bg-accent text-white hover:bg-accent/90" type="submit">
                  Soumettre la demande d'ouverture de compte
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/espace-pro" className="text-sm text-gray-500 hover:text-black transition-colors">
               ← Déjà un compte ? Connectez-vous ici.
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Inscription;