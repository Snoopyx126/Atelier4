// src/pages/dashboardpro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Link } from "react-router-dom"; 

interface UserData {
  id: string;
  nomSociete: string;
  email: string;
  siret: string;
}

const DashboardPro = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
      } catch (e) {
        handleLogout(); 
      }
    } else {
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/"); 
  };
  
  const handleEditProfile = () => {
    navigate("/profil"); 
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) return null;

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
            
            {/* Carte Informations */}
            <Card className="col-span-1 md:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle>Informations Clés</CardTitle>
                <CardDescription>Vos détails d'entreprise enregistrés.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p><span className="font-semibold block text-gray-700">Nom :</span> {user.nomSociete}</p>
                <p><span className="font-semibold block text-gray-700">Email :</span> {user.email}</p>
                <p><span className="font-semibold block text-gray-700">SIRET :</span> {user.siret || "N/A"}</p>
                
                <Button variant="outline" className="mt-4" onClick={handleEditProfile}>
                  Modifier le profil
                </Button>
              </CardContent>
            </Card>

            {/* Carte Actions (Déconnexion, Comment ça marche) */}
            <Card className="bg-white shadow-lg border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/comment-ca-marche" className="w-full block mb-4">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    Comment ça marche ?
                  </Button>
                </Link>
                <p className="mb-4 text-sm text-gray-600">
                  Se déconnecter en toute sécurité.
                </p>
                <Button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white">
                  Déconnexion
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ✅ LA CARTE D'ACCÈS AUX COMMANDES (Visible mais séparée) */}
          <Card className="shadow-lg border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Suivi de Production</CardTitle>
              <CardDescription>Gérez vos montages et suivez leur avancement.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-gray-600">Accédez à l'historique complet et créez de nouvelles demandes.</p>
              <Button 
                onClick={() => navigate("/mes-commandes")} 
                className="bg-accent hover:bg-accent/90 text-white px-8"
              >
                Accéder à mes commandes →
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default DashboardPro;