// src/pages/AdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

// 1. Définition de l'interface pour éviter les erreurs de type "any"
interface Montage {
  _id: string;
  clientName: string;
  description: string;
  statut: string;
  dateReception: string;
}

const statusPriority: Record<string, number> = {
  'En attente': 1,
  'Reçu': 2,
  'En cours': 3,
  'Terminé': 4,
  'Expédié': 5
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  // Utilisation de l'interface Montage[] au lieu de any[]
  const [montages, setMontages] = useState<Montage[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { 
            navigate("/dashboardpro"); 
            return; 
        }
        fetchData();
    } catch (e) {
        navigate("/");
    }
  }, [navigate]);

  const fetchData = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success) setMontages(data.montages);
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
      // Sauvegarde pour rollback si erreur
      const oldMontages = [...montages];
      
      // Mise à jour optimiste
      setMontages(prev => prev.map(m => m._id === id ? { ...m, statut: newStatus } : m));

      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: newStatus })
          });
          
          if (!res.ok) throw new Error("Erreur réseau");
          
          const data = await res.json();
          if (data.success) {
              toast.success(`Statut mis à jour : ${newStatus}`);
          } else {
              throw new Error("Erreur API");
          }
      } catch (e) { 
          toast.error("Erreur de mise à jour");
          setMontages(oldMontages); // Annulation en cas d'erreur
      }
  };

  // Groupement par Magasin
  const groupedByShop = montages.reduce((groups, montage) => {
    const shop = montage.clientName || "Client Inconnu";
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  // Fonction helper pour les couleurs
  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'En attente': return 'text-red-600 bg-red-50 border-red-200';
        case 'Reçu': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'En cours': return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'Terminé': return 'text-green-600 bg-green-50 border-green-200';
        case 'Expédié': return 'text-purple-600 bg-purple-50 border-purple-200';
        default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 px-4 container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Suivi des Montages par Magasin</h1>
            <Button variant="destructive" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
        </div>

        {Object.keys(groupedByShop).length === 0 ? (
             <p className="text-center text-gray-500 italic mt-10">Aucun montage en cours.</p>
        ) : (
            <Accordion type="single" collapsible className="space-y-4">
                {Object.entries(groupedByShop).sort().map(([shopName, items]) => {
                    const urgentCount = items.filter(i => i.statut === 'En attente').length;
                    
                    return (
                        <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-4 w-full">
                                    <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                    <span className="text-sm text-gray-500 font-normal">({items.length} dossiers)</span>
                                    {urgentCount > 0 && (
                                        <Badge variant="destructive" className="ml-auto mr-4 rounded-full px-2">
                                            {urgentCount} en attente
                                        </Badge>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-3">
                                {/* Tri sécurisé avec String() pour éviter les erreurs TS */}
                                {items.sort((a, b) => (statusPriority[String(a.statut)] || 99) - (statusPriority[String(b.statut)] || 99)).map((m) => (
                                    <div key={m._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-md border border-gray-100 gap-4">
                                        
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-base">{m.description}</p>
                                            <p className="text-xs text-gray-500">
                                                Reçu le {new Date(m.dateReception).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>

                                        <div className="w-full md:w-auto">
                                            <Select 
                                                defaultValue={m.statut} 
                                                onValueChange={(val) => handleStatusChange(m._id, val)}
                                            >
                                                <SelectTrigger className={`w-[160px] h-9 font-medium border ${getStatusColor(m.statut)}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="En attente">🔴 En attente</SelectItem>
                                                    <SelectItem value="Reçu">🔵 Reçu</SelectItem>
                                                    <SelectItem value="En cours">🟠 En cours</SelectItem>
                                                    <SelectItem value="Terminé">🟢 Terminé</SelectItem>
                                                    <SelectItem value="Expédié">🟣 Expédié</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;