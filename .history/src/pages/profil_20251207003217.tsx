// src/pages/Profil.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
// Nous n'importons plus Input car nous utilisons des éléments <input> natifs
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserData {
  nomSociete: string;
  email: string;
  siret: string;
}

interface UpdateData extends UserData {
  currentPassword?: string; 
}

// Classe de style pour les inputs natifs, équivalente à votre composant Input
const customInputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";


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
    
    // Filtre SIRET (accepte uniquement les chiffres)
    if (id === 'siret') {
        const filteredValue = value.replace(/[^0-9]/g, '').slice(0, 14);
        setFormData(prev => ({ ...prev, [id]: filteredValue }));
        return;
    }
    
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // La soumission se fait via onClick, il n'y a plus d'événement de formulaire
  const handleSubmit = async () => {
    
    // 1. Validation JavaScript - Nom de société
    if (!formData.nomSociete.trim()) {
        alert("Le nom de la société est requis.");
        return;
    }

    // 2. Validation JavaScript - Email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
        alert("Veuillez saisir une adresse email valide.");
        return;
    }

    // 3. Validation JavaScript - SIRET
    if (formData.siret.length !== 14 || /[^0-9]/.test(formData.siret)) {
        alert("Le numéro SIRET doit contenir exactement 14 chiffres.");
        return;
    }
    
    // 4. Vérification de sécurité (Mot de passe actuel)
    if (formData.email !== originalEmail && !formData.currentPassword) {
        alert("Veuillez saisir votre Mot de passe actuel pour modifier votre adresse email.");
        return;
    }
    
    setIsLoading(true);

    


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
              {/* Remplacement de <form> par <div> : suppression définitive de la validation HTML native */}
              <div className="space-y-6"> 
                
                {/* 1. Nom de la société - INPUT NATIF */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <input 
                    id="nomSociete" 
                    type="text" 
                    required 
                    onChange={handleChange} 
                    value={formData.nomSociete}
                    className={customInputClass}
                  />
                </div>

                {/* 2. Email - INPUT NATIF (type text pour éviter le pattern caché) */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <input 
                    id="email" 
                    type="text" 
                    required
                    onChange={handleChange} 
                    value={formData.email}
                    className={customInputClass}
                  />
                </div>
                
                {/* 3. SIRET - INPUT NATIF */}
                <div>
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <input 
                    id="siret" 
                    type="text" 
                    required 
                    onChange={handleChange} 
                    value={formData.siret}
                    maxLength={14} 
                    className={customInputClass}
                  />
                </div>

                {/* 4. Mot de passe actuel - INPUT NATIF */}
                {(formData.email !== originalEmail) && (
                  <div className="border-t pt-4">
                    <Label htmlFor="currentPassword">Mot de passe actuel (Requis pour changer l'email)</Label>
                    <input 
                      id="currentPassword" 
                      type="password" 
                      onChange={handleChange} 
                      value={formData.currentPassword}
                      className={customInputClass} 
                    />
                  </div>
                )}
                
                <div className="pt-4">
                  <Button 
                    // ✅ Appel de handleSubmit via onClick
                    onClick={handleSubmit} 
                    className="w-full bg-accent text-white hover:bg-accent/90" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Mise à jour en cours..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </div>
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
}
export default Profil ;