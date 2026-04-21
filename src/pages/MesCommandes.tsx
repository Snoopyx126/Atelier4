import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Image as ImageIcon, X, UserCog, Store, RefreshCw, Loader2, Clock, ChevronRight } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authFetch, API_URL } from "@/lib/api";

// ─── INTERFACES ────────────────────────────────────────────────────────────────
interface UserData {
  id: string; nomSociete: string; address?: string; zipCity?: string;
  siret: string; role?: string; assignedShops?: any[]; pricingTier?: 1|2;
}
interface Montage {
  _id: string; reference: string; frame: string; description: string; category: string;
  glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number;
  shapeChange?: boolean; statut: string; dateReception: string; photoUrl?: string;
  createdBy?: string; clientName?: string; userId?: string;
  statusHistory?: {statut: string; date: string}[];
}
interface Facture {
  id: string; invoiceNumber: string; montageReference: string; dateEmission: string;
  totalHT: number; totalTTC: number; invoiceData: any[]; amountPaid?: number; paymentStatus?: string;
}

// ─── PRIX ──────────────────────────────────────────────────────────────────────
const CC: Record<string,{1:number,2:number}> = {
  'Sans Montage':{1:0,2:0}, 'Cerclé':{1:7,2:3.6}, 'Percé':{1:15.9,2:12}, 'Nylor':{1:14.9,2:12}
};
const GC: Record<string,{1:number,2:number}> = {
  'Verre Dégradé 4 saisons':{1:28.8,2:28.8}, 'Verre Dégradé':{1:50,2:43}, 'Verre de stock':{1:0,2:0}
};
const DC: Record<string,{1:number,2:number}> = {
  'Facette Lisse':{1:39.8,2:21.5}, 'Facette Twinkle':{1:79.8,2:60}, 'Diamond Ice':{1:93.6,2:60}, 'Standard':{1:0,2:0}
};
const UR: Record<string,number> = {'Urgent -3H':0.5,'Urgent -24H':0.3,'Urgent -48H':0.2,'Standard':0};
const SHAPE = {1:10,2:3.5};
const ENG   = {1:12,2:10};

const calcP = (m: Montage, tier=1): number => {
  const t = (tier===1||tier===2) ? tier as 1|2 : 1 as 1|2;
  let b = (CC[m.category||'Cerclé']?.[t]||0) + (DC[m.diamondCutType||'Standard']?.[t]||0) + (m.engravingCount||0)*ENG[t];
  m.glassType?.forEach(g => { b += GC[g]?.[t]||0; });
  if (m.shapeChange) b += SHAPE[t];
  if (tier===3) b*=0.9; else if (tier===4) b*=0.85;
  return b + b*(UR[m.urgency||'Standard']||0);
};

const URGENCY_OPTIONS  = ['Standard','Prioritaire -48H','Express -24H','Urgent -3H'];
const DIAMONDCUT_OPTIONS = ['Standard','Facette Lisse','Diamond Ice','Facette Twinkle'];
const GLASS_OPTIONS    = ['Verre Dégradé 4 saisons','Verre Dégradé','Verre de stock'];
const STATUS_ORDER     = ['En attente','Reçu','En cours','Terminé'];
const normalize = (t?: string) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim() : "";

// ─── CONFIG STATUTS ────────────────────────────────────────────────────────────
const statusCfg: Record<string,{dot:string;cls:string}> = {
  'En attente': {dot:'bg-amber-400',   cls:'bg-amber-50 text-amber-800 border-amber-300'},
  'Reçu':       {dot:'bg-blue-400',    cls:'bg-blue-50 text-blue-800 border-blue-300'},
  'En cours':   {dot:'bg-orange-400',  cls:'bg-orange-50 text-orange-800 border-orange-300'},
  'Terminé':    {dot:'bg-emerald-400', cls:'bg-emerald-50 text-emerald-800 border-emerald-300'},
  'Expédié':    {dot:'bg-purple-400',  cls:'bg-purple-50 text-purple-800 border-purple-300'},
};

const StatusPill = ({s}: {s:string}) => {
  const c = statusCfg[s] || {dot:'bg-gray-300', cls:'bg-gray-50 text-gray-700 border-gray-300'};
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 border ${c.cls}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`}/>
      {s}
    </span>
  );
};

// ─── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  card:  "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  lbl:   "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
  inp:   "bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all",
  btnP:  "inline-flex items-center justify-center gap-2 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-xs tracking-widest uppercase font-medium transition-all px-5 h-10 cursor-pointer border-0",
  btnO:  "inline-flex items-center justify-center gap-2 bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-xs font-medium transition-all px-4 h-9 cursor-pointer",
  btnG:  "inline-flex items-center justify-center gap-2 border border-[#C9A96E] text-[#C9A96E] bg-transparent hover:bg-[#C9A96E] hover:text-[#0F0E0C] rounded-xl text-xs uppercase tracking-widest font-medium transition-all px-4 h-9 cursor-pointer",
};

// ─── QUICKVIEW MODAL ───────────────────────────────────────────────────────────
const QuickView = ({m, tier, onClose}: {m:Montage|null; tier:number; onClose:()=>void}) => {
  if (!m) return null;
  const price = calcP(m, tier);
  const currentIdx = STATUS_ORDER.indexOf(m.statut);
  const pct = currentIdx >= 0 ? (currentIdx / (STATUS_ORDER.length-1)) * 100 : 0;
  const history = m.statusHistory || [];

  return (
    <Dialog open={!!m} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#EDE8DF]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1">Dossier</span>
              <DialogTitle className="font-playfair text-2xl font-normal text-[#0F0E0C]">{m.reference}</DialogTitle>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{m.frame}</p>
            </div>
            <StatusPill s={m.statut}/>
          </div>
        </DialogHeader>
        <div className="px-6 py-5 space-y-5">
          {/* Barre de progression */}
          <div>
            <div className="flex justify-between mb-3">
              {STATUS_ORDER.map((s,i) => {
                const done = i <= currentIdx;
                const c = statusCfg[s];
                return (
                  <div key={s} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${done ? `${c.dot} border-transparent` : 'bg-white border-[#EDE8DF]'}`}>
                      {done && <span className="w-2.5 h-2.5 rounded-full bg-white"/>}
                    </div>
                    <span className={`text-[9px] tracking-wide text-center leading-tight ${done ? 'text-[#0F0E0C] font-semibold' : 'text-gray-400'}`}>{s}</span>
                  </div>
                );
              })}
            </div>
            <div className="relative h-1 bg-[#EDE8DF] rounded-full -mt-8 mx-3" style={{zIndex:0}}>
              <div className="h-full rounded-full bg-[#C9A96E] transition-all duration-500" style={{width:`${pct}%`}}/>
            </div>
          </div>
          {/* Détails */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7F4EE] rounded-xl p-3">
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-1">Prix HT estimé</span>
              <span className="font-playfair text-xl text-[#0F0E0C]">{price.toFixed(2)} €</span>
            </div>
            <div className="bg-[#F7F4EE] rounded-xl p-3">
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-1">Envoyé le</span>
              <span className="text-sm font-medium text-[#0F0E0C]">{new Date(m.dateReception).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs rounded-full px-3 py-1 bg-[#F7F4EE] border border-[#D5CFC6] text-gray-700 font-medium">{m.category}</span>
            {m.urgency!=='Standard'&&<span className="text-xs rounded-full px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-medium">{m.urgency}</span>}
            {m.diamondCutType!=='Standard'&&<span className="text-xs rounded-full px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-medium">{m.diamondCutType}</span>}
            {m.glassType?.map(g=><span key={g} className="text-xs rounded-full px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{g.replace('Verre ','')}</span>)}
            {(m.engravingCount||0)>0&&<span className="text-xs rounded-full px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-medium">{m.engravingCount} gravure(s)</span>}
            {m.shapeChange&&<span className="text-xs rounded-full px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 font-medium">Changement forme</span>}
          </div>
          {m.description && <p className="text-sm text-gray-600 italic border-l-2 border-[#EDE8DF] pl-3">{m.description}</p>}
          {/* Timeline */}
          <div>
            <span className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-3">Historique</span>
            <div className="relative pl-5">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-[#EDE8DF]"/>
              <div className="space-y-3">
                <div className="flex items-center gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-[#EDE8DF] border-2 border-white absolute -left-3.5"/>
                  <span className="text-sm font-semibold text-gray-700">Dossier créé</span>
                  <span className="text-xs text-gray-500">{new Date(m.dateReception).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}</span>
                </div>
                {history.length > 0
                  ? history.map((h,i) => {
                      const hc = statusCfg[h.statut]||{dot:'bg-gray-300'};
                      const last = i===history.length-1;
                      return (
                        <div key={i} className="flex items-center gap-3 relative">
                          <div className={`w-3 h-3 rounded-full border-2 border-white absolute -left-3.5 ${last?hc.dot:'bg-gray-300'}`}/>
                          <span className={`text-sm font-semibold ${last?'text-[#0F0E0C]':'text-gray-500'}`}>{h.statut}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(h.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                            {' · '}
                            {new Date(h.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                      );
                    })
                  : m.statut!=='En attente' && (
                      <div className="flex items-center gap-3 relative">
                        <div className={`w-3 h-3 rounded-full border-2 border-white absolute -left-3.5 ${statusCfg[m.statut]?.dot||'bg-gray-300'}`}/>
                        <span className="text-sm font-semibold text-[#0F0E0C]">{m.statut}</span>
                        <span className="text-xs text-gray-400 italic">date non enregistrée</span>
                      </div>
                    )
                }
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function MesCommandes() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user,          setUser]          = useState<UserData|null>(null);
  const [montages,      setMontages]      = useState<Montage[]>([]);
  const [factures,      setFactures]      = useState<Facture[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<string|null>(null);
  const [photoUrl,      setPhotoUrl]      = useState<string|null>(null);
  const [quickView,     setQuickView]     = useState<Montage|null>(null);
  const [clientsList,   setClientsList]   = useState<any[]>([]);
  const [targetClient,  setTargetClient]  = useState("");
  const [openTimeline,  setOpenTimeline]  = useState<string|null>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  // Formulaire
  const [ref,  setRef]  = useState("");
  const [frame,setFrame]= useState("");
  const [desc, setDesc] = useState("");
  const [cat,  setCat]  = useState("Cerclé");
  const [glass,setGlass]= useState<string[]>([]);
  const [urg,  setUrg]  = useState("Standard");
  const [dc,   setDc]   = useState("Standard");
  const [eng,  setEng]  = useState(0);
  const [sc,   setSc]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialTab = new URLSearchParams(location.search).get('tab')==='factures' ? 'factures' : 'commandes';
  const [tab, setTab] = useState(initialTab);

  // ─── CHARGEMENT INITIAL ───────────────────────────────────────────────────────
  useEffect(() => {
    const str = localStorage.getItem("user");
    if (!str) { navigate("/espace-pro"); return; }

    let u: UserData;
    try { u = JSON.parse(str); } catch { navigate("/"); return; }
    setUser(u);

    const load = async () => {
      try {
        // Montages
        const q = u.role === 'manager'
          ? `?role=manager&managerId=${u.id}`
          : `?userId=${u.id}`;
        const [mRes, fRes] = await Promise.all([
          authFetch(`${API_URL}/montages${q}`),
          authFetch(`${API_URL}/factures?userId=${u.id}`),
        ]);
        const [mData, fData] = await Promise.all([mRes.json(), fRes.json()]);
        if (mData.success) setMontages(mData.montages || []);
        if (fData.success) setFactures(fData.factures.map((f: any) => ({
          id: f._id, invoiceNumber: f.invoiceNumber,
          montageReference: f.montagesReferences?.join(', ') || 'N/A',
          dateEmission: f.dateEmission, totalHT: f.totalHT, totalTTC: f.totalTTC,
          invoiceData: f.invoiceData || [], amountPaid: f.amountPaid, paymentStatus: f.paymentStatus
        })));

        // Clients pour le manager
        if (u.role === 'manager') {
          const cRes = await authFetch(`${API_URL}/users`);
          const cData = await cRes.json();
          if (cData.success) {
            setClientsList(cData.users);
            if (u.assignedShops?.length) {
              const id = typeof u.assignedShops[0] === 'string' ? u.assignedShops[0] : u.assignedShops[0]._id;
              setTargetClient(id);
            }
          }
        } else {
          setTargetClient(u.id);
        }
      } catch (e) {
        console.error('Erreur chargement MesCommandes:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // ─── RAFRAÎCHISSEMENT ─────────────────────────────────────────────────────────
  const fetchM = async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);
    try {
      const q = user.role === 'manager'
        ? `?role=manager&managerId=${user.id}`
        : `?userId=${user.id}`;
      const r = await authFetch(`${API_URL}/montages${q}`);
      const d = await r.json();
      if (d.success) setMontages(d.montages || []);
    } catch {}
    finally { setRefreshing(false); }
  };

  // ─── AJOUT DOSSIER ────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const tid = user.role === 'manager' ? targetClient : user.id;
    if (!tid) { toast.error("Veuillez sélectionner un magasin."); return; }
    setSubmitting(true);
    try {
      const r = await authFetch(`${API_URL}/montages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: tid, reference: ref, frame, description: desc,
          category: cat, glassType: glass, urgency: urg, diamondCutType: dc,
          engravingCount: eng, shapeChange: sc,
          createdBy: user.role === 'manager' ? `Manager (${user.nomSociete})` : 'Client'
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Dossier envoyé à l'atelier !");
        setRef(""); setFrame(""); setDesc(""); setCat("Cerclé"); setGlass([]);
        setUrg("Standard"); setDc("Standard"); setEng(0); setSc(false);
        fetchM(true);
      } else {
        toast.error(d.message || "Erreur lors de l'envoi.");
      }
    } catch { toast.error("Erreur lors de l'envoi."); }
    finally { setSubmitting(false); }
  };

  // ─── TÉLÉCHARGEMENT PDF ────────────────────────────────────────────────────────
  const downloadPDF = async (f: Facture) => {
    if (!user) return;
    toast.loading("Génération...", {id:'dl'});
    const div = document.createElement('div');
    div.style.cssText = 'width:800px;padding:40px;background:white;position:absolute;top:-9999px;left:-9999px;font-family:sans-serif;color:#000';
    div.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:36px"><div><h1 style="font-size:26px;font-weight:bold;margin-bottom:6px">DÉTAIL DE FACTURATION</h1><p style="color:#999;font-size:11px">Date : ${new Date(f.dateEmission).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><p style="font-weight:bold">L'Atelier des Arts</p><p style="font-size:11px;color:#666">178 Avenue Daumesnil, 75012 Paris</p></div></div><div style="border-top:1px solid #eee;padding-top:16px;margin-bottom:24px"><p style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin-bottom:4px">Facturé à</p><p style="font-size:16px;font-weight:bold">${user.nomSociete}</p><p style="font-size:11px;color:#666">${user.address||''} ${user.zipCity||''}</p></div><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Référence</th><th style="text-align:left;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Détails</th><th style="text-align:right;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Prix HT</th></tr></thead><tbody>${f.invoiceData.map((i:any)=>`<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:8px 0;font-weight:500;font-size:12px">${i.reference||'-'}</td><td style="padding:8px 0;font-size:10px;color:#666">${i.details.join('<br/>')}</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:12px">${i.price.toFixed(2)} €</td></tr>`).join('')}</tbody></table><div style="display:flex;justify-content:space-between;align-items:flex-end"><div style="background:#F7F4EE;border:1px solid #EDE8DF;padding:14px;width:44%;border-radius:8px"><p style="font-weight:bold;font-size:10px;text-transform:uppercase;margin-bottom:6px">Coordonnées bancaires</p><p style="font-size:10px;color:#666">IBAN : FR76 1820 6002 0065 1045 3419 297</p><p style="font-size:10px;color:#666">BIC : AGRIFRPP882</p></div><div style="text-align:right"><p style="color:#666;font-size:12px">Total HT : ${f.totalHT?.toFixed(2)} €</p><p style="color:#666;font-size:12px">TVA 20% : ${(f.totalTTC-(f.totalHT||0)).toFixed(2)} €</p><p style="font-size:20px;font-weight:bold;margin-top:6px">Net à payer : ${f.totalTTC.toFixed(2)} €</p></div></div>`;
    document.body.appendChild(div);
    try {
      const canvas = await html2canvas(div, {scale:2, windowWidth:div.scrollWidth, windowHeight:div.scrollHeight});
      const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
      const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
      const ih = (canvas.height * w) / canvas.width;
      let left = ih, pos = 0;
      pdf.addImage(canvas.toDataURL('image/jpeg',1), 'JPEG', 0, pos, w, ih);
      left -= h;
      while (left > 0) { pos = left - ih; pdf.addPage(); pdf.addImage(canvas.toDataURL('image/jpeg',1), 'JPEG', 0, pos, w, ih); left -= h; }
      pdf.save(`Facturation_${f.invoiceNumber}.pdf`);
      toast.success("PDF téléchargé !", {id:'dl'});
    } catch { toast.error("Erreur téléchargement.", {id:'dl'}); }
    finally { document.body.removeChild(div); }
  };

  // ─── CALCULS / FILTRAGE ────────────────────────────────────────────────────────
  const fm = montages.filter(m => {
    const matchSearch = normalize(m.reference + m.frame).includes(normalize(search));
    const matchStatus = !statusFilter || m.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = Object.fromEntries(
    ['En attente','Reçu','En cours','Terminé'].map(s => [s, montages.filter(m => m.statut===s).length])
  );

  const isManager = user?.role === 'manager';
  const getTier = (m: Montage) =>
    isManager ? (clientsList.find((c: any) => c._id===m.userId)?.pricingTier || 1) : (user?.pricingTier || 1);

  // Groupement par mois
  const getMonthKey = (date: string) => {
    try { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
    catch { return '0000-00'; }
  };
  const getMonthLabel = (key: string) => {
    try {
      const [y,m] = key.split('-');
      const label = new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch { return key; }
  };

  const grouped = fm.reduce((acc: any, m) => {
    const mk = getMonthKey(m.dateReception);
    if (!acc[mk]) acc[mk] = isManager ? {} : [];
    if (isManager) {
      const shop = m.clientName || "Inconnu";
      if (!acc[mk][shop]) acc[mk][shop] = [];
      acc[mk][shop].push(m);
    } else {
      acc[mk].push(m);
    }
    return acc;
  }, {});

  const monthKeys = Object.keys(grouped).sort().reverse();

  // ─── CARTE MONTAGE ─────────────────────────────────────────────────────────────
  const renderCard = (m: Montage) => {
    const price  = calcP(m, getTier(m));
    const tlOpen = openTimeline === m._id;
    const history = m.statusHistory || [];
    const statusColor = statusCfg[m.statut]?.dot
      .replace('bg-amber-400','#F59E0B').replace('bg-blue-400','#60A5FA')
      .replace('bg-orange-400','#FB923C').replace('bg-emerald-400','#34D399')
      .replace('bg-purple-400','#A78BFA') || '#E5E7EB';
    const barColor = m.statut==='En attente'?'#F59E0B':m.statut==='Reçu'?'#60A5FA':m.statut==='En cours'?'#FB923C':m.statut==='Terminé'?'#34D399':'#E5E7EB';

    return (
      <div key={m._id} className="bg-white border border-[#EDE8DF] rounded-xl overflow-hidden hover:shadow-md transition-all group">
        {/* Corps cliquable */}
        <div className="flex items-stretch cursor-pointer" onClick={() => setQuickView(m)}>
          <div className="w-1.5 flex-shrink-0 rounded-l-xl" style={{background: barColor}}/>
          <div className="flex-1 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              {/* Ligne principale */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-bold text-base text-[#0F0E0C] tracking-wide">{m.reference}</span>
                <span className="text-gray-400 font-light">·</span>
                <span className="text-sm font-medium text-gray-600">{m.frame}</span>
                <StatusPill s={m.statut}/>
                <span className="ml-auto text-sm font-semibold text-[#9A7A45]">{price.toFixed(2)} € HT</span>
              </div>
              {/* Badge manager */}
              {isManager && m.createdBy?.includes("Manager") && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5 mb-2">
                  <UserCog className="w-3 h-3"/>{m.createdBy}
                </div>
              )}
              {/* Badges options */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs rounded-full px-3 py-1 bg-[#F7F4EE] border border-[#D5CFC6] text-gray-700 font-medium">{m.category}</span>
                {m.urgency!=='Standard'&&<span className="text-xs rounded-full px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-medium">{m.urgency}</span>}
                {m.diamondCutType!=='Standard'&&<span className="text-xs rounded-full px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-medium">{m.diamondCutType}</span>}
                {m.glassType?.map(g=><span key={g} className="text-xs rounded-full px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{g.replace('Verre ','')}</span>)}
                {(m.engravingCount||0)>0&&<span className="text-xs rounded-full px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-medium">{m.engravingCount} gravure(s)</span>}
                {m.shapeChange&&<span className="text-xs rounded-full px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 font-medium">Changement forme</span>}
              </div>
              {m.description && <p className="text-xs text-gray-600 mt-2 border-l-2 border-[#D5CFC6] pl-2.5">{m.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m.photoUrl && (
                <button className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#C9A96E] bg-[#FBF6EE] hover:bg-[#C9A96E]/20 transition-colors"
                  onClick={e => { e.stopPropagation(); setPhotoUrl(m.photoUrl!); }}>
                  <ImageIcon className="w-4 h-4 text-[#C9A96E]"/>
                </button>
              )}
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#C9A96E] transition-colors"/>
            </div>
          </div>
        </div>

        {/* Pied — date + historique */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-t cursor-pointer transition-colors ${tlOpen ? 'border-[#C9A96E]/20 bg-[#FBF6EE]' : 'border-[#F0EDE7] hover:bg-[#F7F4EE]'}`}
          onClick={e => { e.stopPropagation(); setOpenTimeline(tlOpen ? null : m._id); }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400"/>
            <span className="text-xs font-medium text-gray-500">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${tlOpen ? 'text-[#C9A96E]' : 'text-gray-500 hover:text-gray-700'} transition-colors`}>
            <span className="text-xs font-semibold tracking-widest uppercase">Historique</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${tlOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        {/* Timeline dépliable */}
        {tlOpen && (
          <div className="px-5 pb-4 pt-3 bg-[#FAFAF8] border-t border-[#EDE8DF]">
            <div className="relative pl-5">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-[#EDE8DF]"/>
              <div className="space-y-3">
                <div className="flex items-center gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-[#EDE8DF] border-2 border-white absolute -left-3.5"/>
                  <span className="text-sm font-semibold text-gray-700 w-28 flex-shrink-0">Créé</span>
                  <span className="text-xs text-gray-500">{new Date(m.dateReception).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}</span>
                </div>
                {history.length > 0
                  ? history.map((h, i) => {
                      const hc = statusCfg[h.statut] || {dot:'bg-gray-300'};
                      const last = i === history.length - 1;
                      return (
                        <div key={i} className="flex items-center gap-3 relative">
                          <div className={`w-3 h-3 rounded-full border-2 border-white absolute -left-3.5 ${last ? hc.dot : 'bg-gray-300'}`}/>
                          <span className={`text-sm font-semibold w-28 flex-shrink-0 ${last ? 'text-[#0F0E0C]' : 'text-gray-500'}`}>{h.statut}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(h.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                            {' · '}
                            {new Date(h.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                      );
                    })
                  : m.statut !== 'En attente' && (
                      <div className="flex items-center gap-3 relative">
                        <div className={`w-3 h-3 rounded-full border-2 border-white absolute -left-3.5 ${statusCfg[m.statut]?.dot||'bg-gray-300'}`}/>
                        <span className="text-sm font-semibold text-[#0F0E0C] w-28 flex-shrink-0">{m.statut}</span>
                        <span className="text-xs text-gray-400 italic">date non enregistrée</span>
                      </div>
                    )
                }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A96E]"/>
        <span className="text-xs tracking-[0.25em] uppercase text-gray-500">Chargement en cours...</span>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation/>
      <div className="flex-grow pt-24 pb-12 px-6 container mx-auto max-w-5xl">

        {/* En-tête */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <span className={S.lbl}>{isManager ? 'Espace Manager' : 'Espace Professionnel'}</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">{user.nomSociete}</h1>
          </div>
          <button onClick={() => fetchM()} className={S.btnO} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}/> Actualiser
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#EDE8DF] rounded-2xl p-1 inline-flex shadow-sm mb-6">
          {([['commandes', `Commandes (${montages.length})`, <ShoppingCart className="w-4 h-4"/>],
             ['factures',  `Factures (${factures.length})`,  <Receipt className="w-4 h-4"/>]] as const).map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-xl px-6 py-2.5 text-xs font-medium tracking-wide uppercase transition-all flex items-center gap-2 ${tab===t ? 'bg-[#0F0E0C] text-[#F7F4EE]' : 'text-gray-500 hover:text-[#0F0E0C]'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── ONGLET COMMANDES ── */}
        {tab === 'commandes' && (
          <div className="space-y-6">
            {/* Formulaire */}
            <div className={S.card + " overflow-hidden"}>
              <div className="px-6 py-4 border-b border-[#EDE8DF]">
                <p className={S.lbl}>Nouvelle demande</p>
                <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#C9A96E]"/>
                  {isManager ? 'Dossier pour un magasin' : 'Nouvelle demande de montage'}
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleAdd} className="space-y-5">
                  {isManager && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-blue-700 block mb-2">Pour le compte de quel magasin ?</Label>
                      <Select onValueChange={setTargetClient} value={targetClient}>
                        <SelectTrigger className={S.inp + " h-10"}><SelectValue placeholder="Choisir un client..."/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl max-h-60">
                          {clientsList.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className={S.lbl}>Référence *</Label><input placeholder="Ex : REF-123" value={ref} onChange={e=>setRef(e.target.value)} required className={S.inp + " h-10 w-full px-3"}/></div>
                    <div><Label className={S.lbl}>Monture *</Label><input placeholder="Ex : RayBan 450" value={frame} onChange={e=>setFrame(e.target.value)} required className={S.inp + " h-10 w-full px-3"}/></div>
                    <div><Label className={S.lbl}>Urgence</Label>
                      <Select onValueChange={setUrg} value={urg}>
                        <SelectTrigger className={S.inp + " h-10"}><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className={S.lbl}>Type</Label>
                      <Select onValueChange={setCat} value={cat}>
                        <SelectTrigger className={S.inp + " h-10"}><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">
                          {['Cerclé','Percé','Nylor','Sans Montage'].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className={S.lbl}>Diamond Cut</Label>
                      <Select onValueChange={setDc} value={dc}>
                        <SelectTrigger className={S.inp + " h-10"}><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className={S.lbl}>Gravures (qté)</Label>
                      <input type="number" min={0} max={2} value={eng} onChange={e=>setEng(parseInt(e.target.value)||0)} className={S.inp + " h-10 w-full px-3"}/>
                    </div>
                  </div>
                  <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                    <p className={S.lbl}>Options verres & autres</p>
                    <div className="flex flex-wrap gap-5 mt-2">
                      {GLASS_OPTIONS.map(o=>(
                        <div key={o} className="flex items-center gap-2">
                          <Checkbox id={o} checked={glass.includes(o)} onCheckedChange={c=>setGlass(p=>(c as boolean)?[...p,o]:p.filter(t=>t!==o))}/>
                          <label htmlFor={o} className="text-sm cursor-pointer text-[#0F0E0C]">{o}</label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 border-l border-[#EDE8DF] pl-5">
                        <Checkbox id="sc" checked={sc} onCheckedChange={c=>setSc(c as boolean)}/>
                        <label htmlFor="sc" className="text-sm cursor-pointer text-[#0F0E0C]">Changement de forme</label>
                      </div>
                    </div>
                  </div>
                  <div><Label className={S.lbl}>Note</Label>
                    <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Informations supplémentaires..." className={S.inp + " h-10 w-full px-3"}/>
                  </div>
                  <button type="submit" disabled={submitting} className={S.btnP + " w-full md:w-auto"}>
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin"/>Envoi...</> : "Valider et envoyer à l'atelier"}
                  </button>
                </form>
              </div>
            </div>

            {/* Filtres statut */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatusFilter(null)}
                className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all ${!statusFilter ? 'bg-[#0F0E0C] text-[#F7F4EE] border-[#0F0E0C]' : 'bg-white text-gray-600 border-[#EDE8DF] hover:bg-[#F7F4EE]'}`}>
                Tous ({montages.length})
              </button>
              {Object.entries(statusCfg).slice(0,4).map(([s,cfg]) => (
                <button key={s} onClick={() => setStatusFilter(statusFilter===s ? null : s)}
                  className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${statusFilter===s ? `${cfg.cls}` : 'bg-white text-gray-600 border-[#EDE8DF] hover:bg-[#F7F4EE]'}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
                  {s} {statusCounts[s] > 0 && <span className="text-gray-400">({statusCounts[s]})</span>}
                </button>
              ))}
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
              <input className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm text-[#0F0E0C] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all"
                placeholder="Rechercher un dossier..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>

            {/* Liste dossiers */}
            {monthKeys.length === 0
              ? <div className="text-center py-16 text-gray-500 text-sm">Aucune commande{statusFilter ? ` "${statusFilter}"` : ''} trouvée.</div>
              : (
                <Accordion type="multiple" className="space-y-3" defaultValue={monthKeys.slice(0,2)}>
                  {monthKeys.map(mk => {
                    const content = grouped[mk];
                    const label = getMonthLabel(mk);
                    const count = Array.isArray(content) ? content.length : (Object.values(content) as any[]).flat().length;
                    return (
                      <AccordionItem key={mk} value={mk} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                        <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#F7F4EE] transition-colors">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-[#C9A96E]"/>
                            <span className="font-playfair text-xl font-normal text-[#0F0E0C] capitalize">{label}</span>
                            <span className="text-xs font-medium text-gray-500 ml-1">({count} dossiers)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 pt-2">
                          {isManager ? (
                            <Accordion type="multiple" className="space-y-2">
                              {Object.entries(content).map(([shop, items]: any) => (
                                <AccordionItem key={shop} value={shop} className="bg-[#F7F4EE] border border-[#EDE8DF] rounded-xl overflow-hidden">
                                  <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#EDE8DF] transition-colors">
                                    <div className="flex items-center gap-2">
                                      <Store className="w-4 h-4 text-[#C9A96E]"/>
                                      <span className="text-sm font-semibold text-[#0F0E0C]">{shop}</span>
                                      <span className="text-xs text-gray-500 font-medium ml-1">({items.length})</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4 pt-2 space-y-2">
                                    {items.map((m: Montage) => renderCard(m))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <div className="space-y-2">
                              {[...content].sort((a: Montage, b: Montage) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime()).map((m: Montage) => renderCard(m))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )
            }
          </div>
        )}

        {/* ── ONGLET FACTURES ── */}
        {tab === 'factures' && (
          factures.length === 0
            ? <div className="text-center py-16 text-gray-500 text-sm">Aucune facture disponible.</div>
            : (
              <div className="space-y-3">
                {factures.map(f => {
                  const isPaid = f.paymentStatus === 'Payé';
                  const isPartial = f.paymentStatus === 'Partiellement payé';
                  const rem = f.totalTTC - (f.amountPaid||0);
                  return (
                    <div key={f.invoiceNumber} className="bg-white border border-[#EDE8DF] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-[#0F0E0C] flex items-center gap-2 text-base">
                            <Receipt className="w-4 h-4 text-[#C9A96E]"/> {f.invoiceNumber}
                          </p>
                          {isPaid && <span className="text-xs font-semibold rounded-full px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800">Réglé</span>}
                          {isPartial && <span className="text-xs font-semibold rounded-full px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800">Reste : {rem.toFixed(2)} €</span>}
                          {!isPaid && !isPartial && <span className="text-xs font-semibold rounded-full px-3 py-1 bg-red-50 border border-red-300 text-red-800">À régler</span>}
                        </div>
                        <p className="text-sm text-gray-500">Émis le {new Date(f.dateEmission).toLocaleDateString('fr-FR')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Dossiers : {f.montageReference}</p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className={S.lbl} style={{marginBottom:2}}>Montant TTC</p>
                          <span className="font-playfair text-2xl font-normal text-[#0F0E0C]">{f.totalTTC.toFixed(2)} €</span>
                        </div>
                        <button onClick={() => downloadPDF(f)} className={S.btnG}>
                          <FileText className="w-4 h-4"/> Télécharger
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        )}

        {/* Modales */}
        <QuickView m={quickView} tier={quickView ? getTier(quickView) : 1} onClose={() => setQuickView(null)}/>

        <Dialog open={!!photoUrl} onOpenChange={() => setPhotoUrl(null)}>
          <DialogContent className="bg-[#0F0E0C]/95 border-[#C9A96E]/20 p-0 flex items-center justify-center max-w-4xl rounded-2xl overflow-hidden">
            <div className="relative p-4">
              <button className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={() => setPhotoUrl(null)}>
                <X className="w-4 h-4"/>
              </button>
              {photoUrl && <img src={photoUrl} alt="Montage" className="max-w-full max-h-[85vh] object-contain rounded-xl"/>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
