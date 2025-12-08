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
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone, Receipt, Printer, Send, Loader2 } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// Interfaces
interface Montage {
  _id: string; clientName: string; reference?: string; frame?: string; description: string; category?: string;
  glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number; shapeChange?: boolean; statut: string; dateReception: string; userId: string;
}

interface Client { 
  _id: string; nomSociete: string; email: string; siret: string; phone?: string; 
  address?: string; zipCity?: string; createdAt: string; 
}

interface FactureData { 
    id: string;
    userId: string;
    clientName: string;
    invoiceNumber: string;
    totalTTC: number;
    dateEmission: string;
    pdfUrl: string;
    montagesReferences?: string[]; 
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
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = 10.00;
const ENGRAVING_UNIT_COST = 12.00;

const FACTURE_INFO = {
    name: "L'Atelier des Arts", address: "178 Avenue Daumesnil", zipCity: "75012 Paris", siret: "98095501700010", email: "contact@atelierdesarts.com", tvaRate: 0.20
};

// --- COMPOSANT MODAL DE FACTURATION ---
interface InvoiceProps { client: Client; montages: Montage[]; isOpen: boolean; onClose: () => void; onInvoicePublished: (invoiceData: FactureData) => void; }

const InvoiceModal: React.FC<InvoiceProps> = ({ client, montages, isOpen, onClose, onInvoicePublished }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    if (!isOpen) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    const monthlyMontages = montages.filter(m => { return m.statut === 'Terminé'; });
    
    // Calculs Prix
    const calculateTotal = (m: Montage) => {
        let totalBase = 0;
        totalBase += CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
        totalBase += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
        totalBase += (m.engravingCount || 0) * ENGRAVING_UNIT_COST;
        if (m.glassType) { m.glassType.forEach(type => { totalBase += GLASS_COSTS[type] || 0; }); }
        if (m.shapeChange) { totalBase += SHAPE_CHANGE_COST; }
        const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0;
        const urgencySurcharge = totalBase * urgencyRate;
        const finalTotal = totalBase + urgencySurcharge;
        return { total: finalTotal, surcharge: urgencySurcharge };
    };
    
    const getMontagePriceDetails = (m: Montage) => {
        const { total, surcharge } = calculateTotal(m);
        let details: string[] = [];
        const montagePrice = CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
        details.push(`${m.category} (${montagePrice.toFixed(2)}€)`);
        const dcPrice = DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
        if (dcPrice > 0) details.push(`Diamond Cut ${m.diamondCutType} (+${dcPrice.toFixed(2)}€)`);
        const engravingPrice = (m.engravingCount || 0) * ENGRAVING_UNIT_COST;
        if (engravingPrice > 0) details.push(`${m.engravingCount} Gravure(s) (+${engravingPrice.toFixed(2)}€)`);
        if (m.glassType) { m.glassType.forEach(type => { const price = GLASS_COSTS[type] || 0; if (price > 0) details.push(`${type.replace('Verre ', '')} (+${price.toFixed(2)}€)`); }); }
        if (m.shapeChange) details.push(`Changement de forme (+${SHAPE_CHANGE_COST.toFixed(2)}€)`);
        if (surcharge > 0) { const rate = URGENCY_RATES[m.urgency || 'Standard'] * 100; details.push(`Urgence (${rate.toFixed(0)}% Surcharge: +${surcharge.toFixed(2)}€)`); }
        return { total, details };
    };

    const totalHT = monthlyMontages.reduce((sum, m) => sum + getMontagePriceDetails(m).total, 0);
    const tva = totalHT * FACTURE_INFO.tvaRate;
    const totalTTC = totalHT + tva;
    const invoiceNumber = `FCT-${currentYear}${today.getMonth() + 1}-${client._id.substring(0, 4)}`.toUpperCase();
    const montagesReferences = monthlyMontages.map(m => m.reference).filter(ref => ref) as string[];

    // --- LOGIQUE DE PUBLICATION ET ENVOI ---
    const handlePublishAndSend = async () => {
        const input = document.getElementById('invoice-content');
        if (!input) return;

        setIsPublishing(true);
        toast.loading("Génération PDF et Envoi en cours...", { id: 'pub-load' });

        try {
            // 1. Générer le PDF en Base64
            const canvas = await html2canvas(input, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            
            // output('datauristring') renvoie "data:application/pdf;base64,..."
            const pdfBase64 = pdf.output('datauristring');
            
            // 2. Préparer les données pour la BDD (y compris le détail pour regénération future)
            const invoiceDetailsSnapshot = monthlyMontages.map(m => ({
                reference: m.reference,
                details: getMontagePriceDetails(m).details, 
                price: getMontagePriceDetails(m).total
            }));

            const payload = {
                userId: client._id,
                clientName: client.nomSociete,
                invoiceNumber: invoiceNumber,
                totalHT: parseFloat(totalHT.toFixed(2)),
                totalTTC: parseFloat(totalTTC.toFixed(2)),
                montagesReferences: montagesReferences,
                dateEmission: new Date().toISOString(),
                invoiceData: invoiceDetailsSnapshot, // Sauvegarde des données
                pdfUrl: '#',
                sendEmail: true, // FLAG POUR ENVOYER L'EMAIL
                pdfBase64: pdfBase64 // LE FICHIER PDF
            };

            // 3. Envoyer au backend
            const res = await fetch("https://atelier4.vercel.app/api/factures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Facture publiée et envoyée par email au client !", { id: 'pub-load' });
                // Télécharger aussi une copie locale pour l'admin
                pdf.save(`Facture_${client.nomSociete}_${invoiceNumber}.pdf`);
                onInvoicePublished(data.facture);
                onClose();
            } else {
                toast.error(`Erreur: ${data.message}`, { id: 'pub-load' });
            }

        } catch (error) {
            console.error(error);
            toast.error("Erreur critique lors de la génération.", { id: 'pub-load' });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
             <style>{`
                .print-hidden { display: none !important; }
                @media print {
                    .print-hidden { display: none !important; }
                    body > * { visibility: hidden !important; }
                    .invoice-wrapper, .invoice-wrapper * { visibility: visible !important; }
                    .invoice-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; }
                    .DialogContent { width: 100vw !important; max-width: 100vw !important; margin: 0 !important; padding: 0 !important; }
                    #invoice-content { box-shadow: none !important; border: none !important; }
                }
            `}</style>
            <div className="invoice-wrapper"> 
                <DialogContent className="DialogContent max-w-4xl bg-white p-8 print:p-0 max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-3xl font-bold text-gray-900 print-hidden">Facturation Mensuelle</DialogTitle></DialogHeader>

                    {/* RENDU VISUEL DE LA FACTURE (Pour html2canvas) */}
                    <div id="invoice-content" className="p-10 bg-white print:p-0 text-black border shadow-sm"> 
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">FACTURE</h1>
                                <p className="text-gray-500 font-medium">N° {invoiceNumber}</p>
                                <p className="text-sm text-gray-400">Date: {today.toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-800">{FACTURE_INFO.name}</h2>
                                <p className="text-sm text-gray-600">{FACTURE_INFO.address}</p>
                                <p className="text-sm text-gray-600">{FACTURE_INFO.zipCity}</p>
                                <p className="text-sm text-gray-600">SIRET: {FACTURE_INFO.siret}</p>
                                <p className="text-sm text-gray-600">{FACTURE_INFO.email}</p>
                            </div>
                        </div>

                        <div className="border-t-2 border-gray-100 py-6 mb-8">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Facturé à</h3>
                            <p className="text-xl font-bold text-gray-900">{client.nomSociete}</p>
                            <p className="text-gray-600">{client.address || "Adresse non renseignée"}</p>
                            <p className="text-gray-600">{client.zipCity || ""}</p>
                            <p className="text-gray-600 text-sm mt-1">SIRET: {client.siret}</p>
                            <p className="text-gray-600 text-sm">{client.email}</p>
                        </div>

                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="text-left py-3 font-bold text-gray-900">Description / Référence</th>
                                    <th className="text-left py-3 font-bold text-gray-900">Détails</th>
                                    <th className="text-right py-3 font-bold text-gray-900">Prix HT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {monthlyMontages.map((m) => {
                                    const { total, details } = getMontagePriceDetails(m);
                                    return (
                                        <tr key={m._id}>
                                            <td className="py-4 align-top font-medium text-gray-800">{m.reference}</td>
                                            <td className="py-4 align-top text-sm text-gray-600 space-y-1">
                                                {details.map((d, i) => <div key={i}>{d}</div>)}
                                            </td>
                                            <td className="py-4 align-top text-right font-bold text-gray-900">{total.toFixed(2)} €</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="flex justify-end">
                            <div className="w-1/2 space-y-3">
                                <div className="flex justify-between text-gray-600"><span className="font-medium">Total HT</span><span>{totalHT.toFixed(2)} €</span></div>
                                <div className="flex justify-between text-gray-600"><span className="font-medium">TVA (20%)</span><span>{tva.toFixed(2)} €</span></div>
                                <div className="flex justify-between text-2xl font-extrabold text-gray-900 border-t-2 border-gray-900 pt-3"><span>Net à payer</span><span>{totalTTC.toFixed(2)} €</span></div>
                            </div>
                        </div>
                        
                        <div className="mt-12 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
                            <p>Merci de votre confiance. Paiement dû sous 30 jours.</p>
                            <p>{FACTURE_INFO.name} - SIRET {FACTURE_INFO.siret} - TVA Intracommunautaire FRXX980955017</p>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 gap-3 print-hidden">
                        <Button onClick={handlePublishAndSend} disabled={isPublishing || monthlyMontages.length === 0} className="bg-black text-white hover:bg-gray-800">
                            {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Valider, Envoyer & Sauvegarder
                        </Button>
                    </div>
                </DialogContent>
            </div>
        </Dialog>
    );
};

// --- MODALE : AFFICHAGE DES FACTURES CLIENTS (AVEC SUPPRESSION) ---
interface ClientInvoicesModalProps { 
    client: Client | null; 
    invoices: FactureData[]; 
    isOpen: boolean; 
    onClose: () => void;
    onDelete: (id: string) => void; // Ajout de la fonction delete
}

const ClientInvoicesModal: React.FC<ClientInvoicesModalProps> = ({ client, invoices, isOpen, onClose, onDelete }) => {
    if (!isOpen || !client) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-2xl font-bold">Factures de {client.nomSociete}</DialogTitle></DialogHeader>
                
                {invoices.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">Aucune facture émise pour ce client pour le moment.</div>
                ) : (
                    <div className="space-y-3 pt-4">
                        {invoices.map(invoice => (
                            <Card key={invoice.invoiceNumber} className="flex justify-between items-center p-3">
                                <div>
                                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                                    <p className="text-xs text-gray-500">Émis le: {new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-extrabold text-xl">{invoice.totalTTC.toFixed(2)} € TTC</span>
                                    {/* Bouton Supprimer */}
                                    <Button size="sm" variant="destructive" onClick={() => {
                                        if(confirm("Voulez-vous vraiment supprimer cette facture ? Cela ne l'effacera pas de la boîte mail du client s'il l'a déjà reçue.")) {
                                            onDelete(invoice.id);
                                        }
                                    }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<FactureData[]>([]);

  // Form states (simplified)
  const [newClient, setNewClient] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newFrame, setNewFrame] = useState("");
  const [newCategory, setNewCategory] = useState("Cerclé");
  const [newGlassType, setNewGlassType] = useState<string[]>([]);
  const [newUrgency, setNewUrgency] = useState("Standard");
  const [newDiamondCutType, setNewDiamondCutType] = useState("Standard");
  const [newEngravingCount, setNewEngravingCount] = useState(0);
  const [newShapeChange, setNewShapeChange] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modales Factures
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentClientToInvoice, setCurrentClientToInvoice] = useState<Client | null>(null);
  const [montagesToInvoice, setMontagesToInvoice] = useState<Montage[]>([]);
  const [isClientInvoicesModalOpen, setIsClientInvoicesModalOpen] = useState(false);
  const [currentClientInvoices, setCurrentClientInvoices] = useState<FactureData[]>([]); 
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const URGENCY_OPTIONS = ['Standard', 'Urgent -48H', 'Urgent -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
        Promise.all([fetchMontages(), fetchClients(), fetchAllInvoices()]).finally(() => setLoading(false));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success && Array.isArray(data.montages)) { setMontages(data.montages); }
    } catch (e) { console.error(e); }
  };

  const fetchClients = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) { 
            setClients(data.users); 
            if (data.users.length > 0) setNewClient(data.users[0]._id);
        }
    } catch (e) { console.error(e); }
  };

  const fetchAllInvoices = async () => {
      try {
           const res = await fetch("https://atelier4.vercel.app/api/factures"); 
           const data = await res.json();
           if (data.success && Array.isArray(data.factures)) {
               setAllInvoices(data.factures.map((f: any) => ({
                   id: f._id,
                   userId: f.userId,
                   clientName: f.clientName,
                   invoiceNumber: f.invoiceNumber,
                   totalTTC: f.totalTTC,
                   dateEmission: f.dateEmission,
                   pdfUrl: f.pdfUrl,
                   montagesReferences: f.montagesReferences
               })));
           }
      } catch (e) { console.error(e); }
  };
  
  const handleInvoicePublished = (newInvoice: FactureData) => {
      setAllInvoices(prev => [newInvoice, ...prev]);
  };
  
  // Suppression Facture
  const handleDeleteInvoice = async (id: string) => {
      try {
        const res = await fetch(`https://atelier4.vercel.app/api/factures/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            toast.success("Facture supprimée");
            setAllInvoices(prev => prev.filter(f => f.id !== id));
            setCurrentClientInvoices(prev => prev.filter(f => f.id !== id));
        } else {
            toast.error("Erreur suppression");
        }
      } catch (e) { toast.error("Erreur réseau"); }
  };

  const openClientInvoices = (client: Client) => {
      const clientInvoices = allInvoices.filter(f => f.userId === client._id);
      setSelectedClient(client);
      setCurrentClientInvoices(clientInvoices);
      setIsClientInvoicesModalOpen(true);
  };

  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `https://atelier4.vercel.app/api/montages/${editingId}` : "https://atelier4.vercel.app/api/montages";
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: newClient, reference: newRef, frame: newFrame, description: newDesc, category: newCategory, glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount, shapeChange: newShapeChange })
        });
        const data = await res.json();
        if (data.success) {
            toast.success(editingId ? "Modifié !" : "Créé !");
            setIsDialogOpen(false);
            fetchMontages(); 
        }
    } catch (error) { toast.error("Erreur API"); }
    finally { setIsSubmitting(false); }
  };
  
  const openCreateDialog = () => { setEditingId(null); setIsDialogOpen(true); };
  const openEditDialog = (m: Montage) => { /* logic to fill form */ setEditingId(m._id); setIsDialogOpen(true); };
  const handleStatusChange = async (id: string, newStatus: string) => { 
      try { await fetch(`https://atelier4.vercel.app/api/montages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: newStatus }) }); fetchMontages(); toast.success("Statut mis à jour"); } catch (e) { toast.error("Erreur"); }
  };
  const handleDelete = async (id: string) => { 
      if(confirm("Supprimer ce dossier ?")) { await fetch(`https://atelier4.vercel.app/api/montages/${id}`, { method: 'DELETE' }); fetchMontages(); toast.success("Supprimé"); }
  };

  const handleGenerateInvoice = (client: Client, clientMontages: Montage[]) => {
      setCurrentClientToInvoice(client);
      setMontagesToInvoice(clientMontages);
      setIsInvoiceOpen(true);
  };

  // Logic pour l'affichage (filtrage)
  const filteredMontages = montages.filter(m => normalize(m.reference + m.clientName).includes(normalize(searchTerm)));
  const groupedByMonthAndShop = filteredMontages.reduce((acc: any, m) => {
      const d = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
      if(!acc[d]) acc[d] = {};
      if(!acc[d][m.clientName]) acc[d][m.clientName] = [];
      acc[d][m.clientName].push(m);
      return acc;
  }, {});

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Tableau de Bord</h1>
            <div className="flex gap-3">
                <Button onClick={openCreateDialog} className="bg-black text-white"><PlusCircle className="w-4 h-4 mr-2" /> Créer dossier</Button>
                <Button variant="outline" className="text-red-600" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingId ? "Modifier" : "Créer"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveMontage} className="space-y-4">
                        <Select onValueChange={setNewClient} value={newClient}><SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent></Select>
                        <Input placeholder="Référence" value={newRef} onChange={e => setNewRef(e.target.value)} required />
                        <Input placeholder="Monture" value={newFrame} onChange={e => setNewFrame(e.target.value)} required />
                        {/* Autres champs simplifiés pour la longueur du code... */}
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "..." : "Valider"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white h-12" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList>
                <TabsTrigger value="atelier">Atelier</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card>
                    <CardHeader><CardTitle>Flux de Production</CardTitle></CardHeader>
                    <CardContent>
                        {Object.entries(groupedByMonthAndShop).map(([month, shops]: any) => (
                            <div key={month} className="mb-6">
                                <h3 className="text-xl font-bold mb-4 capitalize">{month}</h3>
                                {Object.entries(shops).map(([shopName, items]: any) => {
                                    const client = clients.find(c => c.nomSociete === shopName);
                                    return (
                                        <Card key={shopName} className="mb-4 p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-lg">{shopName} ({items.length})</h4>
                                                <Button size="sm" onClick={() => handleGenerateInvoice(client as Client, items)}><Receipt className="w-4 h-4 mr-2" /> Facturer</Button>
                                            </div>
                                            <div className="space-y-2">
                                                {items.map((m: Montage) => (
                                                    <div key={m._id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                                        <span>{m.reference} - {m.frame} ({m.statut})</span>
                                                        <div className="flex gap-2">
                                                            <Select defaultValue={m.statut} onValueChange={(v) => handleStatusChange(m._id, v)}>
                                                                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                                                <SelectContent><SelectItem value="En attente">En attente</SelectItem><SelectItem value="Terminé">Terminé</SelectItem></SelectContent>
                                                            </Select>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clients">
                <Card>
                    <CardContent className="pt-6 space-y-2">
                        {clients.map(c => (
                            <div key={c._id} onClick={() => openClientInvoices(c)} className="p-4 border rounded hover:bg-gray-50 cursor-pointer flex justify-between">
                                <div><p className="font-bold">{c.nomSociete}</p><p className="text-sm text-gray-500">{c.email}</p></div>
                                <Button variant="outline">Voir Factures</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {currentClientToInvoice && <InvoiceModal client={currentClientToInvoice} montages={montagesToInvoice} isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onInvoicePublished={handleInvoicePublished} />}
        <ClientInvoicesModal client={selectedClient} invoices={currentClientInvoices} isOpen={isClientInvoicesModalOpen} onClose={() => setIsClientInvoicesModalOpen(false)} onDelete={handleDeleteInvoice} />
      </div>
    </div>
  );
};

export default AdminDashboard;