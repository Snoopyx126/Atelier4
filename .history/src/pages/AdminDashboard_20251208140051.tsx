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
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone, Receipt, Printer, Send, Loader2, CreditCard } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// --- INTERFACES ---
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
    amountPaid?: number; // ✅
    paymentStatus?: string; // ✅
}

const statusPriority: Record<string, number> = {
  'En attente': 1, 'Reçu': 2, 'En cours': 3, 'Terminé': 4, 'Expédié': 5
};

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- CONSTANTES PRIX ---
const CATEGORY_COSTS: Record<string, number> = { 'Cerclé': 7.00, 'Percé': 15.90, 'Nylor': 14.90 };
const GLASS_COSTS: Record<string, number> = { 'Verre 4 saisons': 25.00, 'Verre Dégradé': 50.00, 'Verre de stock': 0.00 };
const DIAMONDCUT_COSTS: Record<string, number> = { 'Facette Lisse': 39.80, 'Facette Twinkle': 79.80, 'Diamond Ice': 93.60, 'Standard': 0.00 };
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = 10.00;
const ENGRAVING_UNIT_COST = 12.00;

const FACTURE_INFO = {
    name: "L'Atelier des Arts", address: "178 Avenue Daumesnil", zipCity: "75012 Paris", siret: "98095501700010", email: "contact@atelierdesarts.com", tvaRate: 0.20
};

// --- MODALE DE FACTURATION (GÉNÉRATION PDF & ENVOI) ---
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

    const handlePublishAndSend = async () => {
        const input = document.getElementById('invoice-content');
        if (!input) { toast.error("Erreur PDF"); return; }

        setIsPublishing(true);
        toast.loading("Génération PDF et envoi...", { id: 'pub-load' });

        try {
            // 1. Capture PDF optimisée
            const canvas = await html2canvas(input, { scale: 1.5, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            const pdfBase64 = pdf.output('datauristring');
            
            // 2. Prépa Données
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
                invoiceData: invoiceDetailsSnapshot,
                pdfUrl: '#',
                sendEmail: true,
                pdfBase64: pdfBase64 
            };

            // 3. Envoi API
            const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
            const res = await fetch(`${baseUrl}/api/factures`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Facture envoyée au client !", { id: 'pub-load' });
                pdf.save(`Facture_${client.nomSociete}_${invoiceNumber}.pdf`); // Copie locale
                onInvoicePublished(data.facture);
                onClose();
            } else {
                toast.error(`Erreur: ${data.message}`, { id: 'pub-load' });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur technique.", { id: 'pub-load' });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
             <style>{`
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
                <DialogContent className="DialogContent max-w-4xl bg-white p-0 overflow-hidden flex flex-col max-h-[95vh]">
                    <DialogHeader className="p-6 border-b print-hidden">
                        <DialogTitle className="text-3xl font-bold text-gray-900">Facturation Mensuelle</DialogTitle>
                    </DialogHeader>

                    <div className="overflow-y-auto p-6 bg-gray-50 flex-grow">
                        <div id="invoice-content" className="p-10 bg-white text-black border shadow-sm mx-auto max-w-[210mm] min-h-[297mm]"> 
                            {/* DESIGN FACTURE (Header) */}
                            <div className="flex justify-between items-start mb-10">
                                <div><h1 className="text-4xl font-extrabold text-gray-900 mb-2">FACTURE</h1><p className="text-gray-500 font-medium">N° {invoiceNumber}</p><p className="text-sm text-gray-400">Date: {today.toLocaleDateString('fr-FR')}</p></div>
                                <div className="text-right"><h2 className="text-xl font-bold text-gray-800">{FACTURE_INFO.name}</h2><p className="text-sm text-gray-600">{FACTURE_INFO.address}</p><p className="text-sm text-gray-600">{FACTURE_INFO.zipCity}</p><p className="text-sm text-gray-600">SIRET: {FACTURE_INFO.siret}</p></div>
                            </div>

                            {/* CLIENT INFO */}
                            <div className="border-t-2 border-gray-100 py-6 mb-8">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Facturé à</h3>
                                <p className="text-xl font-bold text-gray-900">{client.nomSociete}</p>
                                <p className="text-gray-600">{client.address}</p>
                                <p className="text-gray-600 text-sm">SIRET: {client.siret}</p>
                            </div>

                            {/* TABLEAU */}
                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b-2 border-gray-800">
                                        <th className="text-left py-3 font-bold text-gray-900">Description</th>
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
                                                <td className="py-4 align-top text-sm text-gray-600">{details.map((d, i) => <div key={i}>{d}</div>)}</td>
                                                <td className="py-4 align-top text-right font-bold text-gray-900">{total.toFixed(2)} €</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* TOTAUX */}
                            <div className="flex justify-end">
                                <div className="w-1/2 space-y-3">
                                    <div className="flex justify-between text-gray-600"><span className="font-medium">Total HT</span><span>{totalHT.toFixed(2)} €</span></div>
                                    <div className="flex justify-between text-gray-600"><span className="font-medium">TVA (20%)</span><span>{tva.toFixed(2)} €</span></div>
                                    <div className="flex justify-between text-2xl font-extrabold text-gray-900 border-t-2 border-gray-900 pt-3"><span>Net à payer</span><span>{totalTTC.toFixed(2)} €</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 print-hidden flex-shrink-0 z-50 relative">
                        <Button variant="outline" onClick={onClose} disabled={isPublishing}>Annuler</Button>
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

// --- MODALE LISTE FACTURES (AVEC PAIEMENT) ---
interface ClientInvoicesModalProps { client: Client | null; invoices: FactureData[]; isOpen: boolean; onClose: () => void; onDelete: (id: string) => void; onPaymentUpdate: (id: string, amount: number) => void; }

const ClientInvoicesModal: React.FC<ClientInvoicesModalProps> = ({ client, invoices, isOpen, onClose, onDelete, onPaymentUpdate }) => {
    const [payInvoice, setPayInvoice] = useState<FactureData | null>(null);
    const [amountInput, setAmountInput] = useState<number>(0);

    const openPayment = (inv: FactureData) => {
        setPayInvoice(inv);
        setAmountInput(inv.amountPaid || 0);
    };

    const submitPayment = () => {
        if(payInvoice) {
            onPaymentUpdate(payInvoice.id, amountInput);
            setPayInvoice(null);
        }
    };

    const getStatusBadge = (status: string | undefined, remaining: number) => {
        if(status === 'Payé') return <Badge className="bg-green-100 text-green-700 border-green-200">Payé</Badge>;
        if(status === 'Partiellement payé') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Reste: {remaining.toFixed(2)} €</Badge>;
        return <Badge className="bg-red-100 text-red-700 border-red-200">Non payé</Badge>;
    };

    if (!isOpen || !client) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-2xl font-bold">Factures : {client.nomSociete}</DialogTitle></DialogHeader>
                {invoices.length === 0 ? <div className="text-center py-10 text-gray-500">Aucune facture.</div> : (
                    <div className="space-y-3 pt-4">
                        {invoices.map(inv => {
                            const paid = inv.amountPaid || 0;
                            const remaining = inv.totalTTC - paid;
                            return (
                                <Card key={inv.id} className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold">{inv.invoiceNumber}</p>
                                            {getStatusBadge(inv.paymentStatus, remaining)}
                                        </div>
                                        <p className="text-xs text-gray-500">{new Date(inv.dateEmission).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-lg">{inv.totalTTC.toFixed(2)} €</div>
                                            {paid > 0 && paid < inv.totalTTC && <div className="text-xs text-gray-400">Déjà payé: {paid.toFixed(2)} €</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openPayment(inv)} title="Enregistrer un paiement">
                                                <CreditCard className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => { if(confirm("Supprimer ?")) onDelete(inv.id); }} title="Supprimer">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </DialogContent>

            {/* MODALE INTERNE POUR SAISIR LE MONTANT */}
            {payInvoice && (
                <Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}>
                    <DialogContent className="max-w-sm bg-white">
                        <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-sm text-gray-600">Facture {payInvoice.invoiceNumber} <br/> Total: <strong>{payInvoice.totalTTC.toFixed(2)} €</strong></p>
                            <div className="space-y-2">
                                <Label>Montant total réglé à ce jour (€)</Label>
                                <Input type="number" step="0.01" value={amountInput} onChange={e => setAmountInput(parseFloat(e.target.value))} />
                                <div className="flex gap-2 text-xs">
                                    <Button size="sm" variant="outline" onClick={() => setAmountInput(payInvoice.totalTTC)}>Tout régler</Button>
                                    <Button size="sm" variant="outline" onClick={() => setAmountInput(0)}>Réinitialiser</Button>
                                </div>
                            </div>
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={submitPayment}>Valider le paiement</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
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

  // Form states
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
        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
        
        Promise.all([
            fetch(`${baseUrl}/api/montages?role=admin`).then(r => r.json()), 
            fetch(`${baseUrl}/api/users`).then(r => r.json()), 
            fetch(`${baseUrl}/api/factures`).then(r => r.json())
        ]).then(([mData, cData, iData]) => {
            if (mData.success) setMontages(mData.montages);
            if (cData.success) { setClients(cData.users); if(cData.users.length) setNewClient(cData.users[0]._id); }
            if (iData.success) {
                setAllInvoices(iData.factures.map((f: any) => ({
                   id: f._id, userId: f.userId, clientName: f.clientName, invoiceNumber: f.invoiceNumber,
                   totalTTC: f.totalTTC, dateEmission: f.dateEmission, pdfUrl: f.pdfUrl, montagesReferences: f.montagesReferences,
                   amountPaid: f.amountPaid, paymentStatus: f.paymentStatus
               })));
            }
            setLoading(false);
        }).catch(e => console.error(e));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => {
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
    const res = await fetch(`${baseUrl}/api/montages?role=admin`);
    const data = await res.json();
    if (data.success) setMontages(data.montages);
  };

  const handleDeleteInvoice = async (id: string) => {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
      const res = await fetch(`${baseUrl}/api/factures/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if(data.success) {
          toast.success("Facture supprimée");
          setAllInvoices(prev => prev.filter(f => f.id !== id));
          setCurrentClientInvoices(prev => prev.filter(f => f.id !== id));
      } else toast.error("Erreur suppression");
  };

  // ✅ LOGIQUE DE MISE À JOUR PAIEMENT
  const handlePaymentUpdate = async (id: string, amount: number) => {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
      try {
          const res = await fetch(`${baseUrl}/api/factures/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amountPaid: amount })
          });
          const data = await res.json();
          if (data.success) {
              toast.success("Paiement mis à jour !");
              // Mise à jour locale
              const updatedInv = data.facture;
              setAllInvoices(prev => prev.map(f => f.id === id ? { ...f, amountPaid: updatedInv.amountPaid, paymentStatus: updatedInv.paymentStatus } : f));
              setCurrentClientInvoices(prev => prev.map(f => f.id === id ? { ...f, amountPaid: updatedInv.amountPaid, paymentStatus: updatedInv.paymentStatus } : f));
          }
      } catch (e) { toast.error("Erreur mise à jour paiement"); }
  };

  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${baseUrl}/api/montages/${editingId}` : `${baseUrl}/api/montages`;
    try {
        const res = await fetch(url, {
            method, headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: newClient, reference: newRef, frame: newFrame, description: newDesc, category: newCategory, glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount, shapeChange: newShapeChange })
        });
        const data = await res.json();
        if (data.success) { toast.success("Enregistré !"); setIsDialogOpen(false); fetchMontages(); }
    } catch (error) { toast.error("Erreur API"); } finally { setIsSubmitting(false); }
  };
  
  const openCreateDialog = () => { setEditingId(null); setIsDialogOpen(true); };
  const openEditDialog = (m: Montage) => { setEditingId(m._id); setNewRef(m.reference||""); setNewFrame(m.frame||""); setIsDialogOpen(true); };
  
  const handleStatusChange = async (id: string, newStatus: string) => { 
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
      await fetch(`${baseUrl}/api/montages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: newStatus }) }); 
      fetchMontages(); toast.success(`Statut: ${newStatus}`); 
  };
  const handleDelete = async (id: string) => { 
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";
      if(confirm("Supprimer ?")) { await fetch(`${baseUrl}/api/montages/${id}`, { method: 'DELETE' }); fetchMontages(); toast.success("Supprimé"); }
  };
  const handleGenerateInvoice = (client: Client, items: Montage[]) => {
      setCurrentClientToInvoice(client); setMontagesToInvoice(items); setIsInvoiceOpen(true);
  };
  const handleInvoicePublished = (newInvoice: FactureData) => { setAllInvoices(prev => [newInvoice, ...prev]); };
  const openClientInvoices = (client: Client) => { setSelectedClient(client); setCurrentClientInvoices(allInvoices.filter(f => f.userId === client._id)); setIsClientInvoicesModalOpen(true); };
  const handleGlassTypeChange = (type: string, checked: boolean) => { setNewGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type)); };
  const getStatusColor = (statut: string) => { if(statut==='Terminé') return 'border-green-500'; if(statut==='En cours') return 'border-orange-500'; return 'border-gray-300'; };
  const renderMontageDetails = (m: Montage) => (
    <div className="flex flex-wrap items-center gap-2">
        {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}
        {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
        {m.engravingCount && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
        {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}
        {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}
    </div>
  );

  // Filtrage
  const filteredMontages = montages.filter(m => normalize(m.reference + m.clientName).includes(normalize(searchTerm)));
  const groupedByMonthAndShop = filteredMontages.reduce((acc: any, m) => {
      const d = new Date(m.dateReception).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
      if(!acc[d]) acc[d] = {}; if(!acc[d][m.clientName]) acc[d][m.clientName] = [];
      acc[d][m.clientName].push(m); return acc;
  }, {});
  const filteredClients = clients.filter(c => normalize(c.nomSociete).includes(normalize(searchTerm)));
  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1><p className="text-gray-500">Gestion de l'atelier et suivi de production.</p></div>
            <div className="flex gap-3">
                <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2"><PlusCircle className="w-4 h-4" /> Créer un dossier</Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-3xl bg-white">
                        <DialogHeader><DialogTitle>{editingId ? "Modifier" : "Ajouter"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSaveMontage} className="space-y-4 pt-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-3"><Label>Client</Label><Select onValueChange={setNewClient} value={newClient}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{clients.map(c=><SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label>Réf.</Label><Input value={newRef} onChange={e=>setNewRef(e.target.value)} required/></div>
                                <div><Label>Monture</Label><Input value={newFrame} onChange={e=>setNewFrame(e.target.value)} required/></div>
                                <div><Label>Urgence</Label><Select onValueChange={setNewUrgency} value={newUrgency}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <hr/>
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Type</Label><Select onValueChange={setNewCategory} value={newCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent></Select></div>
                                <div><Label>Diamond Cut</Label><Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label>Gravure</Label><Input type="number" value={newEngravingCount} onChange={e=>setNewEngravingCount(parseInt(e.target.value))}/></div>
                            </div>
                            <div className="flex gap-4">{GLASS_OPTIONS.map(o=><div key={o} className="flex items-center gap-2"><Checkbox checked={newGlassType.includes(o)} onCheckedChange={(c)=>handleGlassTypeChange(o, c as boolean)}/><label>{o}</label></div>)}</div>
                            <Button type="submit" className="w-full">{editingId?"Modifier":"Créer"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-l-4 border-l-red-500"><CardHeader><CardTitle>À traiter</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500"><CardHeader><CardTitle>En Production</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inProgressCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-green-500"><CardHeader><CardTitle>Clients</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent></Card>
        </div>

        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* TABS */}
        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto">
                <TabsTrigger value="atelier" className="px-6 py-2"><Glasses className="w-4 h-4 mr-2" /> Atelier ({filteredMontages.length})</TabsTrigger>
                <TabsTrigger value="clients" className="px-6 py-2"><Users className="w-4 h-4 mr-2" /> Fiches Clients ({filteredClients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle>Flux de Production</CardTitle></CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByMonthAndShop).length === 0 ? <div className="text-center py-20 text-gray-400">Aucun montage.</div> : (
                            <Accordion type="multiple" className="space-y-4">
                                {Object.entries(groupedByMonthAndShop).sort().reverse().map(([monthName, shopGroups]: any) => (
                                    <AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-xl px-4">
                                        <AccordionTrigger className="hover:no-underline py-4 bg-gray-100/70 hover:bg-gray-100 rounded-lg -mx-4 px-4">
                                            <div className="flex items-center gap-4 w-full pr-4">
                                                <Calendar className="w-5 h-5 text-blue-600" /><span className="text-xl font-extrabold text-gray-900 capitalize">{monthName}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4 pb-6 space-y-4">
                                            <Accordion type="multiple" className="space-y-2">
                                                {Object.entries(shopGroups).map(([shopName, items]: any) => {
                                                    const client = clients.find(c => c.nomSociete === shopName);
                                                    return (
                                                        <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4">
                                                            <AccordionTrigger className="hover:no-underline py-4">
                                                                <div className="flex items-center gap-4 w-full pr-4">
                                                                    <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                                                    <span className="text-xs text-gray-400">({items.length})</span>
                                                                    <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1 text-xs bg-black text-white hover:bg-gray-800" onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client as Client, items); }} disabled={items.length === 0}>
                                                                        <Receipt className="w-4 h-4" /> Facturer
                                                                    </Button>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-2 pb-6 space-y-3">
                                                                {items.map((m: Montage) => (
                                                                    <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
                                                                        <div className="flex-1">
                                                                            <div className="mb-2"><span className="font-bold text-xl text-gray-900">{m.reference}</span><span className="text-gray-400 mx-2">|</span><span className="font-semibold text-gray-700">{m.frame}</span></div>
                                                                            <div className="flex flex-wrap items-center gap-2 mb-2"><Badge variant="outline">{m.category}</Badge>{renderMontageDetails(m)}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                            <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                                                <SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}><SelectValue /></SelectTrigger>
                                                                                <SelectContent><SelectItem value="En attente">🔴 En attente</SelectItem><SelectItem value="Reçu">🔵 Reçu</SelectItem><SelectItem value="En cours">🟠 En cours</SelectItem><SelectItem value="Terminé">🟢 Terminé</SelectItem></SelectContent>
                                                                            </Select>
                                                                            <Button variant="outline" size="icon" onClick={() => openEditDialog(m)}><Pencil className="w-4 h-4 text-blue-600" /></Button>
                                                                            <Button variant="outline" size="icon" onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
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
                    <CardHeader className="bg-white border-b"><CardTitle>Fiches Clients & Facturation</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        {filteredClients.map(c => (
                            <div key={c._id} className="p-4 border-b last:border-0 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => openClientInvoices(c)}>
                                <div><p className="font-bold text-lg">{c.nomSociete}</p><p className="text-sm text-gray-500">{c.email}</p></div>
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"><Receipt className="w-4 h-4 mr-2" /> Voir les Factures</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {currentClientToInvoice && <InvoiceModal client={currentClientToInvoice} montages={montagesToInvoice} isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onInvoicePublished={handleInvoicePublished} />}
        {/* MODALE LISTE FACTURE AVEC PAIEMENT */}
        <ClientInvoicesModal 
            client={selectedClient} 
            invoices={currentClientInvoices} 
            isOpen={isClientInvoicesModalOpen} 
            onClose={() => setIsClientInvoicesModalOpen(false)} 
            onDelete={handleDeleteInvoice} 
            onPaymentUpdate={handlePaymentUpdate} // ✅ Passer la fonction
        />
      </div>
    </div>
  );
};

export default AdminDashboard;