// src/pages/AdminDashboard.tsx

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
    if (user.role !== 'admin') { navigate("/dashboardpro"); return; }

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

  // ✅ Fonction pour valider la réception (Passe de 'En attente' à 'Reçu')
  const handleValidateReception = async (id: string) => {
      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: 'Reçu' })
          });
          const data = await res.json();
          if (data.success) {
              toast.success("Réception validée ! Le client est notifié.");
              fetchData(); // Rafraîchir la liste
          }
      } catch (e) { toast.error("Erreur de validation"); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Tableau de Bord Admin</h1>

        <div className="space-y-4">
            {montages.map((m) => (
                <Card key={m._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Infos du montage */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-accent">{m.clientName}</h3>
                                {m.statut === 'En attente' && (
                                    <Badge variant="destructive" className="animate-pulse">Nouveau</Badge>
                                )}
                            </div>
                            <p className="text-gray-700 font-medium">{m.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(m.dateReception).toLocaleDateString()}
                            </p>
                        </div>
                        
                        {/* Actions Admin */}
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold 
                                ${m.statut === 'En attente' ? 'bg-gray-200 text-gray-700' : ''}
                                ${m.statut === 'Reçu' ? 'bg-blue-100 text-blue-700' : ''}
                            `}>
                                {m.statut}
                            </span>

                            {/* ✅ BOUTON DE VALIDATION */}
                            {m.statut === 'En attente' && (
                                <Button 
                                    onClick={() => handleValidateReception(m._id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
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