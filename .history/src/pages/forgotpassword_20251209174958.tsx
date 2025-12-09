import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Veuillez entrer votre email.");
      return;
    }

    setIsLoading(true);

    try {
      // Appel à l'API sécurisée (qui envoie l'email via Resend)
      // ✅ CORRECTION : URL dynamique selon l'environnement
      const API_BASE_URL = window.location.hostname === "localhost" 
        ? "http://localhost:3000/api" 
        : "/api";

      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        // ✅ Succès : On informe l'utilisateur que l'email est parti
        toast.success("Email envoyé !", {
            description: "Vérifiez votre boîte mail (et vos spams) pour récupérer votre nouveau mot de passe."
        });
        // Redirection automatique vers la connexion après 3 secondes
        setTimeout(() => navigate("/espace-pro"), 3000);
      } else {
        toast.error("Erreur", { description: data.message || "Email introuvable." });
      }
    } catch (error) {
      toast.error("Erreur serveur", { description: "Réessayez plus tard." });
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
              Récupération de compte
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Entrez votre email professionnel pour recevoir un nouveau mot de passe.
            </p>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Mot de passe oublié</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemple@optique.com"
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                  /> 
                </div>
                
                <Button 
                  className="w-full bg-black text-white hover:bg-gray-800" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
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