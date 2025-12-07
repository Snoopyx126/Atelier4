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
      // ✅ URL CORRIGÉE (Production)
      const API_BASE_URL = "https://atelier4.vercel.app/api";
      
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'envoi.");
      }

      setMessage("✅ Si cet email existe, vous recevrez un nouveau mot de passe temporaire.");

    } catch (error: any) {
      console.error("Erreur:", error);
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
                Entrez votre email pour recevoir un mot de passe temporaire.
              </p>
              
              {message && (
                <div className={`p-3 rounded-md text-center text-sm ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6"> 
                
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
                  {isLoading ? "Envoi..." : "Recevoir mon mot de passe"}
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