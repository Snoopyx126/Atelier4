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
  const [newGlassType, setNewGlassType] = useState<string[]>([]); // ✅
  const [newUrgency, setNewUrgency] = useState("Standard"); // ✅
  const [newDiamondCutType, setNewDiamondCutType] = useState("Standard"); // ✅
  const [newEngravingCount, setNewEngravingCount] = useState(0); // ✅
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
      setNewGlassType([]); setNewUrgency("Standard"); setNewDiamondCutType("Standard"); setNewEngravingCount(0); // ✅ Reset
      setIsDialogOpen(true);
  };

  const openEditDialog = (m: Montage) => {
      setEditingId(m._id);
      setNewClient(m.userId);
      setNewRef(m.reference || "");
      setNewFrame(m.frame || "");
      setNewDesc(m.description || "");
      setNewCategory(m.category || "Cerclé");
      setNewGlassType(m.glassType || []); // ✅
      setNewUrgency(m.urgency || "Standard"); // ✅
      setNewDiamondCutType(m.diamondCutType || "Standard"); // ✅
      setNewEngravingCount(m.engravingCount || 0); // ✅
      setIsDialogOpen(true);
  };

  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newRef || !newFrame) {
        toast.error("Veuillez remplir les champs obligatoires.");
        return;
    }

    setIsSubmitting(true);
    try {
        const url = editingId ? `https://atelier4.vercel.app/api/montages/${editingId}` : "https://atelier4.vercel.app/api/montages";
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userId: newClient, reference: newRef, frame: newFrame, category: newCategory, description: newDesc,
                glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount // ✅ ENVOI
            })
        });
        const data = await res.json();
        
        if (data.success) {
            toast.success(editingId ? "Dossier modifié !" : "Dossier créé !");
            setIsDialogOpen(false); 
            fetchMontages(); 
        } else { throw new Error(data.message); }
    } catch (error) { toast.error("Erreur d'enregistrement."); } 
    finally { setIsSubmitting(false); }
  };

  const handleGlassTypeChange = (type: string, checked: boolean) => {
    setNewGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
  };

  const handleStatusChange = async (id: string, newStatus: string) => { /* ... (Logique inchangée) ... */ };
  const handleDelete = async (id: string) => { /* ... (Logique inchangée) ... */ };
  const getStatusColor = (statut: string) => { /* ... (Logique inchangée) ... */ };

  const filteredMontages = montages.filter(m => { /* ... (Logique de filtrage inchangée, elle est déjà robuste) ... */ });
  const groupedByShop = filteredMontages.reduce((groups, montage) => { /* ... (Logique inchangée) ... */ }, {} as Record<string, Montage[]>);
  const filteredClients = clients.filter(c => { /* ... (Logique de filtrage clients inchangée) ... */ });

  // ... (Calculs KPIs inchangés)

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        {/* ... (Header et KPIs inchangés) ... */}
        
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
                                        <SelectContent className="bg-white">
                                            {URGENCY_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <hr />
                            
                            <div className="grid grid-cols-3 gap-4">
                                {/* ✅ NOUVEAU : TYPE DE MONTAGE */}
                                <div className="space-y-2">
                                    <Label>Type de Montage</Label>
                                    <Select onValueChange={setNewCategory} value={newCategory}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ✅ NOUVEAU : TYPE DE DIAMOND CUT */}
                                <div className="space-y-2">
                                    <Label>Diamond Cut</Label>
                                    <Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {DIAMONDCUT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ✅ NOUVEAU : NOMBRE DE GRAVURES */}
                                <div className="space-y-2">
                                    <Label>Gravure (Qté)</Label>
                                    <Input type="number" min={0} max={2} value={newEngravingCount} onChange={e => setNewEngravingCount(parseInt(e.target.value))} />
                                </div>
                            </div>
                            
                            <hr />

                            {/* ✅ NOUVEAU : TYPE DE VERRE (CHECKBOXES) */}
                            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                                <Label className="text-lg block font-bold">Options Verre Spécifiques</Label>
                                <div className="flex gap-6">
                                    {GLASS_OPTIONS.map(opt => (
                                        <div key={opt} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`glass-${opt}`} 
                                                checked={newGlassType.includes(opt)} 
                                                onCheckedChange={(checked) => handleGlassTypeChange(opt, checked as boolean)}
                                            />
                                            <label htmlFor={`glass-${opt}`}>{opt}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2"><Label>Note / Commentaire</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : (editingId ? "Modifier" : "Créer")}</Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
        </div>

        {/* ... (Rendu du dashboard/montages inchangé, les détails s'affichent automatiquement via l'interface) ... */}
        {/* NOTE: Les badges d'affichage des nouveaux champs dans l'accordéon Admin et Client n'ont pas été implémentés 
           pour cette étape car cela nécessite une refonte du rendu HTML de la liste, je les ajoute au prochain fichier pour MesCommandes.tsx. */}
        
      </div>
    </div>
  );
};

export default AdminDashboard;