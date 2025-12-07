// src/pages/Profil.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserData {
  nomSociete: string;
  email: string;
  siret: string;
}

const Profil = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    nomSociete: '',
    email: '',
    siret: '',
  });

  // 1. Charger les données utilisateur au montage
  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setFormData(userData);
      } catch (e) {
        console.error("Erreur lors de l'analyse des données utilisateur:", e);
        navigate("/espace-pro"); // Rediriger si les données sont corrompues
      }
    } else {
      navigate("/espace-pro"); // Rediriger si l'utilisateur n'est pas connecté
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      // 2. Appel à l'endpoint de mise à jour (Vous devrez créer cette API !)
      const response = await fetch("http://localhost:3001/profil-update", {
        method: "PUT", 
        headers: {
          "Content-Type": "application/json",
          // IMPORTANT: Vous devriez inclure le jeton d'authentification ici
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Échec de la mise à jour du profil.");
      }

      // 3. Succès : Mettre à jour le localStorage avec les nouvelles données
      localStorage.setItem("user", JSON.stringify(data.user)); 
      
      alert("✅ Profil mis à jour avec succès !");
      navigate("/dashboardpro"); // Retour au tableau de bord

    } catch (error: any) {
      console.error("Erreur de mise à jour du profil:", error);
      alert(error.message || "Une erreur est survenue lors de la mise à jour du profil.");
    } finally {
      setIsLoading(false);
    }
  };

  if (formData.email === '') {
      return (
        <div className="min-h-screen flex items-center justify-center">
            Chargement des informations du profil...
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8">
          
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-playfair font-bold text-gray-900">
              Modifier Mon Profil
            </h2>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Informations d'Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                {/* Nom de la société */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <Input id="nomSociete" type="text" required onChange={handleChange} value={formData.nomSociete} />
                </div>

                {/* Email (Lecture seule pour la sécurité) */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input id="email" type="email" readOnly className="bg-gray-100 cursor-not-allowed" value={formData.email} />
                </div>
                
                {/* SIRET */}
                <div>
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <Input id="siret" type="text" required onChange={handleChange} value={formData.siret} />
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full bg-accent text-white hover:bg-accent/90" 
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Mise à jour en cours..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/changer-mot-de-passe" className="text-sm text-gray-500 hover:text-black transition-colors underline">
               Changer le mot de passe →
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profil;