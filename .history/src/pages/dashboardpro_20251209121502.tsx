import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
// Import des icônes supplémentaires
import { Phone, Mail, FileText, ShoppingCart, Receipt, MapPin, Users, Glasses } from "lucide-react"; 

interface UserData {
  id: string;
  nomSociete: string;
  email: string;
  siret: string;
  phone?: string; 
  address?: string; // ✅ AJOUT
  zipCity?: string; // ✅ AJOUT
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
        
        // Assurez-vous que les champs d'adresse sont présents pour l'affichage
        const userWithAddress = {
            ...userData,
            address: userData.address || "Adresse non renseignée", 
            zipCity: userData.zipCity || "Code postal et ville N/A" 
        };
        
        setUser(userWithAddress);
        
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Bonjour, {user.nomSociete}</h1>
        <p className="text-lg text-gray-600 mb-10">Bienvenue sur votre espace professionnel. Gérez vos commandes et accédez à vos documents.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Col 1: Profil & Actions */}
          <div className="md:col-span-1 space-y-6">
            {/* Infos de Profil */}
            <Card className="shadow-lg border-l-4 border-l-black">
              <CardHeader>
                <CardTitle>Mon Profil</CardTitle>
                <CardDescription>Vos informations de contact et de facturation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-gray-700 gap-2"><Mail className="w-4 h-4 text-black" /> {user.email}</div>
                {user.phone && <div className="flex items-center text-sm text-gray-700 gap-2"><Phone className="w-4 h-4 text-black" /> {user.phone}</div>}
                <div className="flex items-center text-sm text-gray-700 gap-2"><FileText className="w-4 h-4 text-black" /> SIRET: {user.siret}</div>
                
                {/* ✅ AFFICHAGE ADRESSE */}
                <div className="flex items-start text-sm text-gray-700 gap-2">
                    <MapPin className="w-4 h-4 text-black mt-1" />
                    <span>
                        {user.address}
                        {user.zipCity && <br />}
                        {user.zipCity}
                    </span>
                </div>
                
                <Button onClick={handleEditProfile} className="w-full bg-black hover:bg-gray-800 text-white mt-4">
                  Modifier mon profil
                </Button>
              </CardContent>
            </Card>
            
            {/* Actions */}
            <Card className="shadow-lg border-l-4 border-l-black">
              <CardHeader>
                <CardTitle className="text-black">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/comment-ca-marche" className="w-full block">
                  <Button className="w-full bg-black hover:bg-gray-800 text-white">
                    Comment ça marche ?
                  </Button>
                </Link>
                <Button onClick={handleLogout} className="w-full bg-black hover:bg-gray-800 text-white">
                  Déconnexion
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Col 2 & 3: Commandes et Factures */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Accès aux Commandes */}
            <Card 
              className="shadow-lg border-l-4 border-l-blue-400 hover:shadow-xl transition-shadow cursor-pointer" 
              onClick={() => navigate("/mes-commandes")}
            >
              <CardHeader>
                <CardTitle>Suivi de Production</CardTitle>
                <CardDescription>Gérez vos montages et suivez leur avancement.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-gray-600">Accédez à l'historique complet et créez de nouvelles demandes.</p>
                <Button className="bg-black hover:bg-gray-800 text-white px-8">
                  <ShoppingCart className="w-4 h-4 mr-2"/> Mes Commandes →
                </Button>
              </CardContent>
            </Card>

            {/* Accès aux Factures */}
            <Card 
              className="shadow-lg border-l-4 border-l-green-400 hover:shadow-xl transition-shadow cursor-pointer" 
              onClick={() => navigate("/mes-commandes?tab=factures")} // Navigation vers l'onglet Factures
            >
              <CardHeader>
                <CardTitle>Mes Factures</CardTitle>
                <CardDescription>Consultez et téléchargez vos documents de facturation.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-gray-600">Retrouvez l'historique de vos documents de facturation.</p>
                <Button className="bg-black hover:bg-gray-800 text-white px-8">
                  <Receipt className="w-4 h-4 mr-2"/> Accéder aux factures →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPro;