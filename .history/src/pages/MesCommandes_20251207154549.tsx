// src/pages/MesCommandes.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UserData {
  id: string;      
  nomSociete: string;
}

interface Montage {
  _id: string;
  description: string;
  statut: string;
  dateReception: string;
}

const MesCommandes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); 
  const [loading, setLoading] = useState(true);
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        fetchMontages(userData.id);
      } catch (e) { navigate("/"); }
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
            toast.success("Demande envoyée !");
            setNewDescription(""); 
            fetchMontages(user.id); 
        }
    } catch (error) { toast.error("Erreur lors de l'envoi."); } 
    finally { setIsSubmitting(false); }
  };

  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'En attente': return 'bg-gray-400';
        case 'Reçu': return 'bg-blue-500';
        case 'En cours': return 'bg-orange-500';
        case 'Terminé': return 'bg-green-500';
        case 'Expédié': return 'bg-purple-500';
        default: return 'bg-gray-500';
    }
  };

  const groupedMontages = montages.reduce((groups, montage) => {
    const date = new Date(montage.dateReception);
    const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-12 px-4 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Mes Commandes</h1>
            <Button variant="outline" onClick={() => navigate("/dashboardpro")}>
                ← Retour au Dashboard
            </Button>
        </div>

        {/* Formulaire d'ajout */}
        <Card className="mb-8 shadow-md border-blue-100">
            <CardHeader>
            <CardTitle>Nouvelle demande</CardTitle>
            <CardDescription>Envoyez une nouvelle demande de montage à l'atelier.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleAddMontage} className="flex gap-4">
                <Input 
                    placeholder="Description (ex: Montage percé titane Mr Dupont)" 
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

        {/* Liste des commandes */}
        <div className="space-y-6">
            {Object.keys(groupedMontages).length === 0 ? (
                <p className="text-center text-gray-500">Aucune commande pour le moment.</p>
            ) : (
                Object.entries(groupedMontages).map(([month, items]) => (
                    <Card key={month} className="shadow-sm">
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
  );
};

export default MesCommandes;