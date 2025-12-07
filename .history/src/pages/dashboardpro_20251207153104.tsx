// src/pages/dashboardpro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge"; // Assurez-vous d'avoir ce composant, sinon utilisez une div simple
import { Link } from "react-router-dom"; 

// 1. Définition des types de données
interface UserData {
  id: string;
  nomSociete: string;
  email: string;
  siret: string;
}

interface Montage {
  _id: string;
  description: string;
  statut: string;
  dateReception: string;
}

const DashboardPro = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); // État pour stocker les commandes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        // Une fois l'utilisateur chargé, on va chercher ses montages
        fetchMontages(userData.id);
      } catch (e) {
        console.error("Données utilisateur corrompues", e);
        handleLogout(); 
      }
    } else {
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  // 2. Fonction pour récupérer les montages depuis l'API
  const fetchMontages = async (userId: string) => {
    try {
      // On appelle l'API avec l'ID de l'utilisateur
      const response = await fetch(`https://atelier4.vercel.app/api/montages?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setMontages(data.montages);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des montages:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/"); 
  };
  
  const handleEditProfile = () => {
    navigate("/profil"); 
  };

  // Petit helper pour la couleur des statuts
  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'Reçu': return 'bg-blue-500 hover:bg-blue-600';
        case 'En cours': return 'bg-orange-500 hover:bg-orange-600';
        case 'Terminé': return 'bg-green-500 hover:bg-green-600';
        case 'Expédié': return 'bg-purple-500 hover:bg-purple-600';
        default: return 'bg-gray-500';
    }
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
              Bienvenue, {user.nomSociete}
            </h1>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Carte Infos Entreprise */}
            <Card className="col-span-1 md:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Mon Entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Email :</span> {user.email}</p>
                <p><span className="font-semibold">SIRET :</span> {user.siret || "Non renseigné"}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleEditProfile}>
                  Modifier mes informations
                </Button>
              </CardContent>
            </Card>

            {/* Carte Actions */}
            <Card className="shadow-sm border-red-100 bg-red-50/50">
              <CardContent className="pt-6">
                <Button onClick={handleLogout} variant="destructive" className="w-full">
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ✅ SECTION COMMANDES (Mise à jour) */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Vos Commandes en cours</CardTitle>
              <CardDescription>Suivez l'avancement de vos montages optiques.</CardDescription>
            </CardHeader>
            <CardContent>
              {montages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune commande pour le moment.</p>
              ) : (
                <div className="space-y-4">
                  {montages.map((montage) => (
                    <div 
                      key={montage._id} 
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="mb-2 sm:mb-0">
                        <p className="font-medium text-gray-900">{montage.description}</p>
                        <p className="text-xs text-gray-500">
                          Reçu le {new Date(montage.dateReception).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Badge de statut */}
                      <Badge className={`${getStatusColor(montage.statut)} text-white border-none`}>
                        {montage.statut}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default DashboardPro;