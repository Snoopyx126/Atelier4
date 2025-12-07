import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar } from "lucide-react";

// Interfaces
interface Montage {
  _id: string;
  clientName: string;
  description: string;
  statut: string;
  dateReception: string;
  userId: string; // Utile pour lier aux clients
}

interface Client {
  _id: string;
  nomSociete: string;
  email: string;
  siret: string;
  createdAt: string;
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
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // ✅ État pour les clients
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
        
        // Chargement parallèle des données
        Promise.all([fetchMontages(), fetchClients()]).finally(() => setLoading(false));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success) setMontages(data.montages);
    } catch (e) { console.error(e); }
  };

  // ✅ Nouvelle fonction pour récupérer les infos clients
  const fetchClients = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success) setClients(data.users);
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
      const oldMontages = [...montages];
      setMontages(prev => prev.map(m => m._id === id ? { ...m, statut: newStatus } : m));

      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: newStatus })
          });
          if (!res.ok) throw new Error();
          toast.success(`Statut mis à jour : ${newStatus}`);
      } catch (e) { 
          toast.error("Erreur de mise à jour");
          setMontages(oldMontages);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement ce dossier ?")) return;
      const oldMontages = [...montages];
      setMontages(prev => prev.filter(m => m._id !== id));

      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'DELETE'
          });
          if (!res.ok) throw new Error();
          toast.success("Dossier supprimé.");
      } catch (e) {
          toast.error("Erreur suppression.");
          setMontages(oldMontages);
      }
  };

  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'En attente': return 'text-red-700 bg-red-50 border-red-200';
        case 'Reçu': return 'text-blue-700 bg-blue-50 border-blue-200';
        case 'En cours': return 'text-orange-700 bg-orange-50 border-orange-200';
        case 'Terminé': return 'text-green-700 bg-green-50 border-green-200';
        case 'Expédié': return 'text-purple-700 bg-purple-50 border-purple-200';
        default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Groupement par Magasin pour l'onglet Atelier
  const groupedByShop = montages.reduce((groups, montage) => {
    const shop = montage.clientName || "Client Inconnu";
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  // KPIs
  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1>
                <p className="text-gray-500">Gestion de l'atelier et suivi de production.</p>
            </div>
            <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>
                Déconnexion
            </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">À traiter (Urgent)</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-gray-900">{pendingCount}</div></CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">En Production</CardTitle>
                    <Package className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-gray-900">{inProgressCount}</div></CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Clients Inscrits</CardTitle>
                    <Users className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-gray-900">{clients.length}</div></CardContent>
            </Card>
        </div>

        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border rounded-lg h-auto grid grid-cols-2 md:inline-flex w-full md:w-auto">
                <TabsTrigger value="atelier" className="py-2 px-4 data-[state=active]:bg-gray-100 data-[state=active]:text-black">
                    <Glasses className="w-4 h-4 mr-2" />
                    Gestion Atelier
                </TabsTrigger>
                <TabsTrigger value="clients" className="py-2 px-4 data-[state=active]:bg-gray-100 data-[state=active]:text-black">
                    <Users className="w-4 h-4 mr-2" />
                    Liste Clients
                </TabsTrigger>
            </TabsList>

            {/* ONGLET ATELIER (Inchangé visuellement) */}
            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-gray-500" />
                            Flux de Production
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByShop).length === 0 ? (
                            <div className="text-center py-20 text-gray-400">Aucun montage en cours.</div>
                        ) : (
                            <Accordion type="single" collapsible className="space-y-4">
                                {Object.entries(groupedByShop).sort().map(([shopName, items]) => {
                                    const urgentCount = items.filter(i => i.statut === 'En attente').length;
                                    return (
                                        <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <div className="flex items-center gap-4 w-full pr-4">
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                                        <span className="text-xs text-gray-400 font-normal">{items.length} dossier(s)</span>
                                                    </div>
                                                    {urgentCount > 0 && (
                                                        <Badge variant="destructive" className="ml-auto rounded-full px-3 py-1 text-xs animate-pulse shadow-sm">
                                                            {urgentCount} action(s)
                                                        </Badge>
                                                    )}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-6 space-y-3">
                                                {items.sort((a, b) => (statusPriority[String(a.statut)] || 99) - (statusPriority[String(b.statut)] || 99)).map((m) => (
                                                    <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md hover:border-gray-200">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {m.statut === 'Terminé' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                                <p className="font-semibold text-gray-900 text-base">{m.description}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500">📅 Reçu le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                                <SelectTrigger className={`w-full sm:w-[180px] h-10 font-medium border-2 ${getStatusColor(m.statut)}`}>
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
                                                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(m._id)}>
                                                                <Trash2 className="w-5 h-5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ✅ ONGLET CLIENTS (Refondu avec Accordéon) */}
            <TabsContent value="clients">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            Répertoire Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {clients.length === 0 ? (
                            <p className="text-center text-gray-500 italic mt-10">Aucun client inscrit pour le moment.</p>
                        ) : (
                            <Accordion type="single" collapsible className="space-y-3">
                                {clients.map((client) => {
                                    // On compte le nombre de commandes pour ce client
                                    const orderCount = montages.filter(m => m.userId === client._id).length;
                                    
                                    return (
                                        <AccordionItem key={client._id} value={client._id} className="bg-white border rounded-lg shadow-sm px-4">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                                                            {client.nomSociete.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-gray-900 text-lg">{client.nomSociete}</p>
                                                            <p className="text-xs text-gray-400">Inscrit le {new Date(client.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="hidden sm:flex">
                                                        {orderCount} Commande(s)
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-0 pb-6">
                                                <div className="pl-[52px] space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <Mail className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
                                                                <a href={`mailto:${client.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                                    {client.email}
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium uppercase">SIRET</p>
                                                                <p className="text-sm font-medium text-gray-900">{client.siret || "Non renseigné"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium uppercase">Membre depuis</p>
                                                                <p className="text-sm font-medium text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Package className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium uppercase">Activité</p>
                                                                <p className="text-sm font-medium text-gray-900">{orderCount} montages réalisés</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;