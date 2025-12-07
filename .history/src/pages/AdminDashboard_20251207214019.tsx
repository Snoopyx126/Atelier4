import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil } from "lucide-react";

// Interfaces Typescript
interface Montage {
  _id: string;
  clientName: string;
  reference?: string;
  frame?: string;
  description: string;
  category?: string;
  options?: string[];
  statut: string;
  dateReception: string;
  userId: string;
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
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);

  // --- ÉTATS DU FORMULAIRE (Création & Modification) ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = Création, ID = Modification
  
  const [newClient, setNewClient] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newFrame, setNewFrame] = useState("");
  const [newCategory, setNewCategory] = useState("Cerclé");
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
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

  const fetchClients = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success) setClients(data.users);
    } catch (e) { console.error(e); }
  };

  // 1. Fonction pour ouvrir en mode CRÉATION
  const openCreateDialog = () => {
      setEditingId(null); 
      setNewClient(""); setNewRef(""); setNewFrame(""); setNewDesc(""); 
      setNewCategory("Cerclé"); setNewOptions([]);
      setIsDialogOpen(true);
  };

  // 2. Fonction pour ouvrir en mode MODIFICATION (Pré-remplissage)
  const openEditDialog = (m: Montage) => {
      setEditingId(m._id);
      setNewClient(m.userId);
      setNewRef(m.reference || "");
      setNewFrame(m.frame || "");
      setNewDesc(m.description || "");
      setNewCategory(m.category || "Cerclé");
      setNewOptions(m.options || []);
      setIsDialogOpen(true);
  };

  // 3. Fonction SAUVEGARDER (Gère POST ou PUT)
  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newRef || !newFrame) {
        toast.error("Veuillez remplir Client, Référence et Monture.");
        return;
    }

    setIsSubmitting(true);
    try {
        // Si editingId existe, on fait un PUT (modif), sinon un POST (création)
        const url = editingId 
            ? `https://atelier4.vercel.app/api/montages/${editingId}`
            : "https://atelier4.vercel.app/api/montages";
        
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userId: newClient, 
                reference: newRef,
                frame: newFrame,
                category: newCategory,
                options: newOptions,
                description: newDesc
            })
        });
        const data = await res.json();
        
        if (data.success) {
            toast.success(editingId ? "Dossier modifié !" : "Dossier créé !");
            setIsDialogOpen(false); 
            fetchMontages(); 
        } else {
            throw new Error(data.message);
        }
    } catch (error) { toast.error("Erreur lors de l'enregistrement."); } 
    finally { setIsSubmitting(false); }
  };

  const handleOptionChange = (option: string, checked: boolean) => {
    if (checked) setNewOptions([...newOptions, option]);
    else setNewOptions(newOptions.filter((o) => o !== option));
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
      const oldMontages = [...montages];
      setMontages(prev => prev.map(m => m._id === id ? { ...m, statut: newStatus } : m));
      try {
          await fetch(`https://atelier4.vercel.app/api/montages/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ statut: newStatus })
          });
          toast.success(`Statut : ${newStatus}`);
      } catch (e) { 
          setMontages(oldMontages);
          toast.error("Erreur mise à jour statut.");
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Supprimer définitivement ce dossier ?")) return;
      setMontages(prev => prev.filter(m => m._id !== id));
      try {
          await fetch(`https://atelier4.vercel.app/api/montages/${id}`, { method: 'DELETE' });
          toast.success("Dossier supprimé.");
      } catch (e) { toast.error("Erreur suppression."); }
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

  const groupedByShop = montages.reduce((groups, montage) => {
    const shop = montage.clientName || "Client Inconnu";
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        
        {/* En-tête + Bouton Création */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1>
                <p className="text-gray-500">Gestion de l'atelier et suivi de production.</p>
            </div>
            
            <div className="flex gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2">
                        <PlusCircle className="w-4 h-4" /> Créer un dossier
                    </Button>
                    
                    <DialogContent className="max-w-lg bg-white">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Modifier le dossier" : "Ajouter un nouveau dossier"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveMontage} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Client (Opticien)</Label>
                                <Select onValueChange={setNewClient} value={newClient}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {clients.map(c => (
                                            <SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Référence</Label>
                                    <Input placeholder="Ref Dossier" value={newRef} onChange={e => setNewRef(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Monture</Label>
                                    <Input placeholder="Marque/Modèle" value={newFrame} onChange={e => setNewFrame(e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Type de Montage</Label>
                                <Select onValueChange={setNewCategory} value={newCategory}>
                                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="Cerclé">Cerclé</SelectItem>
                                        <SelectItem value="Percé">Percé</SelectItem>
                                        <SelectItem value="Nylor">Nylor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="adm-gravure" checked={newOptions.includes("Gravure")} onCheckedChange={(c) => handleOptionChange("Gravure", c as boolean)} />
                                    <label htmlFor="adm-gravure">Gravure</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="adm-diamond" checked={newOptions.includes("Diamond Cut")} onCheckedChange={(c) => handleOptionChange("Diamond Cut", c as boolean)} />
                                    <label htmlFor="adm-diamond">Diamond Cut</label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Note / Commentaire</Label>
                                <Input placeholder="Instruction spéciale..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Enregistrement..." : (editingId ? "Mettre à jour" : "Valider le dossier")}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>
                    Déconnexion
                </Button>
            </div>
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
                    <Glasses className="w-4 h-4 mr-2" /> Gestion Atelier
                </TabsTrigger>
                <TabsTrigger value="clients" className="py-2 px-4 data-[state=active]:bg-gray-100 data-[state=active]:text-black">
                    <Users className="w-4 h-4 mr-2" /> Liste Clients
                </TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-gray-500" /> Flux de Production
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
                                                            <div className="mb-2">
                                                                <span className="font-bold text-xl text-gray-900">{m.reference || "N/A"}</span>
                                                                <span className="text-gray-400 mx-2">|</span>
                                                                <span className="font-semibold text-gray-700 text-lg">{m.frame || "Monture non spécifiée"}</span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                {m.statut === 'Terminé' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                                <Badge variant="outline" className="text-black border-black font-bold">
                                                                    {m.category || "Type inconnu"}
                                                                </Badge>
                                                                {m.options && m.options.map(opt => (
                                                                    <Badge key={opt} className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                                        {opt}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                            {m.description && (
                                                                <div className="flex items-start gap-2 bg-white p-2 rounded border border-gray-100 max-w-md">
                                                                    <span className="text-xs font-bold text-gray-400">NOTE:</span>
                                                                    <p className="text-sm text-gray-600 italic leading-snug">{m.description}</p>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-2">
                                                                Reçu le {new Date(m.dateReception).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                                <SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-white">
                                                                    <SelectItem value="En attente">🔴 En attente</SelectItem>
                                                                    <SelectItem value="Reçu">🔵 Reçu</SelectItem>
                                                                    <SelectItem value="En cours">🟠 En cours</SelectItem>
                                                                    <SelectItem value="Terminé">🟢 Terminé</SelectItem>
                                                                    <SelectItem value="Expédié">🟣 Expédié</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            
                                                            {/* ✅ LE BOUTON MODIFIER */}
                                                            <Button 
                                                                variant="outline" 
                                                                size="icon" 
                                                                className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                                                                onClick={() => openEditDialog(m)}
                                                                title="Modifier le dossier"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>

                                                            <Button variant="outline" size="icon" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(m._id)}>
                                                                <Trash2 className="w-4 h-4" />
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

            <TabsContent value="clients">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-500" /> Répertoire Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {clients.length === 0 ? (
                            <p className="text-center text-gray-500 italic mt-10">Aucun client inscrit pour le moment.</p>
                        ) : (
                            <Accordion type="single" collapsible className="space-y-3">
                                {clients.map((client) => {
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