import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Clock, CheckCircle2, AlertCircle, Package, Image as ImageIcon, X, UserCog, Store, RefreshCw, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authFetch, API_URL } from "@/lib/api";

// --- INTERFACES ---
interface UserData {
  id: string; nomSociete: string; address?: string; zipCity?: string; siret: string; role?: string;
  assignedShops?: any[]; pricingTier?: 1 | 2;
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

const normalize = (t: string | undefined) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

// --- PRIX ---
const CATEGORY_COSTS: Record<string, { 1: number, 2: number }> = {
  'Sans Montage': { 1: 0, 2: 0 }, 'Cerclé': { 1: 7.00, 2: 3.60 },
  'Percé': { 1: 15.90, 2: 12.00 }, 'Nylor': { 1: 14.90, 2: 12.00 }
};
const GLASS_COSTS: Record<string, { 1: number, 2: number }> = {
  'Verre Dégradé 4 saisons': { 1: 28.80, 2: 28.80 }, 'Verre Dégradé': { 1: 50.00, 2: 43.00 }, 'Verre de stock': { 1: 0, 2: 0 }
};
const DIAMONDCUT_COSTS: Record<string, { 1: number, 2: number }> = {
  'Facette Lisse': { 1: 39.80, 2: 21.50 }, 'Facette Twinkle': { 1: 79.80, 2: 60.00 },
  'Diamond Ice': { 1: 93.60, 2: 60.00 }, 'Standard': { 1: 0, 2: 0 }
};
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0 };
const SHAPE_CHANGE_COST = { 1: 10.00, 2: 3.50 };
const ENGRAVING_UNIT_COST = { 1: 12.00, 2: 10.00 };

const calculatePrice = (m: Montage, tier: number = 1): number => {
  const t = (tier === 1 || tier === 2) ? tier as 1 | 2 : 1 as 1 | 2;
  let base = 0;
  base += CATEGORY_COSTS[m.category || 'Cerclé']?.[t] || 0;
  base += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard']?.[t] || 0;
  base += (m.engravingCount || 0) * ENGRAVING_UNIT_COST[t];
  m.glassType?.forEach(g => { base += GLASS_COSTS[g]?.[t] || 0; });
  if (m.shapeChange) base += SHAPE_CHANGE_COST[t];
  if (tier === 3) base *= 0.90;
  else if (tier === 4) base *= 0.85;
  return base + base * (URGENCY_RATES[m.urgency || 'Standard'] || 0);
};

const URGENCY_OPTIONS = ['Standard', 'Prioritaire -48H', 'Express -24H', 'Urgent -3H'];
const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
const GLASS_OPTIONS = ['Verre Dégradé 4 saisons', 'Verre Dégradé', 'Verre de stock'];

// --- STYLES ---
const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1",
  input: "bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all",
  btnPrimary: "inline-flex items-center justify-center gap-2 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-xs tracking-widest uppercase font-normal transition-all px-5 h-10 cursor-pointer border-0",
  btnOutline: "inline-flex items-center justify-center gap-2 bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-xs font-normal transition-all px-4 h-10 cursor-pointer",
  btnGold: "inline-flex items-center justify-center gap-2 border border-[#C9A96E] text-[#C9A96E] bg-transparent hover:bg-[#C9A96E] hover:text-[#0F0E0C] rounded-xl text-xs uppercase tracking-widest font-normal transition-all px-4 h-9 cursor-pointer",
};

const statusConfig: Record<string, { dot: string; cls: string }> = {
  'En attente': { dot: 'bg-amber-400',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Reçu':       { dot: 'bg-blue-400',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'En cours':   { dot: 'bg-orange-400',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Terminé':    { dot: 'bg-emerald-400', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Expédié':    { dot: 'bg-purple-400',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const StatusPill = ({ statut }: { statut: string }) => {
  const cfg = statusConfig[statut] || { dot: 'bg-gray-300', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-wide rounded-full px-3 py-1 border font-normal ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {statut}
    </span>
  );
};

const MesCommandes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedTargetClient, setSelectedTargetClient] = useState("");
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
  const [refreshing, setRefreshing] = useState(false);

  const initialTab = new URLSearchParams(location.search).get('tab') === 'factures' ? 'factures' : 'commandes';

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (!str) { navigate("/espace-pro"); return; }
    try {
      const u: UserData = JSON.parse(str);
      setUser(u);
      const base = API_URL.replace('/api', '');
      let q = `?userId=${u.id}`;
      if (u.role === 'manager') q = `?role=manager&managerId=${u.id}`;
      authFetch(`${base}/api/montages${q}`).then(r => r.json()).then(d => { if (d.success) setMontages(d.montages); });
      authFetch(`${base}/api/factures?userId=${u.id}`).then(r => r.json()).then(d => {
        if (d.success) setFactures(d.factures.map((f: any) => ({ id: f._id, invoiceNumber: f.invoiceNumber, montageReference: f.montagesReferences?.join(', ') || 'N/A', dateEmission: f.dateEmission, totalHT: f.totalHT, totalTTC: f.totalTTC, invoiceData: f.invoiceData || [], amountPaid: f.amountPaid, paymentStatus: f.paymentStatus })));
      });
      if (u.role === 'manager') {
        authFetch(`${base}/api/users`).then(r => r.json()).then(d => {
          if (d.success) { setClientsList(d.users); if (u.assignedShops?.length) { const id = typeof u.assignedShops[0] === 'string' ? u.assignedShops[0] : u.assignedShops[0]._id; setSelectedTargetClient(id); } }
        });
      } else { setSelectedTargetClient(u.id); }
    } catch { navigate("/"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);
    try {
      const base = API_URL.replace('/api', '');
      let q = `?userId=${user.id}`;
      if (user.role === 'manager') q = `?role=manager&managerId=${user.id}`;
      const res = await authFetch(`${base}/api/montages${q}`);
      const d = await res.json();
      if (d.success) setMontages(d.montages);
    } catch {}
    finally { setRefreshing(false); }
  };

  const handleGlassTypeChange = (type: string, checked: boolean) =>
    setGlassType(p => checked ? [...p, type] : p.filter(t => t !== type));

  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetId = user.role === 'manager' ? selectedTargetClient : user.id;
    if (!targetId) { toast.error("Veuillez sélectionner un magasin."); return; }
    setIsSubmitting(true);
    try {
      const base = API_URL.replace('/api', '');
      const res = await authFetch(`${base}/api/montages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId, reference, frame, description, category, glassType, urgency, diamondCutType, engravingCount, shapeChange, createdBy: user.role === 'manager' ? `Manager (${user.nomSociete})` : 'Client' })
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Dossier envoyé à l'atelier !");
        setReference(""); setFrame(""); setDescription(""); setCategory("Cerclé"); setGlassType([]); setUrgency("Standard"); setDiamondCutType("Standard"); setEngravingCount(0); setShapeChange(false);
        fetchMontages(true);
      }
    } catch { toast.error("Erreur lors de l'envoi."); }
    finally { setIsSubmitting(false); }
  };

  const handleDownloadClientInvoice = async (facture: Facture) => {
    if (!user) return;
    toast.loading("Génération du PDF...", { id: 'dl' });
    const div = document.createElement('div');
    div.style.cssText = 'width:800px;padding:40px;background:white;position:absolute;top:-9999px;left:-9999px;font-family:sans-serif;color:#000';
    div.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:40px"><div><h1 style="font-size:28px;font-weight:bold;margin-bottom:8px">DÉTAIL DE FACTURATION</h1><p style="color:#999;font-size:12px">Date : ${new Date(facture.dateEmission).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><h2 style="font-size:16px;font-weight:bold">L'Atelier des Arts</h2><p style="color:#666;font-size:11px">178 Avenue Daumesnil, 75012 Paris</p><p style="color:#666;font-size:11px">SIRET : 98095501700010</p></div></div><div style="border-top:1px solid #eee;padding-top:20px;margin-bottom:30px"><p style="font-size:10px;font-weight:bold;color:#C9A96E;text-transform:uppercase;letter-spacing:2px">Facturé à</p><p style="font-size:18px;font-weight:bold;margin:4px 0">${user.nomSociete}</p><p style="color:#666;font-size:12px">${user.address || ''} ${user.zipCity || ''}</p></div><table style="width:100%;border-collapse:collapse;margin-bottom:30px"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:8px 0;font-size:11px;color:#999;text-transform:uppercase">Référence</th><th style="text-align:left;padding:8px 0;font-size:11px;color:#999;text-transform:uppercase">Détails</th><th style="text-align:right;padding:8px 0;font-size:11px;color:#999;text-transform:uppercase">Prix HT</th></tr></thead><tbody>${facture.invoiceData.map((i: any) => `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:10px 0;vertical-align:top;font-weight:500">${i.reference||'-'}</td><td style="padding:10px 0;font-size:11px;color:#666">${i.details.join('<br/>')}</td><td style="padding:10px 0;text-align:right;font-weight:bold">${i.price.toFixed(2)} €</td></tr>`).join('')}</tbody></table><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px"><div style="background:#F7F4EE;border:1px solid #EDE8DF;padding:16px;width:45%;border-radius:8px"><p style="font-weight:bold;font-size:11px;margin-bottom:8px;text-transform:uppercase">Coordonnées bancaires</p><p style="font-size:11px;color:#666">IBAN : FR76 1820 6002 0065 1045 3419 297</p><p style="font-size:11px;color:#666">BIC : AGRIFRPP882</p></div><div style="text-align:right"><p style="color:#666;margin:4px 0;font-size:13px">Total HT : ${facture.totalHT?.toFixed(2)} €</p><p style="color:#666;margin:4px 0;font-size:13px">TVA (20%) : ${(facture.totalTTC - (facture.totalHT || 0)).toFixed(2)} €</p><p style="font-size:22px;font-weight:bold;margin-top:8px">Net à payer : ${facture.totalTTC.toFixed(2)} €</p></div></div>`;
    document.body.appendChild(div);
    try {
      const canvas = await html2canvas(div, { scale: 2, windowWidth: div.scrollWidth, windowHeight: div.scrollHeight });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * w) / canvas.width;
      let left = imgH, pos = 0;
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, pos, w, imgH);
      left -= h;
      while (left > 0) { pos = left - imgH; pdf.addPage(); pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, pos, w, imgH); left -= h; }
      pdf.save(`Facturation_${facture.invoiceNumber}.pdf`);
      toast.success("PDF téléchargé !", { id: 'dl' });
    } catch { toast.error("Erreur téléchargement.", { id: 'dl' }); }
    finally { document.body.removeChild(div); }
  };

  const filteredMontages = montages.filter(m => normalize(m.reference + m.frame).includes(normalize(searchTerm)));
  const groupedByMonth = filteredMontages.reduce((acc: any, m) => {
    let month = "Date inconnue";
    try { month = new Date(m.dateReception).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); } catch {}
    if (!acc[month]) acc[month] = user?.role === 'manager' ? {} : [];
    if (user?.role === 'manager') {
      const shop = m.clientName || "Inconnu";
      if (!acc[month][shop]) acc[month][shop] = [];
      acc[month][shop].push(m);
    } else {
      acc[month].push(m);
    }
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#C9A96E]" />
        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span>
      </div>
    </div>
  );
  if (!user) return null;

  const isManager = user.role === 'manager';

  function renderMontageCard(m: Montage) {
    const tier = isManager ? (clientsList.find(c => c._id === m.userId)?.pricingTier || 1) : (user?.pricingTier || 1);
    const price = calculatePrice(m, tier);
    return (
      <div key={m._id} className="bg-white border border-[#EDE8DF] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-sm transition-all">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-semibold text-[#0F0E0C]">{m.reference}</span>
            <span className="text-[#EDE8DF]">·</span>
            <span className="text-sm text-gray-500">{m.frame}</span>
            <StatusPill statut={m.statut} />
            <span className="ml-auto text-xs font-medium text-[#9A7A45]">{price.toFixed(2)} € HT</span>
          </div>
          {isManager && m.createdBy?.includes("Manager") && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 w-fit mb-2">
              <UserCog className="w-2.5 h-2.5" /> {m.createdBy}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500">{m.category}</span>
            {m.urgency !== 'Standard' && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-red-50 border border-red-100 text-red-600">{m.urgency}</span>}
            {m.diamondCutType !== 'Standard' && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600">{m.diamondCutType}</span>}
            {m.glassType?.map(g => <span key={g} className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600">{g.replace('Verre ', '')}</span>)}
            {(m.engravingCount || 0) > 0 && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-600">{m.engravingCount} gravure(s)</span>}
            {m.shapeChange && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-600">Changement forme</span>}
          </div>
          {m.description && <p className="text-xs text-gray-400 italic">{m.description}</p>}
          <p className="text-[10px] text-gray-300 mt-1">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {m.photoUrl && (
            <button className={S.btnOutline + " h-9 w-9 p-0"} onClick={() => setSelectedPhotoUrl(m.photoUrl!)}>
              <ImageIcon className="w-3.5 h-3.5 text-[#C9A96E]" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-6 container mx-auto max-w-5xl">

        {/* En-tête */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <span className={S.label}>{isManager ? "Espace Manager" : "Espace Professionnel"}</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">{user.nomSociete}</h1>
          </div>
          <button onClick={() => fetchMontages()} className={S.btnOutline} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="bg-white border border-[#EDE8DF] rounded-2xl p-1 h-auto w-full md:w-auto shadow-sm">
            <TabsTrigger value="commandes" className="rounded-xl px-6 py-2.5 text-xs tracking-wide data-[state=active]:bg-[#0F0E0C] data-[state=active]:text-[#F7F4EE] transition-all">
              <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Mes Commandes ({montages.length})
            </TabsTrigger>
            <TabsTrigger value="factures" className="rounded-xl px-6 py-2.5 text-xs tracking-wide data-[state=active]:bg-[#0F0E0C] data-[state=active]:text-[#F7F4EE] transition-all">
              <Receipt className="w-3.5 h-3.5 mr-2" /> Mes Factures ({factures.length})
            </TabsTrigger>
          </TabsList>

          {/* ── ONGLET COMMANDES ── */}
          <TabsContent value="commandes" className="space-y-6">

            {/* Formulaire nouveau dossier */}
            <div className={S.card + " overflow-hidden"}>
              <div className="px-6 py-4 border-b border-[#EDE8DF]">
                <p className={S.label}>{isManager ? "Ajouter un dossier" : "Nouvelle demande"}</p>
                <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#C9A96E]" />
                  {isManager ? "Dossier pour un magasin" : "Nouvelle demande de montage"}
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddMontage} className="space-y-5">
                  {/* Sélection magasin si manager */}
                  {isManager && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <Label className="text-[9px] tracking-[0.2em] uppercase text-blue-600 font-normal block mb-2">Pour le compte de quel magasin ?</Label>
                      <Select onValueChange={setSelectedTargetClient} value={selectedTargetClient}>
                        <SelectTrigger className={S.input + " h-10"}><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl max-h-60">
                          {clientsList.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className={S.label}>Référence *</Label><Input placeholder="Ex : REF-123" value={reference} onChange={e => setReference(e.target.value)} required className={S.input + " h-10"} /></div>
                    <div><Label className={S.label}>Modèle monture *</Label><Input placeholder="Ex : RayBan 450" value={frame} onChange={e => setFrame(e.target.value)} required className={S.input + " h-10"} /></div>
                    <div><Label className={S.label}>Urgence</Label>
                      <Select onValueChange={setUrgency} value={urgency}>
                        <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">{URGENCY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className={S.label}>Type</Label>
                      <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem><SelectItem value="Sans Montage">Sans Montage</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className={S.label}>Diamond Cut</Label>
                      <Select onValueChange={setDiamondCutType} value={diamondCutType}>
                        <SelectTrigger className={S.input + " h-10"}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">{DIAMONDCUT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className={S.label}>Gravure (qté)</Label><Input type="number" min={0} max={2} value={engravingCount} onChange={e => setEngravingCount(parseInt(e.target.value) || 0)} className={S.input + " h-10"} /></div>
                  </div>
                  <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                    <p className={S.label}>Options verres & autres</p>
                    <div className="flex flex-wrap gap-5 mt-2">
                      {GLASS_OPTIONS.map(o => (
                        <div key={o} className="flex items-center gap-2">
                          <Checkbox id={o} checked={glassType.includes(o)} onCheckedChange={c => handleGlassTypeChange(o, c as boolean)} />
                          <label htmlFor={o} className="text-sm cursor-pointer text-[#0F0E0C] font-light">{o}</label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 border-l border-[#EDE8DF] pl-5">
                        <Checkbox id="sc" checked={shapeChange} onCheckedChange={c => setShapeChange(c as boolean)} />
                        <label htmlFor="sc" className="text-sm cursor-pointer text-[#0F0E0C] font-light">Changement de forme</label>
                      </div>
                    </div>
                  </div>
                  <div><Label className={S.label}>Commentaire / Note</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Informations supplémentaires..." className={S.input + " h-10"} /></div>
                  <button type="submit" disabled={isSubmitting} className={S.btnPrimary + " w-full md:w-auto"}>
                    {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi en cours...</> : "Valider et envoyer à l'atelier"}
                  </button>
                </form>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
              <input
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all"
                placeholder="Rechercher un dossier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Liste dossiers */}
            {Object.keys(groupedByMonth).length === 0
              ? <div className="text-center py-16 text-gray-300 text-sm">Aucune commande trouvée.</div>
              : (
                <Accordion type="multiple" className="space-y-3" defaultValue={[Object.keys(groupedByMonth)[0]]}>
                  {Object.entries(groupedByMonth).sort().reverse().map(([month, content]: any) => (
                    <AccordionItem key={month} value={month} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                      <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#F7F4EE] transition-colors">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-[#C9A96E]" />
                          <span className="font-playfair text-base font-normal text-[#0F0E0C] capitalize">{month}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-2">
                        {isManager ? (
                          <Accordion type="multiple" className="space-y-2">
                            {Object.entries(content).map(([shopName, shopItems]: any) => (
                              <AccordionItem key={shopName} value={shopName} className="bg-[#F7F4EE] border border-[#EDE8DF] rounded-xl overflow-hidden">
                                <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#EDE8DF] transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Store className="w-3.5 h-3.5 text-[#C9A96E]" />
                                    <span className="text-sm font-medium text-[#0F0E0C]">{shopName}</span>
                                    <span className="text-xs text-gray-400 ml-1">({shopItems.length})</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-2 space-y-2">
                                  {shopItems.map((m: Montage) => renderMontageCard(m))}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <div className="space-y-2">
                            {[...content].sort((a: Montage, b: Montage) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime()).map((m: Montage) => renderMontageCard(m))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )
            }
          </TabsContent>

          {/* ── ONGLET FACTURES ── */}
          <TabsContent value="factures">
            {factures.length === 0
              ? <div className="text-center py-16 text-gray-300 text-sm">Aucune facture disponible.</div>
              : (
                <div className="space-y-3">
                  {factures.map(f => {
                    const isPaid = f.paymentStatus === 'Payé';
                    const isPartial = f.paymentStatus === 'Partiellement payé';
                    const remaining = f.totalTTC - (f.amountPaid || 0);
                    return (
                      <div key={f.invoiceNumber} className="bg-white border border-[#EDE8DF] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-[#0F0E0C] flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-[#C9A96E]" /> {f.invoiceNumber}
                            </p>
                            {isPaid && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700">Réglé</span>}
                            {isPartial && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700">Reste : {remaining.toFixed(2)} €</span>}
                            {!isPaid && !isPartial && <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-700">À régler</span>}
                          </div>
                          <p className="text-xs text-gray-400">Émis le {new Date(f.dateEmission).toLocaleDateString('fr-FR')}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">Dossiers : {f.montageReference}</p>
                        </div>
                        <div className="flex items-center gap-5">
                          <div className="text-right">
                            <p className={S.label} style={{ marginBottom: 2 }}>Montant TTC</p>
                            <span className="font-playfair text-xl font-normal text-[#0F0E0C]">{f.totalTTC.toFixed(2)} €</span>
                          </div>
                          <button onClick={() => handleDownloadClientInvoice(f)} className={S.btnGold}>
                            <FileText className="w-3.5 h-3.5" /> Télécharger
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </TabsContent>
        </Tabs>

        {/* Modale photo */}
        <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
          <DialogContent className="bg-[#0F0E0C]/95 border-[#C9A96E]/20 p-0 flex items-center justify-center max-w-4xl rounded-2xl overflow-hidden">
            <div className="relative p-4">
              <button className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={() => setSelectedPhotoUrl(null)}>
                <X className="w-4 h-4" />
              </button>
              {selectedPhotoUrl && <img src={selectedPhotoUrl} alt="Montage" className="max-w-full max-h-[85vh] object-contain rounded-xl" />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MesCommandes;
