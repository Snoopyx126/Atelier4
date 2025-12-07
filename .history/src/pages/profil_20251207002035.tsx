// src/pages/Profil.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Gardons-le pour les autres champs
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserData {
  nomSociete: string;
  email: string;
  siret: string;
}

// Le corps de la requête vers l'API
interface UpdateData extends UserData {
  currentPassword?: string; 
}

const Profil = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateData & { passwordConfirmation: string }>({
    nomSociete: '',
    email: '',
    siret: '',
    currentPassword: '', 
    passwordConfirmation: '', 
  });
  
  const [originalEmail, setOriginalEmail] = useState(''); 

  // 1. Charger les données utilisateur au montage
  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setFormData(prev => ({ 
            ...prev, 
            nomSociete: userData.nomSociete,
            email: userData.email,
            siret: userData.siret,
        }));
        setOriginalEmail(userData.email); 
      } catch (e) {
        console.error("Erreur lors de l'analyse des données utilisateur:", e);
        navigate("/espace-pro");
      }
    } else {
      navigate("/espace-pro");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    
    // Si c'est le SIRET, on filtre les non-chiffres directement
    if (id === 'siret') {
        const filteredValue = value.replace(/[^0-9]/g, '').slice(0, 14);
        setFormData(prev => ({ ...prev, [id]: filteredValue }));
        return;
    }
    
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation JavaScript (qui prend le relais)
    if (formData.siret.length !== 14 || /[^0-9]/.test(formData.siret)) {
        alert("Le numéro SIRET doit contenir exactement 14 chiffres.");
        return;
    }
    
    // 2. Vérification de sécurité si l'email a changé
    if (formData.email !== originalEmail && !formData.currentPassword) {
        alert("Veuillez saisir votre Mot de passe actuel pour modifier votre adresse email.");
        return;
    }
    
    setIsLoading(true);

    try {
        const dataToSend: UpdateData = {
            nomSociete: formData.nomSociete,
            email: formData.email,
            siret: formData.siret,
        };

        if (formData.currentPassword) {
            dataToSend.currentPassword = formData.currentPassword;
        }

        const response = await fetch("http://localhost:3001/profil-update", {
            method: "PUT", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Échec de la mise à jour du profil.");
        }

        localStorage.setItem("user", JSON.stringify(data.user)); 
        
        alert("✅ Profil mis à jour avec succès !");
        navigate("/dashboardpro"); 

    } catch (error: any) {
        console.error("Erreur de mise à jour du profil:", error);
        alert(error.message || "Une erreur est survenue lors de la mise à jour du profil.");
    } finally {
        setIsLoading(false);
    }
  };


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
              {/* ✅ CORRECTION DÉFINITIVE : 'noValidate' désactive la validation HTML/pattern */}
              <form onSubmit={handleSubmit} className="space-y-6" noValidate> 
                
              
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <Input id="nomSociete" type="text" required onChange={handleChange} />
                </div>

                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input id="email" type="text" required onChange={handleChange} /> 
                </div>
                
                <div>
                  <Label htmlFor="siret">Numéro SIRET (14 chiffres)</Label>
                  <Input id="siret" type="text" required title="Le SIRET doit contenir 14 chiffres." onChange={handleChange} />
                </div>

                
                {(formData.email !== originalEmail) && (
                  <div className="border-t pt-4">
                    <Label htmlFor="currentPassword">Mot de passe actuel (Requis pour changer l'email)</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      // ❌ Suppression de 'required' HTML, on laisse la validation JS le gérer
                      onChange={handleChange} 
                      value={formData.currentPassword} 
                    />
                  </div>
                )}
                
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