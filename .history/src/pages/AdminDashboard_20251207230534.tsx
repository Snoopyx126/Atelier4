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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone } from "lucide-react";

// ✅ Interfaces mises à jour
interface Montage {
  _id: string;
  clientName: string;
  reference?: string;
  frame?: string;
  description: string;
  category?: string;
  glassType?: string[];       // ✅ NOUVEAU
  urgency?: string;           // ✅ NOUVEAU
  diamondCutType?: string;    // ✅ NOUVEAU
  engravingCount?: number;    // ✅ NOUVEAU
  statut: string;
  dateReception: string;
  userId: string;
}

interface Client { _id: string; nomSociete: string; email: string; siret: string; phone?: string; createdAt: string; }

const statusPriority: Record<string, number> = {
  'En attente': 1, 'Reçu': 2, 'En cours': 3, 'Terminé': 4, 'Expédié': 5
};

// Fonction de Normalisation (pour la recherche)
const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- ÉTATS DU FORMULAIRE (Création & Modification) ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newClient, setNewClient] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newFrame, setNewFrame] = useState("");
  const [newCategory, setNewCategory] = useState("Cerclé");
  const [newGlassType, setNewGlassType] = useState<string[]>([]);
  const [newUrgency, setNewUrgency] = useState("Standard");
  const [newDiamondCutType, setNewDiamondCutType] = useState("Standard");
  const [newEngravingCount, setNewEngravingCount] = useState(0);
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constantes de choix
  const URGENCY_OPTIONS = ['Standard', 'Urgent -48H', 'Urgent -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
        Promise.all([fetchMontages(), fetchClients()]).finally(() => setLoading(false));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => { /* ... (Logique inchangée) ... */ };
  const fetchClients = async () => { /* ... (Logique inchangée) ... */ };

  const openCreateDialog = () => {
      setEditingId(null);
      setNewClient(""); setNewRef(""); setNewFrame(""); setNewDesc(""); 
      setNewCategory("Cerclé"); 
      setNewGlassType([]); setNewUrgency("Standard"); setNewDiamondCutType("Standard"); setNewEngravingCount(0);
      setIsDialogOpen(true);
  };

  const openEditDialog = (m: Montage) => {
      setEditingId(m._id);
      setNewClient(m.userId);
      setNewRef(m.reference || "");
      setNewFrame(m.frame || "");
      setNewDesc(m.description || "");
      setNewCategory(m.category || "Cerclé");
      setNewGlassType(m.glassType || []); 
      setNewUrgency(m.urgency || "Standard"); 
      setNewDiamondCutType(m.diamondCutType || "Standard"); 
      setNewEngravingCount(m.engravingCount || 0);
      setIsDialogOpen(true);
  };

  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newRef || !newFrame) { toast.error("Champs obligatoires."); return; }
    setIsSubmitting(true);
    try {
        const url = editingId ? `https://atelier4.vercel.app/api/montages/${editingId}` : "https://atelier4.vercel.app/api/montages";
        const method = editingId ? "PUT" : "POST";
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: newClient, reference: newRef, frame: newFrame, category: newCategory, description: newDesc,
                glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount
            })
        });
        const data = await res.json();
        if (data.success) { toast.success(editingId ? "Dossier modifié !" : "Dossier créé !"); setIsDialogOpen(false); fetchMontages(); } 
        else { throw new Error(data.message); }
    } catch (error) { toast.error("Erreur d'enregistrement."); } 
    finally { setIsSubmitting(false); }
  };

  const handleGlassTypeChange = (type: string, checked: boolean) => {
    setNewGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
      const oldMontages = [...montages];
      setMontages(prev => prev.map(m => m._id === id ? { ...m, statut: newStatus } : m));
      try {
          await fetch(`https://atelier4.vercel.app/api/montages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: newStatus }) });
          toast.success(`Statut : ${newStatus}`);
      } catch (e) { setMontages(oldMontages); toast.error("Erreur statut."); }
  };

  const handleDelete = async (id: string) => { /* ... (Logique inchangée) ... */ };
  const getStatusColor = (statut: string) => { /* ... (Logique inchangée) ... */ };

  // ✅ FILTRAGE DES MONTAGES (ATELIER) - Logique inchangée, elle est robuste
  const filteredMontages = montages.filter(m => {
    const term = normalize(searchTerm);
    const dateStr = new Date(m.dateReception).toLocaleDateString('fr-FR');
    if (!term) return true;
    return [m.clientName, m.reference, m.frame, m.description, m.category, m.statut, dateStr].some(field => normalize(field).includes(term));
  });

  // ✅ CORRECTION REDUCE : Ajout du 'return groups' explicite
  const groupedByShop = filteredMontages.reduce((groups: Record<string, Montage[]>, montage: Montage) => {
    const shop = montage.clientName || "Inconnu";
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(montage);
    return groups; // <-- Fix: Retourne l'accumulateur
  }, {} as Record<string, Montage[]>);

  const filteredClients = clients.filter(c => { /* ... (Logique de filtrage clients inchangée) ... */ });
  // ... (Calculs KPIs inchangés) ...

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        {/* ... (En-tête et KPIs) ... */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1><p className="text-gray-500">Gestion de l'atelier et suivi de production.</p></div>
            <div className="flex gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2"><PlusCircle className="w-4 h-4" /> Créer un dossier</Button>
                    <DialogContent className="max-w-3xl bg-white">
                        <DialogHeader><DialogTitle>{editingId ? "Modifier le dossier" : "Ajouter un nouveau dossier"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSaveMontage} className="space-y-4 pt-4">
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2 col-span-3">
                                    <Label>Client</Label>
                                    <Select onValueChange={setNewClient} value={newClient}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                        <SelectContent className="bg-white">{clients.map(c => (<SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Référence</Label><Input value={newRef} onChange={e => setNewRef(e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Monture</Label><Input value={newFrame} onChange={e => setNewFrame(e.target.value)} required /></div>
                                
                                {/* ✅ NOUVEAU : URGENCE */}
                                <div className="space-y-2">
                                    <Label>Urgence</Label>
                                    <Select onValueChange={setNewUrgency} value={newUrgency}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">{URGENCY_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <hr />
                            
                            <div className="grid grid-cols-3 gap-4">
                                {/* ✅ TYPE DE MONTAGE */}
                                <div className="space-y-2">
                                    <Label>Type de Montage</Label>
                                    <Select onValueChange={setNewCategory} value={newCategory}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ✅ TYPE DE DIAMOND CUT */}
                                <div className="space-y-2">
                                    <Label>Diamond Cut</Label>
                                    <Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>

                                {/* ✅ NOMBRE DE GRAVURES */}
                                <div className="space-y-2">
                                    <Label>Gravure (Qté)</Label>
                                    <Input type="number" min={0} max={2} value={newEngravingCount} onChange={e => setNewEngravingCount(parseInt(e.target.value))} />
                                </div>
                            </div>
                            
                            <hr />

                            {/* ✅ TYPE DE VERRE (CHECKBOXES) */}
                            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                                <Label className="text-lg block font-bold">Options Verre Spécifiques</Label>
                                <div className="flex gap-6">
                                    {GLASS_OPTIONS.map(opt => (
                                        <div key={opt} className="flex items-center space-x-2">
                                            <Checkbox id={`glass-${opt}`} checked={newGlassType.includes(opt)} onCheckedChange={(checked) => handleGlassTypeChange(opt, checked as boolean)} />
                                            <label htmlFor={`glass-${opt}`}>{opt}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2"><Label>Note / Commentaire</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>{editingId ? "Modifier" : "Créer"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
        </div>

        {/* ... (KPIs et Barre de Recherche) ... */}

        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher par référence, client, date, monture, statut..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto">
                <TabsTrigger value="atelier" className="px-6 py-2"><Glasses className="w-4 h-4 mr-2" /> Atelier ({filteredMontages.length})</TabsTrigger>
                <TabsTrigger value="clients" className="px-6 py-2"><Users className="w-4 h-4 mr-2" /> Clients ({filteredClients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle className="flex items-center gap-2">Flux de Production</CardTitle></CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByShop).length === 0 ? (<div className="text-center py-20 text-gray-400">Aucun montage trouvé pour cette recherche.</div>) : (
                            <Accordion type="single" collapsible className="space-y-4">
                                {Object.entries(groupedByShop).sort().map(([shopName, items]) => (
                                    <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4">
                                        <AccordionTrigger className="hover:no-underline py-4">
                                            <div className="flex items-center gap-4 w-full pr-4">
                                                <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                                <span className="text-xs text-gray-400">({items.length})</span>
                                                {items.some(i => i.statut === 'En attente') && <Badge variant="destructive" className="ml-auto">Action requise</Badge>}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-6 space-y-3">
                                            {items.sort((a, b) => (statusPriority[String(a.statut)] || 99) - (statusPriority[String(b.statut)] || 99)).map((m) => (
                                                <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
                                                    <div className="flex-1">
                                                        <div className="mb-2">
                                                            <span className="font-bold text-xl text-gray-900">{m.reference || "N/A"}</span>
                                                            <span className="text-gray-400 mx-2">|</span>
                                                            <span className="font-semibold text-gray-700 text-lg">{m.frame || "Monture"}</span>
                                                            {m.urgency !== 'Standard' && <Badge className="ml-2 bg-red-100 text-red-800 border-red-200">🚨 {m.urgency}</Badge>}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                            <Badge variant="outline">{m.category}</Badge>
                                                            
                                                            {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
                                                            {m.engravingCount && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
                                                            {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}

                                                        </div>
                                                        {m.description && <p className="text-sm text-gray-500 italic">"{m.description}"</p>}
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                            <SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-white">
                                                                <SelectItem value="En attente">🔴 En attente</SelectItem><SelectItem value="Reçu">🔵 Reçu</SelectItem><SelectItem value="En cours">🟠 En cours</SelectItem><SelectItem value="Terminé">🟢 Terminé</SelectItem><SelectItem value="Expédié">🟣 Expédié</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditDialog(m)}><Pencil className="w-4 h-4" /></Button>
                                                        <Button variant="outline" size="icon" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clients">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle>Liste des Clients</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        {filteredClients.length === 0 ? <p className="text-center text-gray-500 italic">Aucun client trouvé.</p> : (
                            filteredClients.map(c => (
                                <div key={c._id} className="p-4 border-b last:border-0 flex justify-between items-center">
                                    <div><p className="font-bold text-lg">{c.nomSociete}</p><p className="text-sm text-gray-500">{c.email} - {c.siret}</p></div>
                                    <div className="text-right text-sm text-gray-600 flex flex-col items-end gap-1">
                                        {c.phone && <div className="flex items-center gap-1 font-medium text-black"><Phone className="w-3 h-3" /> {c.phone}</div>}
                                        <span className="text-gray-400 text-xs">Inscrit le {new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
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