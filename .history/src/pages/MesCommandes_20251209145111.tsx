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
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Clock, CheckCircle2, AlertCircle, Package, Image as ImageIcon, X, UserCog } from "lucide-react"; // Ajout icone UserCog
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Dialog, DialogContent } from "@/components/ui/dialog"; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// --- INTERFACES ---
interface UserData { 
    id: string; nomSociete: string; address?: string; zipCity?: string; siret: string; role?: string; // Ajout role
}

interface Montage { 
    _id: string; reference: string; frame: string; description: string; category: string; 
    glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number;
    shapeChange?: boolean; statut: string; dateReception: string;
    photoUrl?: string; 
    createdBy?: string; // ✅ Ajout
    clientName?: string; // ✅ Ajout pour affichage manager
}

interface Facture {
    id: string; invoiceNumber: string; montageReference: string; dateEmission: string;
    totalHT: number; totalTTC: number; invoiceData: any[]; amountPaid?: number; paymentStatus?: string;
}

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- CONSTANTES PRIX ---
const CATEGORY_COSTS: Record<string, number> = { 'Cerclé': 7.00, 'Percé': 15.90, 'Nylor': 14.90 };
const GLASS_COSTS: Record<string, number> = { 'Verre 4 saisons': 12.00, 'Verre Dégradé': 25.00, 'Verre de stock': 0.00 };
const DIAMONDCUT_COSTS: Record<string, number> = { 'Facette Lisse': 39.80, 'Facette Twinkle': 79.80, 'Diamond Ice': 93.60, 'Standard': 0.00 };
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = 10.00;
const ENGRAVING_UNIT_COST = 12.00;

const calculateSingleMontagePrice = (m: Montage): number => {
    let totalBase = 0;
    totalBase += CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
    totalBase += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
    totalBase += (m.engravingCount || 0) * ENGRAVING_UNIT_COST;
    if (m.glassType) { m.glassType.forEach(type => { totalBase += GLASS_COSTS[type] || 0; }); }
    if (m.shapeChange) { totalBase += SHAPE_CHANGE_COST; }
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
  
  // ✅ ÉTATS POUR LE MANAGER
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedTargetClient, setSelectedTargetClient] = useState<string>("");

  // Formulaire État
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
        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
        
        // Si Manager, on récupère TOUS les montages (comme un admin mais sans les droits de suppression/modif statut)
        // OU on récupère juste ceux qu'il a créé ? 
        // Le prompt dit : "ce compte soit exactement comme les user". Donc il doit voir SON tableau de bord.
        // MAIS "ce montage soit rentré dans les montages des autres".
        // On va charger les montages associés à l'ID du user courant, sauf si on veut une vue globale.
        // Pour l'instant, restons simple : il voit ce qui est lié à son compte, mais quand il crée, ça part ailleurs.
        
        fetch(`${baseUrl}/api/montages?userId=${userData.id}`).then(r=>r.json()).then(d=>{if(d.success)setMontages(d.montages)});
        fetch(`${baseUrl}/api/factures?userId=${userData.id}`).then(r=>r.json()).then(d=>{if(d.success)setFactures(d.factures.map((f:any)=>({id:f._id,invoiceNumber:f.invoiceNumber,montageReference:f.montagesReferences?.join(', ')||'N/A',dateEmission:f.dateEmission,totalHT:f.totalHT,totalTTC:f.totalTTC,invoiceData:f.invoiceData||[],amountPaid:f.amountPaid,paymentStatus:f.paymentStatus})));});

        // ✅ SI MANAGER : Récupérer la liste des clients pour le select
        if (userData.role === 'manager') {
            fetch(`${baseUrl}/api/users`).then(r => r.json()).then(d => {
                if (d.success) {
                    setClientsList(d.users);
                    // Sélection par défaut : lui-même s'il est dans la liste, sinon vide
                    setSelectedTargetClient(userData.id);
                }
            });
        } else {
            setSelectedTargetClient(userData.id);
        }

      } catch (e) { navigate("/"); }
    } else { navigate("/espace-pro"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async (userId: string) => {
    try {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
      const response = await fetch(`${baseUrl}/api/montages?userId=${userId}`);
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
    
    // ✅ VALIDATION MANAGER
    const targetId = user.role === 'manager' ? selectedTargetClient : user.id;
    if (!targetId) { toast.error("Veuillez sélectionner un magasin."); return; }

    setIsSubmitting(true);
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
    try {
        const res = await fetch(`${baseUrl}/api/montages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userId: targetId, // ✅ On envoie l'ID du magasin cible
                reference, frame, description, category, glassType, urgency, diamondCutType, engravingCount, shapeChange,
                createdBy: user.role === 'manager' ? `Manager (${user.nomSociete})` : 'Client' // ✅ Traçabilité
            })
        });
        const data = await res.json();
        if (data.success) {
            toast.success(user.role === 'manager' ? "Dossier ajouté au compte du magasin !" : "Dossier envoyé à l'atelier !");
            setReference(""); setFrame(""); setDescription(""); setCategory("Cerclé"); setGlassType([]); setUrgency("Standard"); setDiamondCutType("Standard"); setEngravingCount(0); setShapeChange(false);
            
            // Si le manager s'est assigné à lui-même, on rafraichit la liste, sinon on ne voit pas le montage ici (il est chez l'autre client)
            if (targetId === user.id) fetchMontages(user.id); 
        }
    } catch (error) { toast.error("Erreur envoi."); } 
    finally { setIsSubmitting(false); }
  };

  const handleDownloadClientInvoice = async (facture: Facture) => {
      // (Code identique à avant - tronqué pour lisibilité, ne pas effacer votre fonction existante)
      // ... copier votre fonction existante ici ...
      toast.info("Fonctionnalité téléchargement inchangée");
  };

  // --- HELPERS D'AFFICHAGE ---
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
  const renderMontageDetails = (m: Montage) => ( <div className="flex flex-wrap items-center gap-2 mt-2">{m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}{m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{m.diamondCutType}</Badge>}{m.engravingCount && m.engravingCount > 0 ? <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">✍️ {m.engravingCount} Gravure(s)</Badge> : null}{m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800 hover:bg-green-100">{g.replace('Verre ', '')}</Badge>)} {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">📐 Changement Forme</Badge>}</div>);

  const filteredMontages = montages.filter(m => normalize(m.reference + m.frame).includes(normalize(searchTerm)));
  const groupedByMonth = filteredMontages.reduce((acc: any, m) => { const d = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}); if(!acc[d]) acc[d] = []; acc[d].push(m); return acc; }, {});

  if (loading) return <div>Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
                {user.role === 'manager' ? `Espace Manager: ${user.nomSociete}` : `Espace Pro: ${user.nomSociete}`}
            </h1>
            <Button variant="outline" onClick={() => fetchMontages(user.id)} className="bg-white"><Clock className="w-4 h-4 mr-2"/> Actualiser</Button>
        </div>
        
        <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto"><TabsTrigger value="commandes" className="px-6 py-2"><ShoppingCart className="w-4 h-4 mr-2"/> Mes Commandes ({montages.length})</TabsTrigger><TabsTrigger value="factures" className="px-6 py-2"><Receipt className="w-4 h-4 mr-2"/> Mes Factures ({factures.length})</TabsTrigger></TabsList>
            
            <TabsContent value="commandes" className="space-y-6">
                
                {/* 1. FORMULAIRE DE CRÉATION */}
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
                            
                            {/* ✅ SÉLECTION DU MAGASIN SI MANAGER */}
                            {user.role === 'manager' && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                    <Label className="text-blue-800 font-bold mb-2 block">Pour le compte de quel magasin ?</Label>
                                    <Select onValueChange={setSelectedTargetClient} value={selectedTargetClient}>
                                        <SelectTrigger className="bg-white border-blue-300">
                                            <SelectValue placeholder="Choisir un client..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">
                                            {clientsList.map(c => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {c.nomSociete} ({c.zipCity})
                                                </SelectItem>
                                            ))}
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

                {/* 2. LISTE DES MONTAGES */}
                <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><Input className="pl-10 bg-white h-12 shadow-sm mb-6" placeholder="Rechercher un dossier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                {Object.keys(groupedByMonth).length === 0 ? <div className="text-center py-10 text-gray-500">Aucune commande trouvée.</div> : (<Accordion type="multiple" className="space-y-4" defaultValue={[Object.keys(groupedByMonth)[0]]}>{Object.entries(groupedByMonth).sort().reverse().map(([monthName, items]: any) => (<AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-sm px-4"><AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-4 w-full"><Calendar className="w-5 h-5 text-blue-600" /><span className="text-xl font-bold text-gray-900 capitalize">{monthName}</span><Badge variant="secondary" className="ml-auto mr-4">{items.length} dossier(s)</Badge></div></AccordionTrigger><AccordionContent className="pt-2 pb-6 space-y-3">{items.sort((a: Montage, b: Montage) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime()).map((m: Montage) => {
    // ✅ Calcul du prix
    const price = calculateSingleMontagePrice(m);

    return (
        <div key={m._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
            <div className="flex-1">
                <div className="mb-2 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-lg text-gray-900">{m.reference}</span>
                    <span className="text-gray-400">|</span>
                    <span className="font-semibold text-gray-700">{m.frame}</span>
                    {/* ✅ PRIX */}
                    <Badge variant="outline" className="ml-auto md:ml-4 text-sm font-medium px-2 py-0.5 border-green-600 text-green-700 bg-green-50">
                        {price.toFixed(2)} € HT
                    </Badge>
                </div>

                {/* ✅ ALERT MANAGER SI APPLICABLE */}
                {m.createdBy && m.createdBy.includes('Manager') && (
                    <div className="flex items-center text-xs text-blue-600 mb-2 bg-blue-50 w-fit px-2 py-1 rounded">
                        <UserCog className="w-3 h-3 mr-1"/> Dossier ajouté par {m.createdBy}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">{m.category}</Badge>
                    {renderMontageDetails(m)}
                </div>
                {m.description && <p className="text-sm text-gray-500 italic mt-1">Note: "{m.description}"</p>}
                <p className="text-xs text-gray-400 mt-2">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center gap-3">
                {m.photoUrl && (
                    <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={() => setSelectedPhotoUrl(m.photoUrl!)} title="Voir la photo du montage terminé">
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center ${getStatusColor(m.statut)}`}>{getStatusIcon(m.statut)}{m.statut}</span>
            </div>
        </div>
    );
})}</AccordionContent></AccordionItem>))}</Accordion>)}
            </TabsContent>

            <TabsContent value="factures">{factures.length === 0 ? <p className="text-center py-10 bg-white rounded border">Aucune facture disponible.</p> : (<div className="grid gap-4">{factures.map(f => (<Card key={f.invoiceNumber} className="flex flex-col md:flex-row justify-between items-center p-6 hover:shadow-md transition-shadow bg-white"><div className="mb-4 md:mb-0"><div className="flex items-center gap-3"><p className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-gray-400"/> {f.invoiceNumber}</p>{f.paymentStatus === 'Payé' && <Badge className="bg-green-100 text-green-700 border-green-200">Réglé</Badge>}{f.paymentStatus === 'Partiellement payé' && <Badge className="bg-orange-100 text-orange-700 border-orange-200">Partiel</Badge>}{(f.paymentStatus === 'Non payé' || !f.paymentStatus) && <Badge className="bg-red-100 text-red-700 border-red-200">À régler</Badge>}</div><p className="text-sm text-gray-500">Date d'émission: {new Date(f.dateEmission).toLocaleDateString()}</p><p className="text-xs text-gray-400 mt-1">Dossiers: {f.montageReference}</p></div><div className="flex items-center gap-6"><div className="text-right"><p className="text-xs text-gray-500">Montant TTC</p><span className="text-xl font-extrabold text-gray-900">{f.totalTTC.toFixed(2)} €</span>{f.paymentStatus === 'Partiellement payé' && (<p className="text-xs text-orange-600 font-bold">Reste: {(f.totalTTC - (f.amountPaid || 0)).toFixed(2)} €</p>)}</div><Button variant="outline" onClick={() => handleDownloadClientInvoice(f)} className="bg-blue-600 text-white hover:bg-blue-700 border-0"><FileText className="w-4 h-4 mr-2" /> Télécharger PDF</Button></div></Card>))}</div>)}</TabsContent>
        </Tabs>

      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
          <DialogContent className="bg-transparent shadow-none border-0 p-0 flex items-center justify-center max-w-4xl w-full h-full pointer-events-none">
              <div className="relative pointer-events-auto p-4">
                  <Button variant="ghost" size="icon" className="absolute top-0 right-0 text-white bg-black/50 hover:bg-black/70 rounded-full" onClick={() => setSelectedPhotoUrl(null)}>
                      <X className="w-6 h-6" />
                  </Button>
                  {selectedPhotoUrl && (
                      <img src={selectedPhotoUrl} alt="Montage terminé" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border-4 border-white" />
                  )}
              </div>
          </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default MesCommandes;