import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Link } from "react-router-dom"; 
import { Phone, Mail, FileText, MapPin } from "lucide-react";

interface UserData {
  id: string;
  nomSociete: string;
  email: string;
  siret: string;
  phone?: string;
  address?: string;
  zipCity?: string; 
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
        
        // Simuler l'ajout de données d'adresse pour l'affichage (si votre API de login ne les fournit pas encore)
        const userWithAddress = {
            ...userData,
            address: userData.address || "Adresse non renseignée", 
            zipCity: userData.zipCity || "Code postal et ville N/A" 
        };

        setUser(userWithAddress);
      } catch (e) {
        // En cas d'erreur de parsing
        localStorage.removeItem("user");
        navigate("/"); 
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="text-center pt-8">
            <h1 className="text-4xl font-playfair font-bold text-gray-900">
              Bienvenue, {user.nomSociete} !
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Espace professionnel & Suivi atelier.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Carte Informations */}
            <Card className="col-span-1 md:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle>Informations Clés</CardTitle>
                <CardDescription>Vos coordonnées enregistrées.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {user.nomSociete.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{user.nomSociete}</p>
                        <p className="text-xs text-gray-500">Compte vérifié</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{user.siret || "N/A"}</span>
                    </div>
                    
                    {/* Affichage du Téléphone */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{user.phone || "Aucun numéro renseigné"}</span>
                    </div>

                    {/* ✅ AFFICHAGE DE L'ADRESSE DANS LA GRILLE */}
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg sm:col-span-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                        <span className="text-sm font-medium">
                            {user.address}
                            {user.zipCity && <br />}
                            {user.zipCity}
                        </span>
                    </div>
                </div>
                
                <Button variant="outline" className="w-full mt-2" onClick={handleEditProfile}>
                  Modifier mes informations
                </Button>
              </CardContent>
            </Card>

            {/* Carte Actions */}
            <Card className="bg-white shadow-lg border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/comment-ca-marche" className="w-full block">
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

          {/* Accès aux Commandes */}
          <Card className="shadow-lg border-l-4 border-l-black hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/mes-commandes")}>
            <CardHeader>
              <CardTitle>Suivi de Production</CardTitle>
              <CardDescription>Gérez vos montages et suivez leur avancement.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-gray-600">Accédez à l'historique complet et créez de nouvelles demandes.</p>
              <Button className="bg-black hover:bg-gray-800 text-white px-8">
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