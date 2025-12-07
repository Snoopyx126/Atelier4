// src/pages/dashboardpro.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom"; 
import { toast } from "sonner"; // Pour les notifications jolies

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
  const [montages, setMontages] = useState<Montage[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // État pour le nouveau montage
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        fetchMontages(userData.id);
      } catch (e) { handleLogout(); }
    } else { navigate("/espace-pro"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async (userId: string) => {
    try {
      const response = await fetch(`https://atelier4.vercel.app/api/montages?userId=${userId}`);
      const data = await response.json();
      if (data.success) setMontages(data.montages);
    } catch (error) { console.error("Erreur API:", error); }
  };

  // ✅ Fonction pour ajouter un montage
  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !user) return;

    setIsSubmitting(true);
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, description: newDescription })
        });
        const data = await res.json();
        
        if (data.success) {
            toast.success("Demande envoyée avec succès !");
            setNewDescription(""); // Vider le champ
            fetchMontages(user.id); // Recharger la liste
        }
    } catch (error) {
        toast.error("Erreur lors de l'envoi.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user"); 
    navigate("/"); 
  };

  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'En attente': return 'bg-gray-400'; // Gris pour l'attente
        case 'Reçu': return 'bg-blue-500';
        case 'En cours': return 'bg-orange-500';
        case 'Terminé': return 'bg-green-500';
        case 'Expédié': return 'bg-purple-500';
        default: return 'bg-gray-500';
    }
  };

  // ✅ Logique de groupement par Mois
  const groupedMontages = montages.reduce((groups, montage) => {
    const date = new Date(montage.dateReception);
    // Créer une clé "Mois Année" (ex: Décembre 2023)
    const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="text-center pt-8">
            <h1 className="text-4xl font-playfair font-bold text-gray-900">
              Espace Client : {user.nomSociete}
            </h1>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Carte Nouvelle Demande */}
             <Card className="col-span-1 md:col-span-2 shadow-lg border-blue-100">
              <CardHeader>
                <CardTitle>Nouvelle demande de montage</CardTitle>
                <CardDescription>Décrivez votre envoi (ex: "Montage percé titane Mr Dupont")</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMontage} className="flex gap-4">
                    <Input 
                        placeholder="Description du montage..." 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Envoi..." : "Envoyer"}
                    </Button>
                </form>
              </CardContent>
            </Card>

            {/* Carte Actions (Déconnexion) */}
            <Card className="bg-white shadow-lg border-red-200">
              <CardHeader><CardTitle className="text-red-600">Mon Compte</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={handleLogout} variant="destructive" className="w-full">
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ✅ SECTION COMMANDES GROUPÉES PAR MOIS */}
          <div className="space-y-6">
            <h2 className="text-2xl font-playfair font-bold text-gray-800">Historique des commandes</h2>
            
            {Object.keys(groupedMontages).length === 0 ? (
                <p className="text-center text-gray-500">Aucune commande pour le moment.</p>
            ) : (
                Object.entries(groupedMontages).map(([month, items]) => (
                    <Card key={month} className="shadow-md">
                        <CardHeader className="bg-gray-100 py-3">
                            <CardTitle className="text-lg capitalize text-gray-700">{month}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {items.map((montage) => (
                                <div key={montage._id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{montage.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(montage.dateReception).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <Badge className={`${getStatusColor(montage.statut)} text-white border-none`}>
                                        {montage.statut}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPro;