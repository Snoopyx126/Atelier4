import React, { useEffect, useState, useRef } from 'react';
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
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone, Receipt, Printer, Send, Loader2, CreditCard, Camera, Image as ImageIcon, X, Store } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// --- INTERFACES ---
interface Montage {
  _id: string; clientName: string; reference?: string; frame?: string; description: string; category?: string;
  glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number; shapeChange?: boolean; statut: string; dateReception: string; userId: string;
  photoUrl?: string; createdBy?: string;
}

interface Client { 
  _id: string; nomSociete: string; email: string; siret: string; phone?: string; 
  address?: string; zipCity?: string; createdAt: string; 
  isVerified?: boolean; role: string; assignedShops?: any[];
  pricingTier?: 1 | 2;
}

interface FactureData { 
    id: string; userId: string; clientName: string; invoiceNumber: string; totalTTC: number; dateEmission: string; pdfUrl: string; montagesReferences?: string[]; amountPaid?: number; paymentStatus?: string; 
}

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const CATEGORY_COSTS: Record<string, { 1: number, 2: number }> = { 
    'Cerclé': { 1: 7.00, 2: 3.60 }, // Exemple: Tarif 2 moins cher
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

// Pour l'urgence, c'est souvent un pourcentage, on peut garder un seul taux ou le doubler aussi
const URGENCY_RATES: Record<string, number> = { 
    'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 
};

const SHAPE_CHANGE_COST = { 1: 10.00, 2: 8.00 };
const ENGRAVING_UNIT_COST = { 1: 12.00, 2: 10.00 };const SHAPE_CHANGE_COST = 10.00;
const ENGRAVING_UNIT_COST = 12.00;
const FACTURE_INFO = {
    name: "L'Atelier des Arts", address: "178 Avenue Daumesnil", zipCity: "75012 Paris", siret: "98095501700010", email: "contact@atelierdesarts.com", tvaRate: 0.20
};

const calculateSingleMontagePrice = (m: Montage, tier: 1 | 2 = 1): number => {
    let totalBase = 0;
    
    // On accède au prix via [tier]
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

interface InvoiceProps { client: Client; montages: Montage[]; isOpen: boolean; onClose: () => void; onInvoicePublished: (invoiceData: FactureData) => void; }
const InvoiceModal: React.FC<InvoiceProps> = ({ client, montages, isOpen, onClose, onInvoicePublished }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    if (!isOpen) return null;
    const today = new Date();
    const currentYear = today.getFullYear();
    const monthlyMontages = montages.filter(m => { return m.statut === 'Terminé'; });
    const getMontagePriceDetails = (m: Montage) => {
        let totalBase = 0; let details: string[] = [];
        const montagePrice = CATEGORY_COSTS[m.category || 'Cerclé'] || 0; totalBase += montagePrice; details.push(`${m.category} (${montagePrice.toFixed(2)}€)`);
        const dcPrice = DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0; if (dcPrice > 0) { totalBase += dcPrice; details.push(`Diamond Cut ${m.diamondCutType} (+${dcPrice.toFixed(2)}€)`); }
        const engravingPrice = (m.engravingCount || 0) * ENGRAVING_UNIT_COST; if (engravingPrice > 0) { totalBase += engravingPrice; details.push(`${m.engravingCount} Gravure(s) (+${engravingPrice.toFixed(2)}€)`); }
        if (m.glassType) { m.glassType.forEach(type => { const price = GLASS_COSTS[type] || 0; if (price > 0) { totalBase += price; details.push(`${type.replace('Verre ', '')} (+${price.toFixed(2)}€)`); } }); }
        if (m.shapeChange) { totalBase += SHAPE_CHANGE_COST; details.push(`Changement de forme (+${SHAPE_CHANGE_COST.toFixed(2)}€)`); }
        const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0; const surcharge = totalBase * urgencyRate;
        if (surcharge > 0) { const rate = urgencyRate * 100; details.push(`Urgence (${rate.toFixed(0)}% Surcharge: +${surcharge.toFixed(2)}€)`); }
        const finalTotal = totalBase + surcharge;
        return { total: finalTotal, details };
    };
    const totalHT = monthlyMontages.reduce((sum, m) => sum + getMontagePriceDetails(m).total, 0); const tva = totalHT * FACTURE_INFO.tvaRate; const totalTTC = totalHT + tva;
    const invoiceNumber = `FCT-${currentYear}${today.getMonth() + 1}-${client._id.substring(0, 4)}`.toUpperCase();
    const montagesReferences = monthlyMontages.map(m => m.reference).filter(ref => ref) as string[];

    const handlePublishAndSend = async () => {
        const input = document.getElementById('invoice-content'); if (!input) { toast.error("Erreur PDF"); return; } setIsPublishing(true);
        try {
            const canvas = await html2canvas(input, { scale: 1.5, useCORS: true }); const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width); const pdfBase64 = pdf.output('datauristring');
            const invoiceDetailsSnapshot = monthlyMontages.map(m => ({ reference: m.reference, details: getMontagePriceDetails(m).details, price: getMontagePriceDetails(m).total }));
            const payload = { userId: client._id, clientName: client.nomSociete, invoiceNumber: invoiceNumber, totalHT: parseFloat(totalHT.toFixed(2)), totalTTC: parseFloat(totalTTC.toFixed(2)), montagesReferences: montagesReferences, dateEmission: new Date().toISOString(), invoiceData: invoiceDetailsSnapshot, pdfUrl: '#', sendEmail: true, pdfBase64: pdfBase64 };
            const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
            const res = await fetch(`${baseUrl}/api/factures`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) { toast.success("Facture envoyée !"); pdf.save(`Facture_${client.nomSociete}_${invoiceNumber}.pdf`); onInvoicePublished(data.facture); onClose(); }
        } catch (error) { toast.error("Erreur technique."); } finally { setIsPublishing(false); }
    };
    return ( <Dialog open={isOpen} onOpenChange={onClose}> <style>{`@media print { .print-hidden { display: none !important; } body > * { visibility: hidden !important; } .invoice-wrapper, .invoice-wrapper * { visibility: visible !important; } .invoice-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; } .DialogContent { width: 100vw !important; max-width: 100vw !important; margin: 0 !important; padding: 0 !important; } #invoice-content { box-shadow: none !important; border: none !important; } }`}</style> <div className="invoice-wrapper"> <DialogContent className="DialogContent max-w-4xl bg-white p-0 overflow-hidden flex flex-col max-h-[95vh]"> <DialogHeader className="p-6 border-b print-hidden"><DialogTitle>Facturation</DialogTitle></DialogHeader> <div className="overflow-y-auto p-6 bg-gray-50 flex-grow"> <div id="invoice-content" className="p-10 bg-white text-black border shadow-sm mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between"> <div> <div className="flex justify-between items-start mb-10"><div><h1 className="text-4xl font-extrabold text-gray-900 mb-2">FACTURE</h1><p className="text-gray-500 font-medium">N° {invoiceNumber}</p><p className="text-sm text-gray-400">Date: {today.toLocaleDateString('fr-FR')}</p></div><div className="text-right"><h2 className="text-xl font-bold text-gray-800">{FACTURE_INFO.name}</h2><p className="text-sm text-gray-600">{FACTURE_INFO.address}</p><p className="text-sm text-gray-600">{FACTURE_INFO.zipCity}</p><p className="text-sm text-gray-600">SIRET: {FACTURE_INFO.siret}</p></div></div> <div className="border-t-2 border-gray-100 py-6 mb-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Facturé à</h3><p className="text-xl font-bold text-gray-900">{client.nomSociete}</p><p className="text-gray-600">{client.address}</p><p className="text-gray-600">{client.zipCity}</p><p className="text-gray-600 text-sm mt-1">SIRET: {client.siret}</p></div> <table className="w-full mb-8"><thead><tr className="border-b-2 border-gray-800"><th className="text-left py-3 font-bold text-gray-900">Description</th><th className="text-left py-3 font-bold text-gray-900">Détails</th><th className="text-right py-3 font-bold text-gray-900">Prix HT</th></tr></thead><tbody className="divide-y divide-gray-200">{monthlyMontages.map((m) => { const { total, details } = getMontagePriceDetails(m); return (<tr key={m._id}><td className="py-4 align-top font-medium text-gray-800">{m.reference}</td><td className="py-4 align-top text-sm text-gray-600">{details.map((d, i) => <div key={i}>{d}</div>)}</td><td className="py-4 align-top text-right font-bold text-gray-900">{total.toFixed(2)} €</td></tr>); })}</tbody></table> </div> <div> <div className="flex justify-between items-end mb-8"><div className="bg-gray-50 border border-gray-200 p-4 rounded-lg w-1/2 mr-8"><h4 className="font-bold text-sm text-gray-900 mb-2">BANQUE</h4><div className="text-xs text-gray-600 space-y-1"><p>IBAN : FR76 1820 6002 0065 1045 3419 297</p><p>BIC : AGRIFRPP882</p></div></div><div className="w-1/3 space-y-3"><div className="flex justify-between text-gray-600"><span className="font-medium">Total HT</span><span>{totalHT.toFixed(2)} €</span></div><div className="flex justify-between text-gray-600"><span className="font-medium">TVA (20%)</span><span>{tva.toFixed(2)} €</span></div><div className="flex justify-between text-2xl font-extrabold text-gray-900 border-t-2 border-gray-900 pt-3"><span>Net à payer</span><span>{totalTTC.toFixed(2)} €</span></div></div></div> </div> </div> </div> <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 print-hidden"><Button variant="outline" onClick={onClose} disabled={isPublishing}>Annuler</Button><Button onClick={handlePublishAndSend} disabled={isPublishing || monthlyMontages.length === 0} className="bg-black text-white hover:bg-gray-800">Envoyer</Button></div> </DialogContent> </div> </Dialog> );
};

interface ClientInvoicesModalProps { client: Client | null; invoices: FactureData[]; isOpen: boolean; onClose: () => void; onDelete: (id: string) => void; onPaymentUpdate: (id: string, amount: number) => void; }
const ClientInvoicesModal: React.FC<ClientInvoicesModalProps> = ({ client, invoices, isOpen, onClose, onDelete, onPaymentUpdate }) => {
    const [payInvoice, setPayInvoice] = useState<FactureData | null>(null); const [amountInput, setAmountInput] = useState<number>(0);
    const openPayment = (inv: FactureData) => { setPayInvoice(inv); setAmountInput(inv.amountPaid || 0); };
    const submitPayment = () => { if(payInvoice) { onPaymentUpdate(payInvoice.id, amountInput); setPayInvoice(null); } };
    const getStatusBadge = (status: string | undefined, remaining: number) => { if(status === 'Payé') return <Badge className="bg-green-100 text-green-700 border-green-200">Payé</Badge>; if(status === 'Partiellement payé') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Reste: {remaining.toFixed(2)} €</Badge>; return <Badge className="bg-red-100 text-red-700 border-red-200">Non payé</Badge>; };
    if (!isOpen || !client) return null;
    return ( <Dialog open={isOpen} onOpenChange={onClose}> <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Factures : {client.nomSociete}</DialogTitle></DialogHeader>{invoices.length === 0 ? <div className="text-center py-10 text-gray-500">Aucune facture.</div> : (<div className="space-y-3 pt-4">{invoices.map(inv => { const paid = inv.amountPaid || 0; const remaining = inv.totalTTC - paid; return (<Card key={inv.id} className="flex flex-col md:flex-row justify-between items-center p-4 gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><p className="font-semibold">{inv.invoiceNumber}</p>{getStatusBadge(inv.paymentStatus, remaining)}</div><p className="text-xs text-gray-500">{new Date(inv.dateEmission).toLocaleDateString()}</p></div><div className="flex items-center gap-4"><div className="text-right"><div className="font-bold text-lg">{inv.totalTTC.toFixed(2)} €</div>{paid > 0 && paid < inv.totalTTC && <div className="text-xs text-gray-400">Déjà payé: {paid.toFixed(2)} €</div>}</div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openPayment(inv)}><CreditCard className="w-4 h-4" /></Button><Button size="sm" variant="destructive" onClick={() => { if(confirm("Supprimer ?")) onDelete(inv.id); }}><Trash2 className="w-4 h-4" /></Button></div></div></Card>); })}</div>)}</DialogContent> {payInvoice && (<Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}><DialogContent className="max-w-sm bg-white"><DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader><div className="space-y-4 py-4"><p className="text-sm text-gray-600">Facture {payInvoice.invoiceNumber} <br/> Total: <strong>{payInvoice.totalTTC.toFixed(2)} €</strong></p><div className="space-y-2"><Label>Montant total réglé à ce jour (€)</Label><Input type="number" step="0.01" value={amountInput} onChange={e => setAmountInput(parseFloat(e.target.value))} /><div className="flex gap-2 text-xs"><Button size="sm" variant="outline" onClick={() => setAmountInput(payInvoice.totalTTC)}>Tout régler</Button></div></div><Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={submitPayment}>Valider</Button></div></DialogContent></Dialog>)} </Dialog> );
};

// --- DASHBOARD PRINCIPAL ---
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<FactureData[]>([]);
  
  // États formulaire création montage
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

  // Modales Factures & Photo
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentClientToInvoice, setCurrentClientToInvoice] = useState<Client | null>(null);
  const [montagesToInvoice, setMontagesToInvoice] = useState<Montage[]>([]);
  const [isClientInvoicesModalOpen, setIsClientInvoicesModalOpen] = useState(false);
  const [currentClientInvoices, setCurrentClientInvoices] = useState<FactureData[]>([]); 
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ✅ MODALE GESTION MAGASINS (MANAGER)
  const [isShopAssignOpen, setIsShopAssignOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Client | null>(null);
  const [tempAssignedShops, setTempAssignedShops] = useState<string[]>([]);

  const URGENCY_OPTIONS = ['Standard', 'Prioritaire -48H', 'Express -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 Dégradé saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
        Promise.all([fetch(`${baseUrl}/api/montages?role=admin`).then(r => r.json()), fetch(`${baseUrl}/api/users`).then(r => r.json()), fetch(`${baseUrl}/api/factures`).then(r => r.json())]).then(([mData, cData, iData]) => {
            if (mData.success) setMontages(mData.montages);
            if (cData.success) { setClients(cData.users); if(cData.users.length) setNewClient(cData.users[0]._id); }
            if (iData.success) { setAllInvoices(iData.factures.map((f: any) => ({ id: f._id, userId: f.userId, clientName: f.clientName, invoiceNumber: f.invoiceNumber, totalTTC: f.totalTTC, dateEmission: f.dateEmission, pdfUrl: f.pdfUrl, montagesReferences: f.montagesReferences, amountPaid: f.amountPaid, paymentStatus: f.paymentStatus }))); }
            setLoading(false);
        }).catch(e => console.error(e));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; const res = await fetch(`${baseUrl}/api/montages?role=admin`); const data = await res.json(); if (data.success) setMontages(data.montages); };
  const handleDeleteInvoice = async (id: string) => { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; const res = await fetch(`${baseUrl}/api/factures/${id}`, { method: 'DELETE' }); const data = await res.json(); if(data.success) { toast.success("Facture supprimée"); setAllInvoices(prev => prev.filter(f => f.id !== id)); setCurrentClientInvoices(prev => prev.filter(f => f.id !== id)); } else toast.error("Erreur suppression"); };
  const handlePaymentUpdate = async (id: string, amount: number) => { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; try { const res = await fetch(`${baseUrl}/api/factures/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaid: amount }) }); const data = await res.json(); if (data.success) { toast.success("Paiement mis à jour !"); const updatedInv = data.facture; setAllInvoices(prev => prev.map(f => f.id === id ? { ...f, amountPaid: updatedInv.amountPaid, paymentStatus: updatedInv.paymentStatus } : f)); setCurrentClientInvoices(prev => prev.map(f => f.id === id ? { ...f, amountPaid: updatedInv.amountPaid, paymentStatus: updatedInv.paymentStatus } : f)); } } catch (e) { toast.error("Erreur mise à jour paiement"); } };

  const handlePhotoUpload = async (montageId: string, file: File) => {
      if (!file || file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) { toast.error("Image invalide (Max 5MB)"); return; }
      const formData = new FormData(); formData.append('photo', file); toast.loading("Envoi...", { id: 'photo-upload' });
      try {
          const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
          const res = await fetch(`${baseUrl}/api/montages/${montageId}/photo`, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) { toast.success("Photo ajoutée !", { id: 'photo-upload' }); setMontages(prev => prev.map(m => m._id === montageId ? { ...m, photoUrl: data.montage.photoUrl } : m)); } 
          else { toast.error(`Erreur: ${data.message}`, { id: 'photo-upload' }); }
      } catch (error) { toast.error("Erreur connexion.", { id: 'photo-upload' }); }
  };

  const handleSaveMontage = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; const method = editingId ? "PUT" : "POST"; const url = editingId ? `${baseUrl}/api/montages/${editingId}` : `${baseUrl}/api/montages`; try { const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: newClient, reference: newRef, frame: newFrame, description: newDesc, category: newCategory, glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount, shapeChange: newShapeChange, createdBy: "Admin" }) }); const data = await res.json(); if (data.success) { toast.success(editingId ? "Modifié !" : "Créé !"); setIsDialogOpen(false); fetchMontages(); } } catch (error) { toast.error("Erreur API"); } finally { setIsSubmitting(false); } };
  const openCreateDialog = () => { setEditingId(null); setNewRef(""); setNewFrame(""); setNewCategory("Cerclé"); setNewGlassType([]); setNewUrgency("Standard"); setNewDiamondCutType("Standard"); setNewEngravingCount(0); setNewShapeChange(false); setNewDesc(""); setIsDialogOpen(true); };
  const openEditDialog = (m: Montage) => { setEditingId(m._id); setNewRef(m.reference||""); setNewFrame(m.frame||""); setNewCategory(m.category||"Cerclé"); setNewGlassType(m.glassType||[]); setNewUrgency(m.urgency||"Standard"); setNewDiamondCutType(m.diamondCutType||"Standard"); setNewEngravingCount(m.engravingCount||0); setNewShapeChange(m.shapeChange||false); setNewDesc(m.description||""); setIsDialogOpen(true); };
  const handleStatusChange = async (id: string, newStatus: string) => { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; await fetch(`${baseUrl}/api/montages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: newStatus }) }); fetchMontages(); toast.success(`Statut: ${newStatus}`); };
  const handleDelete = async (id: string) => { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; if(confirm("Supprimer ?")) { await fetch(`${baseUrl}/api/montages/${id}`, { method: 'DELETE' }); fetchMontages(); toast.success("Supprimé"); } };
  const handleGenerateInvoice = (client: Client, items: Montage[]) => { setCurrentClientToInvoice(client); setMontagesToInvoice(items); setIsInvoiceOpen(true); };
  const handleInvoicePublished = (newInvoice: FactureData) => { setAllInvoices(prev => [newInvoice, ...prev]); };
  const openClientInvoices = (client: Client) => { setSelectedClient(client); setCurrentClientInvoices(allInvoices.filter(f => f.userId === client._id)); setIsClientInvoicesModalOpen(true); };
  const handleGlassTypeChange = (type: string, checked: boolean) => { setNewGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type)); };
  const getStatusColor = (statut: string) => { if(statut==='Terminé') return 'border-green-500'; if(statut==='En cours') return 'border-orange-500'; if(statut==='Reçu') return 'border-blue-500'; return 'border-gray-300'; };
  const renderMontageDetails = (m: Montage) => ( <div className="flex flex-wrap items-center gap-2">{m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}{m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}{m.engravingCount && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}{m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)} {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}</div>);

  // ✅ OUVERTURE MODALE MANAGER
  const openShopAssign = (manager: Client) => {
      setSelectedManager(manager);
      // On récupère les IDs des magasins déjà assignés
      const existingIds = manager.assignedShops?.map((s: any) => typeof s === 'string' ? s : s._id) || [];
      setTempAssignedShops(existingIds);
      setIsShopAssignOpen(true);
  };
  
  // ✅ SAUVEGARDE ASSIGNATION MAGASINS
  const saveAssignedShops = async () => {
      if (!selectedManager) return;
      try {
          const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
          const res = await fetch(`${baseUrl}/api/users/${selectedManager._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignedShops: tempAssignedShops }) // Envoi du tableau d'IDs
          });
          const data = await res.json();
          if (data.success) {
              toast.success("Magasins assignés !");
              // Mise à jour locale
              setClients(prev => prev.map(c => c._id === selectedManager._id ? { ...c, assignedShops: data.user.assignedShops } : c));
              setIsShopAssignOpen(false);
          } else { toast.error("Erreur sauvegarde."); }
      } catch (e) { toast.error("Erreur technique."); }
  };

  // ✅ FONCTION EXPORT CSV
  const handleExportCSV = () => {
    const headers = ["Date Reception", "Client", "Reference", "Monture", "Categorie", "Statut", "Prix HT", "Cree Par"];
    const csvContent = [
      headers.join(";"),
      ...montages.map(m => {
        const clientName = m.clientName || clients.find(c => c._id === m.userId)?.nomSociete || "Inconnu";
        const price = calculateSingleMontagePrice(m).toFixed(2);
        return [
          new Date(m.dateReception).toLocaleDateString(),
          `"${clientName}"`,
          `"${m.reference}"`,
          `"${m.frame}"`,
          m.category,
          m.statut,
          price.replace('.', ','),
          `"${m.createdBy || 'Client'}"`
        ].join(";");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_atelier_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMontages = montages.filter(m => normalize(m.reference + m.clientName).includes(normalize(searchTerm)));
  const groupedByMonthAndShop = filteredMontages.reduce((acc: any, m) => { const d = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}); if(!acc[d]) acc[d] = {}; if(!acc[d][m.clientName]) acc[d][m.clientName] = []; acc[d][m.clientName].push(m); return acc; }, {});
  const filteredClients = clients.filter(c => normalize(c.nomSociete).includes(normalize(searchTerm)));
  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1><p className="text-gray-500">Gestion de l'atelier et suivi de production.</p></div>
            <div className="flex gap-3">
                {/* ✅ BOUTON EXPORT CSV */}
                <Button variant="outline" onClick={handleExportCSV} className="bg-white gap-2 border-gray-300 hover:bg-gray-50">
                    <FileText className="w-4 h-4" /> Export CSV
                </Button>

                <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2"><PlusCircle className="w-4 h-4" /> Créer un dossier</Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="max-w-3xl bg-white"><DialogHeader><DialogTitle>{editingId ? "Modifier" : "Ajouter"}</DialogTitle></DialogHeader><form onSubmit={handleSaveMontage} className="space-y-4 pt-4"><div className="grid grid-cols-3 gap-4"><div className="col-span-3"><Label>Client</Label><Select onValueChange={setNewClient} value={newClient}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{clients.map(c=><SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent></Select></div><div><Label>Réf.</Label><Input value={newRef} onChange={e=>setNewRef(e.target.value)} required className="bg-white"/></div><div><Label>Monture</Label><Input value={newFrame} onChange={e=>setNewFrame(e.target.value)} required className="bg-white"/></div><div><Label>Urgence</Label><Select onValueChange={setNewUrgency} value={newUrgency}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div></div><hr/><div className="grid grid-cols-3 gap-4"><div><Label>Type</Label><Select onValueChange={setNewCategory} value={newCategory}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent></Select></div><div><Label>Diamond Cut</Label><Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div><div><Label>Gravure</Label><Input type="number" value={newEngravingCount} onChange={e=>setNewEngravingCount(parseInt(e.target.value))} className="bg-white"/></div></div><div className="flex gap-4">{GLASS_OPTIONS.map(o=><div key={o} className="flex items-center gap-2"><Checkbox checked={newGlassType.includes(o)} onCheckedChange={(c)=>handleGlassTypeChange(o, c as boolean)}/><label>{o}</label></div>)}</div><Button type="submit" className="w-full">{editingId?"Modifier":"Créer"}</Button></form></DialogContent></Dialog>
                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><Card className="shadow-sm border-l-4 border-l-red-500"><CardHeader><CardTitle>À traiter</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent></Card><Card className="shadow-sm border-l-4 border-l-blue-500"><CardHeader><CardTitle>En Production</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inProgressCount}</div></CardContent></Card><Card className="shadow-sm border-l-4 border-l-green-500"><CardHeader><CardTitle>Clients</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent></Card></div>
        <div className="mb-6 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

        <Tabs defaultValue="atelier" className="space-y-6"><TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto"><TabsTrigger value="atelier" className="px-6 py-2"><Glasses className="w-4 h-4 mr-2" /> Atelier ({filteredMontages.length})</TabsTrigger><TabsTrigger value="clients" className="px-6 py-2"><Users className="w-4 h-4 mr-2" /> Fiches Clients ({filteredClients.length})</TabsTrigger></TabsList>
            
            <TabsContent value="atelier">
                <Card className="shadow-md border-0"><CardHeader className="bg-white border-b"><CardTitle>Flux de Production</CardTitle></CardHeader><CardContent className="p-6 bg-gray-50/50 min-h-[400px]">{Object.keys(groupedByMonthAndShop).length === 0 ? <div className="text-center py-20 text-gray-400">Aucun montage.</div> : (<Accordion type="multiple" className="space-y-4">{Object.entries(groupedByMonthAndShop).sort().reverse().map(([monthName, shopGroups]: any) => (<AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-xl px-4"><AccordionTrigger className="hover:no-underline py-4 bg-gray-100/70 hover:bg-gray-100 rounded-lg -mx-4 px-4"><div className="flex items-center gap-4 w-full pr-4"><Calendar className="w-5 h-5 text-blue-600" /><span className="text-xl font-extrabold text-gray-900 capitalize">{monthName}</span></div></AccordionTrigger><AccordionContent className="pt-4 pb-6 space-y-4"><Accordion type="multiple" className="space-y-2">{Object.entries(shopGroups).map(([shopName, items]: any) => { const client = clients.find(c => c.nomSociete === shopName); return (<AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4"><AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-4 w-full pr-4"><span className="text-lg font-bold text-gray-800">{shopName}</span><span className="text-xs text-gray-400">({items.length})</span><Button variant="outline" size="sm" className="ml-auto flex items-center gap-1 text-xs bg-black text-white hover:bg-gray-800" onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client as Client, items); }} disabled={items.length === 0}><Receipt className="w-4 h-4" /> Facturer</Button></div></AccordionTrigger><AccordionContent className="pt-2 pb-6 space-y-3">{items.map((m: Montage) => {
                    const price = calculateSingleMontagePrice(m);
                    return (
                        <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
                            <div className="flex-1">
                                <div className="mb-2 flex items-center gap-3 flex-wrap"> 
                                    <span className="font-bold text-xl text-gray-900">{m.reference}</span>
                                    <span className="text-gray-400 mx-2">|</span>
                                    <span className="font-semibold text-gray-700">{m.frame}</span>
                                    {/* ALERT SI CREATED BY MANAGER */}
                                    {m.createdBy && m.createdBy.includes("Manager") && <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ajout Manager</Badge>}
                                    <span className="text-sm text-gray-500 ml-3">Reçu le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</span>
                                    <Badge variant="outline" className="ml-auto sm:ml-4 text-sm font-medium px-2 py-0.5 border-green-600 text-green-700 bg-green-50">{price.toFixed(2)} € HT</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-2"><Badge variant="outline" className="bg-white">{m.category}</Badge>{renderMontageDetails(m)}</div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}><SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}><SelectValue /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="En attente">🔴 En attente</SelectItem><SelectItem value="Reçu">🔵 Reçu</SelectItem><SelectItem value="En cours">🟠 En cours</SelectItem><SelectItem value="Terminé">🟢 Terminé</SelectItem></SelectContent></Select>
                                {m.photoUrl ? (<Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setSelectedPhotoUrl(m.photoUrl!)}><ImageIcon className="w-4 h-4" /></Button>) : (<><input type="file" accept="image/*" style={{ display: 'none' }} ref={el => fileInputRefs.current[m._id] = el} onChange={(e) => { if (e.target.files && e.target.files[0]) handlePhotoUpload(m._id, e.target.files[0]); }} /><Button variant="outline" size="icon" className="text-gray-600 border-gray-300 hover:bg-gray-50" onClick={() => fileInputRefs.current[m._id]?.click()}><Camera className="w-4 h-4" /></Button></>)}
                                <Button variant="outline" size="icon" onClick={() => openEditDialog(m)} className="bg-white"><Pencil className="w-4 h-4 text-blue-600" /></Button>
                                <Button variant="outline" size="icon" onClick={() => handleDelete(m._id)} className="bg-white"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                            </div>
                        </div>
                    );
                })}</AccordionContent></AccordionItem>); })}</Accordion></AccordionContent></AccordionItem>))}
                            </Accordion>)}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clients">
                <Card className="shadow-md border-0"><CardHeader className="bg-white border-b"><CardTitle>Fiches Clients & Facturation</CardTitle></CardHeader><CardContent className="p-6">
                {filteredClients.map(c => (
                    <div key={c._id} className="p-4 border-b last:border-0 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 hover:bg-gray-100 transition-colors gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => openClientInvoices(c)}>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-lg">{c.nomSociete}</p>
                                {c.role === 'manager' && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Manager</Badge>}
                                {c.isVerified ? (<Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1"/> Validé</Badge>) : (<Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"><AlertCircle className="w-3 h-3 mr-1"/> En attente</Badge>)}
                            </div>
                            <p className="text-sm text-gray-500">{c.email} | SIRET: {c.siret}</p>
                            <p className="text-xs text-gray-400">{c.address} {c.zipCity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* ✅ BOUTON MANAGER : GÉRER LES MAGASINS */}
                            {c.role === 'manager' && (
                                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); openShopAssign(c); }}>
                                    <Store className="w-4 h-4 mr-2" /> Gérer Magasins
                                </Button>
                            )}

                            {!c.isVerified && (
                                <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={async (e) => { e.stopPropagation(); if(confirm(`Valider le compte de ${c.nomSociete} ?`)) { const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app"; await fetch(`${baseUrl}/api/users/${c._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVerified: true }) }); setClients(prev => prev.map(client => client._id === c._id ? {...client, isVerified: true} : client)); } }}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Valider
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 bg-white" onClick={(e) => { e.stopPropagation(); openClientInvoices(c); }}>
                                <Receipt className="w-4 h-4 mr-2" /> Factures
                            </Button>
                        </div>
                    </div>
                ))}
                </CardContent></Card>
            </TabsContent>
        </Tabs>
        
        {/* MODALE ASSIGNATION MAGASINS */}
        <Dialog open={isShopAssignOpen} onOpenChange={setIsShopAssignOpen}>
            <DialogContent className="bg-white max-w-lg">
                <DialogHeader><DialogTitle>Assigner des magasins à {selectedManager?.nomSociete}</DialogTitle></DialogHeader>
                <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {clients.filter(c => c.role === 'user').map(shop => (
                        <div key={shop._id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                            <Checkbox 
                                id={shop._id} 
                                checked={tempAssignedShops.includes(shop._id)}
                                onCheckedChange={(checked) => {
                                    setTempAssignedShops(prev => checked ? [...prev, shop._id] : prev.filter(id => id !== shop._id));
                                }}
                            />
                            <label htmlFor={shop._id} className="flex-1 cursor-pointer font-medium">{shop.nomSociete} <span className="text-gray-400 text-xs">({shop.zipCity})</span></label>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsShopAssignOpen(false)}>Annuler</Button>
                    <Button onClick={saveAssignedShops} className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>
                </div>
            </DialogContent>
        </Dialog>

        {currentClientToInvoice && <InvoiceModal client={currentClientToInvoice} montages={montagesToInvoice} isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onInvoicePublished={handleInvoicePublished} />}
        <ClientInvoicesModal client={selectedClient} invoices={currentClientInvoices} isOpen={isClientInvoicesModalOpen} onClose={() => setIsClientInvoicesModalOpen(false)} onDelete={handleDeleteInvoice} onPaymentUpdate={handlePaymentUpdate} />
      
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
};

export default AdminDashboard;
