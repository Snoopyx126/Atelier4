// src/pages/DashboardPro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; // Assurez-vous d'avoir ce composant
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 

// Définir le type des données utilisateur
interface UserData {
  nomSociete: string;
  email: string;
  siret: string; // La propriété SIRET est cruciale
}

const DashboardPro = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Charger les données utilisateur au montage du composant
  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
      } catch (e) {
        console.error("Erreur lors de l'analyse des données utilisateur:", e);
        handleLogout(); 
      }
    } else {
      // Si aucune donnée utilisateur n'est trouvée, rediriger vers la page de connexion
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  // 2. Fonction de Déconnexion
  const handleLogout = () => {
    localStorage.removeItem("user"); // Supprime les données de session
    navigate("/"); // Redirige vers la page d'accueil
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Chargement de l'espace professionnel...
      </div>
    );
  }
  
  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="text-center pt-8">
            <h1 className="text-4xl font-playfair font-bold text-gray-900">
              Bienvenue, {user.nomSociete} !
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Tableau de bord de votre espace professionnel.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Infos Compte */}
            <Card className="col-span-1 md:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle>Informations Clés</CardTitle>
                <CardDescription>Vos détails d'entreprise enregistrés.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  <span className="font-semibold block text-gray-700">Nom de l'entreprise :</span> 
                  {user.nomSociete}
                </p>
                <p>
                  <span className="font-semibold block text-gray-700">Email :</span> 
                  {user.email}
                </p>
                <p>
                  <span className="font-semibold block text-gray-700">SIRET :</span> 
                  {/* ✅ Le SIRET doit maintenant s'afficher ici ! */}
                  {user.siret} 
                </p>
                
                <Button variant="outline" className="mt-4">
                  Modifier le profil
                </Button>
              </CardContent>
            </Card>

            {/* Déconnexion */}
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

          {/* Espace pour les commandes ou autres fonctionnalités */}
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