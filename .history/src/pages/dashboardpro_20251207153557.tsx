// src/pages/dashboardpro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Link } from "react-router-dom"; 
import { Badge } from "@/components/ui/badge";

// 1. Définition des types de données
interface UserData {
  id: string;      
  nomSociete: string;
  email: string;
  siret: string;
  role?: string;   
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
  
  // ✅ Ces lignes manquaient dans votre version :
  const [montages, setMontages] = useState<Montage[]>([]); 
  const [loading, setLoading] = useState(true);

  // 2. Logique de chargement
  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        // ✅ Appel de la fonction pour chercher les montages
        fetchMontages(userData.id);
      } catch (e) {
        console.error("Erreur lecture données", e);
        handleLogout(); 
      }
    } else {
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  // ✅ Fonction manquante : Récupérer les montages
  const fetchMontages = async (userId: string) => {
    try {
      // Assurez-vous que l'URL correspond à votre API déployée
      const response = await fetch(`https://atelier4.vercel.app/api/montages?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setMontages(data.montages);
      }
    } catch (error) {
      console.error("Erreur API:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user"); 
    navigate("/"); 
  };
  
  const handleEditProfile = () => {
    navigate("/profil"); 
  };

  // ✅ Fonction manquante : Couleurs des statuts
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
              Bienvenue, {user.nomSociete} !
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Tableau de bord de votre espace professionnel.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
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
                <Button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white">
                  Déconnexion
                </Button>
              </CardContent>
            </Card>
          </div>

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