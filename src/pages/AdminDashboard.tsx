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
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Glasses, Users, AlertCircle, CheckCircle2, Trash2, FileText, Calendar, PlusCircle, Pencil, Search, Receipt, Loader2, CreditCard, Camera, Image as ImageIcon, X, Store } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authFetch, API_URL } from "@/lib/api";

const getApiUrl = () => window.location.hostname === "localhost" ? "http://localhost:3000" : "https://atelier4.vercel.app";

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
  pricingTier?: number;
}
interface FactureData {
  id: string; userId: string; clientName: string; invoiceNumber: string; totalTTC: number; dateEmission: string; pdfUrl: string; montagesReferences?: string[]; amountPaid?: number; paymentStatus?: string;
}

const normalize = (text: string | undefined): string => {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const CATEGORY_COSTS: Record<string, { 1: number, 2: number }> = {
  'Sans Montage': { 1: 0.00, 2: 0.00 }, 'Cerclé': { 1: 7.00, 2: 3.60 },
  'Percé': { 1: 15.90, 2: 12.00 }, 'Nylor': { 1: 14.90, 2: 12.00 }
};
const GLASS_COSTS: Record<string, { 1: number, 2: number }> = {
  'Verre Dégradé 4 saisons': { 1: 28.80, 2: 28.80 }, 'Verre Dégradé': { 1: 50.00, 2: 43.00 }, 'Verre de stock': { 1: 0.00, 2: 0.00 }
};
const DIAMONDCUT_COSTS: Record<string, { 1: number, 2: number }> = {
  'Facette Lisse': { 1: 39.80, 2: 21.50 }, 'Facette Twinkle': { 1: 79.80, 2: 60.00 },
  'Diamond Ice': { 1: 93.60, 2: 60.00 }, 'Standard': { 1: 0.00, 2: 0.00 }
};
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Express -24H': 0.30, 'Prioritaire -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = { 1: 10.00, 2: 3.50 };
const ENGRAVING_UNIT_COST = { 1: 12.00, 2: 10.00 };
const FACTURE_INFO = { name: "L'Atelier des Arts", address: "178 Avenue Daumesnil", zipCity: "75012 Paris", siret: "98095501700010", email: "contact@atelierdesarts.com", tvaRate: 0.20 };

const calculateSingleMontagePrice = (m: Montage, tier: number = 1): number => {
  const lookupTier = (tier === 1 || tier === 2) ? tier : 1;
  const safeLookupTier = lookupTier as 1 | 2;
  let totalBase = 0;
  totalBase += CATEGORY_COSTS[m.category || 'Cerclé']?.[safeLookupTier] || 0;
  totalBase += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard']?.[safeLookupTier] || 0;
  totalBase += (m.engravingCount || 0) * ENGRAVING_UNIT_COST[safeLookupTier];
  if (m.glassType) m.glassType.forEach(type => { totalBase += GLASS_COSTS[type]?.[safeLookupTier] || 0; });
  if (m.shapeChange) totalBase += SHAPE_CHANGE_COST[safeLookupTier];
  if (tier === 3) totalBase *= 0.90;
  else if (tier === 4) totalBase *= 0.85;
  return totalBase + totalBase * (URGENCY_RATES[m.urgency || 'Standard'] || 0);
};

// --- STYLES PREMIUM PARTAGÉS ---
const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1",
  badge: (color: string) => `text-[10px] font-normal tracking-wide rounded-full px-2.5 py-0.5 border ${color}`,
  input: "bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all",
  btnPrimary: "bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-xs tracking-widest uppercase font-normal transition-all",
  btnOutline: "bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-xs font-normal transition-all",
  btnGold: "border border-[#C9A96E] text-[#C9A96E] bg-transparent hover:bg-[#C9A96E] hover:text-[#0F0E0C] rounded-xl text-xs tracking-widest uppercase font-normal transition-all",
  btnDanger: "border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded-xl text-xs font-normal transition-all",
};

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  'En attente': { label: 'En attente', dot: 'bg-amber-400',    badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Reçu':       { label: 'Reçu',       dot: 'bg-blue-400',     badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  'En cours':   { label: 'En cours',   dot: 'bg-orange-400',   badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Terminé':    { label: 'Terminé',    dot: 'bg-emerald-400',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const StatusBadge = ({ statut }: { statut: string }) => {
  const cfg = statusConfig[statut] || { label: statut, dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-wide rounded-full px-2.5 py-1 border font-normal ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// --- MODALE FACTURE ---
interface InvoiceProps { client: Client; montages: Montage[]; isOpen: boolean; onClose: () => void; onInvoicePublished: (i: FactureData) => void; }
const InvoiceModal: React.FC<InvoiceProps> = ({ client, montages, isOpen, onClose, onInvoicePublished }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  if (!isOpen) return null;
  const today = new Date();
  const tier = client.pricingTier || 1;
  const getMontagePriceDetails = (m: Montage) => {
    const lookupTier = (tier === 1 || tier === 2) ? tier : 1;
    const safeLookupTier = lookupTier as 1 | 2;
    let totalBase = 0; let details: string[] = [];
    const catCosts = CATEGORY_COSTS[m.category || 'Cerclé'] || { 1: 0, 2: 0 };
    const montagePrice = catCosts[safeLookupTier] || 0;
    totalBase += montagePrice; details.push(`${m.category || 'Standard'} (${montagePrice.toFixed(2)}€)`);
    const dcCosts = DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || { 1: 0, 2: 0 };
    const dcPrice = dcCosts[safeLookupTier] || 0;
    if (dcPrice > 0) { totalBase += dcPrice; details.push(`Diamond Cut ${m.diamondCutType} (+${dcPrice.toFixed(2)}€)`); }
    const engravingPrice = (m.engravingCount || 0) * ENGRAVING_UNIT_COST[safeLookupTier];
    if (engravingPrice > 0) { totalBase += engravingPrice; details.push(`${m.engravingCount} Gravure(s) (+${engravingPrice.toFixed(2)}€)`); }
    if (m.glassType) m.glassType.forEach(g => { const gc = GLASS_COSTS[g]?.[safeLookupTier] || 0; if (gc > 0) { totalBase += gc; details.push(`${g} (+${gc.toFixed(2)}€)`); } });
    if (m.shapeChange) { const sc = SHAPE_CHANGE_COST[safeLookupTier]; totalBase += sc; details.push(`Changement forme (+${sc.toFixed(2)}€)`); }
    if (tier === 3) totalBase *= 0.90;
    else if (tier === 4) totalBase *= 0.85;
    const urgency = URGENCY_RATES[m.urgency || 'Standard'] || 0;
    const urgencyCost = totalBase * urgency;
    if (urgencyCost > 0) { totalBase += urgencyCost; details.push(`Urgence ${m.urgency} (+${urgencyCost.toFixed(2)}€)`); }
    return { total: totalBase, details };
  };
  const totalHT = montages.reduce((s, m) => s + getMontagePriceDetails(m).total, 0);
  const tva = totalHT * FACTURE_INFO.tvaRate;
  const totalTTC = totalHT + tva;
  const invoiceNumber = `FA-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}-${client.nomSociete.substring(0,4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const montagesReferences = montages.map(m => m.reference || m._id);

  const handlePublishAndSend = async () => {
    setIsPublishing(true);
    const toastId = toast.loading("Génération en cours...");
    try {
      const input = document.getElementById('invoice-content');
      if (!input) throw new Error("Contenu introuvable");
      const canvas = await html2canvas(input, { scale: 1, useCORS: true, scrollY: 0 });
      const imgData = canvas.toDataURL('image/jpeg', 0.3);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, (imgProps.height * pdfWidth) / imgProps.width);
      const rawPdf = pdf.output('datauristring');
      const pdfBase64 = rawPdf.includes('base64,') ? rawPdf.split('base64,')[1] : rawPdf;
      const payload = {
        userId: client._id, clientName: client.nomSociete, invoiceNumber,
        totalHT: parseFloat(totalHT.toFixed(2)), totalTTC: parseFloat(totalTTC.toFixed(2)),
        montagesReferences, dateEmission: new Date().toISOString(),
        invoiceData: montages.map(m => ({ reference: m.reference, details: getMontagePriceDetails(m).details, price: getMontagePriceDetails(m).total })),
        pdfUrl: '#', sendEmail: true, pdfBase64: montages.length <= 20 ? pdfBase64 : null
      };
      const res = await authFetch(`${API_URL}/factures`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { toast.success("Facture enregistrée !", { id: toastId }); pdf.save(`${invoiceNumber}.pdf`); onInvoicePublished(data.facture); onClose(); }
      else toast.error(data.message || "Erreur", { id: toastId });
    } catch (e) { toast.error("Erreur technique.", { id: toastId }); }
    finally { setIsPublishing(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden flex flex-col max-h-[95vh] rounded-2xl">
        <DialogHeader className="p-6 border-b border-[#EDE8DF]"><DialogTitle className="font-playfair font-normal text-xl">Détail Facturation</DialogTitle></DialogHeader>
        <div className="overflow-y-auto p-6 bg-[#F7F4EE] flex-grow">
          <div id="invoice-content" className="p-10 bg-white text-black border border-[#EDE8DF] shadow-sm mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between rounded-xl">
            <div>
              <div className="flex justify-between items-start mb-10">
                <div><h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">DÉTAIL DE FACTURATION</h1><p className="text-xs text-gray-400 tracking-wide">Date : {today.toLocaleDateString('fr-FR')}</p></div>
                <div className="text-right"><h2 className="text-lg font-bold text-gray-800">{FACTURE_INFO.name}</h2><p className="text-xs text-gray-500">{FACTURE_INFO.address}</p><p className="text-xs text-gray-500">{FACTURE_INFO.zipCity}</p><p className="text-xs text-gray-500">SIRET : {FACTURE_INFO.siret}</p></div>
              </div>
              <div className="border-t border-[#EDE8DF] py-5 mb-6"><p className="text-[10px] font-normal tracking-[0.2em] uppercase text-[#C9A96E] mb-1">Facturé à</p><p className="text-lg font-bold text-gray-900">{client.nomSociete}</p><p className="text-sm text-gray-500">{client.address}</p><p className="text-sm text-gray-500">{client.zipCity}</p><p className="text-xs text-gray-400 mt-1">SIRET : {client.siret}</p></div>
              <table className="w-full mb-8"><thead><tr className="border-b border-gray-200"><th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th><th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Détails</th><th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix HT</th></tr></thead>
                <tbody className="divide-y divide-[#EDE8DF]">{montages.map(m => { const { total, details } = getMontagePriceDetails(m); return (<tr key={m._id}><td className="py-3 align-top font-medium text-gray-900 text-sm">{m.reference}</td><td className="py-3 align-top text-xs text-gray-500">{details.map((d, i) => <div key={i}>{d}</div>)}</td><td className="py-3 align-top text-right font-semibold text-gray-900 text-sm">{total.toFixed(2)} €</td></tr>); })}</tbody>
              </table>
            </div>
            <div>
              <div className="flex justify-between items-end mb-6">
                <div className="bg-[#F7F4EE] border border-[#EDE8DF] p-4 rounded-xl w-1/2 mr-8"><p className="font-semibold text-xs text-gray-700 mb-2 uppercase tracking-wider">Coordonnées bancaires</p><p className="text-xs text-gray-500">IBAN : FR76 1820 6002 0065 1045 3419 297</p><p className="text-xs text-gray-500">BIC : AGRIFRPP882</p></div>
                <div className="w-1/3 space-y-2"><div className="flex justify-between text-sm text-gray-500"><span>Total HT</span><span>{totalHT.toFixed(2)} €</span></div><div className="flex justify-between text-sm text-gray-500"><span>TVA (20%)</span><span>{tva.toFixed(2)} €</span></div><div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2"><span>Net à payer</span><span>{totalTTC.toFixed(2)} €</span></div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[#EDE8DF] bg-white flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPublishing} className={S.btnOutline}>Annuler</Button>
          <Button onClick={handlePublishAndSend} disabled={isPublishing || montages.length === 0} className={S.btnPrimary + " px-6"}>Télécharger PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- MODALE FACTURES CLIENT ---
interface ClientInvoicesModalProps { client: Client | null; invoices: FactureData[]; isOpen: boolean; onClose: () => void; onDelete: (id: string) => void; onPaymentUpdate: (id: string, amount: number) => void; }
const ClientInvoicesModal: React.FC<ClientInvoicesModalProps> = ({ client, invoices, isOpen, onClose, onDelete, onPaymentUpdate }) => {
  const [payInvoice, setPayInvoice] = useState<FactureData | null>(null);
  const [amountInput, setAmountInput] = useState<number>(0);
  if (!isOpen || !client) return null;
  const getStatusBadge = (status: string | undefined, remaining: number) => {
    if (status === 'Payé') return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">Payé</span>;
    if (status === 'Partiellement payé') return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">Reste : {remaining.toFixed(2)} €</span>;
    return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200">Non payé</span>;
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="font-playfair font-normal text-xl">Factures — {client.nomSociete}</DialogTitle></DialogHeader>
        {invoices.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">Aucune facture.</div> : (
          <div className="space-y-3 pt-4">{invoices.map(inv => {
            const paid = inv.amountPaid || 0; const remaining = inv.totalTTC - paid;
            return (
              <div key={inv.id} className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                <div className="flex-1"><div className="flex items-center gap-2 mb-1"><p className="font-semibold text-sm">{inv.invoiceNumber}</p>{getStatusBadge(inv.paymentStatus, remaining)}</div><p className="text-xs text-gray-400">{new Date(inv.dateEmission).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-4"><div className="text-right"><div className="font-bold">{inv.totalTTC.toFixed(2)} €</div>{paid > 0 && paid < inv.totalTTC && <div className="text-xs text-gray-400">Payé : {paid.toFixed(2)} €</div>}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setPayInvoice(inv); setAmountInput(inv.amountPaid || 0); }} className={S.btnOutline + " h-8 w-8 p-0"}><CreditCard className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm("Supprimer ?")) onDelete(inv.id); }} className={S.btnDanger + " h-8 w-8 p-0"}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}</div>
        )}
      </DialogContent>
      {payInvoice && (
        <Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}>
          <DialogContent className="max-w-sm bg-white rounded-2xl">
            <DialogHeader><DialogTitle className="font-playfair font-normal">Enregistrer un paiement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500">Facture {payInvoice.invoiceNumber} — Total : <strong>{payInvoice.totalTTC.toFixed(2)} €</strong></p>
              <div><Label className={S.label}>Montant total réglé (€)</Label><Input type="number" step="0.01" value={amountInput} onChange={e => setAmountInput(parseFloat(e.target.value))} className={S.input} /></div>
              <Button size="sm" variant="outline" onClick={() => setAmountInput(payInvoice.totalTTC)} className={S.btnOutline}>Tout régler</Button>
              <Button className={S.btnPrimary + " w-full h-10"} onClick={() => { onPaymentUpdate(payInvoice.id, amountInput); setPayInvoice(null); }}>Valider</Button>
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
  const [newStatut, setNewStatut] = useState("En attente");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentClientToInvoice, setCurrentClientToInvoice] = useState<Client | null>(null);
  const [montagesToInvoice, setMontagesToInvoice] = useState<Montage[]>([]);
  const [isClientInvoicesModalOpen, setIsClientInvoicesModalOpen] = useState(false);
  const [currentClientInvoices, setCurrentClientInvoices] = useState<FactureData[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isShopAssignOpen, setIsShopAssignOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Client | null>(null);
  const [tempAssignedShops, setTempAssignedShops] = useState<string[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const URGENCY_OPTIONS = ['Standard', 'Prioritaire -48H', 'Express -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre Dégradé 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
      const baseUrl = getApiUrl();
      Promise.all([
        authFetch(`${baseUrl}/api/montages`).then(r => r.json()),
        authFetch(`${baseUrl}/api/users`).then(r => r.json()),
        authFetch(`${baseUrl}/api/factures`).then(r => r.json())
      ]).then(([mData, cData, iData]) => {
        if (mData.success) setMontages(mData.montages);
        if (cData.success) { setClients(cData.users); if (cData.users.length) setNewClient(cData.users[0]._id); }
        if (iData.success) setAllInvoices(iData.factures.map((f: any) => ({ id: f._id, userId: f.userId, clientName: f.clientName, invoiceNumber: f.invoiceNumber, totalTTC: f.totalTTC, dateEmission: f.dateEmission, pdfUrl: f.pdfUrl, montagesReferences: f.montagesReferences, amountPaid: f.amountPaid, paymentStatus: f.paymentStatus })));
        setLoading(false);
      }).catch(e => console.error(e));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  const fetchMontages = async () => { const res = await authFetch(`${getApiUrl()}/api/montages`); const data = await res.json(); if (data.success) setMontages(data.montages); };
  const handleDeleteInvoice = async (id: string) => { const res = await authFetch(`${getApiUrl()}/api/factures/${id}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) { toast.success("Facture supprimée"); setAllInvoices(p => p.filter(f => f.id !== id)); setCurrentClientInvoices(p => p.filter(f => f.id !== id)); } else toast.error("Erreur suppression"); };
  const handlePaymentUpdate = async (id: string, amount: number) => { try { const res = await authFetch(`${getApiUrl()}/api/factures/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaid: amount }) }); const data = await res.json(); if (data.success) { toast.success("Paiement mis à jour !"); setAllInvoices(p => p.map(f => f.id === id ? { ...f, amountPaid: data.facture.amountPaid, paymentStatus: data.facture.paymentStatus } : f)); setCurrentClientInvoices(p => p.map(f => f.id === id ? { ...f, amountPaid: data.facture.amountPaid, paymentStatus: data.facture.paymentStatus } : f)); } } catch (e) { toast.error("Erreur paiement"); } };
  const handlePhotoUpload = async (montageId: string, file: File) => { const fd = new FormData(); fd.append('photo', file); toast.loading("Envoi...", { id: 'photo' }); try { const res = await authFetch(`${getApiUrl()}/api/montages/${montageId}/photo`, { method: 'POST', body: fd }); const data = await res.json(); if (data.success) { toast.success("Photo ajoutée !", { id: 'photo' }); fetchMontages(); } else toast.error("Erreur upload", { id: 'photo' }); } catch { toast.error("Erreur connexion", { id: 'photo' }); } };
  const handleSaveMontage = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); const baseUrl = getApiUrl(); const method = editingId ? "PUT" : "POST"; const url = editingId ? `${baseUrl}/api/montages/${editingId}` : `${baseUrl}/api/montages`; const basePayload = { reference: newRef, frame: newFrame, description: newDesc, category: newCategory, glassType: newGlassType, urgency: newUrgency, diamondCutType: newDiamondCutType, engravingCount: newEngravingCount, shapeChange: newShapeChange, createdBy: "Admin", statut: newStatut }; const payload = method === "POST" ? { ...basePayload, userId: newClient } : basePayload; try { const res = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.success) { toast.success(editingId ? "Modifié !" : "Créé !"); setIsDialogOpen(false); fetchMontages(); } } catch { toast.error("Erreur API"); } finally { setIsSubmitting(false); } };
  const openCreateDialog = () => { setEditingId(null); setNewRef(""); setNewFrame(""); setNewCategory("Cerclé"); setNewGlassType([]); setNewUrgency("Standard"); setNewDiamondCutType("Standard"); setNewEngravingCount(0); setNewShapeChange(false); setNewDesc(""); setNewStatut("En attente"); setIsDialogOpen(true); };
  const openEditDialog = (m: Montage) => { setEditingId(m._id); setNewRef(m.reference || ""); setNewFrame(m.frame || ""); setNewCategory(m.category || "Cerclé"); setNewGlassType(m.glassType || []); setNewUrgency(m.urgency || "Standard"); setNewDiamondCutType(m.diamondCutType || "Standard"); setNewEngravingCount(m.engravingCount || 0); setNewShapeChange(m.shapeChange || false); setNewDesc(m.description || ""); setNewStatut(m.statut || "En attente"); setNewClient(m.userId); setIsDialogOpen(true); };
  const handleStatusChange = async (id: string, s: string) => { await authFetch(`${getApiUrl()}/api/montages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: s }) }); fetchMontages(); toast.success(`Statut : ${s}`); };
  const handleDelete = async (id: string) => { if (confirm("Supprimer ce dossier ?")) { await authFetch(`${getApiUrl()}/api/montages/${id}`, { method: 'DELETE' }); fetchMontages(); toast.success("Supprimé"); } };
  const handleGenerateInvoice = (client: Client, items: Montage[]) => { setCurrentClientToInvoice(client); setMontagesToInvoice(items); setIsInvoiceOpen(true); };
  const handleInvoicePublished = (inv: FactureData) => setAllInvoices(p => [inv, ...p]);
  const openClientInvoices = (c: Client) => { setSelectedClient(c); setCurrentClientInvoices(allInvoices.filter(f => f.userId === c._id)); setIsClientInvoicesModalOpen(true); };
  const handleGlassTypeChange = (type: string, checked: boolean) => setNewGlassType(p => checked ? [...p, type] : p.filter(t => t !== type));
  const openShopAssign = (manager: Client) => { setSelectedManager(manager); setTempAssignedShops(manager.assignedShops?.map((s: any) => typeof s === 'string' ? s : s._id) || []); setIsShopAssignOpen(true); };
  const saveAssignedShops = async () => { if (!selectedManager) return; try { const res = await authFetch(`${getApiUrl()}/api/users/${selectedManager._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedShops: tempAssignedShops }) }); const data = await res.json(); if (data.success) { toast.success("Magasins assignés !"); setClients(p => p.map(c => c._id === selectedManager._id ? { ...c, assignedShops: data.user.assignedShops } : c)); setIsShopAssignOpen(false); } else toast.error("Erreur sauvegarde."); } catch { toast.error("Erreur technique."); } };
  const handleExportCSV = () => { const headers = ["Date", "Client", "Référence", "Monture", "Catégorie", "Statut", "Prix HT", "Créé par"]; const csv = [headers.join(";"), ...montages.map(m => { const c = clients.find(cl => cl._id === m.userId); return [new Date(m.dateReception).toLocaleDateString(), `"${c?.nomSociete || ''}"`, `"${m.reference || ''}"`, `"${m.frame || ''}"`, m.category, m.statut, calculateSingleMontagePrice(m, c?.pricingTier || 1).toFixed(2).replace('.', ','), `"${m.createdBy || ''}"`].join(";"); })].join("\n"); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `export_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); };

  const filteredMontages = montages.filter(m => {
    const s = normalize(searchTerm);
    const match = (normalize(m.reference) + normalize(m.clientName)).includes(s);
    let statusMatch = true;
    if (statusFilter === 'En production') statusMatch = m.statut === 'En cours' || m.statut === 'Reçu';
    else if (statusFilter) statusMatch = m.statut === statusFilter;
    return match && statusMatch;
  });
  const sorted = [...filteredMontages].sort((a, b) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime());
  const counts: Record<string, number> = {};
  const montagesToDisplay = showAllHistory ? sorted : sorted.filter(m => { counts[m.userId] = (counts[m.userId] || 0) + 1; return counts[m.userId] <= 20; });
  const hiddenCount = filteredMontages.length - montagesToDisplay.length;
  const groupedByMonthAndShop = filteredMontages.reduce((acc: any, m) => {
    const c = clients.find(cl => cl._id === m.userId);
    const clientName = c?.nomSociete || m.clientName || `ID: ${m.userId.substring(0, 4)}`;
    let month = "Date inconnue";
    try { if (m.dateReception) month = new Date(m.dateReception).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); } catch {}
    if (!acc[month]) acc[month] = {};
    if (!acc[month][clientName]) acc[month][clientName] = [];
    acc[month][clientName].push(m);
    return acc;
  }, {});
  const filteredClients = clients.filter(c => normalize(c.nomSociete).includes(normalize(searchTerm)));
  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#C9A96E]" />
        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />

      <div className="flex-grow pt-24 pb-12 px-6 container mx-auto max-w-7xl">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className={S.label}>Administration</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">Tableau de Bord</h1>
            <p className="text-sm text-gray-400 mt-1 font-light">{montages.length} montages chargés</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleExportCSV} className={S.btnOutline + " h-9 px-4 gap-2"}><FileText className="w-3.5 h-3.5" /> Export CSV</Button>
            <Button onClick={openCreateDialog} className={S.btnPrimary + " h-9 px-5 gap-2"}><PlusCircle className="w-3.5 h-3.5" /> Créer un dossier</Button>
            <Button onClick={() => { localStorage.clear(); navigate("/"); }} className={S.btnDanger + " h-9 px-4"}>Déconnexion</Button>
          </div>
        </div>

        {/* Cartes stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            { label: "À traiter", value: pendingCount, filter: 'En attente', dot: 'bg-amber-400' },
            { label: "En Production", value: inProgressCount, filter: 'En production', dot: 'bg-orange-400' },
            { label: "Clients", value: clients.length, filter: null, dot: 'bg-[#C9A96E]' },
          ].map(({ label, value, filter, dot }) => (
            <div
              key={label}
              onClick={() => filter && setStatusFilter(statusFilter === filter ? null : filter)}
              className={`${S.card} p-6 transition-all duration-300 ${filter ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${statusFilter === filter && filter ? 'ring-2 ring-[#C9A96E]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <span className={S.label} style={{ marginBottom: 0 }}>{label}</span>
              </div>
              <p className="font-playfair text-4xl font-normal text-[#0F0E0C]">{value}</p>
            </div>
          ))}
        </div>

        {/* Filtre actif */}
        {statusFilter && (
          <div className="mb-5">
            <button onClick={() => setStatusFilter(null)} className="inline-flex items-center gap-2 text-xs tracking-wide bg-white border border-[#EDE8DF] rounded-full px-4 py-2 text-[#0F0E0C] hover:bg-[#F7F4EE] transition-colors">
              Filtre : {statusFilter} <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative mb-7">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
          <input
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm text-[#0F0E0C] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all"
            placeholder="Rechercher un dossier, un client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="atelier" className="space-y-6">
          <TabsList className="bg-white border border-[#EDE8DF] rounded-2xl p-1 h-auto w-full md:w-auto shadow-sm">
            <TabsTrigger value="atelier" className="rounded-xl px-6 py-2.5 text-xs tracking-wide data-[state=active]:bg-[#0F0E0C] data-[state=active]:text-[#F7F4EE] transition-all">
              <Glasses className="w-3.5 h-3.5 mr-2" /> Atelier ({filteredMontages.length})
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-xl px-6 py-2.5 text-xs tracking-wide data-[state=active]:bg-[#0F0E0C] data-[state=active]:text-[#F7F4EE] transition-all">
              <Users className="w-3.5 h-3.5 mr-2" /> Clients ({filteredClients.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Atelier */}
          <TabsContent value="atelier">
            <div className={S.card + " overflow-hidden"}>
              <div className="px-6 py-4 border-b border-[#EDE8DF] bg-white">
                <p className={S.label}>Production</p>
                <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Flux de Production</h2>
              </div>
              <div className="p-6 min-h-[400px]">
                {Object.keys(groupedByMonthAndShop).length === 0
                  ? <div className="text-center py-20 text-gray-300 text-sm">Aucun montage avec les filtres actuels.</div>
                  : (
                    <Accordion type="multiple" className="space-y-3">
                      {Object.entries(groupedByMonthAndShop).sort().reverse().map(([monthName, shopGroups]: any) => (
                        <AccordionItem key={monthName} value={monthName} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                          <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#F7F4EE] transition-colors">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-[#C9A96E]" />
                              <span className="font-playfair text-base font-normal text-[#0F0E0C] capitalize">{monthName}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-5 pt-2">
                            <Accordion type="multiple" className="space-y-2">
                              {Object.entries(shopGroups).map(([shopName, items]: any) => {
                                const firstMontage = items[0] as Montage;
                                const client = clients.find(c => c._id === firstMontage.userId);
                                return (
                                  <AccordionItem key={shopName} value={shopName} className="bg-[#F7F4EE] border border-[#EDE8DF] rounded-xl overflow-hidden">
                                    <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#EDE8DF] transition-colors">
                                      <div className="flex items-center gap-3 w-full pr-3">
                                        <span className="font-medium text-[#0F0E0C] text-sm">{shopName}</span>
                                        <span className="text-xs text-gray-400">({items.length})</span>
                                        <Button
                                          size="sm"
                                          onClick={e => { e.stopPropagation(); if (client) handleGenerateInvoice(client, items); }}
                                          disabled={!client}
                                          className={S.btnGold + " ml-auto h-7 px-3 text-[10px]"}
                                        >
                                          <Receipt className="w-3 h-3 mr-1" /> Facturer
                                        </Button>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4 pt-2 space-y-2">
                                      {items.map((m: Montage) => {
                                        const price = calculateSingleMontagePrice(m, client?.pricingTier || 1);
                                        return (
                                          <div key={m._id} className="bg-white border border-[#EDE8DF] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-sm transition-all">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className="font-semibold text-[#0F0E0C]">{m.reference}</span>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-sm text-gray-500">{m.frame}</span>
                                                <StatusBadge statut={m.statut} />
                                                <span className="ml-auto text-xs font-medium text-[#9A7A45]">{price.toFixed(2)} € HT</span>
                                              </div>
                                              <div className="flex flex-wrap gap-1.5">
                                                <span className="text-[10px] rounded-full px-2 py-0.5 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500">{m.category}</span>
                                                {m.urgency !== 'Standard' && <span className="text-[10px] rounded-full px-2 py-0.5 bg-red-50 border border-red-100 text-red-600">{m.urgency}</span>}
                                                {m.diamondCutType !== 'Standard' && <span className="text-[10px] rounded-full px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600">{m.diamondCutType}</span>}
                                                {m.glassType?.map(g => <span key={g} className="text-[10px] rounded-full px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600">{g.replace('Verre ', '')}</span>)}
                                                {m.engravingCount && m.engravingCount > 0 ? <span className="text-[10px] rounded-full px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-600">{m.engravingCount} gravure(s)</span> : null}
                                              </div>
                                              {m.description && <p className="text-xs text-gray-400 mt-1.5 italic">{m.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <Select defaultValue={m.statut} onValueChange={v => handleStatusChange(m._id, v)}>
                                                <SelectTrigger className="w-[140px] h-8 text-xs bg-white border border-[#EDE8DF] rounded-xl focus:ring-1 focus:ring-[#C9A96E]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white rounded-xl">
                                                  {Object.entries(statusConfig).map(([val, cfg]) => (
                                                    <SelectItem key={val} value={val}>
                                                      <span className="flex items-center gap-2 text-xs">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                                                      </span>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              {m.photoUrl ? (
                                                <Button variant="outline" size="icon" className={S.btnOutline + " h-8 w-8"} onClick={async e => { e.stopPropagation(); toast.loading("Chargement...", { id: 'p' }); try { const res = await authFetch(`${getApiUrl()}/api/montages/${m._id}`); const d = await res.json(); if (d.success && d.montage.photoUrl) { setSelectedPhotoUrl(d.montage.photoUrl); toast.dismiss('p'); } else toast.error("Image introuvable", { id: 'p' }); } catch { toast.error("Erreur serveur", { id: 'p' }); } }}>
                                                  <ImageIcon className="w-3.5 h-3.5 text-[#C9A96E]" />
                                                </Button>
                                              ) : (
                                                <>
                                                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => fileInputRefs.current[m._id] = el} onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(m._id, e.target.files[0]); }} />
                                                  <Button variant="outline" size="icon" className={S.btnOutline + " h-8 w-8"} onClick={e => { e.stopPropagation(); fileInputRefs.current[m._id]?.click(); }}>
                                                    <Camera className="w-3.5 h-3.5" />
                                                  </Button>
                                                </>
                                              )}
                                              <Button variant="outline" size="icon" className={S.btnOutline + " h-8 w-8"} onClick={() => openEditDialog(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                                              <Button variant="outline" size="icon" className={S.btnDanger + " h-8 w-8"} onClick={() => handleDelete(m._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                            </div>
                                          </div>
                                        );
                                      })}
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
                {!showAllHistory && hiddenCount > 0 && (
                  <div className="mt-8 flex justify-center">
                    <button onClick={() => setShowAllHistory(true)} className="text-xs tracking-wide text-[#C9A96E] border border-[#C9A96E]/30 rounded-full px-6 py-2.5 hover:bg-[#C9A96E]/5 transition-colors">
                      Charger l'historique ({hiddenCount} dossiers masqués)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Clients */}
          <TabsContent value="clients">
            <div className={S.card + " overflow-hidden"}>
              <div className="px-6 py-4 border-b border-[#EDE8DF] bg-white">
                <p className={S.label}>Gestion</p>
                <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Fiches Clients & Facturation</h2>
              </div>
              <div className="divide-y divide-[#EDE8DF]">
                {filteredClients.map(c => (
                  <div key={c._id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => openClientInvoices(c)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-[#0F0E0C]">{c.nomSociete}</p>
                        {c.role === 'manager' && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600">Manager</span>}
                        {c.isVerified
                          ? <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Validé</span>
                          : <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> En attente</span>}
                      </div>
                      <p className="text-xs text-gray-400">{c.email} · SIRET : {c.siret}</p>
                      {c.address && <p className="text-xs text-gray-300 mt-0.5">{c.address} {c.zipCity}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={S.label} style={{ marginBottom: 0 }}>Tarif</span>
                        <Select value={c.pricingTier?.toString() || "1"} onValueChange={async val => { const t = parseInt(val); await authFetch(`${getApiUrl()}/api/users/${c._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pricingTier: t }) }); toast.success(`Tarif ${t} appliqué`); setClients(p => p.map(cl => cl._id === c._id ? { ...cl, pricingTier: t as 1 | 2 } : cl)); }}>
                          <SelectTrigger className="w-28 h-8 text-xs bg-white border border-[#EDE8DF] rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white rounded-xl">
                            <SelectItem value="1">Tarif 1 — Std</SelectItem>
                            <SelectItem value="2">Tarif 2 — VIP</SelectItem>
                            <SelectItem value="3">Tarif — 10%</SelectItem>
                            <SelectItem value="4">Tarif — 15%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {c.role === 'manager' && <Button size="sm" className={S.btnOutline + " h-8 px-3 text-[10px] gap-1"} onClick={e => { e.stopPropagation(); openShopAssign(c); }}><Store className="w-3 h-3" /> Magasins</Button>}
                      {!c.isVerified && <Button size="sm" className={S.btnPrimary + " h-8 px-3 text-[10px] gap-1"} onClick={async e => { e.stopPropagation(); if (confirm(`Valider ${c.nomSociete} ?`)) { await authFetch(`${getApiUrl()}/api/users/${c._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVerified: true }) }); setClients(p => p.map(cl => cl._id === c._id ? { ...cl, isVerified: true } : cl)); } }}><CheckCircle2 className="w-3 h-3" /> Valider</Button>}
                      <Button size="sm" className={S.btnGold + " h-8 px-3 text-[10px] gap-1"} onClick={e => { e.stopPropagation(); openClientInvoices(c); }}><Receipt className="w-3 h-3" /> Factures</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modale assignation */}
        <Dialog open={isShopAssignOpen} onOpenChange={setIsShopAssignOpen}>
          <DialogContent className="bg-white max-w-lg rounded-2xl">
            <DialogHeader><DialogTitle className="font-playfair font-normal">Magasins — {selectedManager?.nomSociete}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {clients.filter(c => c.role === 'user').map(shop => (
                <div key={shop._id} className="flex items-center gap-3 p-3 border border-[#EDE8DF] rounded-xl hover:bg-[#F7F4EE] transition-colors">
                  <Checkbox id={shop._id} checked={tempAssignedShops.includes(shop._id)} onCheckedChange={checked => setTempAssignedShops(p => checked ? [...p, shop._id] : p.filter(id => id !== shop._id))} />
                  <label htmlFor={shop._id} className="flex-1 cursor-pointer text-sm font-medium text-[#0F0E0C]">{shop.nomSociete} <span className="text-gray-400 text-xs ml-1">{shop.zipCity}</span></label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsShopAssignOpen(false)} className={S.btnOutline + " h-9"}>Annuler</Button>
              <Button onClick={saveAssignedShops} className={S.btnPrimary + " h-9 px-5"}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modale création/édition dossier */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl">
            <DialogHeader><DialogTitle className="font-playfair font-normal text-xl">{editingId ? "Modifier le dossier" : "Nouveau dossier"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveMontage} className="space-y-5 pt-2">
              <div>
                <Label className={S.label}>Client</Label>
                <Select onValueChange={setNewClient} value={newClient}>
                  <SelectTrigger className={S.input + " w-full h-10"}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">{clients.map(c => <SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className={S.label}>Réf.</Label><Input value={newRef} onChange={e => setNewRef(e.target.value)} required className={S.input + " h-10"} /></div>
                <div><Label className={S.label}>Monture</Label><Input value={newFrame} onChange={e => setNewFrame(e.target.value)} required className={S.input + " h-10"} /></div>
                <div><Label className={S.label}>Urgence</Label>
                  <Select onValueChange={setNewUrgency} value={newUrgency}>
                    <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl">{URGENCY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className={S.label}>Statut du montage</Label>
                <Select onValueChange={setNewStatut} value={newStatut}>
                  <SelectTrigger className={S.input + " h-10 w-full"}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    {Object.entries(statusConfig).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>
                        <span className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className={S.label}>Type</Label>
                  <Select onValueChange={setNewCategory} value={newCategory}>
                    <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem><SelectItem value="Sans Montage">Sans Montage</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className={S.label}>Diamond Cut</Label>
                  <Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}>
                    <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl">{DIAMONDCUT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className={S.label}>Gravures</Label><Input type="number" value={newEngravingCount} onChange={e => setNewEngravingCount(parseInt(e.target.value) || 0)} className={S.input + " h-10"} /></div>
              </div>
              <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                <Label className={S.label}>Options Verres & Autres</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {GLASS_OPTIONS.map(o => (<div key={o} className="flex items-center gap-2"><Checkbox id={o} checked={newGlassType.includes(o)} onCheckedChange={c => handleGlassTypeChange(o, c as boolean)} /><label htmlFor={o} className="text-sm cursor-pointer text-[#0F0E0C]">{o}</label></div>))}
                  <div className="flex items-center gap-2 border-l border-[#EDE8DF] pl-4"><Checkbox id="sc" checked={newShapeChange} onCheckedChange={c => setNewShapeChange(c as boolean)} /><label htmlFor="sc" className="text-sm cursor-pointer text-[#0F0E0C]">Changement de forme</label></div>
                </div>
              </div>
              <div><Label className={S.label}>Commentaire / Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Information spécifique visible par le client..." className={S.input + " min-h-[80px] resize-none"} /></div>
              <Button type="submit" disabled={isSubmitting} className={S.btnPrimary + " w-full h-11"}>{isSubmitting ? "Enregistrement..." : (editingId ? "Modifier" : "Créer")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {currentClientToInvoice && <InvoiceModal client={currentClientToInvoice} montages={montagesToInvoice} isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onInvoicePublished={handleInvoicePublished} />}
        <ClientInvoicesModal client={selectedClient} invoices={currentClientInvoices} isOpen={isClientInvoicesModalOpen} onClose={() => setIsClientInvoicesModalOpen(false)} onDelete={handleDeleteInvoice} onPaymentUpdate={handlePaymentUpdate} />

        <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
          <DialogContent className="bg-[#0F0E0C]/95 border-[#C9A96E]/20 p-0 flex items-center justify-center max-w-4xl rounded-2xl overflow-hidden">
            <div className="relative p-4">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white bg-white/10 hover:bg-white/20 rounded-full" onClick={() => setSelectedPhotoUrl(null)}><X className="w-5 h-5" /></Button>
              {selectedPhotoUrl && <img src={selectedPhotoUrl} alt="Montage" className="max-w-full max-h-[85vh] object-contain rounded-xl" />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
