// src/pages/login.tsx

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
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE_URL = "https://atelier4.vercel.app/api"; 

      const response = await fetch(`${API_BASE_URL}/login`, {
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

      // On enregistre les infos venant de MongoDB dans la mémoire du navigateur
      localStorage.setItem("user", JSON.stringify(data.user)); 
      
      // ✅ C'EST ICI QUE TOUT SE JOUE : LA REDIRECTION INTELLIGENTE
      if (data.user.role === 'admin') {
          // Si MongoDB dit que c'est un admin -> Page Admin
          navigate("/admin");
      } else {
          // Sinon -> Espace Client classique
          navigate("/dashboardpro");
      }

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