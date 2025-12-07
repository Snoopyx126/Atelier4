import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // ✅ Import Accordion

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

  // Groupement par mois
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

        {/* Formulaire d'ajout (reste visible) */}
        <Card className="mb-10 shadow-md border-blue-100">
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

        {/* ✅ LISTE EN ACCORDÉON (Menu Déroulant) */}
        <div className="space-y-6">
            <h2 className="text-2xl font-playfair font-bold text-gray-800 mb-4">Historique</h2>
            
            {Object.keys(groupedMontages).length === 0 ? (
                <p className="text-center text-gray-500">Aucune commande pour le moment.</p>
            ) : (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {Object.entries(groupedMontages).map(([month, items]) => (
                        <AccordionItem key={month} value={month} className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="text-lg font-medium capitalize hover:no-underline hover:text-accent">
                                {month} <span className="ml-2 text-sm text-gray-400 font-normal">({items.length} commandes)</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-3">
                                    {items.map((montage) => (
                                        <div key={montage._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-100">
                                            <div>
                                                <p className="font-semibold text-gray-800">{montage.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    Le {new Date(montage.dateReception).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <Badge className={`${getStatusColor(montage.statut)} text-white border-none shadow-none`}>
                                                {montage.statut}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
      </div>
    </div>
  );
};

export default MesCommandes;