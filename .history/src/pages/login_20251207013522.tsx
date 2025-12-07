// src/pages/Login.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; 

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRUCIAL !

    // Remplacement du code de test temporaire par la logique de validation
    if (!formData.email || !formData.password) {
      alert("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Appel à l'endpoint de connexion local
      const response = await fetch("https://atelier4.vercel.app/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Échec de la connexion.");
      }

      // 4. Succès de la connexion
      alert(`Bienvenue ${data.user.nomSociete} !`);
      
      // Stocker l'état de l'utilisateur (Assurez-vous que data.user contient 'siret')
      localStorage.setItem("user", JSON.stringify(data.user)); 
      
      // Redirection vers le tableau de bord ou l'espace client
      navigate("/dashboardpro"); // Assurez-vous que c'est bien la route utilisée dans App.tsx

    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      alert(error.message || "Une erreur est survenue lors de la connexion.");
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
              Accès Espace Professionnel
            </h2>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Connexion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input id="email" type="text" required onChange={handleChange} /> 
                </div>

                
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" required onChange={handleChange} />
                  
                  {/* ✅ LIEN "MOT DE PASSE OUBLIÉ ?" */}
                  <div className="text-right mt-1">
                      <Link 
                        to="/mot-de-passe-oublie" 
                        className="text-xs text-gray-500 hover:text-accent transition-colors underline"
                      >
                        Mot de passe oublié ?
                      </Link>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-accent text-white hover:bg-accent/90" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/inscription" className="text-sm text-gray-500 hover:text-black transition-colors">
               → Pas encore de compte ? S'inscrire ici.
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;