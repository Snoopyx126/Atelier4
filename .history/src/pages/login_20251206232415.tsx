// src/pages/Login.tsx (ou EspacePro.tsx si c'est votre page de connexion)

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; 
// Si vous utilisez 'sonner' ou un autre système de notification, importez-le ici
// import { toast } from "sonner"; 

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
    console.log("Tentative de connexion");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simule un délai
    alert("Test de succès de connexion");
    navigate("/dashboard-pro");


    if (!formData.email || !formData.password) {
      alert("Veuillez saisir votre email et votre mot de passe.");
      // toast.error("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Appel à l'endpoint de connexion local
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Gérer les erreurs : identifiants invalides ou compte non vérifié
        throw new Error(data.message || "Échec de la connexion.");
      }

      // 4. Succès de la connexion
      alert(`Bienvenue ${data.user.nomSociete} !`);
      // toast.success(`Bienvenue ${data.user.nomSociete} !`);
      
      // Stocker l'état de l'utilisateur (par exemple, dans localStorage ou un contexte)
      localStorage.setItem("user", JSON.stringify(data.user)); 
      
      // Redirection vers le tableau de bord ou l'espace client
      navigate("/dashboardpro"); 

    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      alert(error.message || "Une erreur est survenue lors de la connexion.");
      // toast.error(error.message || "Une erreur est survenue lors de la connexion.");
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
                
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input 
                    id="email" 
                    // Nous pouvons remettre type="email" ici car l'erreur de pattern venait d'un conflit antérieur
                    type="email" 
                    required 
                    onChange={handleChange} 
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    onChange={handleChange} 
                  />
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