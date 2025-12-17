import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Calendar, PlusCircle, Clock, CheckCircle2, Image as ImageIcon, X, Store, Loader2, Pencil, Trash2, Camera } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; 
import { Textarea } from "@/components/ui/textarea";

// --- CONFIGURATION ---
const getApiUrl = () => {
    return window.location.hostname === "localhost" 
      ? "http://localhost:3000" 
      : "https://atelier4.vercel.app";
};

// --- INTERFACES & UTILS ---
interface Montage { _id: string; clientName: string; reference?: string; frame?: string; description: string; category?: string; glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number; shapeChange?: boolean; statut: string; dateReception: string; userId: string; photoUrl?: string; createdBy?: string; }
const normalize = (text: string | undefined) => (!text ? "" : text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());

// --- PRIX & CONSTANTES ---
const CATEGORY_COSTS: any = { 'Cerclé': { 1: 7.00, 2: 3.60 }, 'Percé': { 1: 15.90, 2: 12.00 }, 'Nylor': { 1: 14.90, 2: 12.00 } };
const GLASS_COSTS: any = { 'Verre 4 saisons': { 1: 28.80, 2: 28.80 }, 'Verre Dégradé': { 1: 50.00, 2: 48.00 }, 'Verre de stock': { 1: 0.00, 2: 0.00 } };
const DIAMONDCUT_COSTS: any = { 'Facette Lisse': { 1: 39.80, 2: 21.50 }, 'Facette Twinkle': { 1: 79.80, 2: 60.00 }, 'Diamond Ice': { 1: 93.60, 2: 60.00 }, 'Standard': { 1: 0.00, 2: 0.00 } };
const URGENCY_RATES: any = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST: any = { 1: 10.00, 2: 8.00 };
const ENGRAVING_UNIT_COST: any = { 1: 12.00, 2: 10.00 };

const calculatePrice = (m: Montage, tier: 1 | 2 = 1) => {
    let total = 0;
    total += CATEGORY_COSTS[m.category || 'Cerclé'][tier] || 0;
    total += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'][tier] || 0;
    total += (m.engravingCount || 0) * ENGRAVING_UNIT_COST[tier];
    if (m.glassType) m.glassType.forEach((t:string) => total += (GLASS_COSTS[t] ? GLASS_COSTS[t][tier] : 0));
    if (m.shapeChange) total += SHAPE_CHANGE_COST[tier];
    const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0;
    return total + (total * urgencyRate);
};

// --- SOUS-COMPOSANT : CARTE MONTAGE (La brique de base) ---
const MontageCard = ({ m, tier, onPhoto, onEdit, onDelete, isManager, fileInputRefs, handleUpload }: any) => {
    const price = calculatePrice(m, tier);
    
    // --- RÈGLES DE POUVOIR ---
    // Manager : Peut modifier TOUT, ne peut JAMAIS supprimer.
    const canEdit = isManager || (m.statut === 'En attente' || m.statut === 'Reçu');
    const canDelete = !isManager && (m.statut === 'En attente' || m.statut === 'Reçu');

    const statusColors: any = { 'Terminé': 'border-green-500', 'En cours': 'border-orange-500', 'Reçu': 'border-blue-500', 'En attente': 'border-gray-300' };
    const statusBg: any = { 'Terminé': 'bg-green-100 text-green-700', 'En cours': 'bg-orange-100 text-orange-700', 'Reçu': 'bg-blue-100 text-blue-700', 'En attente': 'bg-gray-100 text-gray-700' };

    return (
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-lg border-l-4 border-gray-100 gap-4 hover:shadow-md ${statusColors[m.statut] || 'border-gray-300'}`}>
            <div className="flex-1">
                <div className="mb-2 flex items-center gap-3 flex-wrap"> 
                    <span className="font-bold text-xl text-gray-900">{m.reference}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="font-semibold text-gray-700">{m.frame}</span>
                    <Badge variant="outline" className="ml-auto sm:ml-4 text-sm font-medium bg-green-50 text-green-700 border-green-200">{price.toFixed(2)} € HT</Badge>
                </div>
                <div className="mb-2 flex gap-2 items-center">
                     <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusBg[m.statut]}`}>{m.statut}</span>
                     {m.createdBy && m.createdBy.includes("Manager") && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 font-medium">{m.createdBy}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">{m.category}</Badge>
                    {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency}</Badge>}
                    {m.glassType?.map((g:string) => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}
                </div>
                {m.description && <p className="text-xs text-gray-600 mt-1 italic border-l-2 border-gray-200 pl-2">Note: {m.description}</p>}
            </div>
            <div className="flex items-center gap-2">
                 {m.photoUrl ? (
                    <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); onPhoto(m._id); }}>
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                ) : (
                    <>
                        <input type="file" accept="image/*" className="hidden" ref={el => fileInputRefs.current[m._id] = el} onChange={(e) => handleUpload(m._id, e.target.files?.[0])} />
                        <Button variant="outline" size="icon" className="text-gray-500 border-gray-300 hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); fileInputRefs.current[m._id]?.click(); }}>
                            <Camera className="w-4 h-4" />
                        </Button>
                    </>
                )}
                {canEdit && <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(m); }}><Pencil className="w-4 h-4 text-blue-600" /></Button>}
                {canDelete && <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(m._id); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>}
            </div>
        </div>
    );
};

// --- VUE CLIENT (Simple) ---
const ClientView = ({ grouped, userData, ...props }: any) => {
    return (
        <Accordion type="multiple" className="space-y-4">
            {Object.entries(grouped).map(([month, shops]: any) => (
                <AccordionItem key={month} value={month} className="bg-white border rounded-lg shadow-sm">
                    <AccordionTrigger className="px-4 hover:no-underline"><div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600"/><span className="font-bold text-lg capitalize">{month}</span></div></AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                        {Object.values(shops).flat().map((m: any) => (
                            <MontageCard key={m._id} m={m} tier={userData.pricingTier} isManager={false} {...props} />
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

// --- VUE MANAGER (Structurée par Magasin) ---
const ManagerView = ({ grouped, userData, ...props }: any) => {
    return (
        <Accordion type="multiple" className="space-y-4">
            {Object.entries(grouped).map(([month, shops]: any) => (
                <AccordionItem key={month} value={month} className="bg-white border rounded-lg shadow-sm">
                    <AccordionTrigger className="px-4 hover:no-underline bg-gray-50"><div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600"/><span className="font-bold text-lg capitalize">{month}</span></div></AccordionTrigger>
                    <AccordionContent className="p-4 space-y-4">
                        {Object.entries(shops).map(([shopName, items]: any) => (
                            <div key={shopName} className="border rounded-lg p-3 bg-gray-50/30">
                                <div className="flex items-center gap-2 mb-3 border-b pb-2 px-1">
                                    <Store className="w-4 h-4 text-blue-600"/>
                                    <h3 className="font-bold text-gray-800">{shopName}</h3>
                                    <span className="text-xs text-gray-400">({items.length} dossiers)</span>
                                </div>
                                <div className="space-y-3">
                                    {items.map((m: any) => <MontageCard key={m._id} m={m} tier={userData.pricingTier} isManager={true} {...props} />)}
                                </div>
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

// --- MAIN COMPONENT ---
const MesCommandes = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [montages, setMontages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  
  // États Formulaire
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ref: "", frame: "", category: "Cerclé", glassType: [] as string[], urgency: "Standard", diamondCut: "Standard", engraving: 0, shapeChange: false, desc: "", shopId: "" });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        setUserData(user);
        fetchData(user);
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchData = async (user: any) => {
      const baseUrl = getApiUrl();
      let query = `?userId=${user.id}`;
      if (user.role === 'manager') query = `?role=manager&managerId=${user.id}`;
      try {
          const res = await fetch(`${baseUrl}/api/montages${query}`);
          const data = await res.json();
          if(data.success) setMontages(data.montages);
      } catch(e) {} finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      setIsSubmitting(true); 
      const baseUrl = getApiUrl(); 
      const method = editingId ? "PUT" : "POST"; 
      const url = editingId ? `${baseUrl}/api/montages/${editingId}` : `${baseUrl}/api/montages`; 
      
      const targetUserId = (userData.role === 'manager' && formData.shopId) ? formData.shopId : userData.id;
      let targetClientName = userData.nomSociete;
      if (userData.role === 'manager' && userData.assignedShops) {
          const shop = userData.assignedShops.find((s: any) => s._id === targetUserId);
          if (shop) targetClientName = shop.nomSociete;
      }

      const payload = { 
          userId: targetUserId, clientName: targetClientName, reference: formData.ref, frame: formData.frame, description: formData.desc, category: formData.category, glassType: formData.glassType, urgency: formData.urgency, diamondCutType: formData.diamondCut, engravingCount: formData.engraving, shapeChange: formData.shapeChange, 
          createdBy: userData.role === 'manager' ? `Manager (${userData.nomSociete})` : 'Client'
      };
      
      try { 
          const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); 
          const data = await res.json(); 
          if (data.success) { toast.success("Enregistré !"); setIsDialogOpen(false); fetchData(userData); } else { toast.error("Erreur"); }
      } catch (error) { toast.error("Erreur API"); } finally { setIsSubmitting(false); } 
  };

  const handleDelete = async (id: string) => { if (!confirm("Supprimer ?")) return; await fetch(`${getApiUrl()}/api/montages/${id}`, { method: 'DELETE' }); fetchData(userData); toast.success("Supprimé"); };
  const handlePhotoLoad = async (id: string) => { toast.loading("Chargement...", { id: 'load' }); try { const res = await fetch(`${getApiUrl()}/api/montages/${id}`); const data = await res.json(); if(data.success && data.montage.photoUrl) { setSelectedPhotoUrl(data.montage.photoUrl); toast.dismiss('load'); } else toast.error("Introuvable", { id: 'load' }); } catch(e) { toast.error("Erreur", { id: 'load' }); } };
  const handlePhotoUpload = async (id: string, file: File | undefined) => { if (!file) return; const form = new FormData(); form.append('photo', file); toast.loading("Envoi...", { id: 'up' }); await fetch(`${getApiUrl()}/api/montages/${id}/photo`, { method: 'POST', body: form }); toast.success("Envoyé", { id: 'up' }); fetchData(userData); };

  const openForm = (m?: any) => {
      if (m) { setEditingId(m._id); setFormData({ ref: m.reference||"", frame: m.frame||"", category: m.category||"Cerclé", glassType: m.glassType||[], urgency: m.urgency||"Standard", diamondCut: m.diamondCutType||"Standard", engraving: m.engravingCount||0, shapeChange: m.shapeChange||false, desc: m.description||"", shopId: m.userId }); } 
      else { setEditingId(null); setFormData({ ref: "", frame: "", category: "Cerclé", glassType: [], urgency: "Standard", diamondCut: "Standard", engraving: 0, shapeChange: false, desc: "", shopId: userData?.assignedShops?.[0]?._id || "" }); }
      setIsDialogOpen(true);
  };

  // Groupement des données
  const filtered = montages.filter(m => { const s = normalize(searchTerm); return (normalize(m.reference).includes(s) || normalize(m.frame).includes(s) || normalize(m.clientName).includes(s)); });
  const grouped = filtered.reduce((acc: any, m) => {
      const dateKey = m.dateReception ? new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}) : "Date Inconnue";
      const shopKey = userData?.role === 'manager' ? (m.clientName || "Inconnu") : "Liste";
      if (!acc[dateKey]) acc[dateKey] = {}; if (!acc[dateKey][shopKey]) acc[dateKey][shopKey] = [];
      acc[dateKey][shopKey].push(m); return acc;
  }, {});

  if (loading || !userData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-4 md:px-8 container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1><p className="text-gray-500">{userData.role === 'manager' ? "Vue Responsable : Suivi des boutiques" : "Suivi de vos montages"}</p></div>
            <Button onClick={() => openForm()} className="bg-black text-white gap-2"><PlusCircle className="w-4 h-4" /> Nouveau Dossier</Button>
        </div>
        <div className="mb-6 relative"><Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" /><Input className="pl-10 h-12 bg-white" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>

        <Tabs defaultValue="encours" className="space-y-6">
            <TabsList className="bg-white border p-1"><TabsTrigger value="encours" className="px-6">En cours</TabsTrigger><TabsTrigger value="historique" className="px-6">Historique</TabsTrigger></TabsList>
            {['encours', 'historique'].map(tab => (
                <TabsContent key={tab} value={tab}>
                    <Card className="border-0 shadow-md"><CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(grouped).length === 0 ? <div className="text-center py-10 text-gray-400">Aucun dossier.</div> : 
                            (userData.role === 'manager' 
                                ? <ManagerView grouped={grouped} userData={userData} onPhoto={handlePhotoLoad} onEdit={openForm} onDelete={handleDelete} fileInputRefs={fileInputRefs} handleUpload={handlePhotoUpload} /> 
                                : <ClientView grouped={grouped} userData={userData} onPhoto={handlePhotoLoad} onEdit={openForm} onDelete={handleDelete} fileInputRefs={fileInputRefs} handleUpload={handlePhotoUpload} />
                            )
                        }
                    </CardContent></Card>
                </TabsContent>
            ))}
        </Tabs>

        {/* MODALE FORMULAIRE */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="max-w-2xl bg-white"><DialogHeader><DialogTitle>{editingId ? "Modifier" : "Nouveau"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
                {userData.role === 'manager' && (<div><Label>Magasin</Label><Select value={formData.shopId} onValueChange={v => setFormData({...formData, shopId: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{userData.assignedShops?.map((s:any) => <SelectItem key={s._id} value={s._id}>{s.nomSociete}</SelectItem>)}</SelectContent></Select></div>)}
                <div className="grid grid-cols-2 gap-4"><div><Label>Référence</Label><Input value={formData.ref} onChange={e=>setFormData({...formData, ref: e.target.value})} required/></div><div><Label>Monture</Label><Input value={formData.frame} onChange={e=>setFormData({...formData, frame: e.target.value})} required/></div></div>
                <div className="grid grid-cols-2 gap-4"><div><Label>Type</Label><Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent></Select></div><div><Label>Urgence</Label><Select value={formData.urgency} onValueChange={v => setFormData({...formData, urgency: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Express -24H">Express -24H</SelectItem></SelectContent></Select></div></div>
                <div><Label>Note</Label><Textarea value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} /></div>
                <Button type="submit" className="w-full bg-black text-white" disabled={isSubmitting}>Enregistrer</Button>
            </form>
        </DialogContent></Dialog>

        {/* MODALE PHOTO */}
        <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}><DialogContent className="bg-transparent border-0 p-0 flex justify-center max-w-4xl w-full h-full pointer-events-none"><div className="relative pointer-events-auto p-4"><Button variant="ghost" size="icon" className="absolute top-0 right-0 text-white bg-black/50 rounded-full" onClick={() => setSelectedPhotoUrl(null)}><X className="w-6 h-6" /></Button>{selectedPhotoUrl && (<img src={selectedPhotoUrl} className="max-w-full max-h-[90vh] rounded-lg border-4 border-white" />)}</div></DialogContent></Dialog>
      </div>
    </div>
  );
};

export default MesCommandes;