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

// Le corps de la requête vers l'API
interface UpdateData extends UserData {
  currentPassword?: string; // Ajouté pour la sécurité lors de la modification de l'email
}

const Profil = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateData & { passwordConfirmation: string }>({
    nomSociete: '',
    email: '',
    siret: '',
    currentPassword: '', // Champ pour le mot de passe actuel
    passwordConfirmation: '', // Champ temporaire pour la confirmation du mot de passe (si on veut le changer)
  });
  
  const [originalEmail, setOriginalEmail] = useState(''); // Pour vérifier si l'email a changé

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
        setOriginalEmail(userData.email); // Sauvegarde de l'email initial
      } catch (e) {
        console.error("Erreur lors de l'analyse des données utilisateur:", e);
        navigate("/espace-pro");
      }
    } else {
      navigate("/espace-pro");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // 1. Validation JavaScript (pour remplacer la validation HTML)
    if (formData.siret.length !== 14 || /[^0-9]/.test(formData.siret)) {
        alert("Le numéro SIRET doit contenir exactement 14 chiffres.");
        return;
    }
    
    // 2. Vérification de sécurité si l'email ou une donnée sensible a changé
    if (formData.email !== originalEmail && !formData.currentPassword) {
        alert("Veuillez saisir votre Mot de passe actuel pour modifier votre adresse email.");
        return;
    }
    
    setIsLoading(true);

    try {
        // Envoie uniquement les données nécessaires à l'API
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

        // Succès : Mettre à jour le localStorage avec les nouvelles données
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
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                {/* Nom de la société (Type text) */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <Input 
                    id="nomSociete" 
                    type="text" 
                    required 
                    onChange={handleChange} 
                    value={formData.nomSociete} 
                  />
                </div>

                {/* ✅ Email (Type text pour désactiver le pattern implicite) */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input 
                    id="email" 
                    // Changé en 'text' pour éviter le pattern implicite du navigateur
                    type="text" 
                    required
                    onChange={handleChange} 
                    value={formData.email} 
                  />
                </div>
                
                
                <div>
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <Input 
                    id="siret" 
                    type="text" 
                    required 
                    onChange={handleChange} 
                    value={formData.siret}
                    maxLength={14} 
                  />
                </div>

                {/* Champ pour le Mot de passe actuel (Sécurité) */}
                {(formData.email !== originalEmail) && (
                  <div className="border-t pt-4">
                    <Label htmlFor="currentPassword">Mot de passe actuel (Requis pour changer l'email)</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      required
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