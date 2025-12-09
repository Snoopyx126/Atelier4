import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Clock, CheckCircle2, AlertCircle, Package, Image as ImageIcon, X, UserCog, Store } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Dialog, DialogContent } from "@/components/ui/dialog"; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// --- INTERFACES ---
interface UserData { 
    id: string; nomSociete: string; address?: string; zipCity?: string; siret: string; role?: string; 
    assignedShops?: any[]; 
    pricingTier?: 1 | 2; // ✅ Ajout du pricingTier
}

interface Montage { 
    _id: string; reference: string; frame: string; description: string; category: string; 
    glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number;
    shapeChange?: boolean; statut: string; dateReception: string;
    photoUrl?: string; createdBy?: string; clientName?: string; userId?: string;
}

interface Facture {
    id: string; invoiceNumber: string; montageReference: string; dateEmission: string;
    totalHT: number; totalTTC: number; invoiceData: any[]; amountPaid?: number; paymentStatus?: string;
}

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- CONSTANTES PRIX (Double Tarif) ---
const CATEGORY_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Cerclé': { 1: 7.00, 2: 3.60 }, 
    'Percé': { 1: 15.90, 2: 12.00 }, 
    'Nylor': { 1: 14.90, 2: 12.00 } 
};

const GLASS_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Verre 4 saisons': { 1: 28.80, 2: 28.80 }, 
    'Verre Dégradé': { 1: 50.00, 2: 48.00 }, 
    'Verre de stock': { 1: 0.00, 2: 0.00 } 
};

const DIAMONDCUT_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Facette Lisse': { 1: 39.80, 2: 21.50 }, 
    'Facette Twinkle': { 1: 79.80, 2: 60.00 }, 
    'Diamond Ice': { 1: 93.60, 2: 60.00 }, 
    'Standard': { 1: 0.00, 2: 0.00 } 
};

const URGENCY_RATES: Record<string, number> = { 
    'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 
};

const SHAPE_CHANGE_COST = { 1: 10.00, 2: 8.00 };
const ENGRAVING_UNIT_COST = { 1: 12.00, 2: 10.00 };

// --- FONCTION CALCUL PRIX DYNAMIQUE ---
const calculateSingleMontagePrice = (m: Montage, tier: 1 | 2 = 1): number => {
    let totalBase = 0;
    
    // On utilise le tier passé en paramètre
    totalBase += CATEGORY_COSTS[m.category || 'Cerclé'][tier] || 0;
    totalBase += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'][tier] || 0;
    totalBase += (m.engravingCount || 0) * ENGRAVING_UNIT_COST[tier];
    
    if (m.glassType) { 
        m.glassType.forEach(type => { 
            totalBase += GLASS_COSTS[type] ? GLASS_COSTS[type][tier] : 0; 
        }); 
    }
    
    if (m.shapeChange) { totalBase += SHAPE_CHANGE_COST[tier]; }
    
    const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0;
    const urgencySurcharge = totalBase * urgencyRate;
    
    return totalBase + urgencySurcharge;
};

// --- CONSTANTES FORMULAIRE ---
const URGENCY_OPTIONS = ['Standard', 'Prioritaire -48H', 'Express -24H', 'Urgent -3H'];
const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
const GLASS_OPTIONS = ['Verre 4 Dégradé saisons', 'Verre Dégradé', 'Verre de stock'];

const MesCommandes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); 
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'factures' ? 'factures' : 'commandes';
  const [factures, setFactures] = useState<Facture[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null); 
  
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedTargetClient, setSelectedTargetClient] = useState<string>("");

  const [reference, setReference] = useState("");
  const [frame, setFrame] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cerclé");
  const [glassType, setGlassType] = useState<string[]>([]);
  const [urgency, setUrgency] = useState("Standard");
  const [diamondCutType, setDiamondCutType] = useState("Standard");
  const [engravingCount, setEngravingCount] = useState(0);
  const [shapeChange, setShapeChange] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "";
        
        let query = `?userId=${userData.id}`;
        if (userData.role === 'manager') query = `?role=manager&managerId=${userData.id}`;
        
        fetch(`${baseUrl}/api/montages${query}`).then(r=>r.json()).then(d=>{if(d.success)setMontages(d.montages)});
        fetch(`${baseUrl}/api/factures?userId=${userData.id}`).then(r=>r.json()).then(d=>{if(d.success)setFactures(d.factures.map((f:any)=>({id:f._id,invoiceNumber:f.invoiceNumber,montageReference:f.montagesReferences?.join(', ')||'N/A',dateEmission:f.dateEmission,totalHT:f.totalHT,totalTTC:f.totalTTC,invoiceData:f.invoiceData||[],amountPaid:f.amountPaid,paymentStatus:f.paymentStatus})));});

        if (userData.role === 'manager') {
            // Le manager récupère la liste des clients via l'API pour avoir les infos à jour (dont le pricingTier)
            fetch(`${baseUrl}/api/users`).then(r => r.json()).then(d => {
                if (d.success) {
                    setClientsList(d.users);
                    // On pré-sélectionne le premier magasin assigné s'il y en a
                    if (userData.assignedShops && userData.assignedShops.length > 0) {
                        const firstId = typeof userData.assignedShops[0] === 'string' ? userData.assignedShops[0] : userData.assignedShops[0]._id;
                        setSelectedTargetClient(firstId);
                    }
                }
            });
        } else {
            setSelectedTargetClient(userData.id);
        }

      } catch (e) { navigate("/"); }
    } else { navigate("/espace-pro"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async () => {
    if (!user) return;
    try {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "";
      let query = `?userId=${user.id}`;
      if (user.role === 'manager') query = `?role=manager&managerId=${user.id}`;
      
      const response = await fetch(`${baseUrl}/api/montages${query}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.montages)) setMontages(data.montages);
    } catch (error) { console.error(error); }
  };

  const handleGlassTypeChange = (type: string, checked: boolean) => {
      setGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
  };

  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetId = user.role === 'manager' ? selectedTargetClient : user.id;
    if (!targetId) { toast.error("Veuillez sélectionner un magasin."); return; }
    setIsSubmitting(true);
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "";
    try {
        const res = await fetch(`${baseUrl}/api/montages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: targetId, reference, frame, description, category, glassType, urgency, diamondCutType, engravingCount, shapeChange, createdBy: user.role === 'manager' ? `Manager (${user.nomSociete})` : 'Client' })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Dossier ajouté !");
            setReference(""); setFrame(""); setDescription(""); setCategory("Cerclé"); setGlassType([]); setUrgency("Standard"); setDiamondCutType("Standard"); setEngravingCount(0); setShapeChange(false);
            fetchMontages(); 
        }
    } catch (error) { toast.error("Erreur envoi."); } 
    finally { setIsSubmitting(false); }
  };

  const handleDownloadClientInvoice = async (facture: Facture) => {
    if (!user) return;
    toast.loading("Génération du PDF...", { id: 'download' });
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.width = '800px'; hiddenDiv.style.padding = '40px'; hiddenDiv.style.background = 'white';
    hiddenDiv.style.position = 'absolute'; hiddenDiv.style.top = '-9999px'; hiddenDiv.style.left = '-9999px';
    document.body.appendChild(hiddenDiv);
    hiddenDiv.innerHTML = `<div style="font-family: sans-serif; color: #000; display: flex; flex-direction: column; justify-content: space-between; min-height: 1000px;"><div><div style="display: flex; justify-content: space-between; margin-bottom: 40px;"><div><h1 style="font-size: 30px; font-weight: bold; margin-bottom: 10px;">FACTURE</h1><p style="color: #666;">N° ${facture.invoiceNumber}</p><p style="color: #999;">Date: ${new Date(facture.dateEmission).toLocaleDateString('fr-FR')}</p></div><div style="text-align: right;"><h2 style="font-size: 18px; font-weight: bold;">L'Atelier des Arts</h2><p style="color: #666; font-size: 12px;">178 Avenue Daumesnil, 75012 Paris</p><p style="color: #666; font-size: 12px;">SIRET: 98095501700010</p></div></div><div style="border-top: 2px solid #eee; padding-top: 20px; margin-bottom: 30px;"><h3 style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase;">Facturé à</h3><p style="font-size: 18px; font-weight: bold;">${user.nomSociete}</p><p style="color: #666;">${user.address || ''}</p><p style="color: #666;">${user.zipCity || ''}</p><p style="color: #666;">${user.siret}</p></div><table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;"><thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 10px 0;">Référence</th><th style="text-align: left; padding: 10px 0;">Détails</th><th style="text-align: right; padding: 10px 0;">Prix HT</th></tr></thead><tbody>${facture.invoiceData.map((item: any) => `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; vertical-align: top;">${item.reference || '-'}</td><td style="padding: 10px 0; font-size: 12px; color: #666;">${item.details.join('<br/>')}</td><td style="padding: 10px 0; text-align: right; font-weight: bold;">${item.price.toFixed(2)} €</td></tr>`).join('')}</tbody></table></div><div><div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;"><div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; width: 45%;"><p style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">COORDONNÉES BANCAIRES</p><p style="font-size: 11px; color: #666;">Banque: L'ATELIER DES ARTS</p><p style="font-size: 11px; color: #666; margin-top: 5px;">IBAN :</p><p style="font-family: monospace; font-size: 13px; font-weight: bold; color: #333;">FR76 1820 6002 0065 1045 3419 297</p><p style="font-size: 11px; color: #666; margin-top: 5px;">BIC :</p><p style="font-family: monospace; font-size: 13px; font-weight: bold; color: #333;">AGRIFRPP882</p></div><div style="text-align: right;"><p style="margin: 5px 0;">Total HT: ${facture.totalHT?.toFixed(2)} €</p><p style="margin: 5px 0;">TVA (20%): ${(facture.totalTTC - (facture.totalHT || 0)).toFixed(2)} €</p><h2 style="font-size: 24px; font-weight: bold; margin-top: 10px;">Net à payer: ${facture.totalTTC.toFixed(2)} €</h2></div></div><div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; font-size: 9px; color: #999; line-height: 1.4;"><p>Conditions de règlement : Paiement à réception. Aucun escompte pour paiement anticipé.</p><p>En cas de retard de paiement : indemnité forfaitaire pour frais de recouvrement de 40€ + pénalités de retard (3x taux d'intérêt légal).</p><p style="margin-top: 5px; font-weight: bold;">L'Atelier des Arts - SIRET 98095501700010 - 178 Avenue Daumesnil 75012 Paris</p></div></div></div>`;
    try { const canvas = await html2canvas(hiddenDiv, { scale: 2 }); const imgData = canvas.toDataURL('image/jpeg', 1.0); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width); pdf.save(`Facture_${facture.invoiceNumber}.pdf`); toast.success("Facture téléchargée !", { id: 'download' }); } catch (err) { toast.error("Erreur téléchargement.", { id: 'download' }); } finally { document.body.removeChild(hiddenDiv); }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'En attente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Reçu': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'En cours': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Terminé': return 'bg-green-100 text-green-700 border-green-200';
      case 'Expédié': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  const getStatusIcon = (statut: string) => { switch (statut) { case 'En attente': return <AlertCircle className="w-4 h-4 mr-1"/>; case 'En cours': return <Clock className="w-4 h-4 mr-1"/>; case 'Terminé': return <CheckCircle2 className="w-4 h-4 mr-1"/>; case 'Expédié': return <Package className="w-4 h-4 mr-1"/>; default: return null; } };
  const renderMontageDetails = (m: Montage) => ( <div className="flex flex-wrap items-center gap-2 mt-2">{m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}{m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}{m.engravingCount && m.engravingCount > 0 ? <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">✍️ {m.engravingCount} Gravure(s)</Badge> : null}{m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)} {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">📐 Changement Forme</Badge>}</div>);

  // Groupement logique selon rôle
  const filteredMontages = montages.filter(m => normalize(m.reference + m.frame).includes(normalize(searchTerm)));
  
  const groupedByMonth = filteredMontages.reduce((acc: any, m) => { 
      const d = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}); 
      if(!acc[d]) acc[d] = user?.role === 'manager' ? {} : []; 
      
      if (user?.role === 'manager') {
          const shopName = m.clientName || "Inconnu";
          if (!acc[d][shopName]) acc[d][shopName] = [];
          acc[d][shopName].push(m);
      } else {
          acc[d].push(m);
      }
      return acc; 
  }, {});

  if (loading) return <div>Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{user.role === 'manager' ? `Espace Manager: ${user.nomSociete}` : `Espace Pro: ${user.nomSociete}`}</h1>
            <Button variant="outline" onClick={() => fetchMontages()} className="bg-white"><Clock className="w-4 h-4 mr-2"/> Actualiser</Button>
        </div>
        
        <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto"><TabsTrigger value="commandes" className="px-6 py-2"><ShoppingCart className="w-4 h-4 mr-2"/> Mes Commandes ({montages.length})</TabsTrigger><TabsTrigger value="factures" className="px-6 py-2"><Receipt className="w-4 h-4 mr-2"/> Mes Factures ({factures.length})</TabsTrigger></TabsList>
            
            <TabsContent value="commandes" className="space-y-6">
                
                <Card className={`border-2 border-dashed shadow-sm bg-gray-50/50 ${user.role === 'manager' ? 'border-blue-300' : 'border-gray-300'}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className={`w-5 h-5 ${user.role === 'manager' ? 'text-blue-600' : 'text-black'}`}/> 
                            {user.role === 'manager' ? 'Ajouter un dossier pour un magasin' : 'Nouvelle Demande de Montage'}
                        </CardTitle>
                        <CardDescription>Remplissez ce formulaire pour envoyer un dossier à l'atelier.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddMontage} className="space-y-4">
                            {user.role === 'manager' && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                    <Label className="text-blue-800 font-bold mb-2 block">Pour le compte de quel magasin ?</Label>
                                    <Select onValueChange={setSelectedTargetClient} value={selectedTargetClient}>
                                        <SelectTrigger className="bg-white border-blue-300"><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">
                                            {clientsList.map((c: any) => (<SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Référence Dossier *</Label><Input placeholder="Ex: REF-123" value={reference} onChange={e => setReference(e.target.value)} required className="bg-white"/></div>
                                <div className="space-y-2"><Label>Modèle Monture *</Label><Input placeholder="Ex: RayBan 450" value={frame} onChange={e => setFrame(e.target.value)} required className="bg-white"/></div>
                                <div className="space-y-2"><Label>Urgence</Label><Select onValueChange={setUrgency} value={urgency}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Type</Label><Select onValueChange={setCategory} value={category}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Diamond Cut</Label><Select onValueChange={setDiamondCutType} value={diamondCutType}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Gravure (Qté)</Label><Input type="number" min={0} max={2} value={engravingCount} onChange={e=>setEngravingCount(parseInt(e.target.value))} className="bg-white"/></div>
                            </div>
                            <div className="p-3 bg-white rounded border space-y-3">
                                <Label className="font-semibold">Options Verres & Autres</Label>
                                <div className="flex flex-wrap gap-4">{GLASS_OPTIONS.map(o => (<div key={o} className="flex items-center space-x-2"><Checkbox id={o} checked={glassType.includes(o)} onCheckedChange={(c)=>handleGlassTypeChange(o, c as boolean)}/><label htmlFor={o} className="text-sm cursor-pointer">{o}</label></div>))}<div className="flex items-center space-x-2 border-l pl-4 ml-2"><Checkbox id="sc" checked={shapeChange} onCheckedChange={(c)=>setShapeChange(c as boolean)}/><label htmlFor="sc" className="text-sm font-medium cursor-pointer">Changement de Forme</label></div></div>
                            </div>
                            <div className="space-y-2"><Label>Commentaire / Note</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Infos supplémentaires..." className="bg-white"/></div>
                            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-black text-white hover:bg-gray-800">{isSubmitting ? "Envoi en cours..." : "Valider et Envoyer à l'atelier"}</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><Input className="pl-10 bg-white h-12 shadow-sm mb-6" placeholder="Rechercher un dossier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                
                {Object.keys(groupedByMonth).length === 0 ? <div className="text-center py-10 text-gray-500">Aucune commande trouvée.</div> : (
                    <Accordion type="multiple" className="space-y-4" defaultValue={[Object.keys(groupedByMonth)[0]]}>
                        {Object.entries(groupedByMonth).sort().reverse().map(([monthName, content]: any) => (
                            <AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-sm px-4">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-4 w-full">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        <span className="text-xl font-bold text-gray-900 capitalize">{monthName}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-6 space-y-3">
                                    {/* SI MANAGER : Sous-Accordion par Shop */}
                                    {user.role === 'manager' ? (
                                        <Accordion type="multiple" className="space-y-2">
                                            {Object.entries(content).map(([shopName, shopItems]: any) => (
                                                <AccordionItem key={shopName} value={shopName} className="border rounded-lg px-2 bg-gray-50/50">
                                                    <AccordionTrigger className="hover:no-underline py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Store className="w-4 h-4 text-gray-600"/>
                                                            <span className="font-semibold text-gray-800">{shopName}</span>
                                                            <Badge variant="secondary" className="ml-2">{shopItems.length}</Badge>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="space-y-2 pt-2">
                                                        {shopItems.map((m: Montage) => renderMontageCard(m))}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        // SI USER NORMAL : Liste directe
                                        content.sort((a: Montage, b: Montage) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime()).map((m: Montage) => renderMontageCard(m))
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </TabsContent>

            <TabsContent value="factures">{factures.length === 0 ? <p className="text-center py-10 bg-white rounded border">Aucune facture disponible.</p> : (<div className="grid gap-4">{factures.map(f => (<Card key={f.invoiceNumber} className="flex flex-col md:flex-row justify-between items-center p-6 hover:shadow-md transition-shadow bg-white"><div className="mb-4 md:mb-0"><div className="flex items-center gap-3"><p className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-gray-400"/> {f.invoiceNumber}</p>{f.paymentStatus === 'Payé' && <Badge className="bg-green-100 text-green-700 border-green-200">Réglé</Badge>}{f.paymentStatus === 'Partiellement payé' && <Badge className="bg-orange-100 text-orange-700 border-orange-200">Partiel</Badge>}{(f.paymentStatus === 'Non payé' || !f.paymentStatus) && <Badge className="bg-red-100 text-red-700 border-red-200">À régler</Badge>}</div><p className="text-sm text-gray-500">Date d'émission: {new Date(f.dateEmission).toLocaleDateString()}</p><p className="text-xs text-gray-400 mt-1">Dossiers: {f.montageReference}</p></div><div className="flex items-center gap-6"><div className="text-right"><p className="text-xs text-gray-500">Montant TTC</p><span className="text-xl font-extrabold text-gray-900">{f.totalTTC.toFixed(2)} €</span>{f.paymentStatus === 'Partiellement payé' && (<p className="text-xs text-orange-600 font-bold">Reste: {(f.totalTTC - (f.amountPaid || 0)).toFixed(2)} €</p>)}</div><Button variant="outline" onClick={() => handleDownloadClientInvoice(f)} className="bg-blue-600 text-white hover:bg-blue-700 border-0"><FileText className="w-4 h-4 mr-2" /> Télécharger PDF</Button></div></Card>))}</div>)}</TabsContent>
        </Tabs>

      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
          <DialogContent className="bg-transparent shadow-none border-0 p-0 flex items-center justify-center max-w-4xl w-full h-full pointer-events-none">
              <div className="relative pointer-events-auto p-4">
                  <Button variant="ghost" size="icon" className="absolute top-0 right-0 text-white bg-black/50 hover:bg-black/70 rounded-full" onClick={() => setSelectedPhotoUrl(null)}><X className="w-6 h-6" /></Button>
                  {selectedPhotoUrl && (<img src={selectedPhotoUrl} alt="Montage terminé" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border-4 border-white" />)}
              </div>
          </DialogContent>
      </Dialog>
      </div>
    </div>
  );

  function renderMontageCard(m: Montage) {
    // ✅ LOGIQUE DE TARIF : Chercher le client dans la liste (si manager) ou utiliser le user courant
    let clientTier: 1 | 2 = 1;
    if (user?.role === 'manager') {
        const client = clientsList.find(c => c._id === m.userId);
        clientTier = client?.pricingTier || 1;
    } else {
        clientTier = user?.pricingTier || 1;
    }

    const price = calculateSingleMontagePrice(m, clientTier);

    return (
        <div key={m._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
            <div className="flex-1">
                <div className="mb-2 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-lg text-gray-900">{m.reference}</span>
                    <span className="text-gray-400">|</span>
                    <span className="font-semibold text-gray-700">{m.frame}</span>
                    {/* AFFICHER LE PRIX */}
                    <Badge variant="outline" className="ml-auto md:ml-4 text-sm font-medium px-2 py-0.5 border-green-600 text-green-700 bg-green-50">{price.toFixed(2)} € HT</Badge>
                </div>
                {/* Badge Created By */}
                {m.createdBy && m.createdBy.includes("Manager") && <div className="flex items-center text-xs text-blue-600 mb-2 bg-blue-50 w-fit px-2 py-1 rounded"><UserCog className="w-3 h-3 mr-1"/> Ajouté par {m.createdBy}</div>}
                
                <div className="flex flex-wrap items-center gap-2 mb-2"><Badge variant="outline" className="bg-white">{m.category}</Badge>{renderMontageDetails(m)}</div>
                {m.description && <p className="text-sm text-gray-500 italic mt-1">Note: "{m.description}"</p>}
                <p className="text-xs text-gray-400 mt-2">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center gap-3">
                {m.photoUrl && (<Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={() => setSelectedPhotoUrl(m.photoUrl!)}><ImageIcon className="w-4 h-4" /></Button>)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center ${getStatusColor(m.statut)}`}>{getStatusIcon(m.statut)}{m.statut}</span>
            </div>
        </div>
    );
  }
};

export default MesCommandes;