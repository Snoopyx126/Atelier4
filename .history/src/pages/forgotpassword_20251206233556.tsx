// src/pages/ForgotPassword.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link } from "react-router-dom"; 

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert("Veuillez saisir votre email.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // 1. Appel à l'endpoint de réinitialisation
      const response = await fetch("http://localhost:3001/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Échec de l'envoi de l'email de réinitialisation.");
      }

      // 2. Succès : informer l'utilisateur de vérifier sa boîte mail
      setMessage("✅ Si cet email existe dans notre base, vous recevrez un lien pour réinitialiser votre mot de passe.");
      // Optionnel: Réinitialiser l'email après un envoi réussi
      // setEmail(""); 

    } catch (error: any) {
      console.error("Erreur de réinitialisation:", error);
      // Afficher un message d'erreur générique pour des raisons de sécurité (ne pas confirmer l'existence de l'email)
      setMessage("⚠️ Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-8">
          
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-playfair font-bold text-gray-900">
              Mot de Passe Oublié
            </h2>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Réinitialisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <p className="text-sm text-gray-600 text-center">
                Veuillez entrer l'adresse email associée à votre compte professionnel.
              </p>
              
              {/* Affichage du message de succès/erreur */}
              {message && (
                <div 
                  className={`p-3 rounded-md text-center ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                  />
                </div>
                
                <Button 
                  className="w-full bg-accent text-white hover:bg-accent/90" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Envoi en cours..." : "Recevoir le lien de réinitialisation"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/espace-pro" className="text-sm text-gray-500 hover:text-black transition-colors">
               ← Retour à la connexion
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;