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
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone, Receipt, Printer, Send } from "lucide-react";

// Interfaces Mises à Jour
interface Montage {
  _id: string;
  clientName: string;
  reference?: string;
  frame?: string;
  description: string;
  category?: string;
  glassType?: string[];       
  urgency?: string;           
  diamondCutType?: string;    
  engravingCount?: number;    
  shapeChange?: boolean;      // ✅ NOUVEAU
  statut: string;
  dateReception: string;
  userId: string;
}

interface Client { 
  _id: string; nomSociete: string; email: string; siret: string; phone?: string; createdAt: string; 
}

const statusPriority: Record<string, number> = {
  'En attente': 1, 'Reçu': 2, 'En cours': 3, 'Terminé': 4, 'Expédié': 5
};

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- DÉFINITION DES PRIX FACTURE ---
const CATEGORY_COSTS: Record<string, number> = { 'Cerclé': 7.00, 'Percé': 15.90, 'Nylor': 14.90 };
const GLASS_COSTS: Record<string, number> = { 'Verre 4 saisons': 12.00, 'Verre Dégradé': 25.00, 'Verre de stock': 0.00 };
const DIAMONDCUT_COSTS: Record<string, number> = { 'Facette Lisse': 39.80, 'Facette Twinkle': 79.80, 'Diamond Ice': 93.60, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = 10.00; // ✅ NOUVEAU PRIX
const ENGRAVING_UNIT_COST = 12.00; // ✅ NOUVEAU PRIX

// --- COMPOSANT MODAL DE FACTURATION ---
interface InvoiceProps { client: Client; montages: Montage[]; isOpen: boolean; onClose: () => void; }

const InvoiceModal: React.FC<InvoiceProps> = ({ client, montages, isOpen, onClose }) => {
    if (!isOpen) return null;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const urgencyCost = { 'Urgent -48H': 5, 'Urgent -24H': 10, 'Urgent -3H': 20, 'Standard': 0 };

    const monthlyMontages = montages.filter(m => {
        const date = new Date(m.dateReception);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && m.statut === 'Terminé';
    });
    
    const calculateTotal = (m: Montage) => {
        let total = 0;
        
        total += CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
        total += urgencyCost[m.urgency as keyof typeof urgencyCost] || 0; 
        total += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
        total += (m.engravingCount || 0) * ENGRAVING_UNIT_COST;

        if (m.glassType) { m.glassType.forEach(type => { total += GLASS_COSTS[type] || 0; }); }
        if (m.shapeChange) { total += SHAPE_CHANGE_COST; }

        return total;
    };

    const totalHT = monthlyMontages.reduce((sum, m) => sum + calculateTotal(m), 0);
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;
    const monthName = today.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white p-8">
                <div className="print:hidden"><DialogHeader><DialogTitle className="text-3xl font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-6 h-6" /> Facture Provisoire ({monthName})</DialogTitle></DialogHeader></div>

                <div className="invoice-body p-4 print:p-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">L'ATELIER DES ARTS</h1>
                            <p className="text-sm text-gray-600">contact@atelierdesarts.com | SIRET: [Votre SIRET]</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold">{client.nomSociete}</p>
                            <p className="text-sm text-gray-600">{client.email} | SIRET: {client.siret}</p>
                        </div>
                    </div>

                    <h3 className="font-bold text-lg mb-3 border-b pb-2">Détail des Prestations ({monthName})</h3>

                    <div className="mt-6 border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3">RÉFÉRENCE CLIENT</th>
                                    <th scope="col" className="px-6 py-3">TYPE DE MONTAGE / OPTIONS</th>
                                    <th scope="col" className="px-6 py-3 text-right">PRIX HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyMontages.map(m => (
                                    <tr key={m._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {m.reference || 'N/A'} - {m.frame}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold">{m.category}</span>
                                            <p className="text-xs text-gray-500">
                                                {m.shapeChange && 'Changement de forme | '}
                                                DC: {m.diamondCutType} | Urgence: {m.urgency}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold">
                                            {calculateTotal(m).toFixed(2)} €
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {monthlyMontages.length === 0 && (<p className="text-center py-4 text-gray-500">Aucun montage "Terminé" facturable ce mois-ci.</p>)}

                    {/* Totaux */}
                    <div className="mt-8 p-4 bg-gray-900 text-white rounded-lg">
                        <div className="flex justify-between font-medium"><span>Total HT</span><span>{totalHT.toFixed(2)} €</span></div>
                        <div className="flex justify-between text-sm mt-1"><span>TVA (20%)</span><span>{tva.toFixed(2)} €</span></div>
                        <hr className="my-2 border-gray-700" />
                        <div className="flex justify-between text-xl font-extrabold"><span>TOTAL TTC</span><span>{totalTTC.toFixed(2)} €</span></div>
                    </div>
                </div>

                <div className="flex justify-end mt-4 gap-3 print:hidden">
                    <Button variant="outline" className="flex items-center gap-2" disabled={monthlyMontages.length === 0}><Send className="w-4 h-4" /> Envoyer par E-mail (Pro)</Button>
                    <Button onClick={() => window.print()} className="flex items-center gap-2" disabled={monthlyMontages.length === 0}><Printer className="w-4 h-4" /> Imprimer / Générer PDF</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
// --- FIN COMPOSANT MODAL DE FACTURATION ---


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
  const [newShapeChange, setNewShapeChange] = useState(false); // ✅ NOUVEAU ÉTAT
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États de la Modale de Facture
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentClientToInvoice, setCurrentClientToInvoice] = useState<Client | null>(null);
  const [montagesToInvoice, setMontagesToInvoice] = useState<Montage[]>([]);

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

  const fetchMontages = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success) { setMontages(data.montages); }
    } catch (e) { console.error("Erreur chargement montages:", e); }
  };

  const fetchClients = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success) { setClients(data.users); }
    } catch (e) { console.error("Erreur chargement clients:", e); }
  };

  const openCreateDialog = () => {
      setEditingId(null);
      setNewClient(""); setNewRef(""); setNewFrame(""); setNewDesc(""); 
      setNewCategory("Cerclé"); 
      setNewGlassType([]); setNewUrgency("Standard"); setNewDiamondCutType("Standard"); setNewEngravingCount(0);
      setNewShapeChange(false);
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
      setNewShapeChange(m.shapeChange || false);
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
            body: JSON.stringify({ 
                userId: newClient, reference: newRef, frame: newFrame, category: newCategory, description: newDesc,
                glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount,
                shapeChange: newShapeChange
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

  const handleDelete = async (id: string) => { /* ... */ };
  const getStatusColor = (statut: string) => { /* ... */ };
  
  // FILTRAGE ET GROUPEMENT
  const filteredMontages = montages.filter(m => {
    const term = normalize(searchTerm);
    const dateStr = new Date(m.dateReception).toLocaleDateString('fr-FR');
    if (!term) return true;
    return [m.clientName, m.reference, m.frame, m.description, m.category, m.statut, dateStr].some(field => normalize(field).includes(term));
  });

  const groupedByShop = filteredMontages.reduce((groups: Record<string, Montage[]>, montage: Montage) => {
    const shop = montage.clientName || "Inconnu";
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  const filteredClients = clients.filter(c => {
    const term = normalize(searchTerm);
    if (!term) return true;
    return [c.nomSociete, c.email, c.siret, c.phone].some(field => normalize(field).includes(term));
  });

  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  
  // Fonction d'aide pour afficher les badges Urgence/DC/Verre
  const renderMontageDetails = (m: Montage) => (
    <div className="flex flex-wrap items-center gap-2">
        {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}
        {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
        {m.engravingCount && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
        {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}
        {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}
    </div>
  );

  const handleGenerateInvoice = (client: Client, clientMontages: Montage[]) => {
      setCurrentClientToInvoice(client);
      setMontagesToInvoice(clientMontages);
      setIsInvoiceOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        {/* --- HEADER & BOUTONS --- */}
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
                                <div className="space-y-2">
                                    <Label>Type de Montage</Label>
                                    <Select onValueChange={setNewCategory} value={newCategory}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Diamond Cut</Label>
                                    <Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Gravure (Qté)</Label>
                                    <Input type="number" min={0} max={2} value={newEngravingCount} onChange={e => setNewEngravingCount(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <hr />
                            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                                <Label className="text-lg block font-bold">Options Spécifiques</Label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-6">
                                        {GLASS_OPTIONS.map(opt => (
                                            <div key={opt} className="flex items-center space-x-2"><Checkbox id={`glass-${opt}`} checked={newGlassType.includes(opt)} onCheckedChange={(checked) => handleGlassTypeChange(opt, checked as boolean)} /><label htmlFor={`glass-${opt}`}>{opt}</label></div>
                                        ))}
                                    </div>
                                    <hr className="border-gray-200"/>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="shapeChange" checked={newShapeChange} onCheckedChange={(checked) => setNewShapeChange(checked as boolean)} />
                                        <label htmlFor="shapeChange" className="font-semibold text-gray-700">Changement de Forme (+{SHAPE_CHANGE_COST}€ HT)</label>
                                    </div>
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

        {/* --- KPI et RECHERCHE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-l-4 border-l-red-500"><CardHeader><CardTitle>À traiter</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500"><CardHeader><CardTitle>En Production</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inProgressCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-green-500"><CardHeader><CardTitle>Clients</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent></Card>
        </div>
        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher par référence, client, date, monture, statut..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* --- ONGLET ATELIER/CLIENTS --- */}
        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto">
                <TabsTrigger value="atelier" className="px-6 py-2"><Glasses className="w-4 h-4 mr-2" /> Atelier ({filteredMontages.length})</TabsTrigger>
                <TabsTrigger value="clients" className="px-6 py-2"><Users className="w-4 h-4 mr-2" /> Clients ({filteredClients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle>Flux de Production</CardTitle></CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByShop).length === 0 ? (<div className="text-center py-20 text-gray-400">Aucun montage trouvé.</div>) : (
                            <Accordion type="single" collapsible className="space-y-4">
                                {Object.entries(groupedByShop).sort().map(([shopName, items]) => {
                                    const client = clients.find(c => c.nomSociete === shopName) || { _id: '', nomSociete: shopName, email: '', siret: '', createdAt: '' };
                                    return (
                                        <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <div className="flex items-center gap-4 w-full pr-4">
                                                    <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                                    <span className="text-xs text-gray-400">({items.length})</span>
                                                    
                                                    {/* BOUTON FACTURE */}
                                                    <Button 
                                                        variant="outline" size="sm" className="ml-auto flex items-center gap-1 text-xs bg-black text-white hover:bg-gray-800"
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client as Client, items); }}
                                                        disabled={items.filter(m => m.statut === 'Terminé').length === 0}
                                                    >
                                                        <Receipt className="w-4 h-4" /> Facturer ce mois
                                                    </Button>

                                                    {items.some(i => i.statut === 'En attente') && <Badge variant="destructive">Action requise</Badge>}
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
                                                                {renderMontageDetails(m)}
                                                            </div>
                                                            {m.description && <p className="text-sm text-gray-500 italic">"{m.description}"</p>}
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                                <SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}><SelectValue /></SelectTrigger>
                                                                <SelectContent className="bg-white"><SelectItem value="En attente">🔴 En attente</SelectItem><SelectItem value="Reçu">🔵 Reçu</SelectItem><SelectItem value="En cours">🟠 En cours</SelectItem><SelectItem value="Terminé">🟢 Terminé</SelectItem><SelectItem value="Expédié">🟣 Expédié</SelectItem></SelectContent>
                                                            </Select>
                                                            <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditDialog(m)}><Pencil className="w-4 h-4" /></Button>
                                                            <Button variant="outline" size="icon" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4" /></Button>
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

      {/* Rendu du Composant Facture */}
      {currentClientToInvoice && (
          <InvoiceModal
              client={currentClientToInvoice}
              montages={montagesToInvoice}
              isOpen={isInvoiceOpen}
              onClose={() => setIsInvoiceOpen(false)}
          />
      )}
    </div>
  );
};

export default AdminDashboard;