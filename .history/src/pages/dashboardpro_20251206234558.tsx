// src/pages/DashboardPro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Assurez-vous d'avoir bien ces composants et la navigation
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 

// Définir le type des données utilisateur (Doit correspondre à ce que l'API retourne)
interface UserData {
  nomSociete: string;
  email: string;
  siret: string;
}

const DashboardPro = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Logique de chargement des données et de sécurité
  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    
    if (userDataString) {
      try {
        // Tente de parser les données stockées
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
      } catch (e) {
        console.error("Erreur lors de l'analyse des données utilisateur:", e);
        // Si les données sont corrompues, déconnecter l'utilisateur
        handleLogout(); 
      }
    } else {
      // Si aucune donnée utilisateur n'est trouvée (pas connecté), rediriger
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  // 2. Fonction de Déconnexion
  const handleLogout = () => {
    localStorage.removeItem("user"); // Supprime les données de session (Déconnexion)
    // Redirige vers la page d'accueil
    navigate("/"); 
  };
  
  // 3. Fonction de Redirection pour Modifier le profil
  const handleEditProfile = () => {
    // Redirige vers la page de modification que nous avons créée
    navigate("/profil"); 
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Chargement de l'espace professionnel...
      </div>
    );
  }
  
  if (!user) {
    // Si l'utilisateur n'est pas trouvé (et n'a pas encore été redirigé par l'useEffect)
    return null; 
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* En-tête de bienvenue */}
          <header className="text-center pt-8">
            <h1 className="text-4xl font-playfair font-bold text-gray-900">
              Bienvenue, {user.nomSociete} !
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Tableau de bord de votre espace professionnel.
            </p>
          </header>

          {/* Section Informations et Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Carte des Informations Clés */}
            <Card className="col-span-1 md:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle>Informations Clés</CardTitle>
                <CardDescription>Vos détails d'entreprise enregistrés.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Affichage du Nom de la Société */}
                <p>
                  <span className="font-semibold block text-gray-700">Nom de l'entreprise :</span> 
                  {user.nomSociete}
                </p>
                
                {/* Affichage de l'Email */}
                <p>
                  <span className="font-semibold block text-gray-700">Email :</span> 
                  {user.email}
                </p>
                
                {/* Affichage du SIRET (CORRIGÉ) */}
                <p>
                  <span className="font-semibold block text-gray-700">SIRET :</span> 
                  {/* Si le SIRET est vide/nul, affiche un message d'attente */}
                  {user.siret || "N/A (Veuillez vérifier votre connexion API)"} 
                </p>
                
                {/* Bouton Modifier le profil (FONCTIONNEL) */}
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleEditProfile} // ✅ Déclenche la navigation vers /profil
                >
                  Modifier le profil
                </Button>
              </CardContent>
            </Card>

            {/* Carte de Déconnexion */}
            <Card className="bg-white shadow-lg border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Cliquez ci-dessous pour vous déconnecter en toute sécurité.
                </p>
                <Button 
                  onClick={handleLogout} 
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  Déconnexion
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Espace pour les commandes ou autres fonctionnalités (À développer) */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Vos Commandes Récentes</CardTitle>
              <CardDescription>Statut de vos 5 dernières commandes.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 italic">
                (Le module de gestion des commandes sera développé ici.)
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default DashboardPro;