import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<any[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { 
        navigate("/dashboardpro"); 
        return; 
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
        // On récupère TOUS les montages (admin)
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success) setMontages(data.montages);
    } catch (e) { console.error(e); }
  };

  // Fonction pour valider la réception
  const handleValidateReception = async (id: string) => {
      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: 'Reçu' })
          });
          const data = await res.json();
          if (data.success) {
              toast.success("Réception validée !");
              fetchData(); // Rafraîchir la liste
          }
      } catch (e) { toast.error("Erreur de validation"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 px-4 container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Administration Atelier</h1>
            <Button variant="destructive" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
        </div>

        <div className="space-y-4">
            {montages.length === 0 && <p className="text-gray-500 italic text-center">Aucun montage enregistré.</p>}
            
            {montages.map((m) => (
                <Card key={m._id} className="hover:shadow-md transition-shadow border-l-4 border-l-accent">
                    <CardContent className="p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Informations du Client et du Montage */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-lg text-gray-900">{m.clientName}</h3>
                                {m.statut === 'En attente' && (
                                    <Badge variant="destructive" className="animate-pulse">Nouveau colis</Badge>
                                )}
                            </div>
                            <p className="text-gray-700 font-medium">{m.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Date : {new Date(m.dateReception).toLocaleDateString()}
                            </p>
                        </div>
                        
                        {/* Statut et Actions */}
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold 
                                ${m.statut === 'En attente' ? 'bg-gray-200 text-gray-700' : ''}
                                ${m.statut === 'Reçu' ? 'bg-blue-100 text-blue-700' : ''}
                                ${m.statut === 'En cours' ? 'bg-orange-100 text-orange-700' : ''}
                                ${m.statut === 'Terminé' ? 'bg-green-100 text-green-700' : ''}
                                ${m.statut === 'Expédié' ? 'bg-purple-100 text-purple-700' : ''}
                            `}>
                                {m.statut}
                            </span>

                            {/* ✅ Le seul bouton d'action : Valider la réception */}
                            {m.statut === 'En attente' && (
                                <Button 
                                    onClick={() => handleValidateReception(m._id)}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                    size="sm"
                                >
                                    Valider Réception
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;