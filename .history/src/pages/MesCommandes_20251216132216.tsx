import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Clock, CheckCircle2, AlertCircle, Package, Image as ImageIcon, X, UserCog, Store, Loader2, Pencil, Trash2, Camera } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; 
import { Textarea } from "@/components/ui/textarea";

// --- URL API ---
const getApiUrl = () => {
    return window.location.hostname === "localhost" 
      ? "http://localhost:3000" 
      : "https://atelier4.vercel.app";
};

// --- INTERFACES ---
interface UserData { 
    id: string; nomSociete: string; address?: string; zipCity?: string; siret: string; role?: string; 
    assignedShops?: any[]; 
    pricingTier?: 1 | 2; 
}

interface Montage { 
    _id: string; clientName: string; reference?: string; frame?: string; description: string; category?: string; 
    glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number; shapeChange?: boolean; 
    statut: string; dateReception: string; userId: string; photoUrl?: string; createdBy?: string; 
}

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- PRIX & CONSTANTES (Identiques Admin) ---
const CATEGORY_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Cerclé': { 1: 7.00, 2: 3.60 }, 'Percé': { 1: 15.90, 2: 12.00 }, 'Nylor': { 1: 14.90, 2: 12.00 } 
};
const GLASS_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Verre 4 saisons': { 1: 28.80, 2: 28.80 }, 'Verre Dégradé': { 1: 50.00, 2: 48.00 }, 'Verre de stock': { 1: 0.00, 2: 0.00 } 
};
const DIAMONDCUT_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Facette Lisse': { 1: 39.80, 2: 21.50 }, 'Facette Twinkle': { 1: 79.80, 2: 60.00 }, 'Diamond Ice': { 1: 93.60, 2: 60.00 }, 'Standard': { 1: 0.00, 2: 0.00 } 
};
const URGENCY_RATES: Record<string, number> = { 
    'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 
};
const SHAPE_CHANGE_COST = { 1: 10.00, 2: 8.00 };
const ENGRAVING_UNIT_COST = { 1: 12.00, 2: 10.00 };

// --- COMPOSANT PRINCIPAL ---
const MesCommandes = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  
  // États Formulaire
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newRef, setNewRef] = useState("");
  const [newFrame, setNewFrame] = useState("");
  const [newCategory, setNewCategory] = useState("Cerclé");
  const [newGlassType, setNewGlassType] = useState<string[]>([]);
  const [newUrgency, setNewUrgency] = useState("Standard");
  const [newDiamondCutType, setNewDiamondCutType] = useState("Standard");
  const [newEngravingCount, setNewEngravingCount] = useState(0);
  const [newShapeChange, setNewShapeChange] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  // Nouveau champ pour Manager : Sélectionner le magasin lors de la création
  const [selectedShopId, setSelectedShopId] = useState<string>(""); 

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const URGENCY_OPTIONS = ['Standard', 'Prioritaire -48H', 'Express -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        setUserData(user);
        
        const baseUrl = getApiUrl();
        let query = `?userId=${user.id}`;
        // Si Manager, on demande les montages de tous les magasins assignés
        if (user.role === 'manager') query = `?role=manager&managerId=${user.id}`;
        
        fetch(`${baseUrl}/api/montages${query}`).then(r=>r.json()).then(d=>{
            if(d.success) setMontages(d.montages);
            setLoading(false);
        }).catch(() => setLoading(false));

    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => {
      if (!userData) return;
      const baseUrl = getApiUrl();
      let query = `?userId=${userData.id}`;
      if (userData.role === 'manager') query = `?role=manager&managerId=${userData.id}`;
      
      const res = await fetch(`${baseUrl}/api/montages${query}`);
      const data = await res.json();
      if(data.success) setMontages(data.montages);
  };

  const handleSaveMontage = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!userData) return;
      setIsSubmitting(true); 
      
      const baseUrl = getApiUrl(); 
      const method = editingId ? "PUT" : "POST"; 
      const url = editingId ? `${baseUrl}/api/montages/${editingId}` : `${baseUrl}/api/montages`; 
      
      // Si Manager, on utilise l'ID du magasin sélectionné, sinon l'ID du user courant
      const targetUserId = (userData.role === 'manager' && selectedShopId) ? selectedShopId : userData.id;

      // On essaye de trouver le nom du client si c'est un manager
      let targetClientName = userData.nomSociete;
      if (userData.role === 'manager' && userData.assignedShops) {
          const shop = userData.assignedShops.find((s: any) => s._id === targetUserId);
          if (shop) targetClientName = shop.nomSociete;
      }

      const payload = { 
          userId: targetUserId,
          clientName: targetClientName,
          reference: newRef, 
          frame: newFrame, 
          description: newDesc, 
          category: newCategory, 
          glassType: newGlassType, 
          urgency: newUrgency, 
          diamondCutType: newDiamondCutType, 
          engravingCount: newEngravingCount, 
          shapeChange: newShapeChange, 
          createdBy: userData.role === 'manager' ? `Manager (${userData.nomSociete})` : 'Client'
      };
      
      try { 
          const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); 
          const data = await res.json(); 
          if (data.success) { 
              toast.success(editingId ? "Modifié !" : "Dossier créé !"); 
              setIsDialogOpen(false); 
              fetchMontages(); 
          } else {
              toast.error("Erreur enregistrement");
          }
      } catch (error) { toast.error("Erreur API"); } 
      finally { setIsSubmitting(false); } 
  };

  const handleDelete = async (id: string) => { 
      if (!confirm("Supprimer ce dossier ?")) return;
      const baseUrl = getApiUrl(); 
      await fetch(`${baseUrl}/api/montages/${id}`, { method: 'DELETE' }); 
      fetchMontages(); 
      toast.success("Supprimé"); 
  };

  const handlePhotoUpload = async (montageId: string, file: File) => {
      if (!file) return;
      const formData = new FormData(); formData.append('photo', file); 
      toast.loading("Envoi...", { id: 'photo-upload' });
      const baseUrl = getApiUrl();
      try {
          const res = await fetch(`${baseUrl}/api/montages/${montageId}/photo`, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) { toast.success("Photo ajoutée !", { id: 'photo-upload' }); fetchMontages(); } 
          else { toast.error("Erreur upload", { id: 'photo-upload' }); }
      } catch (error) { toast.error("Erreur connexion", { id: 'photo-upload' }); }
  };

  const openCreateDialog = () => { 
      setEditingId(null); setNewRef(""); setNewFrame(""); setNewDesc(""); 
      setNewCategory("Cerclé"); setNewGlassType([]); setNewUrgency("Standard"); 
      setNewDiamondCutType("Standard"); setNewEngravingCount(0); setNewShapeChange(false);
      // Si manager, pré-selectionner le premier shop
      if (userData?.role === 'manager' && userData.assignedShops?.length) {
          setSelectedShopId(userData.assignedShops[0]._id);
      }
      setIsDialogOpen(true); 
  };

  const openEditDialog = (m: Montage) => {
      setEditingId(m._id); setNewRef(m.reference||""); setNewFrame(m.frame||""); setNewDesc(m.description||"");
      setNewCategory(m.category||"Cerclé"); setNewGlassType(m.glassType||[]); 
      setNewUrgency(m.urgency||"Standard"); setNewDiamondCutType(m.diamondCutType||"Standard"); 
      setNewEngravingCount(m.engravingCount||0); setNewShapeChange(m.shapeChange||false);
      setSelectedShopId(m.userId);
      setIsDialogOpen(true);
  };

  const handleGlassTypeChange = (type: string, checked: boolean) => { setNewGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type)); };

  const calculatePrice = (m: Montage) => {
      const tier = userData?.pricingTier || 1;
      let total = 0;
      total += CATEGORY_COSTS[m.category || 'Cerclé'][tier] || 0;
      total += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'][tier] || 0;
      total += (m.engravingCount || 0) * ENGRAVING_UNIT_COST[tier];
      if (m.glassType) m.glassType.forEach(t => total += (GLASS_COSTS[t] ? GLASS_COSTS[t][tier] : 0));
      if (m.shapeChange) total += SHAPE_CHANGE_COST[tier];
      const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0;
      return total + (total * urgencyRate);
  };

  const renderMontageDetails = (m: Montage) => ( 
      <div className="flex flex-wrap items-center gap-2">
          {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}
          {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
          {m.engravingCount !== undefined && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
          {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)} 
          {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}
      </div>
  );

  // --- FILTRAGE ET REGROUPEMENT (LOGIQUE MANAGER VS USER) ---
  const filteredMontages = montages.filter(m => {
      const search = normalize(searchTerm);
      return (normalize(m.reference).includes(search) || normalize(m.frame).includes(search) || normalize(m.clientName).includes(search));
  });

  // Groupe par MOIS
  const groupedByMonth = filteredMontages.reduce((acc: any, m) => {
      let monthName = "Date Inconnue";
      try { if (m.dateReception) monthName = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}); } catch(e){}
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(m);
      return acc;
  }, {});

  // Pour MANAGER : On doit sous-grouper par Magasin à l'intérieur de chaque mois
  // On ne le fait pas ici dans le reduce global, on le fera à l'affichage pour plus de souplesse

  if (loading || !userData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-4 md:px-8 container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
                <p className="text-gray-500">
                    {userData.role === 'manager' 
                        ? "Vue globale de vos magasins et suivis." 
                        : "Suivez l'avancement de vos montages."}
                </p>
            </div>
            <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2"><PlusCircle className="w-4 h-4" /> Nouveau Dossier</Button>
        </div>

        {/* RECHERCHE */}
        <div className="mb-6 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher une référence, une monture..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

        <Tabs defaultValue="encours" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto">
                <TabsTrigger value="encours" className="px-6 py-2"><Clock className="w-4 h-4 mr-2" /> En cours</TabsTrigger>
                <TabsTrigger value="historique" className="px-6 py-2"><CheckCircle2 className="w-4 h-4 mr-2" /> Historique</TabsTrigger>
            </TabsList>

            {/* CONTENU DES ONGLETS */}
            {['encours', 'historique'].map(tab => (
                <TabsContent key={tab} value={tab}>
                    <Card className="shadow-md border-0"><CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByMonth).length === 0 ? <div className="text-center py-20 text-gray-400">Aucun dossier trouvé.</div> : (
                            <Accordion type="multiple" className="space-y-4">
                                {Object.entries(groupedByMonth).map(([monthName, items]: any) => {
                                    // Filtrage par statut selon l'onglet
                                    const tabItems = items.filter((m: Montage) => {
                                        const isFinished = m.statut === 'Terminé' || m.statut === 'Expédié';
                                        return tab === 'historique' ? isFinished : !isFinished;
                                    });

                                    if (tabItems.length === 0) return null;

                                    // --- LOGIQUE D'AFFICHAGE ---
                                    let contentToRender;

                                    // CAS 1 : C'est un MANAGER -> On groupe par Magasin
                                    if (userData.role === 'manager') {
                                        // On groupe les items de ce mois par magasin (clientName)
                                        const byShop = tabItems.reduce((acc: any, m: Montage) => {
                                            const shop = m.clientName || "Magasin Inconnu";
                                            if (!acc[shop]) acc[shop] = [];
                                            acc[shop].push(m);
                                            return acc;
                                        }, {});

                                        contentToRender = (
                                            <div className="space-y-4">
                                                {Object.entries(byShop).map(([shopName, shopItems]: any) => (
                                                    <div key={shopName} className="bg-white border rounded-lg p-4 ml-2">
                                                        <div className="flex items-center gap-2 mb-3 border-b pb-2">
                                                            <Store className="w-4 h-4 text-blue-600"/>
                                                            <h3 className="font-bold text-gray-800">{shopName}</h3>
                                                            <span className="text-xs text-gray-400">({shopItems.length})</span>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {shopItems.map((m: Montage) => renderMontageCard(m, calculatePrice, setSelectedPhotoUrl, fileInputRefs, handlePhotoUpload, openEditDialog, handleDelete))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    } 
                                    // CAS 2 : C'est un CLIENT -> Liste simple
                                    else {
                                        contentToRender = (
                                            <div className="space-y-3">
                                                {tabItems.map((m: Montage) => renderMontageCard(m, calculatePrice, setSelectedPhotoUrl, fileInputRefs, handlePhotoUpload, openEditDialog, handleDelete))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-xl px-4">
                                            <AccordionTrigger className="hover:no-underline py-4 bg-gray-100/70 hover:bg-gray-100 rounded-lg -mx-4 px-4">
                                                <div className="flex items-center gap-4 w-full pr-4">
                                                    <Calendar className="w-5 h-5 text-blue-600" />
                                                    <span className="text-xl font-extrabold text-gray-900 capitalize">{monthName}</span>
                                                    <Badge className="ml-auto bg-gray-200 text-gray-700 hover:bg-gray-300">{tabItems.length}</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-4 pb-6">
                                                {contentToRender}
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent></Card>
                </TabsContent>
            ))}
        </Tabs>

        {/* MODALE CRÉATION/EDITION */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="max-w-2xl bg-white"><DialogHeader><DialogTitle>{editingId ? "Modifier" : "Nouveau Dossier"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveMontage} className="space-y-4 pt-4">
                {/* Si Manager, Selecteur de Magasin */}
                {userData.role === 'manager' && userData.assignedShops && (
                    <div>
                        <Label>Pour quel magasin ?</Label>
                        <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir un magasin" /></SelectTrigger>
                            <SelectContent className="bg-white">
                                {userData.assignedShops.map((s: any) => (
                                    <SelectItem key={s._id} value={s._id}>{s.nomSociete} ({s.zipCity})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Référence Client</Label><Input value={newRef} onChange={e=>setNewRef(e.target.value)} required className="bg-white"/></div>
                    <div><Label>Modèle Monture</Label><Input value={newFrame} onChange={e=>setNewFrame(e.target.value)} required className="bg-white"/></div>
                </div>
                <div><Label>Urgence</Label><Select onValueChange={setNewUrgency} value={newUrgency}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <hr/>
                <div className="grid grid-cols-3 gap-4">
                    <div><Label>Type</Label><Select onValueChange={setNewCategory} value={newCategory}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent></Select></div>
                    <div><Label>Diamond Cut</Label><Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Gravure</Label><Input type="number" value={newEngravingCount} onChange={e=>setNewEngravingCount(parseInt(e.target.value))} className="bg-white"/></div>
                </div>
                <div className="p-3 bg-white rounded border space-y-3">
                    <Label className="font-semibold">Options Verres & Autres</Label>
                    <div className="flex flex-wrap gap-4">
                        {GLASS_OPTIONS.map(o=>(<div key={o} className="flex items-center space-x-2"><Checkbox id={o} checked={newGlassType.includes(o)} onCheckedChange={(c)=>handleGlassTypeChange(o, c as boolean)}/><label htmlFor={o} className="text-sm cursor-pointer">{o}</label></div>))}
                        <div className="flex items-center space-x-2 border-l pl-4 ml-2"><Checkbox id="sc" checked={newShapeChange} onCheckedChange={(c)=>setNewShapeChange(c as boolean)}/><label htmlFor="sc" className="text-sm font-medium cursor-pointer">Changement de Forme</label></div>
                    </div>
                </div>
                <div><Label>Commentaire / Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Infos supplémentaires..." className="bg-white"/></div>
                <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : (editingId ? "Mettre à jour" : "Envoyer à l'atelier")}</Button>
            </form>
        </DialogContent></Dialog>

        {/* MODALE PHOTO */}
        <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}><DialogContent className="bg-transparent shadow-none border-0 p-0 flex items-center justify-center max-w-4xl w-full h-full pointer-events-none"><div className="relative pointer-events-auto p-4"><Button variant="ghost" size="icon" className="absolute top-0 right-0 text-white bg-black/50 hover:bg-black/70 rounded-full" onClick={() => setSelectedPhotoUrl(null)}><X className="w-6 h-6" /></Button>{selectedPhotoUrl && (<img src={selectedPhotoUrl} alt="Montage" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border-4 border-white" />)}</div></DialogContent></Dialog>
      </div>
    </div>
  );
};

// --- HELPER RENDU CARTE (POUR EVITER LA DUPLICATION) ---
const renderMontageCard = (
    m: Montage, 
    calculatePrice: any, 
    setSelectedPhotoUrl: any, 
    fileInputRefs: any, 
    handlePhotoUpload: any, 
    openEditDialog: any, 
    handleDelete: any
) => {
    const price = calculatePrice(m);
    
    // Fonction couleur statut
    const getStatusColor = (s: string) => {
        if(s==='Terminé') return 'border-l-4 border-l-green-500';
        if(s==='En cours') return 'border-l-4 border-l-orange-500';
        if(s==='Reçu') return 'border-l-4 border-l-blue-500';
        return 'border-l-4 border-l-gray-300';
    };

    return (
        <div key={m._id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md ${getStatusColor(m.statut)}`}>
            <div className="flex-1">
                <div className="mb-2 flex items-center gap-3 flex-wrap"> 
                    <span className="font-bold text-xl text-gray-900">{m.reference}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="font-semibold text-gray-700">{m.frame}</span>
                    <Badge variant="outline" className="ml-auto sm:ml-4 text-sm font-medium px-2 py-0.5 border-green-600 text-green-700 bg-green-50">{price.toFixed(2)} € HT</Badge>
                </div>
                
                {/* Afficher statut texte */}
                <div className="mb-2">
                     <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                         m.statut === 'Terminé' ? 'bg-green-100 text-green-700' :
                         m.statut === 'En cours' ? 'bg-orange-100 text-orange-700' :
                         m.statut === 'Reçu' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                     }`}>{m.statut}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">{m.category}</Badge>
                    <div className="flex flex-wrap items-center gap-2">
                        {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}
                        {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
                        {m.engravingCount !== undefined && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
                        {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)} 
                        {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}
                    </div>
                </div>
                {m.description && <p className="text-xs text-gray-600 mt-1 mb-2 italic border-l-2 border-gray-200 pl-2 max-w-full overflow-hidden whitespace-normal">Note: {m.description}</p>}
                <p className="text-xs text-gray-400">Reçu le {new Date(m.dateReception).toLocaleDateString()}</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                 {/* PHOTO INTELLIGENTE */}
                 {m.photoUrl ? (
                    <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={async () => {
                        toast.loading("Chargement...", { id: 'load-photo' });
                        try {
                            const res = await fetch(`${getApiUrl()}/api/montages/${m._id}`);
                            const data = await res.json();
                            if (data.success && data.montage.photoUrl) {
                                setSelectedPhotoUrl(data.montage.photoUrl);
                                toast.dismiss('load-photo');
                            } else {
                                toast.error("Photo introuvable", { id: 'load-photo' });
                            }
                        } catch (e) { toast.error("Erreur", { id: 'load-photo' }); }
                    }}>
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                ) : (
                    <>
                        <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => fileInputRefs.current[m._id] = el} onChange={(e) => { if (e.target.files && e.target.files[0]) handlePhotoUpload(m._id, e.target.files[0]); }} />
                        <Button variant="outline" size="icon" className="text-gray-600 border-gray-300 hover:bg-gray-50 bg-white" onClick={() => fileInputRefs.current[m._id]?.click()}>
                            <Camera className="w-4 h-4" />
                        </Button>
                    </>
                )}
                
                {/* Actions modif/suppr (seulement si pas terminé) */}
                {(m.statut === 'En attente' || m.statut === 'Reçu') && (
                    <>
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(m)} className="bg-white"><Pencil className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(m._id)} className="bg-white"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MesCommandes;